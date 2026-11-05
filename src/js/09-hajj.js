// الحج بالتمتّع: عمرة كاملة (09-game.js كما هي)، ثم أيام الحج في مشاعر 03-mashair.js:
//   التروية: الإحرام بالحج والتلبية، والمبيت بمنى
//   عرفة: دخول الحدود، والوقوف حتى الغروب دون الخروج منها
//   مزدلفة: المغرب والعشاء جمعًا، والتقاط الحصى، والمبيت، والذكر عند المشعر الحرام
//   النحر: رمي جمرة العقبة سبعًا، والهدي، والحلق أو التقصير، وطواف الإفاضة وسعي الحج (09-game.js بـ tawafKind)
//   التشريق: المبيت بمنى، ورمي الجمرات الثلاث بالترتيب كل يوم والدعاء بعد الصغرى والوسطى، ثم التعجّل أو التأخّر
//   الوداع: طواف الوداع، ثم الملخص
// النصوص في jc(gender).hajj وsi في 04-content.js، وهي مسودة تحتاج مراجعة مختص (docs/hajj-texts-review.md).
// قاعدة CLAUDE.md: لا يُنطق إلا العنوان وأول جملة من النص، ولا يمرّ say ولا si.* إلى النطق.
var HAJJ_TRAVEL_MS = 1300; // الانتقال بين المواقع خلف التعتيم
var HAJJ_WAIT_MS = 3200; // المبيت والصلاة خلف الحجاب
var ARAFAH_STAND = 6; // ثوانٍ (بزمن الإطارات) داخل حدود عرفة حتى الغروب
var HAJJ_STEP_RAIL = {
  niyyah: 1, talbiya: 1, toMina: 1, minaNight: 1,
  toArafah: 2, enterArafah: 2, stand: 2,
  toMuzdalifah: 3, muzPrayer: 3, pebbles: 3, muzNight: 3, mashar: 3,
  toMinaNahr: 4, aqaba: 4, hady: 4, shave: 4, toIfadah: 4, ifadah: 4, backToMina: 4,
  minaTashreeq: 5, stoning: 5, dayDone: 5, choice: 5,
  toWada: 6, wada: 6,
};

function createHajj({ game, hud, player, mashair, atmosphere }) {
  const h = { enabled: false, step: null, busy: false, day: 11, onFinish: null };
  let T = jc("m").hajj;
  let st = null;
  let token = 0; // يُلغي ما بقي من انتقال أو انتظار إذا أعيد التدريب
  const speak = (title, text = "") => hud.speak(text ? `${title}. ${(text || "").split(/[.؛:]/)[0]}` : title);
  const card = (c, { say = c.say || "", btn = null, title = c.title, text = c.text, quiet = false } = {}) => {
    hud.setCard({ title, text, say, btn });
    if (!quiet) speak(title, text);
  };
  const target = (p) => (hud.setTarget(p), mashair.setTarget(p));
  const fresh = () => ({
    umrah: null, ihram: false, stood: false, standT: 0, outArafah: 0, outT: 0, muzPrayer: false, muzNight: false, mashar: false,
    pebbles: 0, aqaba: 0, wrongNahr: 0, hady: false, shave: false, ifadah: 0, saiHajj: 0, tawafWarn: 0,
    tashreeq: 0, tashreeqTotal: 42, orderErr: 0, dua: 0, duaTotal: 4, wada: 0, stayed: false,
  });
  // الرمي: الجمرة المطلوبة، وعدد ما رُمي فيها، والدعاء بعدها
  const throwState = { order: 0, count: 0, duaFor: null };
  const jamrah = (k) => MINA_JAMARAT.find((j) => j.k === k);
  const front = (j) => [j.x, j.z + JAMRAH_BASIN + 2]; // يُقبَل على الحوض من جهة الخيام

  h.setKind = (kind) => {
    h.enabled = kind === "hajj";
    hud.setRail(h.enabled ? HAJJ_RAIL : null, 0);
  };
  // تدريب جديد: من المسجد الحرام بلا مواقع، ومن العمرة
  h.reset = (gender) => {
    token++;
    T = jc(gender).hajj;
    st = fresh();
    h.step = null;
    h.busy = false;
    if (mashair.site) mashair.enter(null);
    hud.setSite(null);
    hud.setVeil("");
    if (atmosphere.chosen && atmosphere.time !== atmosphere.chosen) atmosphere.setTime(atmosphere.chosen, { save: false });
    hud.setRail(h.enabled ? HAJJ_RAIL : null, 0);
    if (h.enabled) setTimeout(() => game.stage === "ihram" && hud.toast(T.intro, "info", 5), 6500);
  };

  // ——— الانتقال والانتظار ———
  function travel(siteKey, spawn, title, then) {
    const my = ++token;
    h.busy = true;
    hud.setAction("", false);
    hud.fadeTo(1);
    hud.setVeil(title, "الانتقال");
    setTimeout(() => {
      if (my !== token) return;
      mashair.enter(siteKey);
      const site = siteKey ? mashair.sites[siteKey] : null;
      hud.setSite(site);
      atmosphere.setTime(site ? site.time : atmosphere.chosen || DEFAULT_TIME, { save: false });
      if (spawn) player.teleport(spawn[0], spawn[1], spawn[2], spawn[3]);
      hud.setVeil("");
      hud.fadeTo(0);
      h.busy = false;
      then();
    }, HAJJ_TRAVEL_MS);
  }
  function wait(title, text, then) {
    const my = ++token;
    h.busy = true;
    hud.setAction("", false);
    hud.fadeTo(0.85);
    hud.setVeil(text, title);
    setTimeout(() => {
      if (my !== token) return;
      hud.setVeil("");
      hud.fadeTo(0);
      h.busy = false;
      then();
    }, HAJJ_WAIT_MS);
  }
  const toMina = (spawn, then) => travel("mina", mashair.sites.mina.spawns[spawn], "إلى منى", then);

  // ——— الخطوات ———
  const go = (step) => {
    h.step = step;
    hud.setRailStep(HAJJ_STEP_RAIL[step] ?? 0);
    hud.setCounter({ mode: null });
    target(null);
    STEPS[step].enter();
  };
  const simple = (c, next, { enabled = true } = {}) => ({
    enter: () => (card(T[c]), hud.setAction(T[c].action, enabled)),
    act: next,
  });
  const STEPS = {
    niyyah: simple("niyyah", () => ((st.ihram = true), hud.toast(T.niyyah.done, "ok", 2), go("talbiya"))),
    talbiya: simple("talbiya", () => go("toMina")),
    toMina: simple("toMina", () => toMina("tents", () => go("minaNight"))),
    minaNight: simple("minaNight", () => wait(T.minaNight.veil, T.minaNight.text, () => go("toArafah"))),
    toArafah: simple("toArafah", () => travel("arafat", mashair.sites.arafat.spawns.road, "إلى عرفة", () => go("enterArafah"))),
    enterArafah: {
      enter: () => (card(T.enterArafah), target([0, ARAFAT_R - 10])),
      update: (p) => {
        const inside = mashair.sites.arafat.inside(p.x, p.z);
        hud.setAction(inside ? T.enterArafah.action : T.enterArafah.hint, inside);
      },
      act: (p) => mashair.sites.arafat.inside(p.x, p.z) && go("stand"),
      walk: true,
    },
    stand: {
      enter: () => {
        st.standT = 0;
        card(T.stand);
        hud.setAction(game.gender === "f" ? T.stand.waitF : T.stand.wait, false);
      },
      update: (p, dt) => {
        if (mashair.sites.arafat.inside(p.x, p.z)) st.standT += dt;
        else if ((st.outT -= dt) <= 0) (st.outArafah++, (st.outT = 5), hud.toast(T.toasts.outArafah, "warn", 4), speak(T.toasts.outArafah));
        const done = Math.min(7, Math.floor((st.standT / ARAFAH_STAND) * 7));
        hud.setCounter({ mode: "jamrah", done, label: "الوقوف حتى الغروب" });
        if (st.standT >= ARAFAH_STAND) {
          st.stood = true;
          atmosphere.setTime("night", { save: false }); // غربت الشمس
          go("toMuzdalifah");
        }
      },
    },
    toMuzdalifah: simple("toMuzdalifah", () => travel("muzdalifah", mashair.sites.muzdalifah.spawns.road, "إلى مزدلفة", () => go("muzPrayer"))),
    muzPrayer: simple("muzPrayer", () => wait(T.muzPrayer.veil, T.muzPrayer.text, () => ((st.muzPrayer = true), go("pebbles")))),
    pebbles: {
      enter: () => (card(T.pebbles), target([MUZ_PEBBLES.x, MUZ_PEBBLES.z])),
      update: (p) => {
        const at = mashair.sites.muzdalifah.atPebbles(p.x, p.z);
        hud.setAction(at ? T.pebbles.action : T.pebbles.hint, at);
      },
      act: (p) => mashair.sites.muzdalifah.atPebbles(p.x, p.z) && ((st.pebbles = 7), hud.toast(T.pebbles.done, "ok", 2), go("muzNight")),
      walk: true,
    },
    muzNight: simple("muzNight", () =>
      wait(T.muzNight.veil, T.muzNight.text, () => ((st.muzNight = true), atmosphere.setTime("duha", { save: false }), go("mashar"))),
    ),
    mashar: {
      enter: () => (card(T.mashar), target([MUZ_MASHAR.x, MUZ_MASHAR.z + MUZ_MASHAR.d / 2 + 6])),
      update: (p) => {
        const at = mashair.sites.muzdalifah.atMashar(p.x, p.z);
        hud.setAction(at ? T.mashar.action : T.mashar.hint, at);
      },
      act: (p) => mashair.sites.muzdalifah.atMashar(p.x, p.z) && ((st.mashar = true), go("toMinaNahr")),
      walk: true,
    },
    toMinaNahr: simple("toMinaNahr", () => toMina("nahr", () => go("aqaba"))),
    aqaba: {
      enter: () => {
        Object.assign(throwState, { order: 2, count: 0, duaFor: null });
        card(T.aqaba);
        target(front(jamrah("aqaba")));
      },
      update: (p) => stoningUpdate(p, true),
      act: (p) => stone(p, true),
      walk: true,
    },
    hady: simple("hady", () => ((st.hady = true), go("shave"))),
    shave: simple("shave", () => ((st.shave = true), hud.toast(T.shave.done, "ok", 3), go("toIfadah"))),
    toIfadah: simple("toIfadah", () =>
      travel(null, null, "إلى مكة", () => {
        h.step = "ifadah";
        game.beginTawaf("ifadah");
      }),
    ),
    backToMina: simple("backToMina", () => toMina("tents", () => go("minaTashreeq"))),
    minaTashreeq: simple("minaTashreeq", () => night(() => ((h.day = 11), go("stoning")))),
    stoning: {
      enter: () => {
        Object.assign(throwState, { order: 0, count: 0, duaFor: null });
        st.pebbles = 21;
        const d = T.day[h.day - 11];
        card(T.stoning, { title: T.stoning.title(d) });
        hud.toast(T.stoning.pebbles, "info", 2.5);
        target(front(MINA_JAMARAT[0]));
      },
      update: (p) => stoningUpdate(p, false),
      act: (p) => stone(p, false),
      walk: true,
    },
    dayDone: {
      enter: () => (card(T.dayDone), hud.setAction(T.minaTashreeq.action, true)),
      act: () => night(() => (h.day++, go("stoning"))),
    },
    choice: {
      enter: () => (card(T.choice, { btn: T.choice.stay }), hud.setAction(T.choice.leave, true)),
      act: () => go("toWada"),
      cardBtn: () => ((st.stayed = true), (st.tashreeqTotal = 63), (st.duaTotal = 6), night(() => ((h.day = 13), go("stoning")))),
    },
    toWada: simple("toWada", () =>
      travel(null, null, "إلى مكة", () => {
        h.step = "wada";
        game.beginTawaf("wada");
      }),
    ),
  };
  // المبيت بمنى، ثم الرمي بعد الزوال من مدخل الجمرات
  function night(then) {
    wait(T.minaTashreeq.veil, T.minaTashreeq.text, () => {
      player.teleport(...mashair.sites.mina.spawns.jamarat);
      then();
    });
  }

  // ——— الرمي ———
  function stoningUpdate(p, nahr) {
    const n = mashair.nearestJamrah(p.x, p.z);
    const want = MINA_JAMARAT[throwState.order];
    if (throwState.duaFor) {
      // الدعاء بعد الصغرى والوسطى: قريبًا منها. ومن مضى إلى التالية فاته
      const near = Math.hypot(p.x - throwState.duaFor.x, p.z - throwState.duaFor.z) < 16;
      if (near) return hud.setAction(T.duaAfter.action, true);
      throwState.duaFor = null;
      hud.toast(T.toasts.noDua, "warn", 3);
      card(T.stoning, { title: T.stoning.title(T.day[h.day - 11]), quiet: true });
    }
    const inRange = n.d <= THROW_RANGE;
    hud.setAction(inRange ? T.throw : nahr ? T.aqaba.hint : T.stoning.hint(want.name), inRange);
    hud.setCounter({ mode: "jamrah", done: throwState.count, label: `${want.name}: ${De(throwState.count)} من ${De(7)}` });
  }
  function stone(p, nahr) {
    if (throwState.duaFor) {
      st.dua++;
      throwState.duaFor = null;
      card(T.stoning, { title: T.stoning.title(T.day[h.day - 11]), quiet: true });
      return target(front(MINA_JAMARAT[throwState.order]));
    }
    const n = mashair.nearestJamrah(p.x, p.z);
    if (n.d > THROW_RANGE) return hud.toast(T.toasts.tooFar, "warn", 2.5);
    const want = MINA_JAMARAT[throwState.order];
    if (n.j !== want) {
      if (nahr) st.wrongNahr++, hud.toast(T.toasts.wrongJamrahNahr, "warn", 3.5), speak(T.toasts.wrongJamrahNahr);
      else st.orderErr++, hud.toast(T.toasts.wrongOrder, "warn", 3.5), speak(T.toasts.wrongOrder);
      return;
    }
    const from = new Vector3();
    player.rig.children[0].getWorldPosition(from);
    mashair.throwPebble(from.setY(from.y - 0.25), want);
    throwState.count++;
    st.pebbles--;
    if (nahr) st.aqaba++;
    else st.tashreeq++;
    hud.setCounter({ mode: "jamrah", done: throwState.count, label: `${want.name}: ${De(throwState.count)} من ${De(7)}` });
    if (throwState.count < 7) return;
    hud.toast(T.toasts.stoned(want.name), "ok", 2.4);
    if (nahr) return go("hady");
    throwState.count = 0;
    throwState.order++;
    if (throwState.order < 3) {
      throwState.duaFor = want;
      card(T.duaAfter);
      return target(null);
    }
    go(h.day === 12 && !st.stayed ? "choice" : h.day >= 13 ? "toWada" : "dayDone");
  }

  // ——— مع منطق العمرة (09-game.js) ———
  // بعد سعي الحج، وبعد ركعتي الوداع: يعود الحج
  game.onStage = (stage) => {
    if (h.step === "ifadah" && stage === "tahallul") {
      const d = game.debug();
      st.ifadah = d.T.valid;
      st.saiHajj = d.A.lap;
      st.tawafWarn += d.stats.hijr + d.stats.wrong;
      game.stage = "hajj";
      hud.toast(T.fullTahallul, "ok", 3);
      go("backToMina");
      return true;
    }
    if (h.step === "wada" && stage === "toSafa") {
      const d = game.debug();
      st.wada = d.T.valid;
      st.tawafWarn += d.stats.hijr + d.stats.wrong;
      finish();
      return true;
    }
    return false;
  };
  // بعد تحلّل العمرة يبدأ الحج، بدل ملخص العمرة
  h.afterUmrah = () => {
    const d = game.debug();
    st.umrah = { valid: d.T.valid, warn: d.stats.hijr + d.stats.wrong, sai: d.A.lap };
    game.stage = "hajj";
    go("niyyah");
  };

  h.act = () => {
    if (h.busy || !h.step || !STEPS[h.step] || !STEPS[h.step].act) return;
    STEPS[h.step].act(player.getPos());
  };
  h.cardBtn = () => !h.busy && STEPS[h.step] && STEPS[h.step].cardBtn && STEPS[h.step].cardBtn();
  h.update = (dt) => {
    if (game.stage !== "hajj" || h.busy || !h.step) return;
    const s = STEPS[h.step];
    if (s && s.update) s.update(player.getPos(), dt);
    hud.refreshCardBtn(); // زر «تعلّم سريع» يظهر ما دام الهدف بعيدًا
  };
  // «تعلّم سريع» (09-fast.js): يمشي إلى الهدف حيث تحتاج الخطوة مشيًا
  h.walking = () => game.stage === "hajj" && !h.busy && STEPS[h.step] && STEPS[h.step].walk && !!hud.model.target && !hud.model.action.enabled;

  // القائمة: الانتقال إلى يوم من أيام الحج (يبدأ من الحج نفسه، وعمرة التمتّع لم تُؤدَّ في هذا التدريب)
  h.jump = (key) => {
    if (!h.enabled) h.setKind("hajj");
    h.reset(game.gender);
    game.stage = "hajj";
    hud.setAction("", false);
    const jamarat = (spawn, then) => toMina(spawn, then);
    if (key === "tarwiyah") travel(null, [dt.xc - 3, dt.marwaZone - 5, 0, 1], "مكة", () => go("niyyah"));
    else if (key === "arafah") (st.ihram = true), STEPS.toArafah.act();
    else if (key === "muzdalifah") (st.ihram = st.stood = true), travel("muzdalifah", mashair.sites.muzdalifah.spawns.road, "إلى مزدلفة", () => go("muzPrayer"));
    else if (key === "nahr") Object.assign(st, { ihram: true, stood: true, muzPrayer: true, muzNight: true, mashar: true, pebbles: 7 }), jamarat("nahr", () => go("aqaba"));
    else if (key === "tashreeq")
      Object.assign(st, { ihram: true, stood: true, muzPrayer: true, muzNight: true, mashar: true, hady: true, shave: true }), jamarat("jamarat", () => ((h.day = 11), go("stoning")));
    else if (key === "wada") go("toWada");
  };

  function finish() {
    const yes = "تمّ";
    const of7 = (n) => `${De(n)} من ${De(7)}`;
    const u = st.umrah;
    const rows = [
      ["عمرة التمتّع", u ? `${of7(u.valid)} طواف، و${of7(u.sai)} سعي` : "—"],
      ["الإحرام بالحج يوم التروية", st.ihram ? yes : "—"],
      ["الوقوف بعرفة حتى الغروب", st.stood ? yes : "—"],
      ["الخروج من حدود عرفة قبل الغروب", De(st.outArafah)],
      ["المبيت بمزدلفة والذكر عند المشعر الحرام", st.muzNight && st.mashar ? yes : "—"],
      ["رمي جمرة العقبة يوم النحر", of7(st.aqaba)],
      ["الهدي، والحلق أو التقصير", st.hady && st.shave ? yes : "—"],
      ["طواف الإفاضة وسعي الحج", st.ifadah ? `${of7(st.ifadah)}، و${of7(st.saiHajj)}` : "—"],
      ["رمي الجمرات أيام التشريق", `${De(st.tashreeq)} من ${De(st.tashreeqTotal)}`],
      ["رمي في غير موضعه أو بغير ترتيب", De(st.wrongNahr + st.orderErr)],
      ["الدعاء بعد الصغرى والوسطى", `${De(st.dua)} من ${De(st.duaTotal)}`],
      ["طواف الوداع", of7(st.wada)],
      ["تنبيهات الطواف: الحِجر وعكس الاتجاه", De(st.tawafWarn + (u ? u.warn : 0))],
    ];
    const clean = !st.outArafah && !st.wrongNahr && !st.orderErr && !st.tawafWarn && !(u && u.warn);
    h.step = null;
    game.stage = "done";
    target(null);
    hud.setCounter({ mode: null });
    const s = jc(game.gender);
    h.onFinish && h.onFinish({ title: T.done.title, sub: s.done.sub, rows, note: clean ? T.done.clean : T.done.review });
  }
  h.stats = () => ({ ...st, step: h.step, day: h.day, throw: { ...throwState, duaFor: throwState.duaFor && throwState.duaFor.k } });
  st = fresh();
  return h;
}
