// «تعلّم سريع»: زر في البطاقة يمشي عن اللاعب المقاطع الطويلة، ولا يختصر خطوة من المناسك:
//   إلى بداية الطواف، وإلى خلف المقام: يمشي حتى يضيء الزر الذهبي، ثم ينظر إلى الحجر الأسود أو الكعبة
//   الطواف «أكمل الشوط»: يمشي بقية الشوط والكعبة عن اليسار، حول الحِجر، حتى خط الحجر الأسود. والتكبير بعده على اللاعب
//   السعي «أكمل الشوط»: يمشي إلى الصفا أو المروة. والدعاء عند الطرف على اللاعب
// المشي بمنطق المناسك نفسه: game.update خطوة خطوة، خلف تعتيم قصير كالانتقال إلى الصفا.
// والهرولة كما ضبطها اللاعب قبل الزر، فيُحسب الرَّمَل والإسراع بين العلمين كما لو مشى. ومدة التدريب بالوقت الحقيقي.
var FAST_STEP = 0.5; // متر لكل خطوة من المشي المسرَّع
var FAST_FADE_MS = 380;

function createFastLearning({ game, hud, player, world, hajj }) {
  const f = { enabled: false, busy: false };
  const guide = createRouteGuide({ game, hud, laneAt: world.crowds.laneAt });

  // عنوان الزر في البطاقة، أو null حيث لا مقطع طويل (أو وصل اللاعب)
  f.label = () => {
    if (!f.enabled || f.busy) return null;
    const L = jc(game.gender).fast;
    if (game.stage === "hajj") return hajj.walking() ? L.toTarget : null; // في مشاعر الحج: إلى الجمرة، أو حدود عرفة...
    const p = player.getPos();
    if (game.stage === "toStart") return Zc(p.x, p.z) ? null : L.toStart;
    if (game.stage === "toMaqam") return $c(p.x, p.z) ? null : L.toMaqam;
    if (game.stage === "tawaf" || game.stage === "sai") return L.lap;
    return null;
  };

  function walk(stage) {
    if (game.stage !== stage) return;
    const clock = game.clock;
    const start = game.debug();
    let p = player.getPos();
    guide.sense = 1; // الكعبة عن اليسار
    guide.rHold = Math.hypot(p.x, p.z); // على البعد نفسه من الكعبة
    const done = () => {
      if (game.stage !== stage) return true; // الشوط السابع ينقل إلى المنسك التالي
      if (stage === "tawaf") return game.debug().T.laps > start.T.laps;
      if (stage === "sai") return game.debug().A.lap > start.A.lap;
      return hud.model.action.enabled;
    };
    for (let i = 0; i < 4000 && !done(); i++) {
      p = player.getPos();
      const d = guide.direction(p.x, p.z, 0, 0, false, 0);
      if (!d) break;
      const [nx, nz] = xd(p.x, p.z, p.x + d[0] * FAST_STEP, p.z + d[1] * FAST_STEP);
      if (Math.hypot(nx - p.x, nz - p.z) < 0.05) break; // علق
      player.teleport(nx, nz, d[0], d[1]);
      player.moving = true;
      game.update(FAST_STEP / (player.isJogging() ? 3.9 : 2.4));
    }
    player.moving = false;
    game.clock = clock;
    // بعد الوصول: إلى الحجر الأسود عند البداية، وإلى الكعبة خلف المقام وعلى الصفا والمروة
    const look = stage === "toStart" ? Ln.black : stage === "toMaqam" || stage === "sai" ? [0, 0] : null;
    if (look) (p = player.getPos()), player.teleport(p.x, p.z, look[0] - p.x, look[1] - p.z);
  }

  f.run = () => {
    const stage = game.stage;
    if (!f.label()) return;
    f.busy = true;
    hud.refreshCardBtn();
    hud.fadeTo(1);
    setTimeout(() => {
      walk(stage);
      hud.fadeTo(0);
      f.busy = false;
      hud.refreshCardBtn();
    }, FAST_FADE_MS);
  };
  return f;
}
