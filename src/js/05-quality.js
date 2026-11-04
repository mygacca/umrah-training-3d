// مستويات الجودة (الطبقة 0 من docs/realism-plan.md).
// المستوى يُختار تلقائيًا بحسب الوضع، ويُغيَّر من القائمة. ونسبة البكسل تتكيّف مع سرعة الإطارات:
// تنخفض إن بقيت الإطارات بطيئة ثانيتين، وترتفع ببطء إن عادت سريعة. وفي النظارة يزيد التنقيط المركزي بدلها.
var QUALITY_TIERS = {
  low: { name: "منخفضة", maxPixelRatio: 1, minPixelRatio: 0.6, crowd: 0.55, crowdNear: 16, shadowRes: 768 },
  medium: { name: "متوسطة", maxPixelRatio: 1.3, minPixelRatio: 0.75, crowd: 0.8, crowdNear: 22, shadowRes: 1024 },
  high: { name: "عالية", maxPixelRatio: 1.6, minPixelRatio: 0.9, crowd: 1, crowdNear: 28, shadowRes: 1024 },
  // النظارة ترسم عينين بدقة عالية: حشود أقل، ونسبة البكسل لا تُستعمل (دقة الإطار من النظارة)
  xr: { name: "النظارة", framebufferScale: 1, foveation: 0.5, crowd: 0.7, crowdNear: 18, shadowRes: 1024 },
};
// دقة نسيج الظل: 1024 تعني نحو 11 سم لكل بكسل على المطاف، وتكفي لظل ناعم. 2048 أبطأ خبزًا بكثير وأربعة أضعاف الذاكرة
var QUALITY_TARGET_FPS = { flat: 55, xr: 68 }; // أقل قليلًا من 60 و72 حتى لا يتذبذب التكيّف

function autoQualityTier(mode) {
  if (mode === "xr") return "xr";
  if (mode === "mobile" || mode === "cardboard") return "low";
  return Math.min(innerWidth, innerHeight) < 500 ? "low" : "high";
}

function createQuality({ renderer, world }) {
  const q = {
    choice: "auto", // "auto" أو اسم مستوى
    tier: "high",
    pixelRatio: 1,
    foveation: 0,
    fps: 60,
    onTier: null, // يُستدعى حين يتغير المستوى (لإعادة خبز الظلال بدقة المستوى)
  };
  const t = () => QUALITY_TIERS[q.tier];

  q.apply = (mode) => {
    const tier = mode === "xr" ? "xr" : q.choice === "auto" ? autoQualityTier(mode) : q.choice;
    const changed = tier !== q.tier;
    q.tier = tier;
    const T = t();
    if (tier === "xr") {
      if (!renderer.xr.isPresenting) renderer.xr.setFramebufferScaleFactor(T.framebufferScale);
      q.foveation = T.foveation;
      renderer.xr.setFoveation(q.foveation);
    } else {
      q.pixelRatio = Math.min(devicePixelRatio || 1, T.maxPixelRatio);
      renderer.setPixelRatio(q.pixelRatio);
    }
    world.setCrowdFraction(T.crowd);
    world.crowds.setNear(T.crowdNear); // أبعد من هذا: بطاقة مسطحة بدل الهيئة الكاملة
    slow = fast = 0;
    if (changed && q.onTier) q.onTier(T);
  };
  q.setChoice = (choice, mode) => {
    q.choice = choice;
    try {
      localStorage.setItem("umrah.quality", choice);
    } catch {}
    q.apply(mode);
  };
  try {
    const saved = localStorage.getItem("umrah.quality");
    if (saved && (saved === "auto" || QUALITY_TIERS[saved])) q.choice = saved;
  } catch {}

  // قياس الإطارات في نوافذ من ثانية واحدة
  let acc = 0;
  let frames = 0;
  let slow = 0; // نوافذ بطيئة متتالية
  let fast = 0; // نوافذ سريعة متتالية
  q.frame = (realDt) => {
    acc += realDt;
    frames++;
    if (acc < 1) return;
    q.fps = frames / acc;
    acc = 0;
    frames = 0;
    const xr = q.tier === "xr";
    const target = xr ? QUALITY_TARGET_FPS.xr : QUALITY_TARGET_FPS.flat;
    if (q.fps < target - 8) (slow++, (fast = 0));
    else if (q.fps >= target) (fast++, (slow = 0));
    else slow = fast = 0;
    const T = t();
    if (slow >= 2) {
      slow = 0;
      if (xr) {
        if (q.foveation < 1) (q.foveation = Math.min(1, q.foveation + 0.25)), renderer.xr.setFoveation(q.foveation);
      } else if (q.pixelRatio > T.minPixelRatio + 1e-3) {
        q.pixelRatio = Math.max(T.minPixelRatio, q.pixelRatio - 0.15);
        renderer.setPixelRatio(q.pixelRatio);
      }
    } else if (fast >= 5) {
      fast = 0;
      const cap = Math.min(devicePixelRatio || 1, T.maxPixelRatio || 1);
      if (!xr && q.pixelRatio < cap - 1e-3) {
        q.pixelRatio = Math.min(cap, q.pixelRatio + 0.1);
        renderer.setPixelRatio(q.pixelRatio);
      }
    }
  };

  // للاختبار: أوامر الرسم والمثلثات لصورة واحدة من الكاميرا الرئيسية (عين واحدة)
  q.measure = (scene, camera) => {
    renderer.render(scene, camera);
    const r = renderer.info.render;
    return { calls: r.calls, triangles: r.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries };
  };
  return q;
}
