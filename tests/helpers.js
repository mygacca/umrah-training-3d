// أدوات اختبار المتصفح المشتركة بين الأوضاع الأربعة: المسار، وفتح الصفحة، وطرق الضغط في كل وضع.
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const HTML = path.resolve(process.env.UMRAH_HTML || path.join(ROOT, 'index.html'));
const IWER = path.join(ROOT, 'node_modules', 'iwer', 'build', 'iwer.min.js');

// ——— المسار ———
// نسخة من أبعاد الكعبة في src/js/02-layout.js (Yt). إن تغيّرت هناك فغيّرها هنا.
const KAABA = { lx: 12, lz: 11.2, rot: Math.PI / 4 };
const cr = Math.cos(KAABA.rot);
const sr = Math.sin(KAABA.rot);
// من إحداثيات الكعبة المحلية إلى إحداثيات العالم (Qe في 02-layout.js)
const toWorld = (x, z) => [x * cr + z * sr, -x * sr + z * cr];
// زاوية محلية: الدوران عكس عقارب الساعة (الكعبة عن اليسار) يزيدها
const localAt = (psi, r) => [r * Math.cos(psi), -r * Math.sin(psi)];
const PSI_BLACK = Math.atan2(-KAABA.lz / 2, KAABA.lx / 2); // ركن الحجر الأسود
const R = 20; // نصف قطر مسار الطواف: خارج الحِجر ومقام إبراهيم
const STEP = 1; // متر لكل خطوة

function arc(psiA, psiB, r = R) {
  const n = Math.max(1, Math.ceil((Math.abs(psiB - psiA) * r) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => localAt(psiA + ((psiB - psiA) * i) / n, r));
}
function line(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
}
// شوط يدخل حِجر إسماعيل: يقترب من جدار الكعبة ويمرّ بين الجدار والحطيم
function hijrLap(psiA, psiB) {
  const zl = -KAABA.lz / 2 - 1.3; // 1.3 م من جدار الكعبة، داخل الحِجر
  const inA = [9, zl];
  const inB = [-9, zl];
  // زاويتا الدخول والخروج في دورة الشوط نفسه (الزوايا تتراكم عبر الأشواط)
  const fwd = (from, to) => from + ((((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const psiIn = fwd(psiA, Math.atan2(-inA[1], inA[0]));
  const psiOut = fwd(psiIn, Math.atan2(-inB[1], inB[0]));
  return [...arc(psiA, psiIn), ...line(localAt(psiIn, R), inA), ...line(inA, inB), ...line(inB, localAt(psiOut, R)), ...arc(psiOut, psiB)];
}

// ——— الأوضاع ———
const MODES = {
  desktop: { name: 'الحاسوب', context: { viewport: { width: 900, height: 560 } } },
  mobile: { name: 'الجوال', context: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, touch: true, sensor: true },
  // علبة VR ترسم المشهد مرتين: نافذة أفقية أصغر من الجوال الحقيقي (زاوية الشاشة 90° كما في الجوال الأفقي)
  cardboard: { name: 'علبة VR', context: { viewport: { width: 640, height: 300 }, hasTouch: true, isMobile: true }, touch: true, sensor: true, gamepad: true },
  // IWER يرسم بحجم النافذة لعينين، والرسم البرمجي بطيء: نافذة صغيرة تكفي لاختبار المنطق
  xr: { name: 'النظارة', context: { viewport: { width: 480, height: 300 } }, iwer: true },
};

// ما يُحقن في الصفحة قبل تحميلها
function pageInit() {
  // صوت عربي مزيّف يسجّل كل ما تنطقه اللعبة
  window.__spoken = [];
  const voice = { lang: 'ar-SA', name: 'test-ar', default: true, localService: true, voiceURI: 'test-ar' };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { getVoices: () => [voice], speak: (u) => window.__spoken.push(u.text), cancel() {}, addEventListener() {}, removeEventListener() {} },
  });
  window.SpeechSynthesisUtterance = function (text) {
    this.text = text;
  };
  // كل تنبيه يظهر، وكل نص يُعرض نصًّا شرعيًّا. نقرأ المرآة النصية في #hud، وهي ما تُرسم منه اللوحات
  window.__toasts = [];
  window.__sacred = new Set();
  document.addEventListener('DOMContentLoaded', () => {
    const toast = document.getElementById('toast');
    new MutationObserver(() => {
      if (toast.className.includes('show')) window.__toasts.push({ kind: toast.className, text: toast.textContent });
    }).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });
    // whole: النص كله شرعي (خانة النص الشرعي)، وإلا فما بين «» فقط
    const watch = (el, whole) =>
      new MutationObserver(() => {
        const t = el.textContent.trim();
        if (t && whole) window.__sacred.add(t);
        for (const m of t.matchAll(/«([^»]+)»/g)) window.__sacred.add(m[1]);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    watch(document.getElementById('cardSay'), true);
    watch(document.getElementById('veilText'), false);
    watch(document.getElementById('cardText'), false);
  });
}
// يد تحكم بلوتوث مزيّفة (Gamepad API) يتحكم بها الاختبار
function fakeGamepad() {
  window.__pad = {
    id: 'test-pad',
    index: 0,
    connected: false,
    mapping: 'standard',
    timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
  };
  navigator.getGamepads = () => [window.__pad.connected ? window.__pad : null];
}
function installIwer() {
  const device = new window.IWER.XRDevice(window.IWER.metaQuest3);
  device.installRuntime({ forceInstall: true }); // Chromium فيه navigator.xr أصلًا
  window.__xrDevice = device;
}

async function openPage(mode) {
  const M = MODES[mode];
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext(M.context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(pageInit);
  if (M.gamepad) await page.addInitScript(fakeGamepad);
  if (M.iwer) {
    await page.addInitScript({ path: IWER });
    await page.addInitScript(installIwer);
  }
  await page.goto('file://' + HTML);
  await page.waitForFunction(() => window.__umrah && window.__umrah.game, null, { timeout: 60000 });
  return { browser, page, errors, driver: createDriver(mode, page) };
}

// ——— طرق الإدخال في كل وضع ———
function createDriver(mode, page) {
  const M = MODES[mode];
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const dbg = () => ev(() => window.__umrah.game.debug());
  const frames = (n) =>
    ev((n) => new Promise((r) => {
      let k = 0;
      const f = () => (++k >= n ? r() : requestAnimationFrame(f));
      requestAnimationFrame(f);
    }), n);
  // ما يغيّره الضغط على زر، دون ما يتغير وحده كل إطار (مهلة التكبير، والزمن)
  function pressState() {
    const { game, hud, player, modes } = window.__umrah;
    const d = game.debug();
    return JSON.stringify([d.stage, d.sub, d.stats.takbir, d.stats.dua, d.T.laps, d.A.lap, hud.model.action, hud.model.cardBtn, player.yaw.toFixed(3), player.rig.rotation.y.toFixed(3), modes.walking]);
  }
  const snapshot = () => ev(pressState);
  const changedSince = (before) => page.waitForFunction(`(${pressState})() !== ${JSON.stringify(before)}`, null, { timeout: 8000 });
  const tapOrClick = async (x, y) => (M.touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  let clickedOnce = false;

  // يمشي على نقاط في العالم: teleport لكل متر، ثم جسم الإطار نفسه بلا رسم (__umrah.step)
  async function walkWorld(pts) {
    await ev(async (pts) => {
      const { player: P, step } = window.__umrah;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        let dx = b[0] - a[0];
        let dz = b[1] - a[1];
        if (!dx && !dz) dz = -1;
        P.teleport(pts[i][0], pts[i][1], dx, dz);
        step(1 / 30);
        if (i % 25 === 24) await new Promise((r) => requestAnimationFrame(r));
      }
      await new Promise((r) => requestAnimationFrame(r));
    }, pts);
    if (process.env.UMRAH_DEBUG) console.error(mode, 'walk', pts.length, JSON.stringify(await dbg()));
  }
  const walkLocal = (pts) => walkWorld(pts.map(([x, z]) => toWorld(x, z)));

  // ——— علبة VR: النظر بالمستشعر ———
  // يحسب قراءة deviceorientation التي تجعل الكاميرا تنظر في اتجاه معيّن (عكس تحويل 05-input.js)، ويرسلها.
  // target: { point: {x,y,z} } نقطة في العالم، أو { yaw, pitch } بالنسبة إلى العالم
  const look = (target) =>
    ev((target) => {
      const { camera, player } = window.__umrah;
      const V = camera.position.constructor;
      const Q = camera.quaternion.constructor;
      const E = camera.rotation.constructor;
      let yaw;
      let pitch;
      if (target.point) {
        const head = new V();
        camera.getWorldPosition(head);
        const d = new V(target.point.x, target.point.y, target.point.z).sub(head);
        d.applyAxisAngle(new V(0, 1, 0), -player.rig.rotation.y); // إلى إحداثيات المنصّة
        yaw = Math.atan2(-d.x, -d.z);
        pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
      } else (yaw = target.yaw - player.rig.rotation.y), (pitch = target.pitch);
      const qCam = new Q().setFromEuler(new E(pitch, yaw, 0, 'YXZ'));
      const angle = ((screen.orientation ? screen.orientation.angle : window.orientation) || 0) * (Math.PI / 180);
      const qz = new Q().setFromAxisAngle(new V(0, 0, 1), angle);
      const q1inv = new Q(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)).invert();
      const e = new E().setFromQuaternion(qCam.multiply(qz).multiply(q1inv), 'YXZ');
      const deg = 180 / Math.PI;
      window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', { alpha: e.y * deg, beta: e.x * deg, gamma: -e.z * deg }));
    }, target);
  // ينظر أمامه وفوق اللوحة قليلًا، فلا يقع النظر على زر أثناء المشي
  // ...وينتظر إطارًا تلاحظ فيه اللعبة أن النظر ابتعد عن الأزرار، وإلا بقي الزر السابق «مُستهلَكًا»
  async function lookAway() {
    const yaw = await ev(() => window.__umrah.player.headingYaw());
    await look({ yaw, pitch: 0.45 });
    await page.waitForFunction(() => window.__umrah.modes.gaze.id === null, null, { timeout: 60000 });
  }
  // ينتظر أن تستقر لوحة النظارة بعد الانتقال
  const boardSettled = () =>
    page.waitForFunction(
      () => {
        const m = window.__umrah.panels.board.mesh;
        const p = m.position;
        const k = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)},${m.rotation.y.toFixed(2)}`; // سنتيمتر يكفي: التصويب يُعاد حتى ينجح
        const same = window.__lastBoard === k;
        window.__lastBoard = k;
        return same;
      },
      null,
      { polling: 150, timeout: 60000 },
    );
  const buttonWorld = (id) =>
    ev((id) => {
      const v = window.__umrah.panels.buttonWorld(id);
      return v && { x: v.x, y: v.y, z: v.z };
    }, id);
  async function gazePress(id) {
    const before = await snapshot();
    await boardSettled();
    // ثانية الاختيار تُحسب بزمن الإطارات، والإطار في الرسم البرمجي بطيء حين تعمل الأوضاع بالتوازي
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const point = await buttonWorld(id);
      if (point) await look({ point });
      await frames(3);
      if ((await snapshot()) !== before) return lookAway();
    }
    throw new Error(`النظر إلى الزر ${id} لم يضغطه`);
  }

  // ——— النظارة: تصويب الذراع اليمنى ثم الزناد ———
  const aimController = (point) =>
    ev((point) => {
      const { camera, player, modes } = window.__umrah;
      const V = camera.position.constructor;
      const Q = camera.quaternion.constructor;
      const E = camera.rotation.constructor;
      const c = player.controllers.find((c) => c.userData.handedness === 'right') || player.controllers[1];
      const local = new V(point.x, point.y, point.z);
      player.rig.worldToLocal(local);
      const d = local.sub(c.position);
      const q = new Q().setFromEuler(new E(Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(-d.x, -d.z), 0, 'YXZ'));
      window.__xrDevice.controllers.right.quaternion.set(q.x, q.y, q.z, q.w);
      return modes.rayHover;
    }, point);
  const xrButton = async (hand, id, frameCount = 3) => {
    await ev(([h, i]) => window.__xrDevice.controllers[h].updateButtonValue(i, 1), [hand, id]);
    await frames(frameCount);
    await ev(([h, i]) => window.__xrDevice.controllers[h].updateButtonValue(i, 0), [hand, id]);
    await frames(frameCount);
  };
  const xrStick = (hand, x, y) => ev(([h, x, y]) => window.__xrDevice.controllers[h].updateAxes('thumbstick', x, y), [hand, x, y]);
  async function controllerPress(id) {
    const before = await snapshot();
    await boardSettled();
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      const point = await buttonWorld(id);
      await aimController(point);
      await frames(2);
      if ((await ev(() => window.__umrah.modes.rayHover)) === id) {
        await xrButton('right', 'trigger');
        if ((await snapshot()) !== before) return;
      }
    }
    throw new Error(`الذراع لم تضغط الزر ${id}`);
  }

  // ——— الشاشات المسطحة: نقر أو لمس على اللوحة داخل المشهد ———
  async function screenPress(id) {
    const before = await snapshot();
    await frames(2);
    const p = await ev((id) => window.__umrah.panels.buttonScreen(id), id);
    if (!p) throw new Error(`الزر ${id} غير ظاهر`);
    await tapOrClick(p.x, p.y);
    await changedSince(before);
  }

  // يضغط زرًا في اللوحات بطريقة الوضع
  async function press(id) {
    if (mode === 'cardboard') return gazePress(id);
    if (mode === 'xr') return controllerPress(id);
    return screenPress(id);
  }
  // الزر الذهبي بعد أن يضيء بالعنوان المتوقع
  async function act(label) {
    await page.waitForFunction(
      (l) => {
        const a = window.__umrah.hud.model.action;
        return a.enabled && (!l || a.label.includes(l));
      },
      label,
      { timeout: 15000 },
    );
    if (mode === 'desktop' && clickedOnce) {
      // في الحاسوب: المسافة، وأول مرة بالنقر على الزر المرسوم
      const before = await snapshot();
      await page.keyboard.press('Space');
      return changedSince(before);
    }
    clickedOnce = true;
    return press('action');
  }
  // بدء التدريب من شاشة البداية: اختيار الوضع ثم «ابدأ»
  async function start() {
    const sel = `[data-mode="${mode}"]`;
    await page.waitForSelector(sel, { state: 'visible', timeout: 15000 });
    if (M.touch) await page.tap(sel), await page.tap('#startBtn');
    else await page.click(sel), await page.click('#startBtn');
    if (mode === 'xr') await page.waitForFunction(() => window.__umrah.renderer.xr.isPresenting, null, { timeout: 20000 });
    if (M.sensor) await look({ yaw: 0, pitch: 0 }); // أول قراءة من المستشعر
    await page.waitForFunction((m) => window.__umrah.modes.mode === m && window.__umrah.game.stage === 'ihram', mode, { timeout: 20000 });
    if (mode === 'cardboard') await lookAway();
  }

  return { mode, page, dbg, frames, walkWorld, walkLocal, act, press, start, look, lookAway, gazePress, buttonWorld, aimController, xrButton, xrStick, snapshot };
}

module.exports = { MODES, openPage, toWorld, localAt, arc, line, hijrLap, PSI_BLACK, R, KAABA };
