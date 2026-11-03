// اللاعب: المنصّة (rig) والكاميرا، والمشي مع التصادم، والانتقال، والدوران على دفعات.
// لا يقرأ الإدخال بنفسه: الوضع (10-modes.js) يضبط النظر ويمرّر أمر المشي إلى update.
var EYE_HEIGHT = 1.62;
var SNAP_ANGLE = Math.PI / 6; // 30° لكل دفعة

function createPlayer({ scene, camera, renderer }) {
  const rig = new Group();
  rig.name = "rig";
  scene.add(rig);
  rig.add(camera);
  camera.position.set(0, EYE_HEIGHT, 0);

  const p = {
    rig,
    enabled: false,
    // مصدر النظر: "mouse" (yaw وpitch من الفأرة أو السحب)، "sensor" (مستشعر الجوال)، "xr" (النظارة)
    look: "mouse",
    yaw: 0, // دوران المنصّة حول المحور الرأسي
    pitch: 0, // ميل الرأس في وضع "mouse" فقط
    sensorQuat: new Quaternion(), // دوران الكاميرا داخل المنصّة في وضع "sensor"
    slow: false, // سرعات أبطأ وأريح في النظارة وعلبة VR
    jogToggle: false,
    jogKey: false,
    jogXR: false,
    jogPad: false,
    moving: false,
    speed: 0,
    turnedAt: -1e9, // وقت آخر دوران على دفعات، لتعتيم الأطراف لحظتها
    controllers: [],
  };

  // أذرع النظارة: مقبض مرئي لكل ذراع، والذراع نفسها (اتجاه الإشارة) لـ 10-modes.js
  const gripGeo = new Fi(0.025, 0.09, 4, 8);
  gripGeo.rotateX(Math.PI / 2);
  const gripMat = new Rn({ color: "#e9e2d0", roughness: 0.5 });
  for (let i = 0; i < 2; i++) {
    const c = renderer.xr.getController(i);
    c.addEventListener("connected", (e) => (c.userData.handedness = e.data && e.data.handedness));
    c.addEventListener("disconnected", () => (c.userData.handedness = null));
    rig.add(c);
    p.controllers.push(c);
    const g = renderer.xr.getControllerGrip(i);
    g.add(new Mesh(gripGeo, gripMat));
    rig.add(g);
  }

  const head = new Vector3();
  const head2 = new Vector3();
  const dir = new Vector3();
  const up = new Vector3();
  let lastValid = null; // آخر موضع داخل المساحة المسموحة
  const headPos = (out) => camera.getWorldPosition(out);

  // يدير المنصّة حول موضع الرأس، فلا ينزاح الرأس (مهم في النظارة حيث الرأس ليس على محور المنصّة)
  function rotateAboutHead(angle) {
    rig.updateMatrixWorld(true);
    headPos(head);
    rig.rotation.y += angle;
    rig.updateMatrixWorld(true);
    headPos(head2);
    rig.position.x += head.x - head2.x;
    rig.position.z += head.z - head2.z;
  }

  function applyLook() {
    if (p.look === "mouse") rig.rotation.y = p.yaw, camera.rotation.set(p.pitch, 0, 0);
    else if (p.look === "sensor") rig.rotation.y = p.yaw, camera.quaternion.copy(p.sensorQuat);
  }

  p.headingPhi = () => (camera.getWorldDirection(dir), Math.atan2(-dir.z, dir.x));
  p.headingYaw = () => (camera.getWorldDirection(dir), Math.atan2(-dir.x, -dir.z));
  p.getPos = () => (headPos(head), { x: head.x, z: head.z });
  p.isJogging = () => p.jogToggle || p.jogKey || p.jogXR || p.jogPad;

  // dir: +1 لليسار، -1 لليمين
  p.snapTurn = (d) => {
    if (!d) return;
    if (p.look === "xr") rotateAboutHead(d * SNAP_ANGLE);
    else p.yaw += d * SNAP_ANGLE;
    p.turnedAt = performance.now();
  };

  // يجعل اتجاه النظر الأفقي yaw دون تحريك الرأس (يُستعمل حين يبدأ المستشعر أو بعد الانتقال)
  p.faceYaw = (yaw) => {
    applyLook();
    rig.updateMatrixWorld(true);
    const delta = yaw - p.headingYaw();
    if (p.look === "xr") rotateAboutHead(delta);
    else p.yaw += delta;
    applyLook();
    rig.updateMatrixWorld(true);
  };

  p.teleport = (x, z, dx, dz) => {
    const yaw = Math.atan2(-dx, -dz);
    if (p.look === "mouse") {
      p.yaw = yaw;
      p.pitch = -0.05;
      rig.position.set(x, 0, z);
    } else {
      p.faceYaw(yaw);
      headPos(head);
      rig.position.x += x - head.x;
      rig.position.z += z - head.z;
    }
    lastValid = null;
    rig.updateMatrixWorld(true);
  };

  p.setLook = (look) => {
    if (look === p.look) return;
    const yaw = p.headingYaw();
    const was = p.look;
    p.look = look;
    if (look === "xr") {
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
      rig.rotation.y = p.yaw;
    } else {
      if (was === "xr") camera.position.set(0, EYE_HEIGHT, 0), (p.jogXR = false);
      p.pitch = 0;
      p.faceYaw(yaw);
    }
    lastValid = null;
  };

  // cmd: { forward, strafe } بين -1 و1
  p.update = (dt, cmd = {}) => {
    applyLook();
    rig.updateMatrixWorld(true);
    headPos(head);
    const start = head.clone();
    let fwd = p.enabled ? cmd.forward || 0 : 0;
    let side = p.enabled ? cmd.strafe || 0 : 0;
    const len = Math.hypot(fwd, side);
    if (len > 1) (fwd /= len), (side /= len);
    if (len > 0.08) {
      let fx, fz;
      if (p.look === "mouse") (fx = -Math.sin(p.yaw)), (fz = -Math.cos(p.yaw));
      else {
        camera.getWorldDirection(dir);
        let h = Math.hypot(dir.x, dir.z);
        if (h < 0.2) {
          // ينظر إلى الأرض تقريبًا: أعلى الرأس يشير إلى الأمام
          up.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(new Quaternion()));
          (dir.x = up.x), (dir.z = up.z), (h = Math.hypot(up.x, up.z) || 1);
        }
        (fx = dir.x / h), (fz = dir.z / h);
      }
      const jog = p.isJogging();
      const v = p.slow ? (jog ? 3 : 1.8) : jog ? 3.9 : 2.4;
      const mx = (fx * fwd - fz * side) * v * dt;
      const mz = (fz * fwd + fx * side) * v * dt;
      const [nx, nz] = xd(head.x, head.z, head.x + mx, head.z + mz);
      rig.position.x += nx - head.x;
      rig.position.z += nz - head.z;
      rig.updateMatrixWorld(true);
      headPos(head);
    }
    if (!zs(head.x, head.z) && lastValid) {
      rig.position.x += lastValid.x - head.x;
      rig.position.z += lastValid.z - head.z;
      rig.updateMatrixWorld(true);
      headPos(head);
    } else {
      const [cx, cz] = Yc(head.x, head.z);
      if (cx !== head.x || cz !== head.z) {
        rig.position.x += cx - head.x;
        rig.position.z += cz - head.z;
        rig.updateMatrixWorld(true);
        headPos(head);
      }
    }
    if (zs(head.x, head.z)) lastValid = (lastValid || new Vector3()).copy(head);
    const moved = Math.hypot(head.x - start.x, head.z - start.z);
    p.speed = dt > 0 ? moved / dt : 0;
    p.moving = p.speed > 0.5;
  };

  return p;
}

// الحركة المريحة: تعتيم أطراف الرؤية أثناء المشي والدوران، فيقلّ دوار الحركة في النظارة وعلبة VR.
// كرة حول الكاميرا تُعتم بحسب الزاوية عن اتجاه النظر؛ تعمل في العين الواحدة والعينين.
function createComfortVignette(camera) {
  const mat = new ShaderMaterial({
    uniforms: { strength: { value: 0 } },
    vertexShader: `varying vec3 vPos;
      void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float strength; varying vec3 vPos;
      void main() {
        float c = -normalize(vPos).z; // جيب تمام الزاوية عن الأمام
        gl_FragColor = vec4(0.0, 0.0, 0.0, (1.0 - smoothstep(0.62, 0.93, c)) * strength);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: BackSide,
  });
  const mesh = new Mesh(new SphereGeometry(1, 24, 16), mat);
  mesh.renderOrder = 998;
  mesh.frustumCulled = false;
  mesh.visible = false;
  camera.add(mesh);
  const v = { enabled: false, strength: 0 };
  v.update = (dt, target) => {
    const t = v.enabled ? Math.max(0, Math.min(0.85, target)) : 0;
    v.strength += (t - v.strength) * Math.min(1, dt * 8);
    mat.uniforms.strength.value = v.strength;
    mesh.visible = v.strength > 0.01;
  };
  return v;
}
