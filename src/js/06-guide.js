// المشي الموجّه في الجوال: اتجاه مسار المنسك من موضع اللاعب. يستعمله 10-modes.js حين يدفع اللاعب العصا إلى الأمام،
// فيمشي على المسار ويلتفت معه، ولا يحتاج أن يدير الجوال ولا أن يصوّب بدقة.
//
//   الطواف          حول الكعبة على البعد نفسه منها، ويبتعد حول الحِجر ثم يعود. والكعبة عن اليسار،
//                   إلا لمن ينظر عكس الاتجاه بوضوح: فيمشي عكسه ويُنبَّه، كما لو مشى بلا توجيه
//   إلى الهدف       بداية الطواف، والمقام، والصفا: إلى الهدف، وحول الكعبة إن كانت في الطريق، ومن الممر إلى المسعى
//   السعي           إلى الصفا أو المروة بحسب الشوط. الذاهب إلى المروة غربي الحاجز، والعائد شرقيه (كالحشود)
//   غير ذلك         لا توجيه: المشي في اتجاه النظر
var GUIDE_LOOKAHEAD = 2.5; // متر: نقطة المسار التي يتجه إليها اللاعب
var GUIDE_STAGES = { toStart: 1, toMaqam: 1, toSafa: 1, sai: 1 };

function createRouteGuide({ game, hud, laneAt }) {
  const g = { sense: 0, rHold: 0 };
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
    const rt = Math.max(r, keepOut(a));
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
  function alongMasa(x, z, tx, tz) {
    const dz = tz - z;
    const s = Math.sign(dz);
    const D = dt.divider;
    let lane = x;
    if (z > D.z0 - 4 && z < D.z1 + 4 && Math.abs(x - dt.xc) < 2) lane = dt.xc + (s < 0 ? -2.5 : 2.5);
    lane = clamp(lane, dt.x0 + 1.5, dt.x1 - 1.5);
    return unit(clamp((lane - x) * 0.5, -0.6, 0.6), s);
  }
  const inMasa = (x, z) => x >= dt.x0 + 0.7 && z <= dt.walkS && z >= dt.walkM;
  const inPass = (x, z) => x >= dt.pass.x0 - 1 && x < dt.x0 + 0.7 && z >= dt.pass.z0 - 1 && z <= dt.pass.z1 + 1;
  // إلى الهدف، ومن المطاف إلى المسعى (أو العكس) عبر الممر
  function toTarget(x, z, tx, tz) {
    if (Math.hypot(tx - x, tz - z) < 0.8) return null; // وصل
    const P = dt.pass;
    const passZ = clamp(z, P.z0 + 2, P.z1 - 2);
    const targetInMasa = tx >= dt.x0;
    if (targetInMasa) {
      if (inMasa(x, z)) return Math.abs(tz - z) < 0.8 ? null : alongMasa(x, z, tx, tz);
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

  // (x, z) موضع اللاعب، و(hx, hz) اتجاه نظره الأفقي. fresh: بداية دفعة جديدة للعصا. side: المشي الجانبي.
  // يعيد [dx, dz] اتجاه المشي، أو null للمشي في اتجاه النظر
  g.direction = (x, z, hx, hz, fresh, side) => {
    const stage = game.stage;
    if (stage === "tawaf") {
      const r = Math.hypot(x, z);
      const phi = Math.atan2(-z, x);
      if (fresh || !g.sense) {
        // المماس عكس عقارب الساعة (-sin φ, -cos φ): من ينظر عكسه بوضوح يمشي عكسه
        g.sense = hx * -Math.sin(phi) + hz * -Math.cos(phi) < -0.5 ? -1 : 1;
        g.rHold = r;
      }
      if (Math.abs(side) > 0.15) g.rHold = r; // المشي الجانبي يقرّب من الكعبة أو يبعد عنها
      return around(x, z, g.sense, g.rHold);
    }
    const T = hud.model.target;
    if (!GUIDE_STAGES[stage] || !T) return null;
    return toTarget(x, z, T[0], T[1]);
  };
  // بعد الوصول إلى ما يحتاج منسكًا: إلى أين ينظر اللاعب (الحجر الأسود عند بداية الطواف، والكعبة خلف المقام)
  g.arrivalFace = (stage) => (stage === "toStart" ? Ln.black : stage === "toMaqam" ? [0, 0] : null);
  g.reset = () => (g.sense = 0);
  return g;
}
