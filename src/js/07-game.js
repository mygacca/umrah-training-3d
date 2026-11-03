function Pd({ world: i, hud: t, player: e }) {
  let n = { gender: "m", stage: "intro", sub: "", t0: 0, clock: 0 },
    s = jc("m"),
    r,
    a,
    o,
    l = null,
    c = "",
    h = 0,
    d = 0,
    u = () => {
      (r = { laps: 0, valid: 0, roundOk: !0, cum: 0, maxCum: 0, last: 0, inHijr: !1, takbirWindow: 0 }),
        (a = { lap: 0, target: "marwa", left: !1, duaReady: !1, green: !1 }),
        (o = {
          hijr: 0,
          wrong: 0,
          invalid: 0,
          takbir: 0,
          ramalT: 0,
          ramalMove: 0,
          jogT: 0,
          greenT: 0,
          dua: 0,
          start: 0,
        });
    };
  u();
  let f = (I) => t.speak(I),
    g = (I) => (I || "").split(/[.؛:]/)[0];
  function v(I, A = {}) {
    t.setRite(I.rite),
      t.setCard({
        title: I.title,
        text: A.text ?? I.text ?? "",
        say: A.say ?? I.say ?? "",
        btn: A.btn ?? null,
      }),
      A.speak !== !1 && f(`${I.title}. ${g(A.text ?? I.text)}`);
  }
  function m(I) {
    i.setTarget(I), t.setTarget(I);
  }
  function p() {
    let I = Math.cos(Yr.phi) * Yr.r,
      A = -Math.sin(Yr.phi) * Yr.r;
    return [I, A];
  }
  function b(I, A = "") {
    switch (((n.stage = I), (n.sub = A), (l = null), (c = ""), I)) {
      case "ihram": {
        t.setCounter({ mode: null }),
          i.setStartAid(!0),
          m(null),
          A === "niyyah"
            ? (v(s.niyyah), t.setAction(s.niyyah.action, !0))
            : (v(s.talbiya), t.setAction(s.talbiya.action, !0));
        break;
      }
      case "toStart": {
        t.setCounter({ mode: null }), i.setStartAid(!0), m([Math.cos(we) * 12, -Math.sin(we) * 12]);
        break;
      }
      case "tawaf": {
        i.setStartAid(!0), m(null), t.setCounter({ mode: "tawaf", done: r.valid, progress: 0, invalid: !1 });
        break;
      }
      case "toMaqam": {
        i.setStartAid(!1), t.setCounter({ mode: null }), m(Qe(Xn[0] + 3.6, Xn[1]));
        break;
      }
      case "toSafa": {
        t.setCounter({ mode: null }), m([dt.xc, dt.safaZone + 5]);
        break;
      }
      case "sai": {
        m([dt.xc, dt.marwaZone - 5]),
          t.setCounter({ mode: "sai", done: a.lap, progress: 0, target: a.target }),
          (a.green = !1),
          v(s.sai, { text: s.sai.toward("المروة"), say: "" }),
          t.setAction(s.sai.walk, !1);
        break;
      }
      case "tahallul": {
        m(null), t.setCounter({ mode: null }), v(s.tahallul), t.setAction(s.tahallul.action, !0);
        break;
      }
      default:
        break;
    }
  }
  (n.start = (I) => {
    (n.gender = I), (s = jc(I)), u(), (n.clock = 0);
    let [A, L] = p();
    e.teleport(A, L, -A, -L), b("ihram", "niyyah");
  }),
    (n.jump = (I) => {
      if ((w++, u(), t.setVeil(""), t.fadeTo(0), I === "ihram")) return n.start(n.gender);
      if (I === "tawaf") {
        let L = we - 0.28;
        e.teleport(Math.cos(L) * 14, -Math.sin(L) * 14, -Math.cos(we), Math.sin(we)), b("toStart");
      } else if (I === "prayer") {
        r.valid = 7;
        let A = Qe(Xn[0] + 9, Xn[1] + 2);
        e.teleport(A[0], A[1], -A[0], -A[1]), b("toMaqam");
      } else
        I === "sai"
          ? ((r.valid = 7), e.teleport(dt.xc - 3, dt.safaZone + 6, 0, -1), b("toSafa"))
          : I === "tahallul" &&
            ((r.valid = 7), (a.lap = 7), e.teleport(dt.xc - 3, dt.marwaZone - 5, 0, 1), b("tahallul"));
    }),
    (n.fastToSafa = () => {
      t.fadeTo(1),
        setTimeout(() => {
          e.teleport(dt.xc - 3, dt.safaZone + 7, 0, -1), t.fadeTo(0);
        }, 380);
    }),
    (n.act = () => {
      let I = e.getPos();
      switch (n.stage) {
        case "ihram":
          n.sub === "niyyah"
            ? (t.toast(n.gender === "f" ? s.toasts.niyyahF : s.toasts.niyyah, "ok"), b("ihram", "talbiya"))
            : b("toStart");
          break;
        case "toStart":
          Zc(I.x, I.z) && C(I);
          break;
        case "tawaf":
          r.takbirWindow > 0 && ((r.takbirWindow = 0), o.takbir++, t.toast(s.toasts.takbir, "ok", 1.6));
          break;
        case "toMaqam":
          $c(I.x, I.z) && D();
          break;
        case "toSafa":
          cl(I.x, I.z) && x();
          break;
        case "sai":
          a.duaReady && ((a.duaReady = !1), o.dua++, t.toast(s.toasts.dua, "ok", 1.8));
          break;
        case "tahallul":
          P();
          break;
        default:
          break;
      }
    });
  function C(I) {
    (r.last = qr(I.x, I.z)),
      (r.cum = ll(r.last - we)),
      (r.maxCum = r.cum),
      (r.laps = 0),
      (r.valid = 0),
      (r.roundOk = !0),
      (r.inHijr = qc(I.x, I.z)),
      o.takbir++,
      (o.start = n.clock),
      t.toast(s.toasts.takbir, "ok", 1.6),
      b("tawaf");
  }
  function y(I) {
    return I > 6.08
      ? "near"
      : I > 4.95
        ? "between"
        : I > 4.42
          ? "yamani"
          : I > 1.15 && I < 3.35
            ? "hijr"
            : "base";
  }
  function E(I, A) {
    let L = qr(I.x, I.z),
      T = ll(L - r.last);
    (r.last = L),
      Math.abs(T) < 0.6 && (r.cum += T),
      r.cum > r.maxCum && (r.maxCum = r.cum),
      (h -= A),
      r.maxCum - r.cum > 0.35 &&
        h <= 0 &&
        (o.wrong++, (h = 6), t.toast(s.toasts.wrong, "warn", 4), f(s.toasts.wrong));
    let F = qc(I.x, I.z);
    for (
      F && !r.inHijr && ((r.roundOk = !1), o.hijr++, t.toast(s.toasts.hijr, "warn", 5), f(s.toasts.hijr)),
        r.inHijr = F;
      r.cum >= le * (r.laps + 1);

    ) {
      if (
        (r.laps++,
        r.roundOk
          ? (r.valid++,
            r.valid < 7 && (t.toast(s.toasts.roundDone(r.valid), "ok", 2.6), f(s.toasts.roundDone(r.valid))))
          : (o.invalid++, t.toast(s.toasts.roundInvalid, "warn", 4.5), f(s.toasts.roundInvalid)),
        (r.roundOk = !r.inHijr),
        r.valid >= 7)
      ) {
        t.toast(s.toasts.tawafDone, "ok", 3.5), b("toMaqam");
        return;
      }
      r.takbirWindow = 7;
    }
    n.gender === "m" && r.valid < 3 && e.moving && ((o.ramalMove += A), e.isJogging() && (o.ramalT += A));
    let H = (((L - we) % le) + le) % le,
      V = y(H),
      Q = n.gender === "m" && r.valid < 3,
      G = `${V}|${Q}`;
    if (G !== c) {
      c = G;
      let tt = s.tawaf,
        At = tt.base + (Q ? " " + tt.ramal : ""),
        Et = "";
      V === "hijr"
        ? (At = tt.hijr)
        : V === "yamani"
          ? (At = tt.yamani)
          : V === "between"
            ? ((At = tt.between), (Et = si.rabbana))
            : V === "near" && (At = tt.near),
        t.setRite("tawaf"),
        t.setCard({ title: tt.title, text: At, say: Et });
    }
    (r.takbirWindow = Math.max(0, r.takbirWindow - A)),
      r.takbirWindow > 0 ? t.setAction(s.tawaf.takbir, !0) : t.setAction(s.tawaf.walk, !1);
    let j = (r.cum - le * r.laps) / le;
    t.setCounter({ mode: "tawaf", done: r.valid, progress: j, invalid: !r.roundOk });
  }
  let w = 0;
  function D() {
    n.stage = "prayer";
    let I = ++w;
    t.setAction("", !1),
      t.fadeTo(0.88),
      t.setVeil(s.toMaqam.prayer),
      f(g(s.toMaqam.prayer)),
      setTimeout(() => {
        I !== w || n.stage !== "prayer" || (t.setVeil(""), t.fadeTo(0), b("toSafa"));
      }, 5200);
  }
  function x() {
    (a.lap = 0),
      (a.target = "marwa"),
      (a.left = !1),
      (a.duaReady = !1),
      o.dua++,
      t.toast(s.toasts.takbir, "ok", 1.6),
      b("sai");
  }
  function M(I, A) {
    let L = cl(I.x, I.z),
      T = Kc(I.x, I.z);
    if (
      (!L && !T && ((a.left = !0), (a.duaReady = !1)),
      (a.target === "marwa" && T) || (a.target === "safa" && L))
    ) {
      a.lap++;
      let At =
        a.target === "marwa" ? "المروة" : "الصفا";
      if (((a.left = !1), a.lap >= 7)) {
        t.toast(s.toasts.lapDone(7, At), "ok", 3), b("tahallul");
        return;
      }
      t.toast(s.toasts.lapDone(a.lap, At), "ok", 2.6),
        (a.target = a.target === "marwa" ? "safa" : "marwa"),
        (a.duaReady = !0),
        v(s.sai, { text: s.sai.atEnd(At), say: si.hill, speak: !1 }),
        f(s.toasts.lapDone(a.lap, At)),
        m(a.target === "marwa" ? [dt.xc, dt.marwaZone - 5] : [dt.xc, dt.safaZone + 5]),
        (c = "end");
    }
    let H = (a.target === "marwa" && L) || (a.target === "safa" && T);
    (d -= A),
      a.left &&
        H &&
        d <= 0 &&
        ((d = 6),
        (a.left = !1),
        t.toast(
          s.toasts.incomplete(
            a.target === "marwa" ? "المروة" : "الصفا",
          ),
          "warn",
          4,
        ));
    let V = yd(I.x, I.z);
    V && e.moving && ((o.greenT += A), e.isJogging() && (o.jogT += A));
    let Q = a.target === "marwa" ? "المروة" : "الصفا",
      G = a.duaReady ? "end" : V ? "green" : `walk-${Q}`;
    G !== c &&
      ((c = G),
      G === "green"
        ? t.setCard({ title: s.sai.title, text: s.sai.green, say: "" })
        : G !== "end" && t.setCard({ title: s.sai.title, text: s.sai.toward(Q), say: "" }),
      t.setRite("sai")),
      t.setAction(a.duaReady ? s.sai.dua : s.sai.walk, a.duaReady);
    let j = dt.safaZone - dt.marwaZone,
      tt = (dt.safaZone - I.z) / j;
    a.target === "safa" && (tt = 1 - tt),
      t.setCounter({ mode: "sai", done: a.lap, progress: Math.max(0, Math.min(1, tt)), target: a.target });
  }
  function P() {
    (n.stage = "done"), m(null), t.setAction("", !1);
    let I = Math.round(n.clock),
      A = Math.floor(I / 60),
      L = String(I % 60).padStart(2, "0"),
      T = [
        ["مدة التدريب", `${De(A)}:${De(L)}`],
        [
          "أشواط الطواف المحتسبة",
          `${De(7)} من ${De(7)}`,
        ],
        [
          "أشواط أُعيدت بسبب دخول الحِجر",
          De(o.invalid),
        ],
        [
          "تنبيهات عكس الاتجاه",
          De(o.wrong),
        ],
        [
          "التكبير عند محاذاة الحجر الأسود",
          `${De(Math.min(o.takbir, 7))} من ${De(7)}`,
        ],
      ];
    if (n.gender === "m") {
      let H = (V, Q) => (Q > 1 ? `${De(Math.round((100 * V) / Q))}٪` : "\u2014");
      T.push([
        "الرَّمَل في الأشواط الثلاثة الأولى",
        H(o.ramalT, o.ramalMove),
      ]),
        T.push([
          "الإسراع بين العلمين الأخضرين",
          H(o.jogT, o.greenT),
        ]);
    }
    T.push([
      "الوقوف للدعاء على الصفا والمروة",
      `${De(Math.min(o.dua, 8))} من ${De(8)}`,
    ]);
    let F = o.hijr === 0 && o.wrong === 0;
    n.onFinish &&
      n.onFinish({ title: s.done.title, sub: s.done.sub, rows: T, note: F ? s.done.clean : s.done.review });
  }
  return (
    (n.update = (I) => {
      if (n.stage === "intro" || n.stage === "done") return;
      n.clock += I;
      let A = e.getPos();
      switch (n.stage) {
        case "toStart": {
          let L = Zc(A.x, A.z);
          if (L !== l) {
            let T = l === null;
            (l = L),
              L
                ? (v(s.atStart), t.setAction(s.atStart.action, !0))
                : (v(s.toStart, { speak: T }), t.setAction(s.toStart.hint, !1));
          }
          break;
        }
        case "tawaf":
          E(A, I);
          break;
        case "toMaqam": {
          let L = $c(A.x, A.z);
          if (L !== l) {
            let T = l === null;
            (l = L), v(s.toMaqam, { speak: T }), t.setAction(L ? s.toMaqam.action : s.toMaqam.hint, L);
          }
          break;
        }
        case "toSafa": {
          let L = cl(A.x, A.z);
          if (L !== l) {
            let T = l === null;
            (l = L),
              L
                ? (v(s.atSafa), t.setAction(s.atSafa.action, !0))
                : (v(s.toSafa, { btn: s.toSafa.fast, speak: T }), t.setAction(s.toSafa.hint, !1));
          }
          !L && Kc(A.x, A.z) && d <= 0 && ((d = 6), t.toast(s.toasts.saiFromSafa, "warn", 3.5)), (d -= I);
          break;
        }
        case "sai":
          M(A, I);
          break;
        default:
          break;
      }
    }),
    (n.debug = () => ({ stage: n.stage, sub: n.sub, T: { ...r }, A: { ...a }, stats: { ...o } })),
    n
  );
}
