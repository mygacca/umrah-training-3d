var ne = (i) => document.getElementById(i),
  Dd = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
document.body.classList.add(Dd ? "touch" : "mouse");
var $_ = matchMedia("(prefers-reduced-motion: reduce)").matches,
  Ne;
try {
  Ne = new nl({ canvas: ne("c"), antialias: !0, powerPreference: "high-performance" });
} catch (i) {
  throw ((ne("fail").hidden = !1), i);
}
Ne.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
Ne.setSize(innerWidth, innerHeight, !1);
Ne.toneMapping = Lr;
Ne.toneMappingExposure = 1;
Ne.xr.enabled = !0;
Ne.xr.setReferenceSpaceType("local-floor");
var Zr = new Di(),
  ks = new Je(68, innerWidth / innerHeight, 0.05, 2200),
  Wi = Ed(Zr, Ne),
  mn = Id({ scene: Zr, camera: ks }),
  cn = null,
  Ce = wd({
    scene: Zr,
    camera: ks,
    renderer: Ne,
    canvas: ne("c"),
    joyEl: ne("joy"),
    knobEl: ne("knob"),
    onAction: () => cn && cn.act(),
  });
cn = Pd({ world: Wi, hud: mn, player: Ce });
mn.onCardBtn = () => cn.fastToSafa();
var J_ = Promise.race([
  Promise.all([
    document.fonts.load('600 40px "Noto Kufi Arabic"'),
    document.fonts.load('800 40px "Noto Kufi Arabic"'),
    document.fonts.load('400 30px "Amiri"'),
  ]),
  new Promise((i) => setTimeout(i, 2500)),
]);
J_.then(() => Wi.rebuildLabels());
var hl = "m";
document.querySelectorAll(".seg button").forEach((i) =>
  i.addEventListener("click", () => {
    (hl = i.dataset.g),
      document
        .querySelectorAll(".seg button")
        .forEach((t) => t.setAttribute("aria-checked", t === i ? "true" : "false"));
  }),
);
function K_(i, t) {
  document.querySelectorAll(`input[data-opt="${i}"]`).forEach((e) => (e.checked = t));
}
function eh(i, t) {
  document.querySelectorAll(`input[data-opt="${i}"]`).forEach((e) =>
    e.addEventListener("change", () => {
      K_(i, e.checked), t(e.checked);
    }),
  );
}
eh("voice", (i) => mn.setVoice(i));
eh("labels", (i) => Wi.setLabels(i));
eh("crowd", (i) => Wi.setCrowd(i));
var nh = () => {
  let i = mn.voiceAvailable();
  document.querySelectorAll('input[data-opt="voice"]').forEach((t) => {
    (t.disabled = !i), i || (t.checked = !1), t.closest("label").classList.toggle("off", !i);
  }),
    document.querySelectorAll(".voice-missing").forEach((t) => (t.hidden = i)),
    mn.setVoice(i && document.querySelector('input[data-opt="voice"]').checked);
};
nh();
setTimeout(nh, 1200);
"speechSynthesis" in window && speechSynthesis.addEventListener?.("voiceschanged", nh);
function Nd() {
  let i = !ne("intro").hidden;
  if (
    ((ne("intro").hidden = !0),
    Wi.setLabelsSuppressed(!1),
    (ne("summary").hidden = !0),
    (ne("hud").hidden = !1),
    (Ce.rig.position.y = 0),
    (Ce.enabled = !0),
    cn.start(hl),
    i && !Ne.xr.isPresenting)
  ) {
    let t = Dd
      ? "امشِ بالعصا تحت إبهامك الأيسر، واسحب على الشاشة لتلتفت."
      : "امشِ بالأسهم أو بمفاتيح WASD، والتفت بسحب الفأرة.";
    setTimeout(() => mn.toast(t, "info", 5), 900);
  }
}
ne("startBtn").addEventListener("click", Nd);
async function j_() {
  if (!navigator.xr) return !1;
  try {
    return await navigator.xr.isSessionSupported("immersive-vr");
  } catch {
    return !1;
  }
}
j_().then((i) => {
  (ne("vrBtn").hidden = !i), (ne("vrNote").hidden = i), (ne("menuVr").hidden = !i);
});
async function Ud() {
  try {
    let i = await navigator.xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor", "bounded-floor"],
    });
    await Ne.xr.setSession(i);
  } catch {
    mn.toast(
      "تعذّر فتح وضع النظارة على هذا الجهاز.",
      "warn",
      4,
    );
  }
}
ne("vrBtn").addEventListener("click", Ud);
ne("menuVr").addEventListener("click", () => {
  (ne("menu").hidden = !0), Ud();
});
Ne.xr.addEventListener("sessionstart", () => {
  Ce.setXR(!0),
    document.body.classList.add("in-vr"),
    (Ce.rig.position.y = 0),
    setTimeout(() => {
      cn.stage === "intro" && Nd();
    }, 300);
});
Ne.xr.addEventListener("sessionend", () => {
  Ce.setXR(!1), document.body.classList.remove("in-vr");
});
ne("actBtn").addEventListener("click", () => cn.act());
ne("jogBtn").addEventListener("click", () => {
  (Ce.jogToggle = !Ce.jogToggle), mn.setJog(Ce.jogToggle);
});
ne("menuBtn").addEventListener("click", () => {
  (ne("menu").hidden = !1), (Ce.enabled = !1);
});
ne("menuClose").addEventListener("click", () => {
  (ne("menu").hidden = !0), (Ce.enabled = !0);
});
ne("restartBtn").addEventListener("click", () => {
  (ne("menu").hidden = !0), (Ce.enabled = !0), cn.start(hl);
});
document.querySelectorAll("[data-jump]").forEach((i) =>
  i.addEventListener("click", () => {
    (ne("menu").hidden = !0), (ne("summary").hidden = !0), (Ce.enabled = !0), cn.jump(i.dataset.jump);
  }),
);
addEventListener("keydown", (i) => {
  if (i.code === "Escape" && !ne("hud").hidden) {
    let t = ne("menu").hidden;
    (ne("menu").hidden = !t), (Ce.enabled = !t);
  }
});
cn.onFinish = (i) => {
  (ne("sumTitle").textContent = i.title),
    (ne("sumSub").textContent = i.sub),
    (ne("sumRows").innerHTML = i.rows.map(([t, e]) => `<div><dt>${t}</dt><dd>${e}</dd></div>`).join("")),
    (ne("sumNote").textContent = i.note),
    (ne("summary").hidden = !1),
    mn.setCard({
      title: i.title,
      text: i.rows.map(([t, e]) => `${t}: ${e}`).join(". ") + ". " + i.note,
      say: i.sub,
    }),
    mn.setRite("end"),
    Ne.xr.isPresenting &&
      mn.setAction(
        "أعِد التدريب من القائمة",
        !1,
      );
};
ne("againBtn").addEventListener("click", () => {
  (ne("summary").hidden = !0), cn.start(hl);
});
ne("freeBtn").addEventListener("click", () => {
  ne("summary").hidden = !0;
});
addEventListener("resize", () => {
  Ne.setSize(innerWidth, innerHeight, !1),
    (ks.aspect = innerWidth / innerHeight),
    ks.updateProjectionMatrix();
});
var Ld = new Ir(),
  th = (160 * Math.PI) / 180;
Ne.setAnimationLoop(() => {
  Ld.update();
  let i = Math.min(Ld.getDelta(), 0.05);
  if (cn.stage === "intro" && !Ne.xr.isPresenting) {
    $_ || (th += i * 0.03);
    let e = innerWidth >= 900 && innerWidth > innerHeight,
      n = e ? 36 : 40,
      s = Math.cos(th) * n,
      r = -Math.sin(th) * n;
    Ce.rig.position.set(s, e ? 2.4 : 6.5, r),
      (Ce.yaw = Math.atan2(s, r) + (e ? -0.24 : 0)),
      (Ce.pitch = e ? 0.06 : -0.3);
  }
  Ce.update(i), cn.update(i);
  let t = Ce.getPos();
  Wi.update(i, t), mn.update(i, t, Ce.headingPhi(), Ne.xr.isPresenting), Ne.render(Zr, ks);
});
window.__umrah = { game: cn, player: Ce, hud: mn, world: Wi, renderer: Ne, scene: Zr, camera: ks };
