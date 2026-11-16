// أوضاع التدريب الأربعة. كلها تشترك في المشهد (03-world) والمنطق (09-game) واللاعب (06-player) واللوحات (07-panels).
// الوضع يقرّر: من أين يأتي النظر والمشي، وكيف يُختار الزر، وكيف يُرسم الإطار.
//
//   mobile     الجوال: اتجاه السير واتجاه النظر مستقلان. العصا العائمة وسهما الدوران لاتجاه السير وحده،
//              والسحب على الشاشة لاتجاه النظر وحده (والمستشعر اختياري)، واللمس على اللوحات.
//              والمشي الموجّه (06-guide.js): العصا إلى الأمام تمشي على مسار المنسك،
//              و«مشي مستمر» يأخذ أفضل موضع للمنسك ويمشيه باتجاه نظر مناسب، حتى ما يحتاج منسكًا
//   cardboard  علبة VR: صورتان جنبًا إلى جنب، والنظر بالمستشعر، والاختيار بالنظر ثانية واحدة أو بلمس الشاشة،
//              والمشي بزر «امشِ» أو بيد تحكم بلوتوث (Gamepad API أو أسهم لوحة المفاتيح)
//   desktop    الحاسوب: الأسهم وWASD وسحب الفأرة، والمسافة للمنسك، والنقر على اللوحات
//   xr         النظارة (WebXR): العصا اليسرى للمشي، واليمنى للدوران على دفعات، والزناد للاختيار
var MODE_NAMES = { mobile: "الجوال", cardboard: "علبة VR", desktop: "الحاسوب", xr: "النظارة" };
var DWELL_SECONDS = 1; // مدة النظر إلى زر لاختياره في علبة VR
var CARDBOARD_IPD = 0.064;
var CARDBOARD_FOV = 75; // زاوية الرؤية الرأسية لكل عين
// الجوال: اتجاه السير (player.yaw) واتجاه النظر (player.yaw + player.head) مستقلان:
//   العصا وسهما الدوران يغيّران اتجاه السير، والنظر يبقى على حاله. واللمس (السحب) يغيّر النظر، والسير على حاله.
//   ✓ (m.centerLook) يعيد النظر إلى اتجاه السير، وفي «مشي مستمر» إلى النظر المناسب للمنسك
var LOOK_CENTER_RATE = 8; // سرعة عودة النظرة بعد ✓ (لكل ثانية)
var BODY_TURN_RATE = 6; // سرعة أخذ اتجاه السير اتجاهَ مسار المنسك (لكل ثانية)
var STEER_RATE = 2; // راديان في الثانية والعصا إلى أقصى اليمين أو اليسار
var STEER_DEAD = 0.25; // ميل جانبي أصغر من هذا لا يدير: المشي المستقيم لا يحتاج إبهامًا دقيقًا
// سهما الدوران في الجوال: دوران ناعم لاتجاه السير ما دام الإصبع على الزر، يبدأ بهدوء ويقف بهدوء
var TURN_BTN_RATE = 1.5; // راديان في الثانية بعد أن يكتمل التسارع
var TURN_BTN_MIN = 0.15; // ثوانٍ: أقصر لمسة تدير هذه المدة ثم تقف بهدوء (نحو 13° في المجموع)
var TURN_BTN_EASE = 7; // سرعة بلوغ السرعة المطلوبة والوقوف (لكل ثانية)
// النظر الذي يأخذه «مشي مستمر» وحده: يلحق بالاتجاه المناسب بهدوء
var VIEW_EASE = 2.5; // لكل ثانية
var VIEW_MAX = 1.6; // راديان في الثانية على الأكثر: الالتفات الكامل نحو ثانيتين
var LOOK_BACK = (100 * Math.PI) / 180; // اتجاه السير أبعد من هذا عن النظر: اللاعب يمشي إلى خلف ما يراه، فينبض ✓
var ROUTE_BEND = 2; // راديان في الثانية: انحناء المسار الذي يدور النظر معه. وما فوقه قفزة في المسار لا يتبعها النظر
// شريط الأسهم على الأرض أمام اللاعب: يُري اتجاه السير حين يخالف اتجاه النظر أو حين يغيّره اللاعب
// ما يقوله «مشي مستمر» حين لا يمشي (تنبيه مكتوب، لا يُنطق)
var AUTO_WALK_HINTS = {
  action: "المشي المستمر ينتظر: أدِّ المنسك بالزر الذهبي، ثم يكمل وحده",
  noRoute: "لا مشي في هذه الخطوة. المشي المستمر يكمل حين يأتي ما يُمشى إليه",
  stuck: "توقف المشي المستمر: الطريق مسدود. تحرّك بالعصا قليلًا ثم شغّله",
};
var WALK_STRIP = { near: 2, far: 9, width: 0.9, show: 1.5 }; // بالمتر، وshow ثوانٍ بعد آخر تغيير

// شريط أسهم على الأرض أمام اللاعب باتجاه سيره (ابن المنصّة، فيدور مع اتجاه السير). نسيج مرسوم، وأمر رسم واحد حين يظهر
function createWalkStrip() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 512;
  const g = c.getContext("2d");
  g.strokeStyle = "#f0c96a";
  g.lineWidth = 9;
  g.lineJoin = g.lineCap = "round";
  // أعلى الصورة هو الأبعد: الأسهم تخفت مع البعد
  for (let i = 0; i < 7; i++) {
    const y = 488 - i * 70;
    g.globalAlpha = 0.9 - i * 0.11;
    g.beginPath();
    g.moveTo(12, y);
    g.lineTo(32, y - 26);
    g.lineTo(52, y);
    g.stroke();
  }
  const map = new CanvasTexture(c);
  map.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map, transparent: true, opacity: 0, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const geo = new PlaneGeometry(WALK_STRIP.width, WALK_STRIP.far - WALK_STRIP.near);
  geo.rotateX(-Math.PI / 2);
  const mesh = new Mesh(geo, mat);
  mesh.name = "walkStrip";
  mesh.position.set(0, 0.05, -(WALK_STRIP.near + WALK_STRIP.far) / 2);
  mesh.renderOrder = 3;
  mesh.visible = false;
  const strip = { mesh, opacity: 0 };
  strip.update = (dt, show) => {
    strip.opacity += ((show ? 1 : 0) - strip.opacity) * Math.min(1, dt * 6);
    mat.opacity = strip.opacity * 0.85;
    mesh.visible = strip.opacity > 0.02;
  };
  return strip;
}

function createModes({ renderer, scene, camera, player, hud, panels, game, input, vignette, reticle, world }) {
  const { keyboard, pointer, joystick, sensor, gamepad } = input;
  const m = {
    mode: "desktop",
    comfort: false, // الحركة المريحة: تعتيم الأطراف، والدوران على دفعات بالأسهم
    comfortChoice: null, // اختيار المستخدم إن غيّره، وإلا فالافتراضي بحسب الوضع
    walking: false, // المشي التلقائي في علبة VR
    gyro: false, // الجوال: النظر بتحريك الجوال. اختياري، والسحب هو الافتراضي
    guide: true, // الجوال: المشي الموجّه
    autoWalk: false, // الجوال: «مشي مستمر»
    guideDir: null, // اتجاه المشي الموجّه في آخر إطار (للاختبار)
    gaze: { id: null, t: 0, consumed: false },
    rayHover: null,
    onChange: null,
    onAutoWalk: null,
  };
  const guide = createRouteGuide({ game, hud, laneAt: world.crowds.laneAt });
  // حالة المساعدة في الجوال. clock بزمن الإطارات لا بالساعة، فيعمل في الاختبار مع step()
  const assist = {
    clock: 0,
    pushing: false,
    held: false, // وصل والعصا مدفوعة: يقف حتى يرفع إبهامه
    key: "",
    enabled: false,
    stuck: 0,
    btnDir: 0, // سهما الدوران
    minDir: 0,
    minT: 0,
    turnVel: 0,
    turnedT: -1e9, // آخر مرة غيّر اللاعب اتجاه السير (لشريط الأرض)
    routeYaw: null, // اتجاه المسار في الإطار السابق: النظر يدور مع انحنائه
    centering: false, // ✓
    lookOff: false,
    lookBack: false,
    shownHead: 0,
    faceTo: null, // بعد وصول «مشي مستمر»: النظر إلى الحجر الأسود أو الكعبة
    viewOff: 0, // «مشي مستمر»: تعديل اللاعب (باللمس) على النظر المناسب للمنسك
    adjusted: false, // «مشي مستمر»: عدّل اللاعب موضعه بالعصا أو السهمين، فلا يُعاد إلى أفضل موضع في هذا المنسك
    stick: false, // العصا مدفوعة إلى الأمام في الإطار السابق
    acted: false, // ضغط اللاعب الزر الذهبي منذ الإطار السابق
    px: 0, // موضع اللاعب في الإطار السابق
    pz: 0,
    autoMoving: false, // «مشي مستمر» يمشي الآن (لا ينتظر)
    autoWait: false,
    autoJustOn: false,
    legView: false, // منسك أو هدف جديد لم يمشِ فيه اللاعب بعد: يبدؤه من النظر المناسب
    viewDirty: false, // ضبط اللاعب نظره وهو واقف (باللمس أو ✓)
  };
  const lookEl = document.getElementById("lookReset");
  const walkStrip = createWalkStrip();
  player.rig.add(walkStrip.mesh);
  m.assist = assist; // للاختبار والتصحيح
  m.walkStrip = walkStrip;
  const snapPad = createSnapLatch();
  const snapXR = createSnapLatch();
  let xrAPrev = false;
  let leftTrigger = false;

  // عينا علبة VR: كاميرتان داخل الكاميرا الرئيسية، بينهما مسافة العينين
  const eyes = [new PerspectiveCamera(CARDBOARD_FOV, 1, 0.05, 2200), new PerspectiveCamera(CARDBOARD_FOV, 1, 0.05, 2200)];
  eyes[0].position.x = -CARDBOARD_IPD / 2;
  eyes[1].position.x = CARDBOARD_IPD / 2;
  camera.add(eyes[0], eyes[1]);

  // شعاع ذراع النظارة اليمنى (أسطوانة رفيعة؛ three.js المضمّن بلا Line)
  const rayGeo = new CylinderGeometry(0.0025, 0.0025, 1, 6, 1, true);
  rayGeo.rotateX(Math.PI / 2);
  rayGeo.translate(0, 0, -0.5);
  const ray = new Mesh(rayGeo, new MeshBasicMaterial({ color: "#f0c96a", transparent: true, opacity: 0.7, depthWrite: false, fog: false }));
  ray.visible = false;
  ray.renderOrder = 1003;

  const isVR = (mode = m.mode) => mode === "xr" || mode === "cardboard";
  const useSensor = (mode = m.mode) => mode === "cardboard" || (mode === "mobile" && m.gyro);

  m.set = (mode) => {
    m.mode = mode;
    document.body.dataset.mode = mode;
    const vr = isVR(mode);
    player.slow = vr;
    m.setComfort(m.comfortChoice ?? vr, false);
    pointer.enabled = mode !== "xr";
    joystick.enabled = mode === "mobile";
    m.walking = false;
    m.setAutoWalk(false);
    walkStrip.update(1, false);
    panels.walking = false;
    panels.setKind(vr ? "board" : "flat", {
      hint: mode === "desktop" ? "مفتاح المسافة" : "",
      board: mode === "xr" ? { dist: 1.25, drop: 0.3 } : { dist: 1.4, drop: 0.22 },
      boardHint:
        mode === "xr"
          ? "العصا اليسرى للمشي، واليمنى للدوران، والزناد للاختيار، والأيسر للهرولة"
          : "انظر إلى زر ثانية واحدة، أو المس الشاشة",
      cardboardButtons: mode === "cardboard",
    });
    if (mode !== "xr") player.setLook(useSensor(mode) && sensor.hasData() ? "sensor" : "mouse");
    reticle.set(false);
    ray.visible = false;
    m.resize();
    m.onChange && m.onChange(mode);
  };
  m.setComfort = (on, byUser = true) => {
    if (byUser) m.comfortChoice = on;
    m.comfort = on;
    vignette.enabled = on;
    document.querySelectorAll('input[data-opt="comfort"]').forEach((e) => (e.checked = on));
  };
  m.toggleWalk = () => {
    m.walking = !m.walking;
    panels.walking = m.walking;
    panels.markDirty();
  };
  // يُستدعى من ضغطة المستخدم على المفتاح: iOS يطلب إذن المستشعر من داخلها
  m.setGyro = (on) => {
    m.gyro = on;
    if (on) sensor.start();
    else if (m.mode === "mobile" && player.look === "sensor") player.setLook("mouse");
  };
  // ✓: النظر يعود إلى اتجاه السير، وفي «مشي مستمر» إلى النظر المناسب للمنسك
  m.centerLook = () => (assist.centering = true);
  // سهما الدوران لاتجاه السير: dir = 1 يسارًا و-1 يمينًا. on: الإصبع على الزر
  m.turnButton = (dir, on) => {
    const a = assist;
    if (on) (a.btnDir = dir), (a.minDir = dir), (a.minT = TURN_BTN_MIN);
    else if (a.btnDir === dir) a.btnDir = 0;
  };
  m.setGuide = (on) => {
    m.guide = on;
    guide.reset();
  };
  m.setAutoWalk = (on) => {
    if (m.autoWalk === on) return;
    m.autoWalk = on;
    assist.stuck = 0;
    // يبدأ من أفضل موضع ومن النظر المناسب، ثم يعدّل اللاعب ما شاء
    assist.adjusted = false;
    if (on) (assist.legView = true), (assist.routeYaw = null);
    assist.autoJustOn = on;
    if (!on) (assist.autoMoving = false), (assist.autoWait = false), document.body.classList.remove("auto-wait");
    m.onAutoWalk && m.onAutoWalk(on);
  };

  // الزر الذهبي. assist.acted: المنسك أو الهدف يتغير الآن بضغطة اللاعب لا بوصوله، فمن إبهامه على العصا لا يُوقَف
  function actRite() {
    assist.acted = true;
    game.act();
  }
  // «اختر»: الزر تحت النظر أو الذراع إن وُجد، وإلا فالمنسك الحالي
  m.select = () => {
    const id = m.mode === "cardboard" ? m.gaze.id : m.mode === "xr" ? m.rayHover : null;
    if (id) return panels.press(id), (m.gaze.consumed = true);
    actRite();
  };
  panels.onButton = (id) => {
    if (id === "action") actRite();
    else if (id === "secondary") hud.onCardBtn && hud.onCardBtn();
    else if (id === "walk") m.toggleWalk();
    else if (id === "turnL") player.snapTurn(1);
    else if (id === "turnR") player.snapTurn(-1);
  };

  keyboard.onPress = (code, e) => {
    if (!player.enabled || m.mode === "xr") return;
    if (code === "Space" || code === "Enter" || code === "KeyE") e.preventDefault(), m.select();
    if (m.comfort && (code === "ArrowLeft" || code === "ArrowRight")) player.snapTurn(code === "ArrowLeft" ? 1 : -1);
  };
  pointer.onTap = (x, y) => {
    if (!player.enabled) return;
    if (m.mode === "cardboard") {
      // زر العلبة يلمس الشاشة: يختار الزر تحت النظر، وإلا يبدأ المشي أو يوقفه
      if (m.gaze.id) return panels.press(m.gaze.id), (m.gaze.consumed = true);
      return m.toggleWalk();
    }
    const hit = panels.hitScreen(x, y);
    if (hit && hit.id) panels.press(hit.id);
  };
  // الجوال: لمسة في النصف الأيسر السفلي تبدأ عصا المشي تحت الإبهام، إلا إن وقعت على لوحة. وما سواها سحب للالتفات
  pointer.claim = (e) =>
    m.mode === "mobile" &&
    player.enabled &&
    e.clientX < innerWidth * 0.5 &&
    e.clientY > innerHeight * 0.4 &&
    !panels.hitScreen(e.clientX, e.clientY) &&
    joystick.begin(e);

  // أحداث زناد النظارة
  player.controllers.forEach((c) => {
    c.addEventListener("selectstart", (e) => {
      if (!player.enabled || m.mode !== "xr") return;
      const hand = e.data && e.data.handedness;
      if (hand === "left") leftTrigger = true;
      else m.select();
    });
    c.addEventListener("selectend", (e) => {
      if (e.data && e.data.handedness === "left") leftTrigger = false;
    });
  });

  // ——— كل إطار: الإدخال ثم تحريك اللاعب ———
  m.frame = (dt) => {
    const mode = m.mode;
    let fwd = 0;
    let side = 0;
    player.jogKey = keyboard.isDown("ShiftLeft") || keyboard.isDown("ShiftRight");
    if (mode === "xr") {
      const x = readXRControllers(renderer);
      fwd = x.my;
      side = x.mx;
      player.jogXR = x.jog || leftTrigger;
      if (player.enabled) player.snapTurn(snapXR(x.turn));
      if (x.a && !xrAPrev && player.enabled) m.select();
      xrAPrev = x.a;
    } else {
      // النظر
      if (useSensor(mode) && sensor.hasData()) {
        sensor.read(player.sensorQuat);
        if (player.look !== "sensor") player.setLook("sensor");
      }
      const [dy, dp] = pointer.takeDrag();
      // في علبة VR لا سحب، إلا إن لم يوجد مستشعر
      const dragged = player.enabled && (mode !== "cardboard" || player.look === "mouse") && (dy !== 0 || dp !== 0);
      if (dragged) {
        // في الجوال: السحب يغيّر اتجاه النظر وحده، واتجاه السير على حاله
        if (mode === "mobile" && player.look === "mouse") player.turnHead(dy);
        else player.yaw += dy;
        if (player.look === "mouse") player.pitch = Math.max(-1.25, Math.min(1.1, player.pitch + dp));
      }
      // المشي: لوحة المفاتيح (ومنها أيادي التحكم التي تعمل كلوحة مفاتيح)
      fwd += keyboard.axis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]);
      side += keyboard.axis(["KeyD"], ["KeyA"]);
      const turn = keyboard.axis(["ArrowLeft"], ["ArrowRight"]);
      if (turn && !m.comfort && player.enabled) player.yaw += turn * dt * 1.8;
      if (mode === "mobile") (fwd += joystick.y), (side += joystick.x);
      // يد تحكم بلوتوث
      const pad = gamepad.read();
      player.jogPad = false;
      if (pad && player.enabled) {
        fwd += -pad.y + (pad.btn(12) ? 1 : 0) - (pad.btn(13) ? 1 : 0);
        side += pad.x;
        player.snapTurn(snapPad(pad.turn));
        if (pad.edge(4) || pad.edge(14)) player.snapTurn(1);
        if (pad.edge(5) || pad.edge(15)) player.snapTurn(-1);
        player.jogPad = pad.btn(6) || pad.btn(7);
        if (pad.edge(0)) m.select();
        if (pad.edge(1) && mode === "cardboard") m.toggleWalk();
      }
      if (mode === "cardboard" && m.walking) fwd = Math.max(fwd, 1);
      // الركعتان خلف المقام (الحجاب معروض): لا مشي حتى تنتهيا
      if (game.stage === "prayer") fwd = side = 0;
      if (mode === "mobile") {
        const a = mobileAssist(dt, fwd, side, dragged);
        return player.update(dt, { forward: a.fwd, strafe: a.strafe, dir: a.dir });
      }
    }
    player.update(dt, { forward: fwd, strafe: side });
  };

  // ——— الجوال: اتجاه السير، واتجاه النظر، والمشي الموجّه، والمشي المستمر ———
  // اتجاه السير للعصا والسهمين: العصا أمام وخلف للمشي، وجانباها والسهمان يديران اتجاه السير والنظر على حاله.
  //   وعلى مسار المنسك (المشي الموجّه والمستمر) المسار هو اتجاه السير، فجانبا العصا والسهمان يميلان بالحركة
  //   عنه: يقرّبان من الكعبة أو يبعدان، ويبقى اللاعب حيث وصل.
  // اتجاه النظر للّمس: السحب يديره كما شاء اللاعب، ولا يغيّره شيء آخر، إلا أنه يدور مع انحناء المسار (كمن يطوف
  //   ورأسه على حاله من جسمه)، وأن «مشي مستمر» يأخذ النظر المناسب للمنسك ثم يعدّله اللاعب باللمس.
  function mobileAssist(dt, fwd, side, dragged) {
    const a = assist;
    a.clock += dt;
    const headLook = player.look === "mouse"; // مع المستشعر الجوال في يد اللاعب يدير النظر، والمشي باتجاهه
    const looking = dragged || pointer.dragging(); // إصبع النظر على الشاشة
    if (looking) (a.centering = false), (a.faceTo = null), (a.legView = false), (a.viewDirty = true);
    // ما يحتاج منسكًا: أضاء الزر الذهبي خارج الطواف (lit)، أو تغيّر المنسك أو الهدف (changed)
    const key = `${game.stage}|${hud.model.target}`;
    const on = hud.model.action.enabled;
    const changed = key !== a.key;
    const lit = on && !a.enabled && game.stage !== "tawaf";
    a.key = key;
    a.enabled = on;
    if (changed) (a.adjusted = false), (a.legView = true); // منسك أو هدف جديد: من أفضل موضع ومن النظر المناسب
    // «بلغ الهدف» يُنسى إن تغيّر المنسك أو الهدف (قد يعود المنسك نفسه لاحقًا)، أو انتقل اللاعب قفزًا (القائمة، أو إعادة التدريب)
    const here = player.getPos();
    if (changed || Math.hypot(here.x - a.px, here.z - a.pz) > 3) guide.reached = "";
    (a.px = here.x), (a.pz = here.z);
    if (game.stage === "done") m.setAutoWalk(false);
    // من وصل بالعصا إلى موضع منسك: اتجاه سيره ونظره إلى ما يستقبله المنسك (الحجر الأسود، أو الكعبة)، كالمشي المستمر
    if (lit && a.stick && m.guide && headLook) faceRite();
    // من يدفع العصا يقف عند ما يحتاج منسكًا حتى يرفع إبهامه، فلا يتجاوز الهدف ولا يرجع قبل أن يقرأ
    // (إلا إن تغيّر المنسك بضغطته هو الزرَّ الذهبي والإبهام على العصا: يكمل)
    const stick = fwd > 0.08;
    if ((changed || lit) && !a.acted) a.held = a.stick;
    a.acted = false;
    a.stick = stick;
    if (!stick) a.held = false;
    if (a.held) fwd = 0;
    // «مشي مستمر» باقٍ حتى يطفئه اللاعب: يمشي إلى موضع المنسك ما دام له طريق، وينتظر عنده الزر الذهبي، ثم يكمل وحده.
    // يبلغ الموضع نفسه ولو أضاء الزر قبله: عند طرف منطقة المنسك، أو لأن جمرة سبق رميها أقرب.
    // إلا طرف شوط السعي: الهدف التالي الطرف الآخر، فينتظر الدعاء أولًا
    const needsRite = on && game.stage !== "tawaf";
    const auto = m.autoWalk && !(on && game.stage === "sai");
    const steer = Math.abs(side) < STEER_DEAD ? 0 : (Math.sign(side) * (Math.abs(side) - STEER_DEAD)) / (1 - STEER_DEAD);
    const pushing = (stick && !a.held) || auto;
    const fresh = pushing && !a.pushing;
    a.pushing = pushing;
    // سهما الدوران: سرعة تتسارع وتقف بهدوء
    a.minT -= dt;
    const turnTo = (a.btnDir || (a.minT > 0 ? a.minDir : 0)) * TURN_BTN_RATE;
    a.turnVel += (turnTo - a.turnVel) * Math.min(1, dt * TURN_BTN_EASE);
    if (!player.enabled || (!turnTo && Math.abs(a.turnVel) <= 0.01)) a.turnVel = 0;
    // تعديل اللاعب لاتجاه الحركة: جانبا العصا والسهمان. موجب إلى اليمين
    const adjust = headLook ? Math.max(-1, Math.min(1, steer - a.turnVel / TURN_BTN_RATE)) : steer;
    if (adjust || a.turnVel) a.turnedT = a.clock;
    if (Math.abs(adjust) > 0.15) a.adjusted = true;
    let dir = null;
    // «مشي مستمر» على مسار المنسك دائمًا، ولو أُطفئ المشي الموجّه، ومن أفضل موضع له ما لم يعدّل اللاعب
    if ((m.guide || auto) && pushing && player.enabled) {
      const p = player.getPos();
      const h = headLook ? player.yaw : player.headingYaw();
      // أفضل موضع: للمشي المستمر في كل منسك، وللعصا في السعي (الذاهب غربي الحاجز والعائد شرقيه، لا عكس الناس)
      const best = (auto || game.stage === "sai") && !a.adjusted;
      dir = guide.direction(p.x, p.z, -Math.sin(h), -Math.cos(h), fresh, adjust, auto, best, dt);
    }
    m.guideDir = dir;
    // «مشي مستمر» يمشي على مسار المنسك وحده: بلا مسار (الإحرام، أو وصل) لا يمشي، فلا يضلّ باللاعب
    const autoMoving = auto && !!dir;
    // وصل «مشي مستمر» إلى موضع المنسك: اتجاه السير والنظر إلى ما يستقبله المنسك
    if (a.autoMoving && !autoMoving && needsRite && headLook) faceRite();
    if (autoMoving) fwd = Math.max(fwd, 1);
    const moving = Math.abs(fwd) > 0.08;
    autoWalkState(dt, autoMoving, on);
    if (!headLook || !player.enabled) {
      // النظر بتحريك الجوال: السهمان يديران اللاعب كله، والمشي باتجاه النظر (وعلى مسار المنسك في المشي الموجّه والمستمر)
      if (player.enabled && a.turnVel) player.yaw += a.turnVel * dt;
      a.routeYaw = null;
      walkStrip.update(dt, false);
      return { fwd, dir, strafe: side };
    }

    if (dir) {
      const routeYaw = Math.atan2(-dir[0], -dir[1]);
      // النظر يدور مع انحناء المسار، لا مع قفزاته (شوط جديد، أو هدف جديد)
      if (a.routeYaw !== null) {
        const bend = ll(routeYaw - a.routeYaw);
        if (Math.abs(bend) < ROUTE_BEND * dt) player.turnHead(bend);
      }
      // اتجاه السير يأخذ اتجاه المسار، والنظر على حاله
      player.turnBody(ll(routeYaw - player.yaw) * Math.min(1, dt * BODY_TURN_RATE));
      a.faceTo = null;
      // النظر على المسار = النظر المناسب للمنسك + تعديل اللاعب باللمس (viewOff). بالعصا وبالمشي المستمر سواء:
      //   أول منسك أو هدف جديد (legView): من النظر المناسب، فلا يمشي اللاعب إلى خلف ما يراه. إلا إن ضبط نظره باللمس قبله.
      //   ثم النظر للّمس وحده: ما دام الإصبع يسحب فالنظر له، وحيث تركه يبقى من المسار. والعصا والسهمان لا يغيّرانه
      const base = routeYaw + guide.lookOffset(game.stage);
      const view = player.yaw + player.head;
      if (looking) a.viewOff = ll(view - base);
      else {
        // أول إطار على المسار في هذه الدفعة. ومن رفع إبهامه قبل أن يكتمل لحاق النظر يكمله في دفعته التالية
        if (a.routeYaw === null) {
          if (a.legView) a.viewOff = 0;
          else if (a.viewDirty) a.viewOff = ll(view - base); // ضبط نظره واقفًا (باللمس أو ✓): يبقى كما ضبطه
          a.legView = a.viewDirty = false;
        }
        if (a.centering) {
          a.viewOff *= Math.max(0, 1 - dt * LOOK_CENTER_RATE);
          if (Math.abs(a.viewOff) < 0.005) (a.viewOff = 0), (a.centering = false);
        }
        const diff = ll(base + a.viewOff - view);
        player.turnHead(Math.max(-VIEW_MAX * dt, Math.min(VIEW_MAX * dt, diff * Math.min(1, dt * VIEW_EASE))));
      }
      a.routeYaw = routeYaw;
    } else {
      a.routeYaw = null;
      // بلا مسار: جانبا العصا والسهمان يديران اتجاه السير، والنظر على حاله
      const turn = a.turnVel - steer * STEER_RATE;
      if (turn) player.turnBody(turn * dt);
      // بعد وصول «مشي مستمر»: النظر إلى الحجر الأسود أو الكعبة
      if (a.faceTo && !moving) {
        const p = player.getPos();
        const diff = ll(Math.atan2(-(a.faceTo[0] - p.x), -(a.faceTo[1] - p.z)) - player.yaw - player.head);
        player.turnHead(Math.max(-VIEW_MAX * dt, Math.min(VIEW_MAX * dt, diff * Math.min(1, dt * VIEW_EASE))));
        if (Math.abs(diff) < 0.02) a.faceTo = null;
      } else if (moving) a.faceTo = null;
    }
    // ✓ بلا مسار: النظر إلى اتجاه السير. (وعلى المسار: إلى النظر المناسب، أعلاه)
    if (a.centering && !dir) {
      a.faceTo = null;
      a.viewDirty = true;
      player.head *= Math.max(0, 1 - dt * LOOK_CENTER_RATE);
      if (Math.abs(player.head) < 0.005) (player.head = 0), (a.centering = false);
    }
    // ✓ يمتلئ حين يخالف النظر اتجاه السير (وعلى المسار: حين يخالف النظر المناسب)، وفيه مؤشر اتجاه السير من النظر.
    // وينبض إن مشى اللاعب واتجاه سيره خلف نظره
    const off = Math.abs(dir ? a.viewOff : player.head) > 0.02;
    if (off !== a.lookOff) (a.lookOff = off), document.body.classList.toggle("look-off", off);
    const back = moving && Math.abs(player.head) > LOOK_BACK;
    if (back !== a.lookBack) (a.lookBack = back), document.body.classList.toggle("look-back", back);
    if (lookEl && Math.abs(player.head - a.shownHead) > 0.01) {
      a.shownHead = player.head;
      lookEl.style.setProperty("--walk", `${player.head.toFixed(2)}rad`);
    }
    walkStrip.update(dt, a.clock - a.turnedT < WALK_STRIP.show || (!dir && Math.abs(player.head) > 0.06));
    // على المسار: التعديل ميل جانبي بالحركة. وبلا مسار: دوران لاتجاه السير، فلا مشي جانبي
    return { fwd, dir, strafe: dir ? adjust : 0 };
  }
  // عند موضع المنسك: اتجاه السير إلى ما يستقبله (الحجر الأسود، أو الكعبة) فلا يبدأ الطواف بعده معكوسًا، والنظر إليه بهدوء
  function faceRite() {
    const face = guide.arrivalFace(game.stage);
    if (!face) return;
    const p = player.getPos();
    player.turnBody(ll(Math.atan2(-(face[0] - p.x), -(face[1] - p.z)) - player.yaw));
    assist.faceTo = face;
  }
  // حال «مشي مستمر»: ماشٍ، أو ينتظر (body.auto-wait). ويُطفأ إن علق اللاعب، مع تنبيه يقول لماذا
  function autoWalkState(dt, autoMoving, actionOn) {
    const a = assist;
    a.autoMoving = autoMoving;
    const wait = m.autoWalk && !autoMoving;
    if (wait !== a.autoWait) (a.autoWait = wait), document.body.classList.toggle("auto-wait", wait);
    // شُغّل حيث لا مشي: يقول ما ينتظره
    if (a.autoJustOn && m.autoWalk) {
      a.autoJustOn = false;
      if (wait) hud.toast(actionOn ? AUTO_WALK_HINTS.action : AUTO_WALK_HINTS.noRoute, "info", 4);
    }
    if (!autoMoving) return (a.stuck = 0);
    a.stuck = player.speed < 0.3 ? a.stuck + dt : 0;
    if (a.stuck > 1.2) m.setAutoWalk(false), hud.toast(AUTO_WALK_HINTS.stuck, "info", 4);
  }

  // ——— بعد تحديث اللوحات: النظر أو الذراع على الأزرار، وتعتيم الأطراف ———
  const o = new Vector3();
  const d = new Vector3();
  const q = new Quaternion();
  m.afterFrame = (dt) => {
    if (m.mode === "cardboard" && player.enabled) {
      camera.getWorldPosition(o);
      camera.getWorldDirection(d);
      const hit = panels.hitRay(o, d);
      const id = hit ? hit.id : null;
      const g = m.gaze;
      // بعد الاختيار يجب أن يبتعد النظر عن الزر ثم يعود، حتى لو تغيّر عنوانه (منسك جديد):
      // وإلا ضغط من يُبقي نظره على الزر المنسكَ التالي دون قصد بعد ثانية
      if (id !== g.id) (g.id = id), (g.t = 0), (g.consumed = false);
      else if (id && !g.consumed) {
        g.t += dt;
        if (g.t >= DWELL_SECONDS) panels.press(id), (g.consumed = true);
      }
      const progress = id && !g.consumed ? Math.min(1, g.t / DWELL_SECONDS) : 0;
      panels.setHover(id, progress);
      reticle.set(true, hit ? hit.distance : 2, progress, !!id);
    } else reticle.set(false);

    if (m.mode === "xr") {
      const c = player.controllers.find((c) => c.userData.handedness === "right") || player.controllers[1];
      if (c && c.parent) {
        if (ray.parent !== c) c.add(ray);
        c.getWorldPosition(o);
        d.set(0, 0, -1).applyQuaternion(c.getWorldQuaternion(q));
        const hit = panels.hitRay(o, d);
        m.rayHover = hit ? hit.id : null;
        panels.setHover(m.rayHover);
        ray.visible = !!hit;
        if (hit) ray.scale.set(1, 1, hit.distance);
      }
    } else m.rayHover = null;

    const turning = performance.now() - player.turnedAt < 250 ? 0.85 : 0;
    const walking = player.moving ? Math.min(1, player.speed / 2.4) * 0.75 : 0;
    vignette.update(dt, Math.max(turning, walking));
  };

  // ——— الرسم ———
  const size = new Vector2();
  m.render = () => {
    if (m.mode !== "cardboard" || renderer.xr.isPresenting) return renderer.render(scene, camera);
    renderer.getSize(size);
    const w = size.x;
    const h = size.y;
    scene.updateMatrixWorld();
    renderer.setScissorTest(true);
    eyes.forEach((eye, i) => {
      eye.aspect = w / 2 / h;
      eye.updateProjectionMatrix();
      const x = i === 0 ? 0 : w / 2;
      renderer.setViewport(x, 0, w / 2, h);
      renderer.setScissor(x, 0, w / 2, h);
      renderer.render(scene, eye);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, w, h);
  };
  m.resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    panels.markDirty();
  };

  // ——— الدخول إلى الأوضاع ———
  // يُستدعى من ضغطة «ابدأ» لأن المتصفح يشترط ضغطة المستخدم لإذن المستشعر وملء الشاشة وجلسة النظارة
  m.enter = async (mode) => {
    if (mode === "xr") return m.enterXR();
    if (useSensor(mode)) sensor.start();
    if (mode === "cardboard") {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {}
      try {
        await screen.orientation?.lock?.("landscape");
      } catch {}
      try {
        m.wakeLock = await navigator.wakeLock?.request("screen");
      } catch {}
    }
    m.set(mode);
    return true;
  };
  m.exitCardboard = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
    } catch {}
    try {
      m.wakeLock && m.wakeLock.release();
    } catch {}
    m.set("mobile");
  };
  m.xrSupported = async () => {
    if (!navigator.xr) return false;
    try {
      return await navigator.xr.isSessionSupported("immersive-vr");
    } catch {
      return false;
    }
  };
  m.enterXR = async () => {
    try {
      const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "bounded-floor"] });
      await renderer.xr.setSession(session);
      return true;
    } catch {
      hud.toast("تعذّر فتح وضع النظارة على هذا الجهاز.", "warn", 4);
      return false;
    }
  };
  return m;
}
