// اختبار متصفح آلي يؤدي عمرة تدريبية كاملة في index.html.
// التشغيل: npm test   (أو UMRAH_HTML=path/to/file.html node --test tests/)
//
// يحرّك الاختبار اللاعب بـ __umrah.player.teleport مترًا مترًا، ويمرّر كل خطوة
// على دوال حلقة اللعبة نفسها (player.update ثم game.update ثم world وhud)،
// ويضغط الأزرار الحقيقية في الصفحة (ابدأ، الزر الذهبي، زر الانتقال إلى الصفا).
// والمشي بالأسهم يُختبر مرة بلوحة المفاتيح الحقيقية وحلقة الرسم الحقيقية.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const HTML = path.resolve(process.env.UMRAH_HTML || path.join(__dirname, '..', 'index.html'));

// نسخة من أبعاد الكعبة والحِجر في src/js/layout.js (Yt و je).
// إن تغيّرت هناك فغيّرها هنا.
const KAABA = { lx: 12, lz: 11.2, rot: Math.PI / 4 };
const c = Math.cos(KAABA.rot);
const s = Math.sin(KAABA.rot);
// من إحداثيات الكعبة المحلية إلى إحداثيات العالم (Qe في layout.js)
const toWorld = (x, z) => [x * c + z * s, -x * s + z * c];
// زاوية محلية: الدوران عكس عقارب الساعة (الكعبة عن اليسار) يزيدها
const localAt = (psi, r) => [r * Math.cos(psi), -r * Math.sin(psi)];
const PSI_BLACK = Math.atan2(-KAABA.lz / 2, KAABA.lx / 2); // ركن الحجر الأسود
const R = 20; // نصف قطر مسار الطواف: خارج الحِجر ومقام إبراهيم
const STEP = 1; // متر لكل إطار

// نقاط على قوس من psiA إلى psiB (محلية)
function arc(psiA, psiB, r = R) {
  const n = Math.max(1, Math.ceil((Math.abs(psiB - psiA) * r) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => localAt(psiA + ((psiB - psiA) * i) / n, r));
}
function line(a, b) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
}
// شوط يدخل حِجر إسماعيل: يقترب من جدار الكعبة الشمالي ويمرّ بين الجدار والحطيم
function hijrLap(psiA, psiB) {
  const zl = -KAABA.lz / 2 - 1.3; // 1.3 م من جدار الكعبة، داخل الحِجر
  const inA = [9, zl];
  const inB = [-9, zl];
  // نضع زاويتي الدخول والخروج في دورة الشوط نفسه (الزوايا تتراكم عبر الأشواط)
  const fwd = (from, to) => from + ((((to - from) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const psiIn = fwd(psiA, Math.atan2(-inA[1], inA[0]));
  const psiOut = fwd(psiIn, Math.atan2(-inB[1], inB[0]));
  return [
    ...arc(psiA, psiIn),
    ...line(localAt(psiIn, R), inA),
    ...line(inA, inB),
    ...line(inB, localAt(psiOut, R)),
    ...arc(psiOut, psiB),
  ];
}

describe('عمرة كاملة في المتصفح', { timeout: 10 * 60 * 1000 }, () => {
  let browser;
  let page;
  const errors = [];

  before(async () => {
    browser = await chromium.launch({
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    });
    page = await browser.newPage({ viewport: { width: 900, height: 560 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.addInitScript(() => {
      // صوت عربي مزيّف يسجّل كل ما تنطقه اللعبة
      window.__spoken = [];
      const voice = { lang: 'ar-SA', name: 'test-ar', default: true, localService: true, voiceURI: 'test-ar' };
      const synth = {
        getVoices: () => [voice],
        speak: (u) => window.__spoken.push(u.text),
        cancel() {},
        addEventListener() {},
        removeEventListener() {},
      };
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
      window.SpeechSynthesisUtterance = function (text) {
        this.text = text;
      };
      // سجلّ كل تنبيه يظهر، وكل نص يُعرض بخط النصوص الشرعية
      window.__toasts = [];
      window.__sacred = new Set();
      document.addEventListener('DOMContentLoaded', () => {
        const toast = document.getElementById('toast');
        new MutationObserver(() => {
          if (toast.className.includes('show')) window.__toasts.push({ kind: toast.className, text: toast.textContent });
        }).observe(toast, { attributes: true, childList: true, characterData: true, subtree: true });
        // whole: النص كله شرعي (خانة النص الشرعي في البطاقة)، وإلا فما بين «» فقط
        const watch = (el, whole) =>
          new MutationObserver(() => {
            const t = el.textContent.trim();
            if (t && whole) window.__sacred.add(t);
            // ما بين «» في أي نص معروض آيةٌ أو ذكرٌ منقول
            for (const m of t.matchAll(/«([^»]+)»/g)) window.__sacred.add(m[1]);
          }).observe(el, { childList: true, characterData: true, subtree: true });
        watch(document.getElementById('cardSay'), true);
        watch(document.getElementById('veilText'), false);
        watch(document.getElementById('cardText'), false);
      });
    });
    await page.goto('file://' + HTML);
    await page.waitForFunction(() => window.__umrah && window.__umrah.game, null, { timeout: 60000 });
  });

  after(async () => {
    await browser?.close();
  });

  const dbg = () => page.evaluate(() => window.__umrah.game.debug());
  const stage = async () => (await dbg()).stage;
  const toasts = () => page.evaluate(() => window.__toasts.slice());
  async function walk(localPts) {
    const pts = localPts.map(([x, z]) => toWorld(x, z));
    await walkWorld(pts);
  }
  async function walkWorld(pts) {
    const t0 = Date.now();
    await page.evaluate(async (pts) => {
      // جسم حلقة الإطار في main.js نفسه (Ce.update ثم cn.update ثم world وhud) دون الرسم،
      // لأن الرسم البرمجي في المتصفح الآلي بطيء. كل 25 خطوة نترك الحلقة الحقيقية ترسم إطارًا.
      const { player: P, game: G, world: W, hud: H } = window.__umrah;
      const dt = 1 / 30;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        let dx = b[0] - a[0];
        let dz = b[1] - a[1];
        if (!dx && !dz) dz = -1;
        P.teleport(pts[i][0], pts[i][1], dx, dz);
        P.update(dt);
        G.update(dt);
        const pos = P.getPos();
        W.update(dt, pos);
        H.update(dt, pos, P.headingPhi(), false);
        if (i % 25 === 24) await new Promise((r) => requestAnimationFrame(r));
      }
      await new Promise((r) => requestAnimationFrame(r));
    }, pts);
    if (process.env.UMRAH_DEBUG) console.error(`walk ${pts.length} steps in ${Date.now() - t0} ms`, JSON.stringify(await dbg()));
  }
  async function frames(n) {
    await page.evaluate(
      (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }),
      n,
    );
  }
  // يضغط الزر الذهبي بعد أن يضيء بالعنوان المتوقع
  async function act(label) {
    if (label) await page.waitForFunction((l) => document.getElementById('actLabel').textContent.includes(l), label, { timeout: 15000 });
    await page.waitForSelector('#actBtn.ready:not([disabled])', { timeout: 15000 });
    await page.click('#actBtn');
  }

  test('الإحرام ثم المشي بلوحة المفاتيح', async () => {
    await page.click('#startBtn');
    assert.equal(await stage(), 'ihram');
    await act('انوِ العمرة');
    await act('لبّيك');
    assert.equal(await stage(), 'toStart');

    // المشي الحقيقي بالأسهم يحرّك اللاعب
    const p0 = await page.evaluate(() => window.__umrah.player.getPos());
    await page.keyboard.down('ArrowUp');
    await frames(15);
    const moving = await page.evaluate(() => window.__umrah.player.moving);
    await page.keyboard.up('ArrowUp');
    const p1 = await page.evaluate(() => window.__umrah.player.getPos());
    assert.ok(Math.hypot(p1.x - p0.x, p1.z - p0.z) > 0.3, 'اللاعب لم يتحرك بالسهم');
    assert.ok(moving, 'player.moving لم يصبح true أثناء المشي');
  });

  test('الطواف: سبعة أشواط تبدأ من الحجر الأسود، وشوط الحِجر يُلغى، والعكس يُكتشف', async () => {
    // هدف اللعبة في هذه المرحلة على خط الحجر الأسود؛ نتحقق أن ثابتنا يطابقه
    const target = await page.evaluate(() => window.__umrah.hud.model.target);
    const weGame = Math.atan2(-target[1], target[0]);
    const bw = toWorld(...localAt(PSI_BLACK, 1));
    const weTest = Math.atan2(-bw[1], bw[0]);
    assert.ok(Math.abs(weGame - weTest) < 1e-6, 'أبعاد الكعبة في الاختبار لا تطابق اللعبة');

    // قبل خط البداية بقليل لا يبدأ الطواف
    await walk([localAt(PSI_BLACK - 0.4, R)]);
    assert.equal(await page.isDisabled('#actBtn'), true, 'الزر الذهبي مفعّل بعيدًا عن الحجر الأسود');
    await walk(arc(PSI_BLACK - 0.4, PSI_BLACK - 0.03));
    await act('أشِر وكبّر');
    assert.equal(await stage(), 'tawaf');

    const end = (k) => PSI_BLACK + 2 * Math.PI * k + 0.05;
    let psi = PSI_BLACK - 0.03;

    // الشوط الأول
    await walk(arc(psi, (psi = end(1))));
    let d = await dbg();
    assert.deepEqual([d.T.laps, d.T.valid], [1, 1]);
    await act('الله أكبر');

    // الشوط الثاني: يرجع 0.6 راديان (الكعبة عن يمينه) ثم يكمل
    const mid = psi + Math.PI;
    await walk(arc(psi, mid));
    assert.equal((await dbg()).stats.wrong, 0);
    await walk(arc(mid, mid - 0.6));
    d = await dbg();
    assert.equal(d.stats.wrong, 1, 'لم يُكتشف الطواف بالاتجاه المعاكس');
    assert.ok((await toasts()).some((t) => t.kind.includes('warn') && t.text.includes('الاتجاه معكوس')));
    await walk(arc(mid - 0.6, (psi = end(2))));
    d = await dbg();
    assert.deepEqual([d.T.laps, d.T.valid], [2, 2], 'الرجوع ثم الإكمال يجب أن يحتسب الشوط مرة واحدة');
    assert.equal(d.stats.wrong, 1);
    await act('الله أكبر');

    // الشوط الثالث عبر حِجر إسماعيل: لا يُحتسب
    await walk(hijrLap(psi, (psi = end(3))));
    d = await dbg();
    assert.equal(d.stats.hijr, 1, 'لم يُكتشف دخول الحِجر');
    assert.equal(d.stats.invalid, 1);
    assert.deepEqual([d.T.laps, d.T.valid], [3, 2], 'شوط الحِجر احتُسب');
    const t = await toasts();
    assert.ok(t.some((x) => x.kind.includes('warn') && x.text.includes('دخلت حِجر إسماعيل')));
    assert.ok(t.some((x) => x.kind.includes('warn') && x.text.includes('لم يُحتسب هذا الشوط')));
    assert.equal(d.stats.wrong, 1, 'تنبيه عكس اتجاه زائد في شوط الحِجر');
    await act('الله أكبر');

    // الأشواط الباقية حتى سبعة صحيحة (ثمانية أشواط مشيًا)
    for (let k = 4; k <= 8; k++) {
      await walk(arc(psi, (psi = end(k))));
      d = await dbg();
      if (k < 8) {
        assert.deepEqual([d.T.laps, d.T.valid], [k, k - 1]);
        await act('الله أكبر');
      }
    }
    assert.equal(d.stage, 'toMaqam', 'لم ينتهِ الطواف بعد سبعة أشواط صحيحة');
    assert.equal(d.T.valid, 7);
    assert.ok((await toasts()).some((x) => x.text.includes('أتممت سبعة أشواط')));
  });

  test('ركعتا الطواف خلف المقام', async () => {
    const target = await page.evaluate(() => window.__umrah.hud.model.target);
    const p = await page.evaluate(() => window.__umrah.player.getPos());
    await walkWorld(line([p.x, p.z], target));
    await act('صلِّ ركعتين');
    assert.equal(await stage(), 'prayer');
    await page.waitForFunction(() => window.__umrah.game.stage === 'toSafa', null, { timeout: 15000 });
  });

  test('السعي: سبعة أشواط تبدأ من الصفا', async () => {
    // زر «انتقل إلى الصفا مباشرة» في البطاقة
    await page.waitForSelector('#cardBtn:not([hidden])');
    await page.click('#cardBtn');
    await act('ابدأ السعي');
    assert.equal(await stage(), 'sai');

    const toMarwa = await page.evaluate(() => window.__umrah.hud.model.target);
    const x = toMarwa[0] - 3; // بجانب الحاجز الأوسط لا فوقه
    const zSafa = 20;
    const zMarwa = toMarwa[1] - 1;
    for (let lap = 1; lap <= 7; lap++) {
      const p = await page.evaluate(() => window.__umrah.player.getPos());
      const goal = lap % 2 ? zMarwa : zSafa;
      await walkWorld(line([x, p.z], [x, goal]));
      const d = await dbg();
      if (lap < 7) {
        assert.equal(d.A.lap, lap, `لم يُحتسب شوط السعي ${lap}`);
        assert.equal(d.A.target, lap % 2 ? 'safa' : 'marwa');
        await act('ادعُ');
      } else {
        assert.equal(d.stage, 'tahallul');
      }
    }
  });

  test('التحلّل ثم الملخص', async () => {
    await act('حلقتُ أو قصّرتُ');
    await page.waitForSelector('#summary:not([hidden])');
    assert.equal(await stage(), 'done');
    const title = await page.textContent('#sumTitle');
    assert.equal(title, 'تمّت العمرة التدريبية');
    const rows = Object.fromEntries(
      await page.$$eval('#sumRows div', (ds) => ds.map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent])),
    );
    assert.equal(rows['أشواط الطواف المحتسبة'], '٧ من ٧');
    assert.equal(rows['أشواط أُعيدت بسبب دخول الحِجر'], '١');
    assert.equal(rows['تنبيهات عكس الاتجاه'], '١');
    assert.equal(rows['التكبير عند محاذاة الحجر الأسود'], '٧ من ٧');
    // السلوك الحالي: أعلى نتيجة ممكنة ٧ من ٨، لأن اللعبة تنتقل إلى التحلّل فور
    // الوصول إلى المروة في الشوط السابع فلا يظهر زر الدعاء هناك. إن أُصلح ذلك فغيّر هذا السطر.
    assert.equal(rows['الوقوف للدعاء على الصفا والمروة'], '٧ من ٨');
    assert.match(await page.textContent('#sumNote'), /راجع التنبيهات/);
    assert.deepEqual(errors, [], 'أخطاء في وحدة التحكم');
  });
});
