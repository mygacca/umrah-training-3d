// مصادر الإدخال. لا يعرف أيٌّ منها شيئًا عن اللعبة؛ كل وضع في 10-modes.js يقرأ منها ما يلزمه في كل إطار.

// لوحة المفاتيح (ومنها أيادي التحكم البلوتوث التي تعمل كلوحة مفاتيح).
function createKeyboard() {
  const down = new Set();
  const kb = { onPress: null }; // (code, event) يُستدعى عند أول ضغطة، لا عند التكرار
  addEventListener("keydown", (e) => {
    const t = e.target;
    // المسافة وEnter على زر أو حقل في الصفحة تخصّه هو
    if (t && (t.tagName === "INPUT" || t.tagName === "BUTTON") && (e.code === "Space" || e.code === "Enter")) return;
    const first = !down.has(e.code);
    down.add(e.code);
    if (first && kb.onPress) kb.onPress(e.code, e);
  });
  addEventListener("keyup", (e) => down.delete(e.code));
  addEventListener("blur", () => down.clear());
  kb.isDown = (code) => down.has(code);
  kb.axis = (pos, neg) => (pos.some((c) => down.has(c)) ? 1 : 0) - (neg.some((c) => down.has(c)) ? 1 : 0);
  return kb;
}

// السحب على اللوحة للالتفات، واللمسة أو النقرة القصيرة.
function createPointer(canvas) {
  const active = new Map();
  // claim(e): يأخذ اللمسة غيرُ السحب (عصا المشي العائمة في الجوال) إن أعاد true
  const p = { enabled: false, dragYaw: 0, dragPitch: 0, onTap: null, claim: null };
  canvas.addEventListener("pointerdown", (e) => {
    if (!p.enabled) return;
    if (p.claim && p.claim(e)) return;
    active.set(e.pointerId, { x: e.clientX, y: e.clientY, t0: performance.now(), touch: e.pointerType !== "mouse", moved: 0 });
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const s = active.get(e.pointerId);
    if (!s) return;
    const k = s.touch ? 0.0058 : 0.0034;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    p.dragYaw -= dx * k;
    p.dragPitch -= dy * k;
    s.moved += Math.abs(dx) + Math.abs(dy);
    s.x = e.clientX;
    s.y = e.clientY;
  });
  const end = (e, tap) => {
    const s = active.get(e.pointerId);
    if (!s) return;
    active.delete(e.pointerId);
    if (tap && s.moved < 10 && performance.now() - s.t0 < 600 && p.onTap) p.onTap(e.clientX, e.clientY, e);
  };
  canvas.addEventListener("pointerup", (e) => end(e, true));
  canvas.addEventListener("pointercancel", (e) => end(e, false));
  // يمنع «النقر الشبحي» بعد اللمس: لولاه لوقع النقر على ما يظهر تحت الإصبع بعد الضغطة
  // (مثل نافذة الملخص التي يفتحها لمس الزر الذهبي)
  // وبعد السحب لا يُلغى touchend (cancelable=false)، ومحاولة إلغائه خطأ في وحدة التحكم؛ ولا نقر بعد السحب أصلًا
  canvas.addEventListener("touchend", (e) => e.cancelable && e.preventDefault(), { passive: false });
  p.takeDrag = () => {
    const d = [p.dragYaw, p.dragPitch];
    p.dragYaw = p.dragPitch = 0;
    return d;
  };
  return p;
}

// عصا المشي تحت الإبهام الأيسر. عائمة: begin(e) يضع مركزها حيث لمس الإبهام (10-modes.js يقرّر أي لمسة لها)،
// وتعود إلى مكانها أسفل اليسار حين يُرفع. فلا يحتاج اللاعب أن يصيب العصا بدقة.
function createJoystick(el, knob) {
  const j = { enabled: false, x: 0, y: 0, id: null, cx: 0, cy: 0 };
  const R = 46;
  const show = (x, y) => (knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`);
  const set = (e) => {
    let x = e.clientX - j.cx;
    let y = e.clientY - j.cy;
    const d = Math.hypot(x, y);
    if (d > R) (x = (x / d) * R), (y = (y / d) * R);
    show(x, y);
    j.x = x / R;
    j.y = -y / R;
  };
  j.begin = (e) => {
    if (!j.enabled || j.id !== null) return false;
    j.id = e.pointerId;
    const half = el.getBoundingClientRect().width / 2;
    j.cx = Math.max(half + 4, Math.min(innerWidth - half - 4, e.clientX));
    j.cy = Math.max(half + 4, Math.min(innerHeight - half - 4, e.clientY));
    el.style.left = `${j.cx - half}px`;
    el.style.top = `${j.cy - half}px`;
    el.style.bottom = "auto";
    el.classList.add("active");
    set(e);
    return true;
  };
  el.addEventListener("pointerdown", (e) => j.begin(e) && el.setPointerCapture?.(e.pointerId));
  // على النافذة: الإصبع يبدأ على اللوحة ثم يتحرك فوق العصا نفسها
  addEventListener("pointermove", (e) => e.pointerId === j.id && set(e));
  const end = (e) => {
    if (e.pointerId !== j.id) return;
    j.id = null;
    j.x = j.y = 0;
    show(0, 0);
    el.classList.remove("active");
    el.style.left = el.style.top = el.style.bottom = "";
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
  return j;
}

// مستشعر اتجاه الجهاز (الجوال وعلبة VR). يعطي دوران الكاميرا داخل المنصّة (rig).
function screenAngle() {
  const o = screen.orientation;
  return o && typeof o.angle === "number" ? o.angle : window.orientation || 0;
}
function createOrientationSensor() {
  const s = { alpha: 0, beta: 0, gamma: 0, last: 0, listening: false };
  const onEvent = (e) => {
    if (e.alpha == null && e.beta == null && e.gamma == null) return;
    s.alpha = e.alpha || 0;
    s.beta = e.beta || 0;
    s.gamma = e.gamma || 0;
    s.last = performance.now();
  };
  const DEG = Math.PI / 180;
  const zee = new Vector3(0, 0, 1);
  const euler = new Euler();
  const q0 = new Quaternion();
  const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90° حول X: الكاميرا تنظر من ظهر الجهاز
  return {
    // يُستدعى من ضغطة المستخدم: iOS يطلب الإذن من داخلها
    start() {
      if (!s.listening) addEventListener("deviceorientation", onEvent), (s.listening = true);
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === "function") return D.requestPermission().catch(() => "denied");
      return Promise.resolve("granted");
    },
    active: () => s.last > 0 && performance.now() - s.last < 1500,
    hasData: () => s.last > 0, // وصلت قراءة واحدة على الأقل: يبقى النظر بالمستشعر بعدها
    // الطريقة نفسها في DeviceOrientationControls في three.js
    read(q) {
      euler.set(s.beta * DEG, s.alpha * DEG, -s.gamma * DEG, "YXZ");
      q.setFromEuler(euler);
      q.multiply(q1);
      q.multiply(q0.setFromAxisAngle(zee, -screenAngle() * DEG));
      return q;
    },
  };
}

// يد تحكم بلوتوث (Gamepad API) خارج النظارة. الترتيب القياسي: 0 A، 1 B، 4/5 الكتفان، 6/7 الزنادان، 12-15 الأسهم.
function createGamepadReader() {
  let prev = [];
  return {
    read() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (const g of pads || []) if (g && g.connected) (gp = gp || g);
      if (!gp) return (prev = []), null;
      const ax = (i) => {
        const v = gp.axes[i] || 0;
        return Math.abs(v) < 0.15 ? 0 : v;
      };
      const now = Array.from(gp.buttons, (b) => !!(b && b.pressed));
      const edges = now.map((v, i) => v && !prev[i]);
      prev = now;
      return { id: gp.id, x: ax(0), y: ax(1), turn: ax(2), btn: (i) => !!now[i], edge: (i) => !!edges[i] };
    },
  };
}

// أذرع النظارة (WebXR). نفس قراءة النسخة السابقة: العصا اليسرى للمشي، واليمنى للالتفات.
function readXRControllers(renderer) {
  const r = { mx: 0, my: 0, turn: 0, a: false, jog: false };
  const session = renderer.xr.getSession();
  if (!session) return r;
  for (const src of session.inputSources) {
    const gp = src.gamepad;
    if (!gp) continue;
    let x = gp.axes[2] || 0;
    let y = gp.axes[3] || 0;
    if (Math.abs(x) + Math.abs(y) < 0.05 && gp.axes.length >= 2) (x = gp.axes[0] || 0), (y = gp.axes[1] || 0);
    if (src.handedness === "left") {
      r.mx = x;
      r.my = -y;
      if (gp.buttons[1] && gp.buttons[1].pressed) r.jog = true;
    } else {
      r.turn = x;
      if (gp.buttons[4] && gp.buttons[4].pressed) r.a = true;
    }
  }
  return r;
}

// دوران على دفعات من عصا: دفعة واحدة كلما تجاوزت العصا 0.7، ثم تعود تحت 0.3.
// تعيد اتجاه الدوران: +1 لليسار (عكس عقارب الساعة)، و-1 لليمين.
function createSnapLatch() {
  let ready = true;
  return (v) => {
    if (Math.abs(v) > 0.7 && ready) return (ready = false), -Math.sign(v);
    if (Math.abs(v) < 0.3) ready = true;
    return 0;
  };
}
