// المشي الموجّه في الجوال: اتجاه مسار المنسك من موضع اللاعب. يستعمله 10-modes.js حين يدفع اللاعب العصا إلى الأمام،
// فيمشي على المسار ويلتفت معه، ولا يحتاج أن يدير الجوال ولا أن يصوّب بدقة.
//
//   الطواف          حول الكعبة على البعد نفسه منها، ويبتعد حول الحِجر ثم يعود. والكعبة عن اليسار،
//                   إلا لمن ينظر عكس الاتجاه بوضوح: فيمشي عكسه ويُنبَّه، كما لو مشى بلا توجيه
//   إلى الهدف       بداية الطواف، والمقام، والصفا: إلى الهدف، وحول الكعبة إن كانت في الطريق، ومن الممر إلى المسعى
//   السعي           إلى الصفا أو المروة بحسب الشوط. الذاهب إلى المروة غربي الحاجز، والعائد شرقيه (كالحشود)
//   غير ذلك         لا توجيه: المشي في اتجاه السير
var GUIDE_LOOKAHEAD = 2.5; // متر: نقطة المسار التي يتجه إليها اللاعب
var GUIDE_STAGES = { toStart: 1, toMaqam: 1, toSafa: 1, sai: 1 };
// أفضل موضع للمنسك، يأخذه «مشي مستمر» ما لم يعدّل اللاعب:
var TAWAF_BEST_R = 13; // متر من مركز الكعبة: بين الكعبة والمقام، فالشوط أقصر والكعبة قريبة. ويبتعد حول الحِجر ثم يعود
var MASA_BEST_LANE = 4; // متر عن وسط الحاجز: وسط المسار، الذاهب إلى المروة غربيه والعائد شرقيه
var BEST_APPROACH = 0.8; // متر في الثانية: سرعة الاقتراب من أفضل بعد عن الكعبة
var TAWAF_LOOK = (50 * Math.PI) / 180; // النظر في طواف «مشي مستمر»: من اتجاه السير نحو الكعبة، فيُرى الطريق والكعبة معًا
var MAQAM_CLEAR = 2.6; // متر: أقرب ما يمرّ به المسار من مقام إبراهيم

function createRouteGuide({ game, hud, laneAt }) {
  const g = { sense: 0, rHold: 0 };
  const MAQAM_R = Math.hypot(Sn[0], Sn[1]);
  const MAQAM_PHI = Math.atan2(-Sn[1], Sn[0]);
  // أقرب ما يقترب المسار من الكعبة في كل زاوية: حدّ الحشود المنعَّم (03-crowds.js)، وأبعد عند الحِجر
  const keepOut = (phi) => laneAt(phi) + 0.6;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const unit = (dx, dz) => {
    const d = Math.hypot(dx, dz);
    return d < 1e-6 ? null : [dx / d, dz / d];
  };

  // نقطة أمام اللاعب على دائرة حول الكعبة: sense = 1 عكس عقارب الساعة (الكعبة عن اليسار)
  function around(x, z, sense, r) {
    const phi = Math.atan2(-z, x);
    const a = phi + (sense * GUIDE_LOOKAHEAD) / Math.max(4, Math.hypot(x, z));
    let rt = Math.max(r, keepOut(a));
    // حول مقام إبراهيم: المسار ينتفخ عنه إلى الجهة التي هو فيها (نحو الكعبة أو بعيدًا عنها)، بلا اصطدام
    const along = ll(a - MAQAM_PHI) * MAQAM_R;
    if (Math.abs(along) < MAQAM_CLEAR) {
      const clear = Math.sqrt(MAQAM_CLEAR * MAQAM_CLEAR - along * along);
      if (Math.abs(rt - MAQAM_R) < clear) rt = MAQAM_R + (rt < MAQAM_R ? -clear : clear);
    }
    return unit(Math.cos(a) * rt - x, -Math.sin(a) * rt - z);
  }
  // في خط مستقيم إلى نقطة، أو حولها إن كانت الكعبة أو الحِجر بين اللاعب والنقطة
  function direct(x, z, tx, tz) {
    const dx = tx - x;
    const dz = tz - z;
    const len2 = dx * dx + dz * dz;
    const t = len2 > 0 ? -(x * dx + z * dz) / len2 : 0;
    if (t > 0.02 && t < 0.98) {
      const cx = x + dx * t;
      const cz = z + dz * t;
      if (Math.hypot(cx, cz) < keepOut(Math.atan2(-cz, cx)) + 0.5) {
        const turn = ll(Math.atan2(-tz, tx) - Math.atan2(-z, x));
        return around(x, z, turn >= 0 ? 1 : -1, Math.hypot(x, z));
      }
    }
    return unit(dx, dz);
  }
  // داخل المسعى إلى طرف: على طوله، والحاجز الأوسط بين الذاهب والعائد
  function alongMasa(x, z, tx, tz, best) {
    const dz = tz - z;
    const s = Math.sign(dz);
    const D = dt.divider;
    let lane = x;
    if (best) {
      // أفضل موضع: وسط المسار، الذاهب إلى المروة غربي الحاجز والعائد شرقيه. ومن كان بجانب الحاجز في الجهة الأخرى بقي فيها
      const want = s < 0 ? -1 : 1;
      const beside = z > D.z0 - 1.2 && z < D.z1 + 1.2;
      // عند طرف الحاجز: يعبر إلى جهته أولًا، ثم يمشي
      if (!beside && (x - dt.xc) * want < 1.5) return unit(want, 0);
      lane = dt.xc + (beside && (x - dt.xc) * want < 0 ? -want : want) * MASA_BEST_LANE;
    } else if (z > D.z0 - 4 && z < D.z1 + 4 && Math.abs(x - dt.xc) < 2) lane = dt.xc + (s < 0 ? -2.5 : 2.5);
    lane = clamp(lane, dt.x0 + 1.5, dt.x1 - 1.5);
    return unit(clamp((lane - x) * 0.5, -0.6, 0.6), s);
  }
  const inMasa = (x, z) => x >= dt.x0 + 0.7 && z <= dt.walkS && z >= dt.walkM;
  const inPass = (x, z) => x >= dt.pass.x0 - 1 && x < dt.x0 + 0.7 && z >= dt.pass.z0 - 1 && z <= dt.pass.z1 + 1;
  // إلى الهدف، ومن المطاف إلى المسعى (أو العكس) عبر الممر
  function toTarget(x, z, tx, tz, best) {
    if (Math.hypot(tx - x, tz - z) < 0.8) return null; // وصل
    const P = dt.pass;
    const passZ = clamp(z, P.z0 + 2, P.z1 - 2);
    const targetInMasa = tx >= dt.x0;
    if (targetInMasa) {
      if (inMasa(x, z)) return Math.abs(tz - z) < 0.8 ? null : alongMasa(x, z, tx, tz, best);
      if (inPass(x, z)) return direct(x, z, dt.x0 + 3, passZ);
      return direct(x, z, P.x0 + 2, passZ);
    }
    if (inMasa(x, z)) {
      // من شرقي الحاجز: حول طرفه عند الصفا أولًا، فالممر غربيه
      const D = dt.divider;
      if (x > D.x0 - 0.3 && z < D.z1 + 1.5) return direct(x, z, dt.xc + 1.5, D.z1 + 2.5);
      return direct(x, z, dt.x0 + 0.5, passZ);
    }
    if (inPass(x, z)) return direct(x, z, P.x0 - 3, passZ);
    return direct(x, z, tx, tz);
  }

  // (x, z) موضع اللاعب، و(hx, hz) اتجاه سيره. fresh: بداية دفعة جديدة. side: تعديل اللاعب الجانبي (العصا أو السهمان).
  // auto: «مشي مستمر»، فالطواف والكعبة عن اليسار دائمًا. best: يأخذ أفضل موضع للمنسك (ما لم يعدّل اللاعب). step: زمن الإطار.
  // يعيد [dx, dz] اتجاه المشي، أو null للمشي في اتجاه الجسم
  g.direction = (x, z, hx, hz, fresh, side, auto = false, best = false, step = 0) => {
    const stage = game.stage;
    if (stage === "tawaf") {
      const r = Math.hypot(x, z);
      const phi = Math.atan2(-z, x);
      if (fresh || !g.sense || (auto && g.sense !== 1)) {
        // المماس عكس عقارب الساعة (-sin φ, -cos φ): من يتجه عكسه بوضوح يمشي عكسه
        g.sense = !auto && hx * -Math.sin(phi) + hz * -Math.cos(phi) < -0.5 ? -1 : 1;
        g.rHold = r;
      }
      if (Math.abs(side) > 0.15) g.rHold = r; // التعديل الجانبي يقرّب من الكعبة أو يبعد عنها
      // إلى أفضل بعد بهدوء، إلا بجوار المقام: يمرّ به من الجهة التي هو فيها ثم يكمل
      else if (best && Math.abs(ll(phi - MAQAM_PHI)) * MAQAM_R > MAQAM_CLEAR + 3)
        g.rHold += clamp(TAWAF_BEST_R - g.rHold, -BEST_APPROACH * step, BEST_APPROACH * step);
      return around(x, z, g.sense, g.rHold);
    }
    const T = hud.model.target;
    // في مشاعر الحج (SITE): إلى الهدف في خط مستقيم، والتصادم يدور حول الحوض والخيام
    if (SITE) return stage === "hajj" && T && Math.hypot(T[0] - x, T[1] - z) >= 0.8 ? unit(T[0] - x, T[1] - z) : null;
    if (!GUIDE_STAGES[stage] || !T) return null;
    // إلى بداية الطواف: خط الحجر الأسود على أفضل بعد للطواف، فيبدأ منه
    if (best && stage === "toStart") return toTarget(x, z, Math.cos(we) * TAWAF_BEST_R, -Math.sin(we) * TAWAF_BEST_R, best);
    return toTarget(x, z, T[0], T[1], best && stage === "sai");
  };
  g.arrivalFace = (stage) => (stage === "toStart" ? Ln.black : stage === "toMaqam" ? [0, 0] : null);
  // النظر المناسب في «مشي مستمر»، زاويةً عن اتجاه المسار (موجبة إلى اليسار): في الطواف نحو الكعبة، وفي غيره إلى الأمام
  g.lookOffset = (stage) => (stage === "tawaf" ? TAWAF_LOOK : 0);
  g.reset = () => (g.sense = 0);
  return g;
}
