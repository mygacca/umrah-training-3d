// التشغيل: الرسّام والمشهد والكاميرا، وربط أزرار الصفحة، وحلقة الإطار. يجب أن يبقى آخر ملف.
var $id = (id) => document.getElementById(id);
// بعد إغلاق نافذة بالنقر يبقى التركيز على زرها المخفي لحظة، فتضيع أول ضغطة مسافة (المسافة على زر تخصّه)
var dropFocus = () => document.activeElement && document.activeElement !== document.body && document.activeElement.blur?.();
var isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
document.body.classList.add(isTouch ? "touch" : "mouse");
var reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

var renderer;
try {
  renderer = new nl({ canvas: $id("c"), antialias: true, powerPreference: "high-performance" });
} catch (e) {
  $id("fail").hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = Lr;
renderer.toneMappingExposure = 1;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");

var scene = new Di();
var camera = new PerspectiveCamera(68, innerWidth / innerHeight, 0.05, 2200);
var world = Ed(scene, renderer);
addLandmarkDetail(scene, world); // الطبقة 4: تفاصيل المعالم
var materials = upgradeMaterials(scene, world); // الطبقة 5: الأنسجة والمواد
var hud = createHud({ camera });
var panels = createPanels({ scene, camera, model: hud.model });
hud.onChange = () => panels.markDirty();
hud.onNewCard = () => (panels.collapsed = false);
var player = createPlayer({ scene, camera, renderer });
var game = Pd({ world, hud, player });
var input = {
  keyboard: createKeyboard(),
  pointer: createPointer($id("c")),
  joystick: createJoystick($id("joy"), $id("knob")),
  sensor: createOrientationSensor(),
  gamepad: createGamepadReader(),
};
var vignette = createComfortVignette(camera);
var reticle = createGazeReticle(camera);
var modes = createModes({ renderer, scene, camera, player, hud, panels, game, input, vignette, reticle, world });

// ——— الجودة وأوقات المشهد (الطبقتان 0 و1 من docs/realism-plan.md) ———
var quality = createQuality({ renderer, world });
var atmosphere = createAtmosphere({ scene, renderer, world });
// المسجد الحرام كله في مجموعة واحدة: تُخفى في مشاعر الحج (03-mashair.js)، مهما غيّر غيرها ظهور أجزائها
world.haramRoot = new Group();
world.haramRoot.name = "haram";
for (const o of [...scene.children]) if (!o.isLight && o !== world.sky && o.name !== "rig" && o.name !== "board") world.haramRoot.add(o);
scene.add(world.haramRoot);
var mashair = createMashair({ scene, world });
var hajj = createHajj({ game, hud, player, mashair, atmosphere });
// الحج يتولى الزر الذهبي وإطار المنطق في خطواته (game.stage === "hajj")، وما سواها لمنطق العمرة
{
  const act = game.act;
  const update = game.update;
  game.act = () => (game.stage === "hajj" ? hajj.act() : act());
  game.update = (dt) => (update(dt), hajj.update(dt));
}
quality.onTier = (tier) => {
  atmosphere.setResolution(tier.shadowRes);
  materials.setKiswaRes(tier.kiswaRes);
};
modes.onChange = (mode) => quality.apply(mode);
function markChoice(attr, value) {
  document.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute("aria-pressed", b.getAttribute(attr) === value ? "true" : "false"));
}
atmosphere.onChange = (t) => markChoice("data-time", t);
document.querySelectorAll("[data-time]").forEach((b) => b.addEventListener("click", () => atmosphere.setTime(b.dataset.time)));
document.querySelectorAll("[data-quality]").forEach((b) =>
  b.addEventListener("click", () => {
    quality.setChoice(b.dataset.quality, modes.mode);
    markChoice("data-quality", quality.choice);
  }),
);
markChoice("data-quality", quality.choice);
// كثافة الحشود: يختارها المستخدم، ولا تتجاوز ما يسمح به مستوى الجودة
function setDensity(v) {
  world.crowds.setDensity(v);
  markChoice("data-density", String(v));
  try {
    localStorage.setItem("umrah.density", String(v));
  } catch {}
}
document.querySelectorAll("[data-density]").forEach((b) => b.addEventListener("click", () => setDensity(+b.dataset.density)));
setDensity(
  (() => {
    try {
      const v = +localStorage.getItem("umrah.density");
      if ([0.35, 0.65, 1].includes(v)) return v;
    } catch {}
    return 1;
  })(),
);
atmosphere.setTime(
  (() => {
    const q = new URLSearchParams(location.search).get("time");
    if (q && TIMES_OF_DAY[q]) return q;
    try {
      const saved = localStorage.getItem("umrah.time");
      if (saved && TIMES_OF_DAY[saved]) return saved;
    } catch {}
    return DEFAULT_TIME;
  })(),
);

// زر البطاقة: زر المنسك (انتقل إلى الصفا) إن وُجد، وإلا فزر «تعلّم سريع»
var fast = createFastLearning({ game, hud, player, world, hajj });
hud.extraBtn = fast.label;
hud.onCardBtn = () =>
  game.stage === "done" ? restart() : hud.model.gameBtn ? (game.stage === "hajj" ? hajj.cardBtn() : game.fastToSafa()) : fast.run();
Promise.race([
  Promise.all([
    document.fonts.load('600 40px "Noto Kufi Arabic"'),
    document.fonts.load('800 40px "Noto Kufi Arabic"'),
    document.fonts.load('400 30px "Amiri"'),
  ]),
  new Promise((r) => setTimeout(r, 2500)),
]).then(() => {
  world.rebuildLabels();
  panels.markDirty();
});

// ——— اختيار الرجل أو المرأة ———
var gender = "m";
document.querySelectorAll(".seg [data-g]").forEach((b) =>
  b.addEventListener("click", () => {
    gender = b.dataset.g;
    document.querySelectorAll(".seg [data-g]").forEach((x) => x.setAttribute("aria-checked", x === b ? "true" : "false"));
  }),
);

// ——— اختيار طريقة التدريب ———
var defaultMode = isTouch ? "mobile" : "desktop";
var chosenMode = (() => {
  const q = new URLSearchParams(location.search).get("mode");
  if (q && MODE_NAMES[q]) return q;
  try {
    const saved = localStorage.getItem("umrah.mode");
    if (saved && MODE_NAMES[saved] && saved !== "xr") return saved;
  } catch {}
  return defaultMode;
})();
function chooseMode(mode) {
  chosenMode = mode;
  document.querySelectorAll("button[data-mode]").forEach((b) => b.setAttribute("aria-checked", b.dataset.mode === mode ? "true" : "false"));
  document.querySelectorAll(".mode-note").forEach((n) => (n.hidden = n.dataset.for !== mode));
  try {
    localStorage.setItem("umrah.mode", mode);
  } catch {}
}
document.querySelectorAll("button[data-mode]").forEach((b) => b.addEventListener("click", () => chooseMode(b.dataset.mode)));
chooseMode(chosenMode);
modes.xrSupported().then((ok) => {
  document.querySelectorAll('[data-mode="xr"], #menuVr').forEach((b) => (b.hidden = !ok));
  $id("vrNote").hidden = ok;
  if (ok && !new URLSearchParams(location.search).get("mode") && !isTouch) chooseMode("xr");
});

// ——— الخيارات ———
function syncOpt(name, on) {
  document.querySelectorAll(`input[data-opt="${name}"]`).forEach((e) => (e.checked = on));
}
function bindOpt(name, fn) {
  document.querySelectorAll(`input[data-opt="${name}"]`).forEach((e) =>
    e.addEventListener("change", () => {
      syncOpt(name, e.checked);
      fn(e.checked);
    }),
  );
}
bindOpt("voice", (on) => hud.setVoice(on));
bindOpt("labels", (on) => world.setLabels(on));
bindOpt("crowd", (on) => world.setCrowd(on));
bindOpt("comfort", (on) => modes.setComfort(on));
// الجوال: النظر بتحريك الجوال (اختياري، والسحب هو الافتراضي)، والمشي الموجّه (مفعّل افتراضيًا). يُحفظان
function savedFlag(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === "1" || v === "0") return v === "1";
  } catch {}
  return fallback;
}
function saveFlag(key, on) {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {}
}
modes.gyro = savedFlag("umrah.gyro", false);
modes.setGuide(savedFlag("umrah.guide", true));
syncOpt("gyro", modes.gyro);
syncOpt("guide", modes.guide);
bindOpt("gyro", (on) => (modes.setGyro(on), saveFlag("umrah.gyro", on)));
bindOpt("guide", (on) => (modes.setGuide(on), saveFlag("umrah.guide", on)));
// «تعلّم سريع» (09-fast.js): زر في البطاقة يمشي الأشواط والمسافات الطويلة
fast.enabled = savedFlag("umrah.fast", false);
syncOpt("fast", fast.enabled);
bindOpt("fast", (on) => ((fast.enabled = on), saveFlag("umrah.fast", on), hud.refreshCardBtn()));
var refreshVoice = () => {
  const ok = hud.voiceAvailable();
  document.querySelectorAll('input[data-opt="voice"]').forEach((e) => {
    e.disabled = !ok;
    if (!ok) e.checked = false;
    e.closest("label").classList.toggle("off", !ok);
  });
  document.querySelectorAll(".voice-missing").forEach((n) => (n.hidden = ok));
  hud.setVoice(ok && document.querySelector('input[data-opt="voice"]').checked);
};
refreshVoice();
setTimeout(refreshVoice, 1200);
if ("speechSynthesis" in window) speechSynthesis.addEventListener?.("voiceschanged", refreshVoice);

// ——— البدء ———
var startHints = {
  mobile: "ضع إبهامك الأيسر أسفل الشاشة لتمشي، واسحب بالأيمن لتلتفت، والمس الزر الذهبي للمنسك.",
  cardboard: "انظر إلى زر ثانية واحدة لتختاره، والمس الشاشة لتمشي أو تقف.",
  desktop: "امشِ بالأسهم أو بمفاتيح WASD، والتفت بسحب الفأرة، والمسافة للمنسك.",
  xr: "",
};
function beginTraining() {
  const fromIntro = !$id("intro").hidden;
  $id("intro").hidden = true;
  world.setLabelsSuppressed(false);
  $id("summary").hidden = true;
  $id("hud").hidden = false;
  panels.active = true;
  player.rig.position.y = 0;
  player.enabled = true;
  hajj.reset(gender);
  game.start(gender);
  const hint = startHints[modes.mode];
  if (fromIntro && hint) setTimeout(() => hud.toast(hint, "info", 5), 900);
}
function restart() {
  dropFocus();
  $id("summary").hidden = true;
  $id("menu").hidden = true;
  player.enabled = true;
  hajj.reset(gender);
  game.start(gender);
}
game.onAgain = restart;
$id("startBtn").addEventListener("click", async () => {
  if (chosenMode === "xr") return modes.enterXR(); // يبدأ التدريب عند sessionstart
  await modes.enter(chosenMode);
  beginTraining();
});
renderer.xr.addEventListener("sessionstart", () => {
  modes.lastFlat = modes.mode === "xr" ? modes.lastFlat : modes.mode;
  player.setLook("xr");
  modes.set("xr");
  document.body.classList.add("in-vr");
  player.rig.position.y = 0;
  setTimeout(() => game.stage === "intro" && beginTraining(), 300);
});
renderer.xr.addEventListener("sessionend", () => {
  document.body.classList.remove("in-vr");
  player.setLook("mouse");
  modes.set(modes.lastFlat || defaultMode);
});
$id("menuVr").addEventListener("click", () => {
  $id("menu").hidden = true;
  modes.enterXR();
});
document.querySelectorAll("[data-switch]").forEach((b) =>
  b.addEventListener("click", async () => {
    dropFocus();
    $id("menu").hidden = true;
    player.enabled = true;
    await modes.enter(b.dataset.switch);
  }),
);
$id("cbExit").addEventListener("click", () => modes.exitCardboard());

// ——— أزرار الصفحة ———
$id("actBtn").addEventListener("click", () => game.act());
// أزرار الجوال تعمل بإصبع ثانٍ والإبهام على العصا (createPressButton في 05-input.js)
createPressButton($id("jogBtn"), () => {
  player.jogToggle = !player.jogToggle;
  hud.setJog(player.jogToggle);
});
createPressButton($id("autoWalkBtn"), () => modes.setAutoWalk(!modes.autoWalk));
modes.onAutoWalk = (on) => {
  $id("autoWalkBtn").classList.toggle("on", on);
  $id("autoWalkBtn").setAttribute("aria-pressed", on ? "true" : "false");
};
// الإبقاء على زر الدوران يكرّر الدفعة (30°) كل ثلث ثانية
createPressButton($id("turnLBtn"), () => player.snapTurn(1), { repeat: 330 });
createPressButton($id("turnRBtn"), () => player.snapTurn(-1), { repeat: 330 });
$id("menuBtn").addEventListener("click", () => {
  $id("menu").hidden = false;
  player.enabled = false;
});
$id("menuClose").addEventListener("click", () => {
  dropFocus();
  $id("menu").hidden = true;
  player.enabled = true;
});
$id("restartBtn").addEventListener("click", restart);
document.querySelectorAll("[data-jump]").forEach((b) =>
  b.addEventListener("click", () => {
    dropFocus();
    $id("menu").hidden = true;
    $id("summary").hidden = true;
    player.enabled = true;
    hajj.reset(gender); // من مشاعر الحج إلى المسجد الحرام
    game.jump(b.dataset.jump);
  }),
);
// ——— التدريب على العمرة أو الحج (التمتّع) ———
var trainingKind = (() => {
  const q = new URLSearchParams(location.search).get("kind");
  if (q === "hajj" || q === "umrah") return q;
  try {
    if (localStorage.getItem("umrah.kind") === "hajj") return "hajj";
  } catch {}
  return "umrah";
})();
function chooseKind(kind) {
  trainingKind = kind;
  document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-checked", b.dataset.kind === kind ? "true" : "false"));
  document.body.classList.toggle("kind-hajj", kind === "hajj");
  hajj.setKind(kind);
  try {
    localStorage.setItem("umrah.kind", kind);
  } catch {}
}
document.querySelectorAll("[data-kind]").forEach((b) => b.addEventListener("click", () => chooseKind(b.dataset.kind)));
document.querySelectorAll("[data-kind-switch]").forEach((b) => b.addEventListener("click", () => (chooseKind(b.dataset.kindSwitch), restart())));
document.querySelectorAll("[data-hajj-jump]").forEach((b) =>
  b.addEventListener("click", () => {
    dropFocus();
    $id("menu").hidden = true;
    $id("summary").hidden = true;
    player.enabled = true;
    hajj.jump(b.dataset.hajjJump);
  }),
);
chooseKind(trainingKind);
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !$id("hud").hidden && modes.mode !== "cardboard") {
    const open = $id("menu").hidden;
    $id("menu").hidden = !open;
    player.enabled = !open;
  }
});
var showSummary = (r) => {
  $id("sumTitle").textContent = r.title;
  $id("sumSub").textContent = r.sub;
  $id("sumRows").innerHTML = r.rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  $id("sumNote").textContent = r.note;
  // في النظارة وعلبة VR لا تُرى نافذة الصفحة؛ الملخص في اللوحة، والزر الذهبي يعيد التدريب
  $id("summary").hidden = modes.mode === "xr" || modes.mode === "cardboard";
  hud.setCard({ title: r.title, text: r.rows.map(([k, v]) => `${k}: ${v}`).join(". ") + ". " + r.note, say: r.sub });
  hud.setRite("end");
  hud.setAction("أعِد التدريب", true);
};
// في الحج: بعد تحلّل العمرة تبدأ أيام الحج، والملخص بعد طواف الوداع
game.onFinish = (r) => (hajj.enabled ? hajj.afterUmrah(r) : showSummary(r));
hajj.onFinish = showSummary;
$id("againBtn").addEventListener("click", restart);
$id("freeBtn").addEventListener("click", () => (dropFocus(), ($id("summary").hidden = true)));
addEventListener("resize", () => modes.resize());

// ——— حلقة الإطار ———
// step بلا رسم: يستعمله الاختبار ليمشي مئات الخطوات بسرعة على منطق الإطار نفسه.
var orbit = (160 * Math.PI) / 180;
function step(dt) {
  if (game.stage === "intro" && !renderer.xr.isPresenting) {
    // جولة الكاميرا حول الكعبة خلف شاشة البداية
    if (!reducedMotion) orbit += dt * 0.03;
    const wide = innerWidth >= 900 && innerWidth > innerHeight;
    const r = wide ? 36 : 40;
    const x = Math.cos(orbit) * r;
    const z = -Math.sin(orbit) * r;
    player.rig.position.set(x, wide ? 2.4 : 6.5, z);
    player.yaw = Math.atan2(x, z) + (wide ? -0.24 : 0);
    player.pitch = wide ? 0.06 : -0.3;
  }
  modes.frame(dt);
  game.update(dt);
  const pos = player.getPos();
  world.update(dt, pos);
  mashair.update(dt, hud.time);
  hud.update(dt);
  panels.update(dt, { time: hud.time, pos, heading: player.headingPhi() });
  modes.afterFrame(dt);
}
var clock = new Ir();
// قبل «ابدأ» عرض عادي خلف شاشة البداية؛ علبة VR والنظارة تبدآن من الضغطة
modes.set(chosenMode === "xr" || chosenMode === "cardboard" ? defaultMode : chosenMode);
renderer.setAnimationLoop(() => {
  clock.update();
  const realDt = clock.getDelta();
  quality.frame(realDt);
  step(Math.min(realDt, 0.05));
  modes.render();
});
window.__umrah = { game, player, hud, world, renderer, scene, camera, panels, modes, input, vignette, quality, atmosphere, materials, fast, mashair, hajj, step };
