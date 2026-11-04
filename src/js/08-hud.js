// الواجهة: نموذج ما يُعرض (model)، والنطق، والتعتيم.
// اللوحات المرئية داخل المشهد (07-panels.js) تقرأ هذا النموذج.
// وعناصر #hud في الصفحة صارت مرآة نصية مخفية لقارئ الشاشة (aria-live) وللاختبار.
// قاعدة: speak() لا تُمرَّر إليها النصوص الشرعية أبدًا (انظر CLAUDE.md).
function createHud({ camera }) {
  const $ = (id) => document.getElementById(id);
  const dom = {
    rail: $("rail"),
    cardTitle: $("cardTitle"),
    cardText: $("cardText"),
    cardSay: $("cardSay"),
    cardBtn: $("cardBtn"),
    countLabel: $("countLabel"),
    toast: $("toast"),
    act: $("actBtn"),
    actLabel: $("actLabel"),
    jog: $("jogBtn"),
    veilText: $("veilText"),
  };
  const s = {
    rite: "ihram",
    title: "",
    text: "",
    say: "",
    cardBtn: null,
    gameBtn: null,
    action: { label: "", enabled: false },
    counter: { mode: null, done: 0, progress: 0, invalid: false, target: "marwa" },
    toast: { msg: "", kind: "info", until: 0 },
    target: null,
    veil: "",
  };
  const hud = { model: s, onCardBtn: null, onChange: null, time: 0 };
  const changed = () => hud.onChange && hud.onChange();

  dom.rail.innerHTML = Ti.map((t, i) => `<li data-k="${t.k}">${De(i + 1)}. ${t.name}</li>`).join("");
  dom.cardBtn.addEventListener("click", () => hud.onCardBtn && hud.onCardBtn());

  hud.setRite = (rite) => {
    s.rite = rite;
    const L = railIndex(s);
    dom.rail.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("done", i < L);
      li.classList.toggle("now", i === L);
      if (i === L) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });
    changed();
  };
  // زر البطاقة: زر المنسك إن وُجد (انتقل إلى الصفا)، وإلا فزر «تعلّم سريع» (hud.extraBtn من 09-fast.js)
  const showCardBtn = () => {
    const btn = s.gameBtn || (hud.extraBtn ? hud.extraBtn() : null);
    s.cardBtn = btn;
    dom.cardBtn.hidden = !btn;
    if (btn) dom.cardBtn.textContent = btn;
  };
  hud.setCard = ({ title = "", text = "", say = "", btn = null }) => {
    const newTitle = title !== s.title;
    s.title = title;
    s.text = text;
    s.say = say;
    s.gameBtn = btn;
    showCardBtn();
    dom.cardTitle.textContent = title;
    dom.cardText.textContent = text;
    dom.cardSay.textContent = say;
    dom.cardSay.hidden = !say;
    if (newTitle && hud.onNewCard) hud.onNewCard();
    changed();
  };
  hud.refreshCardBtn = () => {
    const old = s.cardBtn;
    showCardBtn();
    if (old !== s.cardBtn) changed();
  };
  hud.setAction = (label, enabled) => {
    if (s.action.label === label && s.action.enabled === enabled) return;
    s.action = { label, enabled };
    dom.actLabel.textContent = label;
    dom.act.hidden = !label;
    dom.act.disabled = !enabled;
    changed();
  };
  hud.setCounter = (c) => {
    const old = s.counter;
    s.counter = { ...old, ...c };
    const label = counterLabel(s);
    if (dom.countLabel.textContent !== label) dom.countLabel.textContent = label;
    const n = s.counter;
    if (old.done !== n.done || old.mode !== n.mode || old.invalid !== n.invalid || old.target !== n.target) changed();
  };
  let toastTimer = 0;
  hud.toast = (msg, kind = "info", seconds = 3.2) => {
    s.toast = { msg, kind, until: hud.time + seconds };
    dom.toast.textContent = msg;
    dom.toast.className = `show ${kind}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (dom.toast.className = ""), seconds * 1000);
    if (kind === "warn" && navigator.vibrate) navigator.vibrate([60, 40, 60]);
    changed();
  };
  hud.setTarget = (t) => (s.target = t);
  hud.setVeil = (text) => {
    s.veil = text || "";
    dom.veilText.textContent = s.veil;
    changed();
  };
  hud.setJog = (on) => {
    dom.jog.classList.toggle("on", on);
    dom.jog.setAttribute("aria-pressed", on ? "true" : "false");
  };

  // النطق: صوت عربي إن وُجد
  const voice = { on: true, v: null };
  const pickVoice = () => {
    if (!("speechSynthesis" in window)) return;
    voice.v = speechSynthesis.getVoices().find((v) => /^ar(-|_|$)/i.test(v.lang)) || null;
  };
  if ("speechSynthesis" in window) pickVoice(), speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
  hud.voiceAvailable = () => !!voice.v;
  hud.setVoice = (on) => {
    voice.on = on;
    if (!on && "speechSynthesis" in window) speechSynthesis.cancel();
  };
  hud.speak = (text) => {
    if (!voice.on || !voice.v || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice.v;
      u.lang = voice.v.lang;
      u.rate = 0.98;
      speechSynthesis.speak(u);
    } catch {}
  };

  // التعتيم: كرة حول الكاميرا (الانتقال إلى الصفا، والركعتان)
  const fade = new Mesh(
    new SphereGeometry(0.4, 16, 12),
    new MeshBasicMaterial({ color: "#06140f", side: BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }),
  );
  fade.renderOrder = 999;
  fade.visible = false;
  camera.add(fade);
  let fadeTarget = 0;
  hud.fadeTo = (v) => (fadeTarget = v);

  hud.update = (dt) => {
    hud.time += dt;
    const m = fade.material;
    m.opacity += (fadeTarget - m.opacity) * Math.min(1, dt * 6);
    fade.visible = m.opacity > 0.01;
  };
  return hud;
}
