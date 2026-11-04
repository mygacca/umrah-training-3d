// الحشود الحيّة (الطبقة 2 من docs/realism-plan.md). دوال فقط، ويستدعيها Ed() في 03-world.js.
//
// - هيئتان منخفضتا المضلعات لكل مكان: رجل بالإحرام، وامرأة بعباءة وخمار. والأطفال الهيئتان نفساهما مصغّرتين.
//   رجال المطاف مضطبعون (الكتف الأيمن مكشوف)، ورجال المسعى مغطّو الكتفين: الاضطباع في الطواف وحده.
// - المشي في shader الرؤوس: الساقان والذراعان وطرف العباءة تتأرجح بطور مختلف لكل حاجّ. لا هيكل عظمي.
// - عند خط الحجر الأسود يتباطأ الحاجّ ويلتفت إلى الكعبة ويرفع يده اليمنى بالإشارة.
// - في المسعى يُسرع الرجال وحدهم بين العلمين الأخضرين.
// - ما بعد CROWD_NEAR يُرسم بطاقة مسطحة تواجه الكاميرا (impostor) بدل الهيئة الكاملة.
//
// اتجاهات الهيئة المحلية: الأمام -Z، واليمين +X، والقدمان عند y = 0.
var CROWD_SIZE = { mataf: 380, masa: 140 };
var CROWD_NEAR = 26; // متر: أبعد منه بطاقة مسطحة (تغيّره مستويات الجودة)
var KIND = { man: 0, woman: 1 };
var PART = { body: 0, legL: 1, legR: 2, armL: 3, armR: 4, hem: 5 };
var SKIN = [0.8, 0.62, 0.48];
var HAIR = [0.16, 0.13, 0.11];

// يضيف إلى هندسة جاهزة ما تحتاجه الهيئة: لون الرأس، ورقم الجزء، وهل يُصبغ بلون الثوب
function crowdPart(geo, { color = [1, 1, 1], part = PART.body, tint = 1, at = [0, 0, 0], scale = null }) {
  geo.deleteAttribute("uv");
  if (scale) geo.scale(...scale);
  geo.translate(...at);
  const n = geo.attributes.position.count;
  const c = new Float32Array(n * 3);
  const p = new Float32Array(n).fill(part);
  const t = new Float32Array(n).fill(tint);
  for (let i = 0; i < n; i++) c.set(color, i * 3);
  geo.setAttribute("color", new Ue(c, 3));
  geo.setAttribute("aPart", new Ue(p, 1));
  geo.setAttribute("aTint", new Ue(t, 1));
  return geo;
}
// رجل بالإحرام: إزار من الخصر إلى ما تحت الركبة، ورداء. idtiba: الكتف والذراع اليمنيان مكشوفان
function manGeometry(idtiba) {
  const g = [];
  for (const [x, part] of [[-0.085, PART.legL], [0.085, PART.legR]])
    g.push(crowdPart(new Re(0.05, 0.055, 0.44, 5, 1, true), { color: SKIN, tint: 0, part, at: [x, 0.22, 0] }));
  g.push(crowdPart(new Re(0.185, 0.22, 0.64, 10, 1, true), { at: [0, 0.74, 0] })); // الإزار
  g.push(crowdPart(new Re(0.165, 0.185, 0.42, 10, 1, true), { at: [0, 1.25, 0] })); // الرداء على الجذع
  // الكتفان والذراعان: الأيسر تحت الرداء دائمًا
  g.push(crowdPart(new fn(0.085, 6, 4), { at: [-0.17, 1.42, 0], scale: [1, 0.8, 1] }));
  g.push(crowdPart(new Re(0.05, 0.045, 0.52, 6, 1, true), { part: PART.armL, at: [-0.215, 1.17, 0] }));
  const bare = idtiba ? { color: SKIN, tint: 0 } : {};
  g.push(crowdPart(new fn(0.08, 6, 4), { ...bare, at: [0.17, 1.42, 0], scale: [1, 0.8, 1] }));
  g.push(crowdPart(new Re(0.047, 0.042, 0.52, 6, 1, true), { ...bare, part: PART.armR, at: [0.215, 1.17, 0] }));
  g.push(crowdPart(new fn(0.105, 7, 5), { color: SKIN, tint: 0, at: [0, 1.57, 0] })); // الرأس مكشوف في الإحرام
  g.push(crowdPart(new fn(0.109, 7, 3, 0, le, 0, Math.PI / 2.3), { color: HAIR, tint: 0, at: [0, 1.575, 0.01] }));
  return Bs(g);
}
// امرأة بعباءة وخمار: العباءة تصبغ بلون الثوب، والوجه وحده بلون البشرة
function womanGeometry() {
  const g = [];
  g.push(crowdPart(new Re(0.16, 0.27, 1.4, 10, 1, true), { part: PART.hem, at: [0, 0.7, 0] })); // العباءة
  g.push(crowdPart(new fn(0.165, 7, 4, 0, le, 0, Math.PI / 2), { at: [0, 1.38, 0], scale: [1, 0.55, 1] })); // الكتفان
  for (const [x, part] of [[-0.19, PART.armL], [0.19, PART.armR]])
    g.push(crowdPart(new Re(0.05, 0.055, 0.54, 6, 1, true), { part, at: [x, 1.12, 0] }));
  g.push(crowdPart(new Bi(0.21, 0.3, 9, 1, true), { at: [0, 1.47, 0] })); // الخمار على الكتفين
  g.push(crowdPart(new fn(0.115, 7, 5), { at: [0, 1.535, 0] })); // الخمار على الرأس
  g.push(crowdPart(new fn(0.07, 6, 4), { color: SKIN, tint: 0, at: [0, 1.53, -0.075], scale: [1, 1.15, 0.5] })); // الوجه
  return Bs(g);
}

// مادة الهيئات: MeshStandardMaterial مع حركة المشي في shader الرؤوس.
// iAnim لكل حاجّ: (الطور، شدّة المشي، عامل الظل، رفع اليد للإشارة)
function crowdMaterial() {
  const m = new Rn({ vertexColors: true, roughness: 0.92 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aPart; attribute float aTint; attribute vec4 iAnim;
        void swingX(inout vec3 p, inout vec3 n, float a, float pivot) {
          float c = cos(a), s = sin(a);
          p.y -= pivot;
          p = vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
          n = vec3(n.x, n.y * c - n.z * s, n.y * s + n.z * c);
          p.y += pivot;
        }`,
      )
      .replace(
        "vec3 objectNormal = vec3( normal );",
        `vec3 objectNormal = vec3( normal );
        vec3 animPos = position;
        {
          float ph = iAnim.x, amp = iAnim.y, raise = iAnim.w;
          if (aPart > 0.5 && aPart < 2.5) swingX(animPos, objectNormal, amp * 0.42 * sin(ph + (aPart > 1.5 ? 3.14159 : 0.0)), 0.95);
          else if (aPart > 2.5 && aPart < 4.5) {
            float a = amp * 0.38 * sin(ph + (aPart > 3.5 ? 0.0 : 3.14159));
            if (aPart > 3.5) a = mix(a, 2.0, raise); // اليد اليمنى مرفوعة نحو الحجر الأسود
            swingX(animPos, objectNormal, a, 1.42);
          } else if (aPart > 4.5) {
            float k = clamp(1.0 - animPos.y / 1.4, 0.0, 1.0);
            animPos.z += amp * 0.06 * k * k * sin(ph);
          }
          animPos.x += amp * 0.012 * sin(ph);
        }`,
      )
      .replace("vec3 transformed = vec3( position );", "vec3 transformed = animPos;")
      .replace("vColor.rgb *= instanceColor.rgb;", "vColor.rgb *= mix( vec3( 1.0 ), instanceColor.rgb, aTint ) * iAnim.z;");
  };
  return m;
}

// بطاقات البعيدين: مستطيل يواجه الكاميرا حول المحور الرأسي، عليه صورة الهيئة مصبوغة بلون الثوب
function impostorAtlas() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const x = c.getContext("2d");
  const skin = "rgb(204,158,122)";
  // نصف لكل هيئة: الرجل يسارًا، والمرأة يمينًا. الارتفاع 128 بكسل = 1.65 م
  const Y = (m) => 128 - (m / 1.65) * 128;
  const X = (tile, m) => tile * 64 + 32 + (m / 0.5) * 64 * 0.5;
  // الرجل
  x.fillStyle = skin;
  x.fillRect(X(0, -0.14), Y(0.44), X(0, 0.14) - X(0, -0.14), Y(0) - Y(0.44));
  x.fillStyle = "#fff";
  x.beginPath();
  x.moveTo(X(0, -0.22), Y(0.42));
  x.lineTo(X(0, 0.22), Y(0.42));
  x.lineTo(X(0, 0.2), Y(1.46));
  x.lineTo(X(0, -0.2), Y(1.46));
  x.fill();
  x.fillRect(X(0, -0.26), Y(1.46), X(0, 0.26) - X(0, -0.26), Y(0.9) - Y(1.46));
  x.fillStyle = skin;
  x.beginPath();
  x.arc(X(0, 0), Y(1.57), (0.11 / 1.65) * 128, 0, le);
  x.fill();
  // المرأة
  x.fillStyle = "#fff";
  x.beginPath();
  x.moveTo(X(1, -0.28), Y(0.01));
  x.lineTo(X(1, 0.28), Y(0.01));
  x.lineTo(X(1, 0.19), Y(1.45));
  x.lineTo(X(1, -0.19), Y(1.45));
  x.fill();
  x.beginPath();
  x.arc(X(1, 0), Y(1.53), (0.125 / 1.65) * 128, 0, le);
  x.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
function impostorMaterial() {
  return new ShaderMaterial({
    uniforms: {
      map: { value: impostorAtlas() },
      uLight: { value: 0.95 },
      fogColor: { value: new Color() },
      fogNear: { value: 1 },
      fogFar: { value: 1000 },
    },
    fog: true,
    vertexShader: `
      attribute vec2 iImp; // (رقم الهيئة، عامل الظل)
      varying vec2 vUv; varying vec3 vCol;
      #include <fog_pars_vertex>
      void main() {
        vec3 center = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float sy = length(instanceMatrix[1].xyz);
        vec3 t = cameraPosition - center; t.y = 0.0; t = normalize(t + vec3(1e-5, 0.0, 0.0));
        vec3 right = vec3(t.z, 0.0, -t.x);
        vec4 mvPosition = viewMatrix * vec4(center + right * position.x * sy + vec3(0.0, position.y * sy, 0.0), 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vUv = vec2((uv.x + iImp.x) * 0.5, uv.y);
        vCol = instanceColor * iImp.y;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uLight;
      varying vec2 vUv; varying vec3 vCol;
      #include <fog_pars_fragment>
      void main() {
        vec4 c = texture2D(map, vUv);
        if (c.a < 0.5) discard;
        gl_FragColor = vec4(c.rgb * vCol * uLight, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

function createCrowds(scene) {
  const rnd = Xr(5);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const ihram = ["#f4f3ee", "#f1efe7", "#ecebe3"];
  const abaya = ["#1e1e22", "#1e1e22", "#26262b", "#1e1e22", "#cfc3ab", "#a9b8c9", "#8a6d55", "#e4e0d4"];
  // حاجّ: المكان، والهيئة، واللون، والحجم (الأطفال أصغر)، وطور المشي، والسرعة، والموضع
  function makePilgrim(area) {
    const kind = rnd() < (area === "mataf" ? 0.58 : 0.55) ? KIND.man : KIND.woman;
    const child = rnd() < 0.09;
    const color = new Color(kind === KIND.man ? pick(ihram) : pick(abaya));
    return {
      area,
      kind,
      child,
      color,
      s: child ? 0.62 + rnd() * 0.12 : 0.93 + rnd() * 0.14,
      ph: rnd() * le,
      v: (area === "mataf" ? 0.85 : 0.9) + rnd() * 0.6,
      x: 0,
      z: 0,
      yaw: 0,
      speed: 0,
      raise: 0,
    };
  }
  const mataf = [];
  for (let i = 0; i < CROWD_SIZE.mataf; i++) {
    const p = makePilgrim("mataf");
    p.r0 = 9.2 + 30 * Math.pow(rnd(), 1.7); // أكثف قرب الكعبة
    p.th = rnd() * le;
    mataf.push(p);
  }
  const masa = [];
  for (let i = 0; i < CROWD_SIZE.masa; i++) {
    const p = makePilgrim("masa");
    p.dir = rnd() < 0.5 ? -1 : 1;
    p.lane = rnd() * 6.4;
    p.x = p.dir < 0 ? 67.4 + p.lane : 76.4 + p.lane;
    p.z = dt.walkM + 1 + rnd() * (dt.walkS - dt.walkM - 2);
    masa.push(p);
  }
  const inner = vd(720); // حدّ المطاف الداخلي لكل زاوية (الكعبة والحِجر)

  // ——— الشبكات: لكل مكان هيئتان، ولكل هيئة بقع ظل تشارك مصفوفاتها، وبطاقات للبعيدين ———
  const mat = crowdMaterial();
  const blobTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  })();
  const blobGeo = new PlaneGeometry(0.95, 0.95);
  blobGeo.rotateX(-Math.PI / 2);
  blobGeo.translate(0, 0.025, 0);
  const blobMat = new MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const geos = { mataf: [manGeometry(true), womanGeometry()], masa: [manGeometry(false), womanGeometry()] };
  const meshes = [];
  for (const area of ["mataf", "masa"]) {
    for (const kind of [KIND.man, KIND.woman]) {
      const cap = CROWD_SIZE[area];
      const mesh = new kn(geos[area][kind], mat, cap);
      mesh.instanceMatrix.setUsage(jo);
      mesh.instanceColor = new vs(new Float32Array(cap * 3), 3);
      mesh.instanceColor.setUsage(jo);
      const anim = new vs(new Float32Array(cap * 4), 4);
      anim.setUsage(jo);
      mesh.geometry.setAttribute("iAnim", anim);
      mesh.frustumCulled = false; // الحجاج يتبدّلون بين الشبكات كل إطار
      mesh.count = 0;
      const blob = new kn(blobGeo, blobMat, cap);
      blob.instanceMatrix = mesh.instanceMatrix; // بلا حساب إضافي
      blob.frustumCulled = false;
      blob.renderOrder = 3;
      blob.count = 0;
      scene.add(mesh, blob);
      meshes.push({ area, kind, mesh, blob, anim, n: 0 });
    }
  }
  const byKind = { mataf: [meshes[0], meshes[1]], masa: [meshes[2], meshes[3]] };
  const impCap = CROWD_SIZE.mataf + CROWD_SIZE.masa;
  const impGeo = new PlaneGeometry(0.5, 1.65);
  impGeo.translate(0, 0.825, 0);
  const impMat = impostorMaterial();
  const imp = new kn(impGeo, impMat, impCap);
  imp.instanceMatrix.setUsage(jo);
  imp.instanceColor = new vs(new Float32Array(impCap * 3), 3);
  imp.instanceColor.setUsage(jo);
  const impAttr = new vs(new Float32Array(impCap * 2), 2);
  impAttr.setUsage(jo);
  imp.geometry.setAttribute("iImp", impAttr);
  imp.frustumCulled = false;
  imp.count = 0;
  scene.add(imp);

  const c = {
    active: { mataf: CROWD_SIZE.mataf, masa: CROWD_SIZE.masa },
    near: CROWD_NEAR,
    visible: true,
    shadeAt: null, // (x, z) => عامل الظل، من 03-atmosphere.js
    meshes,
    impostors: imp,
    pilgrims: { mataf, masa },
    stats: { near: 0, far: 0 },
  };
  c.setFraction = (f) => {
    c.active.mataf = Math.round(CROWD_SIZE.mataf * f);
    c.active.masa = Math.round(CROWD_SIZE.masa * f);
  };
  c.setVisible = (v) => (c.visible = v);
  c.setNear = (d) => (c.near = d);
  c.setLight = ({ impostor, blob }) => {
    impMat.uniforms.uLight.value = impostor;
    blobMat.opacity = blob;
  };

  // ——— كل إطار: المشي، ثم توزيع الحجاج على الهيئات الكاملة أو البطاقات ———
  const m4 = new Matrix4();
  const q = new Quaternion();
  const pos = new Vector3();
  const scl = new Vector3();
  const up = new Vector3(0, 1, 0);
  const AVOID = 1.4; // يُبعَد الحاجّ عن اللاعب إن اقترب أقل من هذا (كما كان قبل هذه الطبقة)
  let time = 0;
  function stepMataf(p, delta) {
    const idx = Math.floor((((p.th % le) + le) % le) / le * 720) % 720;
    const r = Math.max(p.r0, inner[idx]);
    // عند خط الحجر الأسود: يتباطأ ويلتفت إلى الكعبة ويرفع يده اليمنى
    const d = Math.abs(ll(p.th - we));
    const target = d < 0.09 ? 1 - d / 0.09 : 0;
    p.raise += (target - p.raise) * Math.min(1, delta * 6);
    const v = p.v * (1 - 0.55 * p.raise);
    p.th += (v / r) * delta; // عكس عقارب الساعة: الكعبة عن اليسار
    p.x = Math.cos(p.th) * r;
    p.z = -Math.sin(p.th) * r;
    p.yaw = p.th + p.raise * 1.1; // يلتفت يسارًا نحو الكعبة
    p.speed = v;
  }
  // (اسم المعامل delta لا dt: dt ثوابت المسعى في 02-layout.js)
  function stepMasa(p, delta) {
    // الرجال وحدهم يُسرعون بين العلمين الأخضرين
    const green = p.z < dt.gA && p.z > dt.gB && p.kind === KIND.man && !p.child;
    const v = p.v * (green ? 1.6 : 1);
    p.z += p.dir * v * delta;
    if (p.z < dt.walkM + 0.8) (p.dir = 1), (p.x = 76.4 + p.lane);
    else if (p.z > dt.walkS - 0.8) (p.dir = -1), (p.x = 67.4 + p.lane);
    p.yaw = p.dir > 0 ? Math.PI : 0;
    p.speed = v;
    p.raise = 0;
  }
  c.update = (delta, player) => {
    time += delta;
    const px = player ? player.x : 1e6;
    const pz = player ? player.z : 1e6;
    for (const M of meshes) M.n = 0;
    let nImp = 0;
    let near = 0;
    const place = (p) => {
      // تفادي اللاعب
      let x = p.x;
      let z = p.z;
      const dx = x - px;
      const dz = z - pz;
      const d = Math.hypot(dx, dz);
      if (d < AVOID && d > 1e-3) (x += (dx / d) * (AVOID - d)), (z += (dz / d) * (AVOID - d));
      const amp = Math.min(1, p.speed / 1.2);
      p.ph += delta * (p.speed / 0.75) * Math.PI * (p.child ? 1.4 : 1);
      const bob = 0.03 * amp * Math.abs(Math.sin(p.ph));
      const shade = c.shadeAt ? c.shadeAt(x, z) : 1;
      q.setFromAxisAngle(up, p.yaw);
      pos.set(x, bob, z);
      scl.set(p.s, p.s, p.s);
      m4.compose(pos, q, scl);
      if (d < c.near) {
        const M = byKind[p.area][p.kind];
        const i = M.n++;
        M.mesh.setMatrixAt(i, m4);
        M.mesh.instanceColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
        M.anim.setXYZW(i, p.ph, amp, shade, p.raise);
        near++;
      } else {
        const i = nImp++;
        imp.setMatrixAt(i, m4);
        imp.instanceColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
        impAttr.setXY(i, p.kind, shade);
      }
    };
    if (c.visible) {
      for (let i = 0; i < c.active.mataf; i++) stepMataf(mataf[i], delta), place(mataf[i]);
      for (let i = 0; i < c.active.masa; i++) stepMasa(masa[i], delta), place(masa[i]);
    }
    for (const M of meshes) {
      M.mesh.count = M.blob.count = M.n;
      M.mesh.instanceMatrix.needsUpdate = M.mesh.instanceColor.needsUpdate = M.anim.needsUpdate = true;
    }
    imp.count = nImp;
    imp.instanceMatrix.needsUpdate = imp.instanceColor.needsUpdate = impAttr.needsUpdate = true;
    c.stats.near = near;
    c.stats.far = nImp;
  };
  return c;
}
