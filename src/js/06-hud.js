var ri = '"Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif',
  Z_ = '"Amiri", "Noto Naskh Arabic", "Traditional Arabic", serif';
function Rd(i, t, e, n, s = 1) {
  i.save(),
    i.translate(t, e),
    i.rotate(n),
    i.scale(s, s),
    i.beginPath(),
    i.moveTo(8, 0),
    i.lineTo(-5.5, 5),
    i.lineTo(-2.5, 0),
    i.lineTo(-5.5, -5),
    i.closePath(),
    (i.fillStyle = "#f6f1e4"),
    i.fill(),
    (i.lineWidth = 1.4),
    (i.strokeStyle = "#0c2a24"),
    i.stroke(),
    i.restore();
}
function Cd(i, t, e, n, s, r, a, o) {
  i.save(), i.translate(t, e);
  let l = n / 2,
    c = n / 120,
    h = s.counter.mode === "sai" || (r && r.x > 57);
  if (
    (i.beginPath(),
    i.arc(l, l, l - 1.5 * c, 0, le),
    (i.fillStyle = "rgba(10,36,31,0.86)"),
    i.fill(),
    (i.lineWidth = 1.4 * c),
    (i.strokeStyle = "rgba(214,176,98,0.9)"),
    i.stroke(),
    h)
  ) {
    let d = 16 * c,
      u = n - 16 * c,
      f = (p) => d + ((p - dt.walkM) / (dt.walkS - dt.walkM)) * (u - d),
      g = 18 * c;
    (i.fillStyle = "rgba(246,241,228,0.16)"),
      i.beginPath(),
      i.roundRect(l - g / 2, d - 4 * c, g, u - d + 8 * c, g / 2),
      i.fill(),
      (i.fillStyle = "rgba(61,220,138,0.75)"),
      i.fillRect(l - g / 2, f(dt.gA), g, f(dt.gB) - f(dt.gA)),
      (i.fillStyle = "rgba(246,241,228,0.9)"),
      (i.font = `600 ${Math.round(9.5 * c)}px ${ri}`),
      (i.textAlign = "right"),
      (i.direction = "rtl"),
      (i.textBaseline = "middle"),
      i.fillText("المروة", l - g / 2 - 4 * c, d + 2 * c),
      i.fillText("الصفا", l - g / 2 - 4 * c, u - 2 * c);
    let m = (s.counter.mode === "sai" ? s.counter.target : "safa") === "marwa" ? d : u;
    if (
      ((i.strokeStyle = "#ffd36b"),
      (i.lineWidth = 1.6 * c),
      i.beginPath(),
      i.arc(l, m, (5 + 1.5 * Math.sin(o * 4)) * c, 0, le),
      i.stroke(),
      r)
    ) {
      let p = Math.max(d - 6 * c, Math.min(u + 6 * c, f(r.z))),
        b = l + Math.max(-1, Math.min(1, (r.x - dt.xc) / 9)) * (g / 2);
      Rd(i, b, p, -a, c);
    }
  } else {
    let d = (l - 13 * c) / 46,
      u = (g) => l + g * d,
      f = (g) => l + g * d;
    i.beginPath(),
      i.arc(l, l, 44 * d, 0, le),
      (i.fillStyle = "rgba(246,241,228,0.1)"),
      i.fill(),
      (i.strokeStyle = "#3ddc8a"),
      (i.lineWidth = 1.8 * c),
      i.beginPath(),
      i.moveTo(u(Ln.black[0]), f(Ln.black[1])),
      i.lineTo(u(Math.cos(we) * 44), f(-Math.sin(we) * 44)),
      i.stroke(),
      (i.strokeStyle = "rgba(246,241,228,0.9)"),
      (i.lineWidth = 1.6 * c),
      i.beginPath();
    for (let g = 0; g <= 24; g++) {
      let v = je.t0 + ((Math.PI - 2 * je.t0) * g) / 24,
        [m, p] = Qe(Math.cos(v) * je.a, -Yt.lz / 2 - Math.sin(v) * je.b);
      g === 0 ? i.moveTo(u(m), f(p)) : i.lineTo(u(m), f(p));
    }
    i.stroke(), i.beginPath();
    for (let g of ["black", "iraqi", "shami", "yamani"]) i.lineTo(u(Ln[g][0]), f(Ln[g][1]));
    if (
      (i.closePath(),
      (i.fillStyle = "#000"),
      i.fill(),
      (i.strokeStyle = "#d6b062"),
      (i.lineWidth = 1 * c),
      i.stroke(),
      (i.fillStyle = "#c9ced2"),
      i.beginPath(),
      i.arc(u(Ln.black[0]), f(Ln.black[1]), 1.6 * c, 0, le),
      i.fill(),
      (i.fillStyle = "#f0c96a"),
      i.beginPath(),
      i.arc(u(Sn[0]), f(Sn[1]), 2.2 * c, 0, le),
      i.fill(),
      s.counter.mode === "tawaf")
    ) {
      let g = l - 6.5 * c;
      (i.lineWidth = 4.5 * c),
        (i.strokeStyle = "rgba(246,241,228,0.14)"),
        i.beginPath(),
        i.arc(l, l, g, 0, le),
        i.stroke();
      let v = Math.max(0, Math.min(1, s.counter.progress));
      v > 0.001 &&
        ((i.strokeStyle = s.counter.invalid ? "#e8604c" : "#f0c96a"),
        (i.lineCap = "round"),
        i.beginPath(),
        i.arc(l, l, g, -we, -(we + v * le), !0),
        i.stroke(),
        (i.lineCap = "butt"));
    }
    if (s.target && Math.hypot(s.target[0], s.target[1]) < 47) {
      let g = (4 + 1.5 * Math.sin(o * 4)) * c;
      (i.strokeStyle = "#ffd36b"),
        (i.lineWidth = 1.6 * c),
        i.beginPath(),
        i.arc(u(s.target[0]), f(s.target[1]), g, 0, le),
        i.stroke();
    } else if (s.target) {
      let g = Math.atan2(s.target[1], s.target[0]),
        v = l - 7 * c;
      i.save(),
        i.translate(l + Math.cos(g) * v, l + Math.sin(g) * v),
        i.rotate(g),
        i.beginPath(),
        i.moveTo(5 * c, 0),
        i.lineTo(-4 * c, 4.5 * c),
        i.lineTo(-4 * c, -4.5 * c),
        i.closePath(),
        (i.fillStyle = "#ffd36b"),
        (i.globalAlpha = 0.65 + 0.35 * Math.sin(o * 4)),
        i.fill(),
        i.restore();
    }
    if (r) {
      let g = r.x,
        v = r.z,
        m = Math.hypot(g, v);
      m > 46 && ((g *= 46 / m), (v *= 46 / m)), Rd(i, u(g), f(v), -a, c);
    }
  }
  i.restore();
}
function Qc(i, t, e) {
  let n = t.split(/\s+/),
    s = [],
    r = "";
  for (let a of n) {
    let o = r ? r + " " + a : a;
    i.measureText(o).width > e && r ? (s.push(r), (r = a)) : (r = o);
  }
  return r && s.push(r), s;
}
function Id({ scene: i, camera: t }) {
  let e = (A) => document.getElementById(A),
    n = {
      hud: e("hud"),
      rail: e("rail"),
      card: e("card"),
      cardTitle: e("cardTitle"),
      cardText: e("cardText"),
      cardSay: e("cardSay"),
      cardBtn: e("cardBtn"),
      mini: e("mini"),
      countLabel: e("countLabel"),
      pips: e("pips"),
      toast: e("toast"),
      act: e("actBtn"),
      actLabel: e("actLabel"),
      jog: e("jogBtn"),
      veil: e("veil"),
      veilText: e("veilText"),
    },
    s = {
      rite: "ihram",
      title: "",
      text: "",
      say: "",
      cardBtn: null,
      action: { label: "", enabled: !1 },
      counter: { mode: null, done: 0, progress: 0, invalid: !1, target: "marwa" },
      toast: { msg: "", kind: "info", until: 0 },
      target: null,
      veil: "",
    },
    r = { model: s, onCardBtn: null },
    a = !0,
    o = 0;
  n.rail.innerHTML = Ti.map(
    (A, L) => `<li data-k="${A.k}"><span class="n">${De(L + 1)}</span><span class="t">${A.name}</span></li>`,
  ).join("");
  let l = n.card.querySelector(".card-head");
  l.addEventListener("click", () => n.card.classList.toggle("collapsed")),
    l.addEventListener("keydown", (A) => {
      (A.code === "Enter" || A.code === "Space") &&
        (A.preventDefault(), A.stopPropagation(), n.card.classList.toggle("collapsed"));
    }),
    n.cardBtn.addEventListener("click", () => r.onCardBtn && r.onCardBtn()),
    (r.setRite = (A) => {
      s.rite = A;
      let L = A === "end" ? Ti.length : Ti.findIndex((T) => T.k === A);
      n.rail.querySelectorAll("li").forEach((T, F) => {
        T.classList.toggle("done", F < L), T.classList.toggle("now", F === L);
      }),
        (a = !0);
    }),
    (r.setCard = ({ title: A = "", text: L = "", say: T = "", btn: F = null }) => {
      let H = A !== s.title;
      (s.title = A),
        (s.text = L),
        (s.say = T),
        (s.cardBtn = F),
        (n.cardTitle.textContent = A),
        (n.cardText.textContent = L),
        (n.cardSay.textContent = T),
        (n.cardSay.hidden = !T),
        (n.cardBtn.hidden = !F),
        F && (n.cardBtn.textContent = F),
        H &&
          (n.card.classList.remove("collapsed"),
          n.card.classList.remove("flash"),
          n.card.offsetWidth,
          n.card.classList.add("flash")),
        (a = !0);
    }),
    (r.setAction = (A, L) => {
      (s.action.label === A && s.action.enabled === L) ||
        ((s.action = { label: A, enabled: L }),
        (n.actLabel.textContent = A),
        (n.act.hidden = !A),
        (n.act.disabled = !L),
        n.act.classList.toggle("ready", L),
        (a = !0));
    }),
    (r.setCounter = (A) => {
      let L = s.counter;
      s.counter = { ...L, ...A };
      let T = s.counter;
      if (T.mode === "tawaf" || T.mode === "sai") {
        let F = Math.min(T.done + 1, 7),
          H =
            T.mode === "tawaf"
              ? `الشوط ${De(F)} من ${De(7)}`
              : `الشوط ${De(F)} من ${De(7)}: إلى ${T.target === "marwa" ? "المروة" : "الصفا"}`;
        n.countLabel.textContent !== H && (n.countLabel.textContent = H);
        let V = Array.from(
          { length: 7 },
          (Q, G) => `<i class="${G < T.done ? "on" : G === T.done ? "cur" : ""}"></i>`,
        ).join("");
        n.pips.innerHTML !== V && (n.pips.innerHTML = V), (n.pips.hidden = !1);
      } else
        (n.countLabel.textContent =
          "المسجد الحرام"),
          (n.pips.hidden = !0);
      (L.done !== T.done || L.mode !== T.mode || L.invalid !== T.invalid || L.target !== T.target) &&
        (a = !0);
    });
  let c = 0;
  (r.toast = (A, L = "info", T = 3.2) => {
    (s.toast = { msg: A, kind: L, until: o + T }),
      (n.toast.textContent = A),
      (n.toast.className = `show ${L}`),
      clearTimeout(c),
      (c = setTimeout(() => (n.toast.className = ""), T * 1e3)),
      (a = !0),
      L === "warn" && navigator.vibrate && navigator.vibrate([60, 40, 60]);
  }),
    (r.setTarget = (A) => {
      s.target = A;
    }),
    (r.setVeil = (A) => {
      (s.veil = A || ""), n.veil.classList.toggle("on", !!A), A && (n.veilText.textContent = A), (a = !0);
    }),
    (r.setJog = (A) => {
      n.jog.classList.toggle("on", A), n.jog.setAttribute("aria-pressed", A ? "true" : "false");
    });
  let h = { on: !0, voice: null },
    d = () => {
      if (!("speechSynthesis" in window)) return;
      let A = speechSynthesis.getVoices();
      h.voice = A.find((L) => /^ar(-|_|$)/i.test(L.lang)) || null;
    };
  "speechSynthesis" in window && (d(), speechSynthesis.addEventListener?.("voiceschanged", d)),
    (r.voiceAvailable = () => !!h.voice),
    (r.setVoice = (A) => {
      (h.on = A), !A && "speechSynthesis" in window && speechSynthesis.cancel();
    }),
    (r.speak = (A) => {
      if (!(!h.on || !h.voice || !A))
        try {
          speechSynthesis.cancel();
          let L = new SpeechSynthesisUtterance(A);
          (L.voice = h.voice), (L.lang = h.voice.lang), (L.rate = 0.98), speechSynthesis.speak(L);
        } catch {}
    });
  let u = n.mini.getContext("2d"),
    f = () => {
      let A = n.mini.clientWidth || 116,
        L = Math.min(devicePixelRatio || 1, 2);
      (n.mini.width = Math.round(A * L)), (n.mini.height = Math.round(A * L));
    };
  f(), addEventListener("resize", f);
  let g = 1024,
    v = 640,
    m = document.createElement("canvas");
  (m.width = g), (m.height = v);
  let p = m.getContext("2d"),
    b = new Ui(m);
  (b.colorSpace = We), (b.anisotropy = 4);
  let C = new Pt(
    new Ve(1, v / g),
    new Le({ map: b, transparent: !0, depthTest: !1, depthWrite: !1, fog: !1, toneMapped: !1 }),
  );
  (C.renderOrder = 1e3), (C.visible = !1), i.add(C);
  let y = new Pt(
    new fn(0.4, 16, 12),
    new Le({
      color: "#06140f",
      side: Oe,
      transparent: !0,
      opacity: 0,
      depthTest: !1,
      depthWrite: !1,
      fog: !1,
    }),
  );
  (y.renderOrder = 999), (y.visible = !1), t.add(y);
  let E = 0;
  r.fadeTo = (A) => {
    E = A;
  };
  function w(A, L) {
    let T = p;
    T.clearRect(0, 0, g, v),
      (T.fillStyle = "rgba(10,36,31,0.9)"),
      T.beginPath(),
      T.roundRect(4, 4, g - 8, v - 8, 34),
      T.fill(),
      (T.strokeStyle = "rgba(214,176,98,0.9)"),
      (T.lineWidth = 3),
      T.stroke(),
      (T.direction = "rtl"),
      (T.textBaseline = "middle");
    let F = s.rite === "end" ? Ti.length : Ti.findIndex((Gt) => Gt.k === s.rite),
      H = (g - 80) / Ti.length;
    if (
      (Ti.forEach((Gt, Wt) => {
        let $ = g - 40 - Wt * H - H / 2;
        (T.font = `${Wt === F ? 800 : 500} 26px ${ri}`),
          (T.fillStyle = Wt === F ? "#f0c96a" : Wt < F ? "rgba(246,241,228,0.75)" : "rgba(246,241,228,0.4)"),
          (T.textAlign = "center"),
          T.fillText(Gt.name, $, 46);
      }),
      (T.fillStyle = "rgba(214,176,98,0.4)"),
      T.fillRect(40, 76, g - 80, 2),
      Cd(T, 34, 110, 300, s, A, L, o),
      s.counter.mode)
    ) {
      (T.font = `700 28px ${ri}`), (T.textAlign = "center"), (T.fillStyle = "#f6f1e4");
      let Gt = Math.min(s.counter.done + 1, 7);
      T.fillText(`الشوط ${De(Gt)} من ${De(7)}`, 184, 446);
      for (let Wt = 0; Wt < 7; Wt++)
        T.beginPath(),
          T.arc(184 + (3 - Wt) * 30, 488, 9, 0, le),
          (T.fillStyle = Wt < s.counter.done ? "#f0c96a" : "rgba(246,241,228,0.18)"),
          T.fill();
    }
    let V = g - 44,
      Q = 372,
      G = V - Q,
      j = 128;
    (T.textAlign = "right"),
      (T.fillStyle = "#f6f1e4"),
      (T.font = `800 42px ${ri}`),
      T.fillText(
        s.veil ? "ركعتا الطواف" : s.title,
        V,
        j,
      ),
      (j += 56);
    let tt = s.veil || s.text,
      At = s.say && !s.veil;
    T.font = `400 26px ${ri}`;
    let Et = Qc(T, tt, G),
      jt = At ? 4 : 7;
    Et.length > jt && ((Et = Et.slice(0, jt)), (Et[jt - 1] += " \u2026")),
      (T.fillStyle = "rgba(246,241,228,0.88)");
    for (let Gt of Et) T.fillText(Gt, V, j), (j += 39);
    if (At) {
      (j += 12),
        (T.fillStyle = "rgba(214,176,98,0.35)"),
        T.fillRect(Q, j - 26, G, 2),
        (j += 14),
        (T.font = `400 34px ${Z_}`),
        (T.fillStyle = "#f0c96a");
      for (let Gt of Qc(T, s.say, G).slice(0, 2)) T.fillText(Gt, V, j), (j += 50);
    }
    if (s.toast.msg && o < s.toast.until) {
      (T.fillStyle = s.toast.kind === "warn" ? "rgba(200,64,48,0.97)" : "rgba(214,176,98,0.97)"),
        T.beginPath(),
        T.roundRect(Q, 452, G, 76, 18),
        T.fill(),
        (T.fillStyle = s.toast.kind === "warn" ? "#fff" : "#0c2a24"),
        (T.font = `700 25px ${ri}`),
        (T.textAlign = "center");
      let Gt = Qc(T, s.toast.msg, G - 30).slice(0, 2);
      Gt.forEach((Wt, $) => T.fillText(Wt, Q + G / 2, 490 + ($ - (Gt.length - 1) / 2) * 32));
    }
    (T.textAlign = "center"),
      s.action.enabled
        ? ((T.fillStyle = "#f0c96a"),
          T.beginPath(),
          T.roundRect(Q, 540, G, 54, 27),
          T.fill(),
          (T.fillStyle = "#0c2a24"),
          (T.font = `800 25px ${ri}`),
          T.fillText(
            `الزناد الأيمن: ${s.action.label}`,
            Q + G / 2,
            568,
          ))
        : s.action.label &&
          ((T.fillStyle = "rgba(246,241,228,0.55)"),
          (T.font = `500 23px ${ri}`),
          T.fillText(s.action.label, Q + G / 2, 568)),
      (T.textAlign = "right"),
      (T.font = `400 19px ${ri}`),
      (T.fillStyle = "rgba(246,241,228,0.5)"),
      T.fillText(
        "العصا اليسرى للمشي، والزناد الأيسر للهرولة، والعصا اليمنى للالتفات",
        V,
        616,
      ),
      (b.needsUpdate = !0);
  }
  let D = new U(),
    x = new U(),
    M = new U(),
    P = 0,
    I = !1;
  return (
    (r.update = (A, L, T, F) => {
      (o += A), Cd(u, 0, 0, n.mini.width, s, L, T, o);
      let H = y.material;
      (H.opacity += (E - H.opacity) * Math.min(1, A * 6)),
        (y.visible = H.opacity > 0.01),
        (C.visible = F),
        F &&
          (t.getWorldPosition(D),
          t.getWorldDirection(x),
          (x.y = 0),
          x.lengthSq() < 1e-4 && x.set(0, 0, -1),
          x.normalize(),
          M.copy(D).addScaledVector(x, 1.25),
          (M.y = D.y - 0.3),
          I ? C.position.lerp(M, 1 - Math.exp(-A * 3.5)) : C.position.copy(M),
          C.lookAt(D.x, C.position.y, D.z),
          (P -= A),
          (a || P <= 0) && (w(L, T), (a = !1), (P = 0.12))),
        (I = F);
    }),
    r
  );
}
