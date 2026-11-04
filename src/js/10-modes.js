// أوضاع التدريب الأربعة. كلها تشترك في المشهد (03-world) والمنطق (09-game) واللاعب (06-player) واللوحات (07-panels).
// الوضع يقرّر: من أين يأتي النظر والمشي، وكيف يُختار الزر، وكيف يُرسم الإطار.
//
//   mobile     الجوال: النظر بالسحب (والمستشعر اختياري)، والمشي بعصا عائمة تحت الإبهام الأيسر، واللمس على اللوحات.
//              والمشي الموجّه (06-guide.js): العصا إلى الأمام تمشي على مسار المنسك والكاميرا تلتفت معه،
//              و«مشي مستمر» يمشي وحده حتى ما يحتاج منسكًا
//   cardboard  علبة VR: صورتان جنبًا إلى جنب، والنظر بالمستشعر، والاختيار بالنظر ثانية واحدة أو بلمس الشاشة،
//              والمشي بزر «امشِ» أو بيد تحكم بلوتوث (Gamepad API أو أسهم لوحة المفاتيح)
//   desktop    الحاسوب: الأسهم وWASD وسحب الفأرة، والمسافة للمنسك، والنقر على اللوحات
//   xr         النظارة (WebXR): العصا اليسرى للمشي، واليمنى للدوران على دفعات، والزناد للاختيار
var MODE_NAMES = { mobile: "الجوال", cardboard: "علبة VR", desktop: "الحاسوب", xr: "النظارة" };
var DWELL_SECONDS = 1; // مدة النظر إلى زر لاختياره في علبة VR
var CARDBOARD_IPD = 0.064;
var CARDBOARD_FOV = 75; // زاوية الرؤية الرأسية لكل عين
var AUTO_TURN_DELAY = 2; // ثانيتان بعد آخر سحب أو دوران قبل أن تلتفت الكاميرا مع المسار
var AUTO_TURN_RATE = 3; // سرعة التفات الكاميرا مع المسار (لكل ثانية)

function createModes({ renderer, scene, camera, player, hud, panels, game, input, vignette, reticle, world }) {
  const { keyboard, pointer, joystick, sensor, gamepad } = input;
  const m = {
    mode: "desktop",
    comfort: false, // الحركة المريحة: تعتيم الأطراف، والدوران على دفعات بالأسهم
    comfortChoice: null, // اختيار المستخدم إن غيّره، وإلا فالافتراضي بحسب الوضع
    walking: false, // المشي التلقائي في علبة VR
    gyro: false, // الجوال: النظر بتحريك الجوال. اختياري، والسحب هو الافتراضي
    guide: true, // الجوال: المشي الموجّه
    autoWalk: false, // الجوال: «مشي مستمر»
    guideDir: null, // اتجاه المشي الموجّه في آخر إطار (للاختبار)
    gaze: { id: null, t: 0, consumed: false },
    rayHover: null,
    onChange: null,
    onAutoWalk: null,
  };
  const guide = createRouteGuide({ game, hud, laneAt: world.crowds.laneAt });
  // حالة المساعدة في الجوال. clock بزمن الإطارات لا بالساعة، فيعمل في الاختبار مع step()
  const assist = { clock: 0, dragT: -1e9, turnedAt: player.turnedAt, pushing: false, held: false, key: "", enabled: false, stuck: 0, faceTo: null };
  const snapPad = createSnapLatch();
  const snapXR = createSnapLatch();
  let xrAPrev = false;
  let leftTrigger = false;

  // عينا علبة VR: كاميرتان داخل الكاميرا الرئيسية، بينهما مسافة العينين
  const eyes = [new PerspectiveCamera(CARDBOARD_FOV, 1, 0.05, 2200), new PerspectiveCamera(CARDBOARD_FOV, 1, 0.05, 2200)];
  eyes[0].position.x = -CARDBOARD_IPD / 2;
  eyes[1].position.x = CARDBOARD_IPD / 2;
  camera.add(eyes[0], eyes[1]);

  // شعاع ذراع النظارة اليمنى (أسطوانة رفيعة؛ three.js المضمّن بلا Line)
  const rayGeo = new CylinderGeometry(0.0025, 0.0025, 1, 6, 1, true);
  rayGeo.rotateX(Math.PI / 2);
  rayGeo.translate(0, 0, -0.5);
  const ray = new Mesh(rayGeo, new MeshBasicMaterial({ color: "#f0c96a", transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  ray.visible = false;
  ray.renderOrder = 1003;

  const isVR = (mode = m.mode) => mode === "xr" || mode === "cardboard";
  const useSensor = (mode = m.mode) => mode === "cardboard" || (mode === "mobile" && m.gyro);

  m.set = (mode) => {
    m.mode = mode;
    document.body.dataset.mode = mode;
    const vr = isVR(mode);
    player.slow = vr;
    m.setComfort(m.comfortChoice ?? vr, false);
    pointer.enabled = mode !== "xr";
    joystick.enabled = mode === "mobile";
    m.walking = false;
    m.setAutoWalk(false);
    panels.walking = false;
    panels.setKind(vr ? "board" : "flat", {
      hint: mode === "desktop" ? "مفتاح المسافة" : "",
      board: mode === "xr" ? { dist: 1.25, drop: 0.3 } : { dist: 1.4, drop: 0.22 },
      boardHint:
        mode === "xr"
          ? "العصا اليسرى للمشي، واليمنى للدوران، والزناد للاختيار، والأيسر للهرولة"
          : "انظر إلى زر ثانية واحدة، أو المس الشاشة",
      cardboardButtons: mode === "cardboard",
    });
    if (mode !== "xr") player.setLook(useSensor(mode) && sensor.hasData() ? "sensor" : "mouse");
    reticle.set(false);
    ray.visible = false;
    m.resize();
    m.onChange && m.onChange(mode);
  };
  m.setComfort = (on, byUser = true) => {
    if (byUser) m.comfortChoice = on;
    m.comfort = on;
    vignette.enabled = on;
    document.querySelectorAll('input[data-opt="comfort"]').forEach((e) => (e.checked = on));
  };
  m.toggleWalk = () => {
    m.walking = !m.walking;
    panels.walking = m.walking;
    panels.markDirty();
  };
  // يُستدعى من ضغطة المستخدم على المفتاح: iOS يطلب إذن المستشعر من داخلها
  m.setGyro = (on) => {
    m.gyro = on;
    if (on) sensor.start();
    else if (m.mode === "mobile" && player.look === "sensor") player.setLook("mouse");
  };
  m.setGuide = (on) => {
    m.guide = on;
    guide.reset();
  };
  m.setAutoWalk = (on) => {
    if (m.autoWalk === on) return;
    m.autoWalk = on;
    assist.stuck = 0;
    m.onAutoWalk && m.onAutoWalk(on);
  };

  // «اختر»: الزر تحت النظر أو الذراع إن وُجد، وإلا فالمنسك الحالي
  m.select = () => {
    const id = m.mode === "cardboard" ? m.gaze.id : m.mode === "xr" ? m.rayHover : null;
    if (id) return panels.press(id), (m.gaze.consumed = true);
    game.act();
  };
  panels.onButton = (id) => {
    if (id === "action") game.act();
    else if (id === "secondary") hud.onCardBtn && hud.onCardBtn();
    else if (id === "walk") m.toggleWalk();
    else if (id === "turnL") player.snapTurn(1);
    else if (id === "turnR") player.snapTurn(-1);
  };

  keyboard.onPress = (code, e) => {
    if (!player.enabled || m.mode === "xr") return;
    if (code === "Space" || code === "Enter" || code === "KeyE") e.preventDefault(), m.select();
    if (m.comfort && (code === "ArrowLeft" || code === "ArrowRight")) player.snapTurn(code === "ArrowLeft" ? 1 : -1);
  };
  pointer.onTap = (x, y) => {
    if (!player.enabled) return;
    if (m.mode === "cardboard") {
      // زر العلبة يلمس الشاشة: يختار الزر تحت النظر، وإلا يبدأ المشي أو يوقفه
      if (m.gaze.id) return panels.press(m.gaze.id), (m.gaze.consumed = true);
      return m.toggleWalk();
    }
    const hit = panels.hitScreen(x, y);
    if (hit && hit.id) panels.press(hit.id);
  };
  // الجوال: لمسة في النصف الأيسر السفلي تبدأ عصا المشي تحت الإبهام، إلا إن وقعت على لوحة. وما سواها سحب للالتفات
  pointer.claim = (e) =>
    m.mode === "mobile" &&
    player.enabled &&
    e.clientX < innerWidth * 0.5 &&
    e.clientY > innerHeight * 0.4 &&
    !panels.hitScreen(e.clientX, e.clientY) &&
    joystick.begin(e);

  // أحداث زناد النظارة
  player.controllers.forEach((c) => {
    c.addEventListener("selectstart", (e) => {
      if (!player.enabled || m.mode !== "xr") return;
      const hand = e.data && e.data.handedness;
      if (hand === "left") leftTrigger = true;
      else m.select();
    });
    c.addEventListener("selectend", (e) => {
      if (e.data && e.data.handedness === "left") leftTrigger = false;
    });
  });

  // ——— كل إطار: الإدخال ثم تحريك اللاعب ———
  m.frame = (dt) => {
    const mode = m.mode;
    let fwd = 0;
    let side = 0;
    player.jogKey = keyboard.isDown("ShiftLeft") || keyboard.isDown("ShiftRight");
    if (mode === "xr") {
      const x = readXRControllers(renderer);
      fwd = x.my;
      side = x.mx;
      player.jogXR = x.jog || leftTrigger;
      if (player.enabled) player.snapTurn(snapXR(x.turn));
      if (x.a && !xrAPrev && player.enabled) m.select();
      xrAPrev = x.a;
    } else {
      // النظر
      if (useSensor(mode) && sensor.hasData()) {
        sensor.read(player.sensorQuat);
        if (player.look !== "sensor") player.setLook("sensor");
      }
      const [dy, dp] = pointer.takeDrag();
      // في علبة VR لا سحب، إلا إن لم يوجد مستشعر
      const dragged = player.enabled && (mode !== "cardboard" || player.look === "mouse") && (dy !== 0 || dp !== 0);
      if (dragged) {
        player.yaw += dy;
        if (player.look === "mouse") player.pitch = Math.max(-1.25, Math.min(1.1, player.pitch + dp));
      }
      // المشي: لوحة المفاتيح (ومنها أيادي التحكم التي تعمل كلوحة مفاتيح)
      fwd += keyboard.axis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]);
      side += keyboard.axis(["KeyD"], ["KeyA"]);
      const turn = keyboard.axis(["ArrowLeft"], ["ArrowRight"]);
      if (turn && !m.comfort && player.enabled) player.yaw += turn * dt * 1.8;
      if (mode === "mobile") (fwd += joystick.y), (side += joystick.x);
      // يد تحكم بلوتوث
      const pad = gamepad.read();
      player.jogPad = false;
      if (pad && player.enabled) {
        fwd += -pad.y + (pad.btn(12) ? 1 : 0) - (pad.btn(13) ? 1 : 0);
        side += pad.x;
        player.snapTurn(snapPad(pad.turn));
        if (pad.edge(4) || pad.edge(14)) player.snapTurn(1);
        if (pad.edge(5) || pad.edge(15)) player.snapTurn(-1);
        player.jogPad = pad.btn(6) || pad.btn(7);
        if (pad.edge(0)) m.select();
        if (pad.edge(1) && mode === "cardboard") m.toggleWalk();
      }
      if (mode === "cardboard" && m.walking) fwd = Math.max(fwd, 1);
      if (mode === "mobile") {
        if (m.autoWalk && joystick.y < -0.3) m.setAutoWalk(false); // العصا إلى الخلف توقفه
        const a = mobileAssist(dt, fwd, side, dragged);
        return player.update(dt, { forward: a.fwd, strafe: side, dir: a.dir });
      }
    }
    player.update(dt, { forward: fwd, strafe: side });
  };

  // ——— الجوال: المشي الموجّه، والمشي المستمر، والتفات الكاميرا مع المسار ———
  function mobileAssist(dt, fwd, side, dragged) {
    const a = assist;
    a.clock += dt;
    // السحب أو زر الدوران: يلتفت اللاعب بنفسه، فلا تلتفت الكاميرا وحدها ثانيتين
    if (dragged || player.turnedAt !== a.turnedAt) (a.dragT = a.clock), (a.turnedAt = player.turnedAt), (a.faceTo = null);
    // الوصول إلى ما يحتاج منسكًا (أضاء الزر الذهبي خارج الطواف، أو تغيّر المنسك أو الهدف):
    // يقف المشي المستمر، ويقف من يدفع العصا حتى يرفع إبهامه، ثم ينظر إلى الحجر الأسود أو الكعبة
    const key = `${game.stage}|${hud.model.target}`;
    const on = hud.model.action.enabled;
    const arrived = key !== a.key || (on && !a.enabled && game.stage !== "tawaf");
    a.key = key;
    a.enabled = on;
    if (arrived) {
      const walking = a.pushing || m.autoWalk;
      m.setAutoWalk(false);
      a.held = a.pushing;
      a.faceTo = walking && m.guide ? guide.arrivalFace(game.stage) : null;
    }
    if (m.autoWalk) fwd = Math.max(fwd, 1);
    const pushing = fwd > 0.08;
    const fresh = pushing && !a.pushing;
    a.pushing = pushing;
    if (!pushing) a.held = false;
    if (a.held) fwd = 0;
    let dir = null;
    if (m.guide && pushing && !a.held && player.enabled) {
      const p = player.getPos();
      const h = player.headingYaw();
      dir = guide.direction(p.x, p.z, -Math.sin(h), -Math.cos(h), fresh, side);
    }
    m.guideDir = dir;
    // الكاميرا تلتفت مع المسار، أو إلى الحجر الأسود بعد الوصول. لا مع المستشعر: الجوال في يد اللاعب يدير النظر
    let want = null;
    const p = dir || a.faceTo ? player.getPos() : null;
    if (dir) (want = Math.atan2(-dir[0], -dir[1])), (a.faceTo = null);
    else if (a.faceTo && !pushing) want = Math.atan2(-(a.faceTo[0] - p.x), -(a.faceTo[1] - p.z));
    if (want !== null && player.look === "mouse" && player.enabled && a.clock - a.dragT > AUTO_TURN_DELAY) {
      const diff = ll(want - player.yaw);
      player.yaw += diff * Math.min(1, dt * AUTO_TURN_RATE);
      if (a.faceTo && Math.abs(diff) < 0.02) a.faceTo = null;
    }
    // المشي المستمر يقف إن علق اللاعب (جدار، أو اتجاه بلا مسار)
    if (m.autoWalk && player.enabled) {
      a.stuck = player.speed < 0.3 ? a.stuck + dt : 0;
      if (a.stuck > 1.2) m.setAutoWalk(false);
    }
    return { fwd, dir };
  }

  // ——— بعد تحديث اللوحات: النظر أو الذراع على الأزرار، وتعتيم الأطراف ———
  const o = new Vector3();
  const d = new Vector3();
  const q = new Quaternion();
  m.afterFrame = (dt) => {
    if (m.mode === "cardboard" && player.enabled) {
      camera.getWorldPosition(o);
      camera.getWorldDirection(d);
      const hit = panels.hitRay(o, d);
      const id = hit ? hit.id : null;
      const g = m.gaze;
      // بعد الاختيار يجب أن يبتعد النظر عن الزر ثم يعود، حتى لو تغيّر عنوانه (منسك جديد):
      // وإلا ضغط من يُبقي نظره على الزر المنسكَ التالي دون قصد بعد ثانية
      if (id !== g.id) (g.id = id), (g.t = 0), (g.consumed = false);
      else if (id && !g.consumed) {
        g.t += dt;
        if (g.t >= DWELL_SECONDS) panels.press(id), (g.consumed = true);
      }
      const progress = id && !g.consumed ? Math.min(1, g.t / DWELL_SECONDS) : 0;
      panels.setHover(id, progress);
      reticle.set(true, hit ? hit.distance : 2, progress, !!id);
    } else reticle.set(false);

    if (m.mode === "xr") {
      const c = player.controllers.find((c) => c.userData.handedness === "right") || player.controllers[1];
      if (c && c.parent) {
        if (ray.parent !== c) c.add(ray);
        c.getWorldPosition(o);
        d.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(q));
        const hit = panels.hitRay(o, d);
        m.rayHover = hit ? hit.id : null;
        panels.setHover(m.rayHover);
        ray.visible = !!hit;
        if (hit) ray.scale.set(1, 1, hit.distance);
      }
    } else m.rayHover = null;

    const turning = performance.now() - player.turnedAt < 250 ? 0.85 : 0;
    const walking = player.moving ? Math.min(1, player.speed / 2.4) * 0.75 : 0;
    vignette.update(dt, Math.max(turning, walking));
  };

  // ——— الرسم ———
  const size = new Vector2();
  m.render = () => {
    if (m.mode !== "cardboard" || renderer.xr.isPresenting) return renderer.render(scene, camera);
    renderer.getSize(size);
    const w = size.x;
    const h = size.y;
    scene.updateMatrixWorld();
    renderer.setScissorTest(true);
    eyes.forEach((eye, i) => {
      eye.aspect = w / 2 / h;
      eye.updateProjectionMatrix();
      const x = i === 0 ? 0 : w / 2;
      renderer.setViewport(x, 0, w / 2, h);
      renderer.setScissor(x, 0, w / 2, h);
      renderer.render(scene, eye);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
  };
  m.resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    panels.markDirty();
  };

  // ——— الدخول إلى الأوضاع ———
  // يُستدعى من ضغطة «ابدأ» لأن المتصفح يشترط ضغطة المستخدم لإذن المستشعر وملء الشاشة وجلسة النظارة
  m.enter = async (mode) => {
    if (mode === "xr") return m.enterXR();
    if (useSensor(mode)) sensor.start();
    if (mode === "cardboard") {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {}
      try {
        await screen.orientation?.lock?.("landscape");
      } catch {}
      try {
        m.wakeLock = await navigator.wakeLock?.request("screen");
      } catch {}
    }
    m.set(mode);
    return true;
  };
  m.exitCardboard = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch {}
    try {
      m.wakeLock && m.wakeLock.release();
    } catch {}
    m.set("mobile");
  };
  m.xrSupported = async () => {
    if (!navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported("immersive-vr");
    } catch {
      return false;
    }
  };
  m.enterXR = async () => {
    try {
      const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
      await renderer.xr.setSession(session);
      return true;
    } catch {
      hud.toast("تعذّر فتح وضع النظارة على هذا الجهاز.", "warn", 4);
      return false;
    }
  };
  return m;
}
