// عمرة كاملة في وضع واحد. كل ملف *.test.js يستدعي runUmrah بوضعه، فتعمل الأوضاع الأربعة بالتوازي.
//
// الضغط على الأزرار بطريقة الوضع الحقيقية:
//   الحاسوب: النقر على الزر المرسوم في المشهد مرة، ثم مفتاح المسافة
//   الجوال:  لمس الزر المرسوم في المشهد
//   علبة VR: قراءات مستشعر تجعل النظر على الزر، ثم انتظار ثانية الاختيار
//   النظارة: IWER يحاكي Quest 3: تصويب الذراع اليمنى على الزر ثم الزناد
// والمشي في المناسك نفسها بـ teleport مترًا مترًا مع جسم الإطار (__umrah.step) بلا رسم، لأن الرسم البرمجي بطيء.
// ويُختبر المشي والالتفات بالإدخال الحقيقي لكل وضع مرة في أول الاختبار.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { MODES, openPage, toWorld, localAt, arc, line, hijrLap, PSI_BLACK, R } = require('./helpers');

const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};
const SNAP = Math.PI / 6;

function runUmrah(mode) {
  const M = MODES[mode];
  describe(`عمرة كاملة: ${M.name}`, { timeout: 15 * 60 * 1000 }, () => {
    let browser;
    let page;
    let errors;
    let D;
    before(async () => {
      ({ browser, page, errors, driver: D } = await openPage(mode));
    });
    after(async () => browser?.close());

    const stage = async () => (await D.dbg()).stage;
    const toasts = () => page.evaluate(() => window.__toasts.slice());
    const pos = () => page.evaluate(() => window.__umrah.player.getPos());
    const heading = () => page.evaluate(() => window.__umrah.player.headingYaw());
    const moved = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);

    test('البداية والإحرام', async () => {
      await D.start();
      assert.equal(await page.evaluate(() => window.__umrah.modes.mode), mode);
      // اللوحات داخل المشهد بحسب الوضع
      const kind = await page.evaluate(() => window.__umrah.panels.kind);
      assert.equal(kind, mode === 'xr' || mode === 'cardboard' ? 'board' : 'flat');
      if (mode === 'cardboard') {
        // بعد الاختيار بالنظر يبقى النظر على الزر وقد صار «لبّيك»: لا يُضغط وحده حتى يبتعد النظر ويعود
        await page.waitForFunction(() => window.__umrah.hud.model.action.enabled, null, { timeout: 15000 });
        await D.look({ point: await D.buttonWorld('action') });
        await page.waitForFunction(() => window.__umrah.game.debug().sub === 'talbiya', null, { timeout: 120000 });
        const t0 = await page.evaluate(() => window.__umrah.hud.time);
        await page.waitForFunction((t0) => window.__umrah.hud.time - t0 > 1.5, t0, { timeout: 120000 });
        assert.equal((await D.dbg()).sub, 'talbiya', 'النظر الباقي على الزر ضغط المنسك التالي وحده');
        assert.equal(await page.evaluate(() => window.__umrah.modes.gaze.id), 'action');
        await D.lookAway();
      } else await D.act('انوِ العمرة');
      await D.act('لبّيك');
      assert.equal(await stage(), 'toStart');
    });

    test(`المشي والالتفات بإدخال ${M.name}`, async () => {
      if (mode === 'desktop') {
        const p0 = await pos();
        await page.keyboard.down('ArrowUp');
        await D.frames(15);
        const moving = await page.evaluate(() => window.__umrah.player.moving);
        await page.keyboard.up('ArrowUp');
        assert.ok(moved(p0, await pos()) > 0.3, 'السهم لم يحرّك اللاعب');
        assert.ok(moving);
        // بلا حركة مريحة: السهم الأيسر التفات متصل
        const h0 = await heading();
        await page.keyboard.down('ArrowLeft');
        await D.frames(8);
        await page.keyboard.up('ArrowLeft');
        const h1 = await heading();
        assert.ok(angleDiff(h1, h0) > 0.05, 'السهم الأيسر لم يلتفت');
        // الحركة المريحة من القائمة: السهم دفعة 30° وتعتيم الأطراف أثناء المشي
        await page.keyboard.press('Escape');
        await page.click('#menu label:has(input[data-opt="comfort"])');
        await page.click('#menuClose');
        await page.keyboard.press('ArrowLeft');
        await D.frames(2);
        assert.ok(Math.abs(angleDiff(await heading(), h1) - SNAP) < 0.02, 'الدوران على دفعات ليس 30°');
        await page.keyboard.down('ArrowUp');
        await D.frames(12);
        const v = await page.evaluate(() => window.__umrah.vignette.strength);
        await page.keyboard.up('ArrowUp');
        assert.ok(v > 0.1, 'لا تعتيم للأطراف أثناء المشي مع الحركة المريحة');
        await page.keyboard.press('Escape');
        await page.click('#menu label:has(input[data-opt="comfort"])');
        await page.click('#menuClose');
      }
      if (mode === 'mobile') {
        // المستشعر: الالتفات بتحريك الجوال
        const h0 = await heading();
        await D.look({ yaw: h0 + 0.7, pitch: 0 });
        await D.frames(3);
        assert.ok(Math.abs(angleDiff(await heading(), h0) - 0.7) < 0.03, 'المستشعر لم يغيّر اتجاه النظر');
        // العصا: لمس ثم سحب إلى الأعلى
        const box = await page.locator('#joy').boundingBox();
        const cdp = await page.context().newCDPSession(page);
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const p0 = await pos();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 40 }] });
        await D.frames(15);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.ok(moved(p0, await pos()) > 0.3, 'العصا لم تحرّك اللاعب');
        // زر الدوران على دفعات
        const h1 = await heading();
        await page.tap('#turnLBtn');
        await D.frames(2);
        assert.ok(Math.abs(angleDiff(await heading(), h1) - SNAP) < 0.02, 'زر الدوران ليس 30°');
      }
      if (mode === 'cardboard') {
        // الصورتان: الكاميرتان جنبًا إلى جنب
        const eyes = await page.evaluate(() => window.__umrah.camera.children.filter((c) => c.isPerspectiveCamera).map((c) => c.position.x));
        assert.deepEqual(eyes.map((x) => Math.sign(x)), [-1, 1]);
        // لمس الشاشة (زر العلبة) يبدأ المشي في اتجاه النظر ويوقفه
        const p0 = await pos();
        await page.touchscreen.tap(320, 200);
        await D.frames(15);
        assert.ok(await page.evaluate(() => window.__umrah.modes.walking));
        await page.touchscreen.tap(320, 200);
        assert.ok(moved(p0, await pos()) > 0.3, 'لمس الشاشة لم يبدأ المشي');
        assert.equal(await page.evaluate(() => window.__umrah.modes.walking), false);
        // النظر ثانية إلى «دُر يسارًا» في اللوحة: يدور الجسم (المنصّة) 30°، أيًّا كان اتجاه الرأس
        const yaw = () => page.evaluate(() => window.__umrah.player.yaw);
        const y0 = await yaw();
        await D.gazePress('turnL');
        assert.ok(Math.abs(angleDiff(await yaw(), y0) - SNAP) < 1e-6, 'النظر إلى زر الدوران لم يدر 30°');
        // يد تحكم بلوتوث: العصا اليسرى للمشي، والعصا اليمنى دفعة
        await page.evaluate(() => (window.__pad.connected = true));
        const p1 = await pos();
        await page.evaluate(() => (window.__pad.axes[1] = -1));
        await D.frames(15);
        await page.evaluate(() => (window.__pad.axes[1] = 0));
        assert.ok(moved(p1, await pos()) > 0.3, 'يد التحكم لم تحرّك اللاعب');
        const h1 = await heading();
        await page.evaluate(() => (window.__pad.axes[2] = 1));
        await D.frames(3);
        await page.evaluate(() => (window.__pad.axes[2] = 0));
        await D.frames(3);
        assert.ok(Math.abs(angleDiff(await heading(), h1) + SNAP) < 0.05, 'العصا اليمنى ليست دفعة 30° لليمين');
        await page.evaluate(() => (window.__pad.connected = false));
        await D.lookAway();
      }
      if (mode === 'xr') {
        const p0 = await pos();
        await D.xrStick('left', 0, -1);
        await D.frames(10);
        await D.xrStick('left', 0, 0);
        assert.ok(moved(p0, await pos()) > 0.05, 'العصا اليسرى لم تحرّك اللاعب');
        const h0 = await heading();
        await D.xrStick('right', 1, 0);
        await D.frames(3);
        await D.xrStick('right', 0, 0);
        await D.frames(3);
        assert.ok(Math.abs(angleDiff(await heading(), h0) + SNAP) < 0.05, 'العصا اليمنى ليست دفعة 30°');
        // اللوحة تتبع الرأس إن التفت عنها أكثر من 35°
        const b0 = await page.evaluate(() => window.__umrah.panels.board.mesh.rotation.y);
        await page.evaluate(() => {
          const q = new window.__umrah.camera.quaternion.constructor().setFromAxisAngle(new window.__umrah.camera.position.constructor(0, 1, 0), 1.2);
          window.__xrDevice.quaternion.set(q.x, q.y, q.z, q.w);
        });
        // تنتقل اللوحة حتى تقف أمام الرأس من جديد
        await page.waitForFunction(
          (b0) => {
            const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
            const yaw = window.__umrah.panels.board.mesh.rotation.y;
            return Math.abs(wrap(yaw - window.__umrah.player.headingYaw())) < 0.15 && Math.abs(wrap(yaw - b0)) > 0.4;
          },
          b0,
          { timeout: 90000 },
        );
        await page.evaluate(() => window.__xrDevice.quaternion.set(0, 0, 0, 1));
      }
    });

    test('الطواف: سبعة أشواط من الحجر الأسود، والحِجر يُلغي الشوط، والعكس يُكتشف', async () => {
      const target = await page.evaluate(() => window.__umrah.hud.model.target);
      const weGame = Math.atan2(-target[1], target[0]);
      const bw = toWorld(...localAt(PSI_BLACK, 1));
      assert.ok(Math.abs(weGame - Math.atan2(-bw[1], bw[0])) < 1e-6, 'أبعاد الكعبة في الاختبار لا تطابق اللعبة');

      await D.walkLocal([localAt(PSI_BLACK - 0.4, R)]);
      assert.equal(await page.evaluate(() => window.__umrah.hud.model.action.enabled), false, 'الزر مفعّل بعيدًا عن الحجر الأسود');
      await D.walkLocal(arc(PSI_BLACK - 0.4, PSI_BLACK - 0.03));
      await D.act('أشِر وكبّر');
      assert.equal(await stage(), 'tawaf');

      const end = (k) => PSI_BLACK + 2 * Math.PI * k + 0.05;
      let psi = PSI_BLACK - 0.03;
      await D.walkLocal(arc(psi, (psi = end(1))));
      let d = await D.dbg();
      assert.deepEqual([d.T.laps, d.T.valid], [1, 1]);
      await D.act('الله أكبر');

      // الشوط الثاني: يرجع 0.6 راديان ثم يكمل
      const mid = psi + Math.PI;
      await D.walkLocal(arc(psi, mid));
      assert.equal((await D.dbg()).stats.wrong, 0);
      await D.walkLocal(arc(mid, mid - 0.6));
      assert.equal((await D.dbg()).stats.wrong, 1, 'لم يُكتشف الطواف بالاتجاه المعاكس');
      assert.ok((await toasts()).some((t) => t.kind.includes('warn') && t.text.includes('الاتجاه معكوس')));
      await D.walkLocal(arc(mid - 0.6, (psi = end(2))));
      d = await D.dbg();
      assert.deepEqual([d.T.laps, d.T.valid, d.stats.wrong], [2, 2, 1]);
      await D.act('الله أكبر');

      // الشوط الثالث عبر حِجر إسماعيل: لا يُحتسب
      await D.walkLocal(hijrLap(psi, (psi = end(3))));
      d = await D.dbg();
      assert.deepEqual([d.stats.hijr, d.stats.invalid, d.T.laps, d.T.valid, d.stats.wrong], [1, 1, 3, 2, 1], 'شوط الحِجر');
      const t = await toasts();
      assert.ok(t.some((x) => x.kind.includes('warn') && x.text.includes('حِجر إسماعيل')));
      assert.ok(t.some((x) => x.kind.includes('warn') && x.text.includes('لم يُحتسب هذا الشوط')));
      await D.act('الله أكبر');

      for (let k = 4; k <= 8; k++) {
        await D.walkLocal(arc(psi, (psi = end(k))));
        d = await D.dbg();
        if (k < 8) {
          assert.deepEqual([d.T.laps, d.T.valid], [k, k - 1]);
          await D.act('الله أكبر');
        }
      }
      assert.equal(d.stage, 'toMaqam', 'لم ينتهِ الطواف بعد سبعة أشواط صحيحة');
      assert.equal(d.T.valid, 7);
    });

    test('ركعتا الطواف خلف المقام', async () => {
      const target = await page.evaluate(() => window.__umrah.hud.model.target);
      const p = await pos();
      await D.walkWorld(line([p.x, p.z], target));
      await D.act('صلِّ ركعتين');
      assert.equal(await stage(), 'prayer');
      await page.waitForFunction(() => window.__umrah.game.stage === 'toSafa', null, { timeout: 15000 });
    });

    test('السعي: سبعة أشواط تبدأ من الصفا', async () => {
      // «انتقل إلى الصفا مباشرة» زر في البطاقة داخل المشهد
      await page.waitForFunction(() => !!window.__umrah.hud.model.cardBtn);
      await D.press('secondary');
      await D.act('ابدأ السعي');
      assert.equal(await stage(), 'sai');
      const toMarwa = await page.evaluate(() => window.__umrah.hud.model.target);
      const x = toMarwa[0] - 3; // بجانب الحاجز الأوسط
      for (let lap = 1; lap <= 7; lap++) {
        const p = await pos();
        await D.walkWorld(line([x, p.z], [x, lap % 2 ? toMarwa[1] - 1 : 20]));
        const d = await D.dbg();
        if (lap < 7) {
          assert.equal(d.A.lap, lap, `شوط السعي ${lap}`);
          await D.act('ادع');
        } else assert.equal(d.stage, 'tahallul');
      }
    });

    test('التحلّل ثم الملخص', async () => {
      await D.act('حلقتُ أو قصّرتُ');
      await page.waitForFunction(() => window.__umrah.game.stage === 'done');
      const rows = Object.fromEntries(
        await page.$$eval('#sumRows div', (ds) => ds.map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent])),
      );
      assert.equal(rows['أشواط الطواف المحتسبة'], '٧ من ٧');
      assert.equal(rows['أشواط أُعيدت بسبب دخول الحِجر'], '١');
      assert.equal(rows['تنبيهات عكس الاتجاه'], '١');
      assert.equal(rows['التكبير عند محاذاة الحجر الأسود'], '٧ من ٧');
      assert.equal(rows['الوقوف للدعاء على الصفا والمروة'], '٧ من ٧');
      assert.match(await page.textContent('#sumNote'), /راجع التنبيهات/);
      const card = await page.evaluate(() => window.__umrah.hud.model.title);
      assert.equal(card, 'تمّت العمرة التدريبية', 'الملخص ليس في لوحة المشهد');
      // نافذة الملخص في الصفحة للشاشات المسطحة فقط
      assert.equal(await page.isVisible('#summary'), !(mode === 'xr' || mode === 'cardboard'));
      if (mode === 'xr' || mode === 'cardboard') {
        // في النظارة وعلبة VR يعيد الزر الذهبي التدريب
        await D.act('أعِد التدريب');
        assert.equal(await stage(), 'ihram');
      }
      assert.deepEqual(errors, [], 'أخطاء في وحدة التحكم');
    });

    test('لا يُقرأ نص شرعي بالصوت الآلي', async () => {
      const { spoken, sacred } = await page.evaluate(() => ({ spoken: window.__spoken, sacred: [...window.__sacred] }));
      assert.ok(spoken.length > 10, 'الصوت المزيّف لم يُستعمل');
      const bare = (t) => t.replace(/[ً-ٰٟۖ-ۭ«»]/g, '').replace(/\s+/g, ' ').trim();
      const phrases = sacred
        .filter((t) => /[ً-ْ]/.test(t) && bare(t).length >= 8)
        .flatMap((t) => bare(t).split(/[،,]/))
        .map((t) => t.trim())
        .filter((t) => t.length >= 8);
      assert.ok(phrases.length > 5, 'لم تُجمع نصوص شرعية للمقارنة');
      for (const u of spoken) for (const ph of phrases) assert.ok(!bare(u).includes(ph), `نُطق نص شرعي آليًا: «${ph}» في «${u}»`);
    });
  });
}

module.exports = { runUmrah };
