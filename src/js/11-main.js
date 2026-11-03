// التشغيل: الرسّام والمشهد والكاميرا، وربط أزرار الصفحة، وحلقة الإطار. يجب أن يبقى آخر ملف.
var $id = (id) => document.getElementById(id);
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
var modes = createModes({ renderer, scene, camera, player, hud, panels, game, input, vignette, reticle });

// ——— الجودة وأوقات المشهد (الطبقتان 0 و1 من docs/realism-plan.md) ———
var quality = createQuality({ renderer, world });
var atmosphere = createAtmosphere({ scene, renderer, world });
quality.onTier = (tier) => atmosphere.setResolution(tier.shadowRes);
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

hud.onCardBtn = () => (game.stage === "done" ? restart() : game.fastToSafa());
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
  document.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-checked", b.dataset.mode === mode ? "true" : "false"));
  document.querySelectorAll(".mode-note").forEach((n) => (n.hidden = n.dataset.for !== mode));
  try {
    localStorage.setItem("umrah.mode", mode);
  } catch {}
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => chooseMode(b.dataset.mode)));
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
  mobile: "حرّك الجوال لتلتفت، وامشِ بالعصا تحت إبهامك الأيسر، والمس الزر الذهبي للمنسك.",
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
  game.start(gender);
  const hint = startHints[modes.mode];
  if (fromIntro && hint) setTimeout(() => hud.toast(hint, "info", 5), 900);
}
function restart() {
  $id("summary").hidden = true;
  $id("menu").hidden = true;
  player.enabled = true;
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
    $id("menu").hidden = true;
    player.enabled = true;
    await modes.enter(b.dataset.switch);
  }),
);
$id("cbExit").addEventListener("click", () => modes.exitCardboard());

// ——— أزرار الصفحة ———
$id("actBtn").addEventListener("click", () => game.act());
$id("jogBtn").addEventListener("click", () => {
  player.jogToggle = !player.jogToggle;
  hud.setJog(player.jogToggle);
});
$id("turnLBtn").addEventListener("click", () => player.snapTurn(1));
$id("turnRBtn").addEventListener("click", () => player.snapTurn(-1));
$id("menuBtn").addEventListener("click", () => {
  $id("menu").hidden = false;
  player.enabled = false;
});
$id("menuClose").addEventListener("click", () => {
  $id("menu").hidden = true;
  player.enabled = true;
});
$id("restartBtn").addEventListener("click", restart);
document.querySelectorAll("[data-jump]").forEach((b) =>
  b.addEventListener("click", () => {
    $id("menu").hidden = true;
    $id("summary").hidden = true;
    player.enabled = true;
    game.jump(b.dataset.jump);
  }),
);
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !$id("hud").hidden && modes.mode !== "cardboard") {
    const open = $id("menu").hidden;
    $id("menu").hidden = !open;
    player.enabled = !open;
  }
});
game.onFinish = (r) => {
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
$id("againBtn").addEventListener("click", restart);
$id("freeBtn").addEventListener("click", () => ($id("summary").hidden = true));
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
  atmosphere.update(dt);
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
window.__umrah = { game, player, hud, world, renderer, scene, camera, panels, modes, input, vignette, quality, atmosphere, step };
