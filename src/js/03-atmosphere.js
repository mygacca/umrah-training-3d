// أوقات المشهد والظلال المخبوزة (الطبقة 1 من docs/realism-plan.md).
// لا أضواء ولا ظلال في وقت التشغيل: الظل يُرسم مرة على canvas من اتجاه الشمس ويُوضع على أرض المطاف،
// ويُعاد رسمه حين يتغير الوقت أو مستوى الجودة. الاتجاهات: +X شرق (ركن الحجر الأسود والمسعى)، و-Z شمال.

// اتجاه نحو الشمس من السمت (من الشمال باتجاه الشرق) والارتفاع، بالدرجات
function sunDirection(azimuthDeg, elevationDeg) {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

var TIMES_OF_DAY = {
  // ضحى: الشمس من الشرق الجنوبي الشرقي
  duha: {
    name: "الضحى",
    sun: sunDirection(105, 40),
    sunColor: "#fff2da",
    sunIntensity: 2.6,
    hemi: ["#dcecff", "#d9c7a4", 1.0],
    sky: { top: "#5d95d0", horizon: "#e9dcc2", bottom: "#cdbd9c", sunCol: "#fff3d6" },
    fog: ["#ece3d0", 150, 780],
    exposure: 1,
    env: 0.55,
    shadow: 0.34,
    night: false,
  },
  // العصر: الإضاءة الأصلية للمشهد (نفس bd في 03-world.js، وهذا الملف يُنفَّذ قبله): من الغرب الجنوبي الغربي بارتفاع 36°
  asr: {
    name: "العصر",
    sun: new Vector3(-0.62, 0.52, 0.34).normalize(),
    sunColor: "#ffe6be",
    sunIntensity: 2.5,
    hemi: ["#dcecff", "#d9c7a4", 1.05],
    sky: { top: "#5b8fc8", horizon: "#f2dcb6", bottom: "#cdbd9c", sunCol: "#fff0cf" },
    fog: ["#eedfc4", 150, 780],
    exposure: 1,
    env: 0.55,
    shadow: 0.34,
    night: false,
  },
  // الليل: الحرم مضاء. «الشمس» هنا كشّافات عالية، ولا ظلال شمس؛ أضواء الأروقة مواد مضيئة وبقع ضوء مخبوزة
  night: {
    name: "الليل",
    sun: new Vector3(0.25, 0.92, 0.3).normalize(),
    sunColor: "#fff3df",
    sunIntensity: 1.4,
    hemi: ["#8a9ccb", "#6a5a44", 0.8],
    sky: { top: "#040a18", horizon: "#22283a", bottom: "#191b20", sunCol: "#000000" },
    fog: ["#151a24", 110, 640],
    exposure: 1.05,
    env: 0.32,
    shadow: 0,
    night: true,
  },
};
var DEFAULT_TIME = "asr";
var GROUND_R = pe.outer + 0.5; // نصف قطر أرض المطاف المغطّاة بنسيج الظل

// ——— خبز الظلال على canvas ———
// من (x, z) في العالم إلى بكسل في canvas مربعة تغطي [-GROUND_R, GROUND_R]
function groundPx(res) {
  const k = res / (2 * GROUND_R);
  return { k, x: (x) => (x + GROUND_R) * k, y: (z) => (z + GROUND_R) * k };
}
// إسقاط نقطة على الأرض بعيدًا عن الشمس
function projectToGround(x, y, z, sun) {
  const t = y / sun.y;
  return [x - sun.x * t, z - sun.z * t];
}
function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}
// نقاط جدار الحِجر في العالم (على خط منتصفه)
function hijrWallPoints(n = 36) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = je.t0 + ((Math.PI - 2 * je.t0) * i) / n;
    pts.push(Qe(Math.cos(t) * je.a, -Yt.lz / 2 - Math.sin(t) * je.b));
  }
  return pts;
}
function arcadeColumns() {
  const cols = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * le;
    cols.push([Math.sin(a) * (pe.arcIn - 0.45), Math.cos(a) * (pe.arcIn - 0.45)]);
    cols.push([Math.sin(a) * (pe.arcOut + 0.45), Math.cos(a) * (pe.arcOut + 0.45)]);
  }
  return cols;
}
// كل canvas الخبز على المعالج: تُرسم مرة وتُرفع نسيجًا، ولا تُقرأ من الرسوميات (قراءتها بطيئة جدًا)
function bakeCanvas(res) {
  const c = document.createElement("canvas");
  c.width = c.height = res;
  c.getContext("2d", { willReadFrequently: true });
  return c;
}
// يطمس قناعًا (ألفا فقط) ويضعه على الهدف بقوة معيّنة. shadowBlur مدعوم في كل المتصفحات، بخلاف ctx.filter
function compositeBlurred(target, mask, blurPx, alpha) {
  const ctx = target.getContext("2d");
  const res = target.width;
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${alpha})`;
  ctx.shadowBlur = blurPx;
  ctx.shadowOffsetX = res;
  ctx.drawImage(mask, -res, 0); // الصورة نفسها خارج اللوحة، وظلها المطموس داخلها
  ctx.restore();
}

function bakeGroundShadows(canvas, res, time) {
  canvas.width = canvas.height = res;
  const out = canvas.getContext("2d");
  out.clearRect(0, 0, res, res);
  const G = groundPx(res);
  const mk = () => {
    const c = bakeCanvas(res);
    const ctx = c.getContext("2d");
    ctx.fillStyle = ctx.strokeStyle = "#000";
    ctx.lineCap = ctx.lineJoin = "round";
    return [c, ctx];
  };
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach(([x, z], i) => (i ? ctx.lineTo(G.x(x), G.y(z)) : ctx.moveTo(G.x(x), G.y(z))));
    ctx.closePath();
    ctx.fill();
  };
  // يضيف دائرة إلى المسار الحالي (لا يبدأ مسارًا جديدًا)
  const circle = (ctx, x, z, r) => {
    ctx.moveTo(G.x(x) + r * G.k, G.y(z));
    ctx.arc(G.x(x), G.y(z), r * G.k, 0, le);
  };
  const kaaba = ["black", "iraqi", "shami", "yamani"].map((c) => Ln[c]);
  const hijr = hijrWallPoints();
  const cols = arcadeColumns();
  const sun = time.sun;

  // 1) ظلال الشمس: قناع صلب، وقناع «مثقّب» لجداري الأروقة ذوي الأقواس
  if (time.shadow > 0 && sun.y > 0.05) {
    const [solid, s] = mk();
    const [porous, p] = mk();
    // الكعبة: غلاف قاعدتها وسطحها المسقط
    poly(s, convexHull([...kaaba, ...kaaba.map(([x, z]) => projectToGround(x, Yt.h, z, sun))]));
    // جدار الحِجر: شريط بين قاعدته وأعلاه المسقط
    for (let i = 0; i < hijr.length - 1; i++) {
      const [a, b] = [hijr[i], hijr[i + 1]];
      poly(s, [a, b, projectToGround(b[0], je.h, b[1], sun), projectToGround(a[0], je.h, a[1], sun)]);
    }
    // المقام والأعمدة: خط عريض مستدير الطرفين من القاعدة إلى الأعلى المسقط
    const capsule = (ctx, x, z, h, r) => {
      const [tx, tz] = projectToGround(x, h, z, sun);
      ctx.lineWidth = 2 * r * G.k;
      ctx.beginPath();
      ctx.moveTo(G.x(x), G.y(z));
      ctx.lineTo(G.x(tx), G.y(tz));
      ctx.stroke();
    };
    capsule(s, Sn[0], Sn[1], 3, 0.85);
    for (const [x, z] of cols) capsule(s, x, z, 6.3, 0.42);
    // سقف الأروقة: حلقة على ارتفاع 9 م، مسقطة
    const [ox, oz] = projectToGround(0, 9, 0, sun);
    s.beginPath();
    circle(s, ox, oz, pe.arcOut + 0.3);
    circle(s, ox, oz, pe.arcIn - 0.3);
    s.fill("evenodd");
    // السور الخارجي (34 م): مضاء ما كان داخل دائرة مزاحة بعيدًا عن الشمس، ومظلل ما سواه
    const [wx, wz] = projectToGround(0, 34, 0, sun); // مركز «الدائرة المضاءة» = -D
    s.beginPath();
    s.rect(0, 0, res, res);
    circle(s, wx, wz, pe.outer);
    s.fill("evenodd");
    // جدارا الأروقة (9 م) بأقواسهما: مسح من القاعدة إلى الأعلى المسقط
    // خطوات متقاربة يتداخل عرضها، فيصير المسح شريطًا متصلًا
    const reach = Math.hypot(...projectToGround(0, 9, 0, sun));
    const steps = Math.max(4, Math.ceil(reach / 0.4));
    p.lineWidth = (reach / steps) * 1.6 * G.k + 1;
    for (const r of [pe.arcIn, pe.arcOut]) {
      for (let k = 0; k <= steps; k++) {
        const [cx, cz] = projectToGround(0, (9 * k) / steps, 0, sun);
        p.beginPath();
        circle(p, cx, cz, r);
        p.stroke();
      }
    }
    compositeBlurred(canvas, porous, 0.5 * G.k, time.shadow * 0.55);
    compositeBlurred(canvas, solid, 0.35 * G.k, time.shadow);
  }

  // 2) الإطباق المحيطي: عتمة ناعمة عند قواعد الكعبة والحِجر والمقام والأعمدة والجدران
  {
    const [ao, a] = mk();
    a.lineWidth = 1.3 * G.k;
    a.beginPath();
    kaaba.forEach(([x, z], i) => (i ? a.lineTo(G.x(x), G.y(z)) : a.moveTo(G.x(x), G.y(z))));
    a.closePath();
    a.stroke();
    a.lineWidth = 1.7 * G.k;
    a.beginPath();
    hijr.forEach(([x, z], i) => (i ? a.lineTo(G.x(x), G.y(z)) : a.moveTo(G.x(x), G.y(z))));
    a.stroke();
    a.beginPath();
    circle(a, Sn[0], Sn[1], 1.15);
    for (const [x, z] of cols) circle(a, x, z, 0.72);
    a.fill();
    a.lineWidth = 1.1 * G.k;
    a.beginPath();
    for (const r of [pe.arcIn, pe.arcOut]) circle(a, 0, 0, r);
    a.stroke();
    a.lineWidth = 2 * G.k;
    a.beginPath();
    circle(a, 0, 0, pe.outer);
    a.stroke();
    compositeBlurred(canvas, ao, 0.7 * G.k, time.night ? 0.42 : 0.3);
  }
  // لا ظل خارج أرض المطاف (السور عند pe.outer)
  out.save();
  out.globalCompositeOperation = "destination-in";
  out.beginPath();
  out.arc(G.x(0), G.y(0), (pe.outer + 0.4) * G.k, 0, le);
  out.fill();
  out.restore();
}

// بقع ضوء الليل (تُجمع جمعًا فوق الأرض)
function bakeNightLight(canvas, res) {
  canvas.width = canvas.height = res;
  const ctx = canvas.getContext("2d");
  const G = groundPx(res);
  ctx.clearRect(0, 0, res, res);
  const glow = (x, z, r, rgb, a) => {
    const g = ctx.createRadialGradient(G.x(x), G.y(z), 0, G.x(x), G.y(z), r * G.k);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(G.x(x) - r * G.k, G.y(z) - r * G.k, 2 * r * G.k, 2 * r * G.k);
  };
  glow(0, 0, 46, "255,238,205", 0.16); // كشّافات المطاف
  const mid = (pe.arcIn + pe.arcOut) / 2;
  for (let i = 0; i < 60; i++) {
    const a = ((i + 0.5) / 60) * le;
    glow(Math.sin(a) * mid, Math.cos(a) * mid, 3.4, "255,206,140", 0.32); // ثريات الأروقة
    glow(Math.sin(a) * (pe.arcIn - 1.2), Math.cos(a) * (pe.arcIn - 1.2), 2.2, "255,214,160", 0.18);
  }
}

function createAtmosphere({ scene, renderer, world }) {
  const atm = { time: DEFAULT_TIME, res: 1024, onChange: null };

  const plane = (renderOrder, material) => {
    const m = new Mesh(new PlaneGeometry(2 * GROUND_R, 2 * GROUND_R), material);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = renderOrder;
    scene.add(m);
    return m;
  };
  // الظل المخبوز فوق أرض المطاف (يحل محل العتمة الدائرية القديمة تحت الكعبة)
  const shadowCanvas = bakeCanvas(2);
  const shadowTex = new CanvasTexture(shadowCanvas);
  shadowTex.colorSpace = SRGBColorSpace;
  const shadow = plane(
    1,
    new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  shadow.position.y = 0.02;
  if (world.kaabaShade) world.kaabaShade.visible = false;
  // ضوء الليل: يُجمع فوق الأرض
  const lightCanvas = bakeCanvas(2);
  const lightTex = new CanvasTexture(lightCanvas);
  lightTex.colorSpace = SRGBColorSpace;
  const light = plane(
    2,
    new MeshBasicMaterial({ map: lightTex, transparent: true, depthWrite: false, blending: Is, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  );
  light.position.y = 0.022;
  light.visible = false;

  // عامل الظل عند نقطة على أرض المطاف، تقرؤه الحشود (03-crowds.js) لتعتيم الحاجّ الواقف في الظل.
  // في الظل الكامل يغيب ضوء الشمس (نحو 60% من إضاءة الحاجّ هنا) ويبقى ضوء السماء
  atm.shadeAt = (x, z) => {
    if (!shade) return 1;
    const u = Math.floor(((x + GROUND_R) / (2 * GROUND_R)) * SHADE_RES);
    const v = Math.floor(((z + GROUND_R) / (2 * GROUND_R)) * SHADE_RES);
    if (u < 0 || v < 0 || u >= SHADE_RES || v >= SHADE_RES) return 1;
    return Math.max(0.35, 1 - 0.6 * (shade[v * SHADE_RES + u] / shadeFull));
  };
  world.crowds.shadeAt = atm.shadeAt;

  // ثريات الأروقة في الليل: كرات مضيئة (مادة لا تتأثر بالضوء)
  const lamps = new kn(new SphereGeometry(0.2, 8, 6), new MeshBasicMaterial({ color: "#ffe6ad" }), 120);
  {
    const m = new Matrix4();
    const mid = (pe.arcIn + pe.arcOut) / 2;
    for (let i = 0; i < 60; i++) {
      const a = ((i + 0.5) / 60) * le;
      lamps.setMatrixAt(i, m.makeTranslation(Math.sin(a) * mid, 8.3, Math.cos(a) * mid));
      lamps.setMatrixAt(60 + i, m.makeTranslation(Math.sin(a) * (pe.arcIn - 0.15), 6.9, Math.cos(a) * (pe.arcIn - 0.15)));
    }
  }
  lamps.visible = false;
  scene.add(lamps);

  const regenerateEnvironment = () => {
    const gen = new Fs(renderer);
    const old = scene.environment;
    scene.environment = gen.fromScene(world.envScene, 0.04).texture;
    gen.dispose();
    if (old) old.dispose();
  };
  const setSky = (u, T) => {
    u.top.value.set(T.sky.top);
    u.horizon.value.set(T.sky.horizon);
    u.bottom.value.set(T.sky.bottom);
    u.sunCol.value.set(T.sky.sunCol);
    u.sunDir.value.copy(T.sun);
  };
  // نسخة صغيرة من الظل يقرؤها المعالج: الحاجّ الواقف في الظل يُعتَّم لونه، فلا يبدو كأن الشمس عليه
  const SHADE_RES = 192;
  const shadeCanvas = bakeCanvas(SHADE_RES);
  let shade = null; // ألفا الظل 0..1 لكل خلية، أو null في الليل
  let shadeFull = 1; // ألفا الظل الكامل في الوقت الحالي
  const bake = () => {
    const T = TIMES_OF_DAY[atm.time];
    bakeGroundShadows(shadowCanvas, atm.res, T);
    if (T.shadow > 0) {
      // تُرسم الأشكال نفسها بدقة صغيرة، لا تصغير النسيج الكبير (قراءته من الرسوميات بطيئة)
      bakeGroundShadows(shadeCanvas, SHADE_RES, T);
      const c = shadeCanvas.getContext("2d", { willReadFrequently: true });
      const px = c.getImageData(0, 0, SHADE_RES, SHADE_RES).data;
      shade = new Float32Array(SHADE_RES * SHADE_RES);
      for (let i = 0; i < shade.length; i++) shade[i] = px[i * 4 + 3] / 255;
      shadeFull = T.shadow;
    } else shade = null;
    shadowTex.dispose(); // الحجم قد يتغير مع مستوى الجودة
    shadowTex.needsUpdate = true;
    if (T.night) {
      bakeNightLight(lightCanvas, Math.min(1024, atm.res));
      lightTex.dispose();
      lightTex.needsUpdate = true;
    }
    light.visible = T.night;
  };

  atm.setTime = (name) => {
    if (!TIMES_OF_DAY[name]) name = DEFAULT_TIME;
    const T = TIMES_OF_DAY[name];
    atm.time = name;
    setSky(world.sky.material.uniforms, T);
    world.envScene.traverse((o) => o.material && o.material.uniforms && setSky(o.material.uniforms, T));
    world.sun.color.set(T.sunColor);
    world.sun.intensity = T.sunIntensity;
    world.sun.position.copy(T.sun).multiplyScalar(120);
    world.hemi.color.set(T.hemi[0]);
    world.hemi.groundColor.set(T.hemi[1]);
    world.hemi.intensity = T.hemi[2];
    scene.fog.color.set(T.fog[0]);
    scene.fog.near = T.fog[1];
    scene.fog.far = T.fog[2];
    renderer.toneMappingExposure = T.exposure;
    scene.environmentIntensity = T.env;
    lamps.visible = T.night;
    for (const [mat, color, k] of [
      [world.minaretMat, "#ffd8a0", 0.32],
      [world.arcadeMat, "#ffcf8c", 0.22],
    ]) {
      mat.emissive.set(T.night ? color : "#000000");
      mat.emissiveIntensity = T.night ? k : 1;
    }
    // البطاقات البعيدة بلا إضاءة حقيقية: سطوعها بحسب الوقت. وبقع الظل أخف ليلًا
    world.crowds.setLight({ impostor: T.night ? 0.62 : 0.95, blob: T.night ? 0.6 : 1 });
    regenerateEnvironment();
    bake();
    try {
      localStorage.setItem("umrah.time", name);
    } catch {}
    if (atm.onChange) atm.onChange(name);
  };
  atm.setResolution = (res) => {
    if (res === atm.res) return;
    atm.res = res;
    bake();
  };
  atm.shadowCanvas = shadowCanvas;
  atm.lamps = lamps;
  return atm;
}
