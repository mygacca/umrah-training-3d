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
const { MODES, openPage, toWorld, localAt, arc, line, hijrLap, PSI_BLACK, R, KAABA } = require('./helpers');

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
        // الافتراضي: الالتفات بالسحب لا بالمستشعر، والمشي الموجّه مفعّل
        assert.deepEqual(await page.evaluate(() => [window.__umrah.player.look, window.__umrah.modes.gyro, window.__umrah.modes.guide]), ['mouse', false, true]);
        const cdp = await page.context().newCDPSession(page);
        const touch = (type, ...pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y })) });
        // السحب في النصف الأيمن (بين البطاقة والأزرار): التفات إلى اليسار
        const h0 = await heading();
        await touch('touchStart', [300, 500]);
        await touch('touchMove', [260, 500]);
        await touch('touchMove', [220, 500]);
        await touch('touchEnd');
        await D.frames(2);
        const turned = angleDiff(await heading(), h0);
        assert.ok(turned > 0.35 && turned < 0.6, `السحب التفت ${turned.toFixed(2)}`);
        // العصا العائمة: تظهر حيث يضع الإبهام أسفل اليسار، لا حيث كانت
        const home = await page.locator('#joy').boundingBox();
        const target = await page.evaluate(() => window.__umrah.hud.model.target);
        const p0 = await pos();
        await touch('touchStart', [100, 620]);
        await D.frames(1);
        const box = await page.locator('#joy').boundingBox();
        assert.ok(Math.hypot(box.x + box.width / 2 - 100, box.y + box.height / 2 - 620) < 2, 'العصا لم تنتقل إلى الإبهام');
        await touch('touchMove', [100, 580]);
        await D.frames(15);
        await touch('touchEnd');
        const p1 = await pos();
        assert.ok(moved(p0, p1) > 0.3, 'العصا لم تحرّك اللاعب');
        // المشي الموجّه: إلى خط البداية، مع أن النظر صار إلى جهة أخرى بالسحب
        const mv = [p1.x - p0.x, p1.z - p0.z];
        const tg = [target[0] - p0.x, target[1] - p0.z];
        const cos = (mv[0] * tg[0] + mv[1] * tg[1]) / (Math.hypot(...mv) * Math.hypot(...tg));
        assert.ok(cos > 0.95, `المشي ليس إلى الهدف (${cos.toFixed(2)})`);
        await D.frames(1);
        assert.deepEqual(await page.locator('#joy').boundingBox(), home, 'العصا لم تعد إلى مكانها');
        // «مشي مستمر»: يمشي وحده ويلتفت مع المسار، ويقف عند خط الحجر الأسود لأن المنسك يحتاج الزر، ثم ينظر إلى الحجر
        await page.tap('#autoWalkBtn');
        assert.equal(await page.evaluate(() => window.__umrah.modes.autoWalk), true);
        const w = await page.evaluate(() => {
          const { modes, hud, game, player, step } = window.__umrah;
          let n = 0;
          let align = null;
          while (modes.autoWalk && n++ < 900) {
            step(1 / 30);
            const g = modes.guideDir;
            if (g) align = Math.abs(Math.atan2(Math.sin(player.headingYaw() - Math.atan2(-g[0], -g[1])), Math.cos(player.headingYaw() - Math.atan2(-g[0], -g[1]))));
          }
          for (let i = 0; i < 90; i++) step(1 / 30);
          const p = player.getPos();
          return { n, autoWalk: modes.autoWalk, stage: game.stage, action: hud.model.action, align, p, heading: player.headingYaw(), pressed: document.getElementById('autoWalkBtn').getAttribute('aria-pressed') };
        });
        assert.ok(!w.autoWalk && w.n < 900, 'المشي المستمر لم يقف');
        assert.equal(w.pressed, 'false');
        assert.equal(w.stage, 'toStart');
        assert.ok(w.action.enabled && w.action.label.includes('أشِر'), 'المشي المستمر لم يقف عند خط البداية');
        assert.ok(w.align < 0.15, `الكاميرا لم تلتفت مع المسار (${w.align.toFixed(2)})`);
        const stone = toWorld(KAABA.lx / 2, KAABA.lz / 2); // ركن الحجر الأسود
        const toStone = Math.atan2(-(stone[0] - w.p.x), -(stone[1] - w.p.z));
        assert.ok(Math.abs(angleDiff(w.heading, toStone)) < 0.1, 'لم ينظر إلى الحجر الأسود بعد الوصول');
        // النظر بتحريك الجوال: اختياري من القائمة
        await page.tap('#menuBtn');
        await page.tap('#menu label:has(input[data-opt="gyro"])');
        await page.tap('#menuClose');
        await D.look({ yaw: 0, pitch: 0 }); // أول قراءة: يبقى اتجاه النظر كما كان
        await D.frames(3);
        assert.equal(await page.evaluate(() => window.__umrah.player.look), 'sensor');
        const h1 = await heading();
        await D.look({ yaw: h1 + 0.7, pitch: 0 });
        await D.frames(3);
        assert.ok(Math.abs(angleDiff(await heading(), h1) - 0.7) < 0.03, 'المستشعر لم يغيّر اتجاه النظر');
        await page.tap('#menuBtn');
        await page.tap('#menu label:has(input[data-opt="gyro"])');
        await page.tap('#menuClose');
        assert.equal(await page.evaluate(() => window.__umrah.player.look), 'mouse');
        // زر الدوران على دفعات
        const h2 = await heading();
        await page.tap('#turnLBtn');
        await D.frames(2);
        assert.ok(Math.abs(angleDiff(await heading(), h2) - SNAP) < 0.02, 'زر الدوران ليس 30°');
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

    // الطبقة 0 من docs/realism-plan.md: مستوى الجودة بحسب الوضع، وميزانية رسم من نقطة ثابتة أمام الكعبة
    test('الجودة وميزانية الرسم', async () => {
      const q = await page.evaluate(() => ({ tier: window.__umrah.quality.tier, crowd: window.__umrah.world.crowds.active.mataf }));
      const expected = { desktop: ['high', 380], mobile: ['low', 209], cardboard: ['low', 209], xr: ['xr', 266] }[mode];
      assert.deepEqual([q.tier, q.crowd], expected, 'مستوى الجودة التلقائي');
      if (mode === 'xr') {
        // في النظارة لا نرسم خارج إطار WebXR؛ نتحقق من التنقيط المركزي فقط:
        // يبدأ 0.5، ويرفعه التكيّف حتى 1 إن بطؤت الإطارات (والمحاكاة بطيئة)، ويصل إلى الرسّام
        const f = await page.evaluate(() => [window.__umrah.quality.foveation, window.__umrah.renderer.xr.getFoveation()]);
        assert.ok(f[0] >= 0.5 && f[0] <= 1, `التنقيط المركزي ${f[0]}`);
        if (f[1] !== undefined) assert.equal(f[1], f[0]);
        return;
      }
      await D.walkLocal([localAt(PSI_BLACK - 0.4, R)]);
      const measure = () =>
        page.evaluate(() => {
          const { player, quality, scene, camera } = window.__umrah;
          const p = player.getPos();
          player.teleport(p.x, p.z, -p.x, -p.z); // ينظر إلى الكعبة
          return quality.measure(scene, camera);
        });
      // الحدود: قياس هذه النسخة وفوقه هامش نحو 20%. إن تجاوزتها إضافة، فراجع docs/realism-plan.md قبل رفعها
      // (في هذه الحالة: اللافتات ظاهرة، وكل لافتة أمر رسم، وحلقة الهدف وخط البداية ظاهران)
      // قيست بعد الطبقة 4 (تفاصيل المعالم: أقواس ثلاثية الأبعاد، وتيجان الأعمدة، والقناديل...):
      // الحاسوب 82 أمرًا و99 ألف مثلث (المستوى العالي)، والجوال 54 و67 ألفًا (المنخفض)، وعلبة VR 77 و74 ألفًا لعين واحدة.
      // الطبقة 4 زادت نحو 27 ألف مثلث، وهو دون تقدير الخطة (+60–150 ألفًا) ودون حدود الأجهزة فيها (300–500 ألف للجوال)
      const BUDGET = { desktop: { calls: 98, triangles: 119000 }, mobile: { calls: 65, triangles: 81000 }, cardboard: { calls: 92, triangles: 88000 } }[mode];
      const day = await measure();
      if (process.env.UMRAH_DEBUG) console.error('budget', mode, JSON.stringify(day));
      assert.ok(day.calls <= BUDGET.calls, `أوامر الرسم ${day.calls} > ${BUDGET.calls}`);
      assert.ok(day.triangles <= BUDGET.triangles, `المثلثات ${day.triangles} > ${BUDGET.triangles}`);

      if (mode === 'desktop') {
        // الليل من القائمة: ثريات الأروقة تظهر، والميزانية تبقى
        await page.keyboard.press('Escape');
        await page.click('[data-time="night"]');
        await page.click('#menuClose');
        assert.equal(await page.evaluate(() => window.__umrah.atmosphere.time), 'night');
        assert.equal(await page.evaluate(() => window.__umrah.atmosphere.lamps.visible), true);
        // قناديل الحِجر والأقواس تتوهّج ليلًا (الطبقة 4)
        assert.ok(await page.evaluate(() => window.__umrah.world.lanternMat.emissive.getHex() !== 0 && window.__umrah.world.archMat.emissive.getHex() !== 0), 'لا توهّج ليلًا');
        const night = await measure();
        assert.ok(night.calls <= BUDGET.calls && night.triangles <= BUDGET.triangles, `ميزانية الليل ${JSON.stringify(night)}`);
        // الجودة المتوسطة من القائمة ترسم 80% من الحشود، ثم «تلقائية» تعيد العالية
        await page.keyboard.press('Escape');
        await page.click('[data-quality="medium"]');
        assert.deepEqual(await page.evaluate(() => [window.__umrah.quality.tier, window.__umrah.world.crowds.active.mataf, window.__umrah.materials.kiswaRes]), ['medium', 304, 1024]);
        await page.click('[data-quality="auto"]');
        await page.click('[data-time="asr"]');
        await page.click('#menuClose');
        assert.deepEqual(
          await page.evaluate(() => [window.__umrah.quality.tier, window.__umrah.atmosphere.time, window.__umrah.atmosphere.lamps.visible, window.__umrah.world.lanternMat.emissive.getHex(), window.__umrah.materials.kiswaRes]),
          ['high', 'asr', false, 0, 2048],
        );
        // نسبة البكسل تنخفض عن سقف المستوى حين تبقى الإطارات بطيئة ثانيتين (الرسم البرمجي هنا بطيء دائمًا)
        await page.waitForTimeout(5000);
        const { fps, pixelRatio, cap } = await page.evaluate(() => ({
          fps: window.__umrah.quality.fps,
          pixelRatio: window.__umrah.quality.pixelRatio,
          cap: Math.min(devicePixelRatio || 1, 1.6), // سقف المستوى العالي (QUALITY_TIERS.high)
        }));
        if (fps < 45) assert.ok(pixelRatio < cap, `نسبة البكسل ${pixelRatio} لم تنخفض عن ${cap} مع ${fps.toFixed(1)} إطارًا/ث`);
      }
    });

    // الطبقة 2 من docs/realism-plan.md. في وضع واحد يكفي: الحشود واحدة في الأوضاع كلها
    if (mode === 'desktop')
      test('الحشود الحيّة: الهيئات، والتباعد، وإفساح الطريق للاعب، والإشارة عند الحجر الأسود، والإسراع بين العلمين', async () => {
        const bw = toWorld(...localAt(PSI_BLACK, 1));
        const we = Math.atan2(-bw[1], bw[0]); // زاوية خط الحجر الأسود
        const r = await page.evaluate((we) => {
          const { world, player, step } = window.__umrah;
          const c = world.crowds;
          // اللاعب واقف في المسار قرب الركن العراقي، و10 ثوانٍ من المحاكاة
          player.teleport(9.5, -6, -0.6, -0.8);
          for (let i = 0; i < 300; i++) step(1 / 30);
          const P = player.getPos();
          const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
          // الاضطباع: كتف أيمن مكشوف (بلون البشرة، لا يُصبغ) في رجال المطاف وحدهم
          const bareRightShoulder = (geo) => {
            const p = geo.attributes.position;
            const t = geo.attributes.aTint;
            let n = 0;
            for (let i = 0; i < p.count; i++) if (t.getX(i) === 0 && p.getX(i) > 0.12 && p.getY(i) > 1.3 && p.getY(i) < 1.5) n++;
            return n;
          };
          const [mataf, masa] = [c.meshes.find((m) => m.area === 'mataf' && m.kind === 0), c.meshes.find((m) => m.area === 'masa' && m.kind === 0)];
          const ps = [...c.pilgrims.mataf.slice(0, c.active.mataf), ...c.pilgrims.masa.slice(0, c.active.masa)];
          const minTo = (kind) => Math.min(...ps.filter((p) => p.kind === kind).map((p) => Math.hypot(p.x - P.x, p.z - P.z)));
          // التباعد: كم حاجًّا له جار أقرب من 40 سم
          let crowded = 0;
          for (const a of ps) if (ps.some((b) => b !== a && Math.hypot(a.x - b.x, a.z - b.z) < 0.4)) crowded++;
          // لا أحد دون حدّ المطاف المنعَّم (الكعبة والحِجر وما حولهما)
          const inside = c.pilgrims.mataf.slice(0, c.active.mataf).filter((p) => Math.hypot(p.x, p.z) < c.laneAt(Math.atan2(-p.z, p.x)) - 0.36).length;
          // الحد منعَّم: لا قفزة كبيرة بين زاويتين متجاورتين (كانت الأركان وفتحتا الحِجر تقفز)
          let laneJump = 0;
          for (let i = 0; i < 720; i++) laneJump = Math.max(laneJump, Math.abs(c.laneAt(((i + 1) / 720) * 2 * Math.PI) - c.laneAt((i / 720) * 2 * Math.PI)));
          const mean = (a) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
          const matafActive = c.pilgrims.mataf.slice(0, c.active.mataf);
          const atLine = matafActive.filter((p) => Math.abs(wrap(Math.atan2(-p.z, p.x) - we)) < 0.03);
          const away = matafActive.filter((p) => Math.abs(wrap(Math.atan2(-p.z, p.x) - we)) > 0.5);
          const green = c.pilgrims.masa.slice(0, c.active.masa).filter((p) => p.z < -16 && p.z > -46 && !p.turning);
          return {
            idtiba: [bareRightShoulder(mataf.mesh.geometry), bareRightShoulder(masa.mesh.geometry)],
            drawn: c.stats.near + c.stats.far,
            active: c.active.mataf + c.active.masa,
            near: c.stats.near,
            far: c.stats.far,
            minWoman: minTo(1),
            minMan: minTo(0),
            space: [c.space[0][1], c.space[1][1]],
            crowded,
            inside,
            laneJump,
            atLine: atLine.map((p) => p.raise),
            slowAtLine: mean(atLine.map((p) => p.speed / p.v)),
            speedAway: mean(away.map((p) => p.speed / p.v)),
            greenMen: mean(green.filter((p) => p.kind === 0 && !p.child).map((p) => p.speed / p.v)),
            greenWomen: mean(green.filter((p) => p.kind === 1).map((p) => p.speed / p.v)),
          };
        }, we);
        if (process.env.UMRAH_DEBUG) console.error('crowds', JSON.stringify(r));
        assert.ok(r.idtiba[0] > 0, 'رجال المطاف بلا اضطباع');
        assert.equal(r.idtiba[1], 0, 'رجال المسعى مضطبعون، والاضطباع في الطواف وحده');
        assert.equal(r.drawn, r.active, 'كل حاجّ يُرسم مرة: هيئة كاملة أو بطاقة');
        assert.ok(r.near > 0 && r.far > 0, `القريب ${r.near} والبعيد ${r.far}`);
        // النساء أوسع مسافة من اللاعب
        assert.ok(r.space[1] > r.space[0], 'مسافة النساء ليست أوسع');
        assert.ok(r.minWoman >= r.space[1] - 0.01, `امرأة على ${r.minWoman.toFixed(2)} م من اللاعب`);
        assert.ok(r.minMan >= r.space[0] - 0.01, `رجل على ${r.minMan.toFixed(2)} م من اللاعب`);
        assert.ok(r.crowded <= r.active * 0.02, `${r.crowded} حاجًّا متلاصقون`);
        assert.equal(r.inside, 0, 'حجاج داخل حدّ الكعبة أو الحِجر');
        assert.ok(r.laneJump < 0.12, `حدّ المطاف يقفز ${r.laneJump.toFixed(2)} م بين زاويتين متجاورتين`);
        assert.ok(r.atLine.length > 0 && r.atLine.every((x) => x > 0.3), 'لا رفع لليد عند خط الحجر الأسود');
        assert.ok(r.slowAtLine < r.speedAway * 0.85, `عند الخط ${r.slowAtLine.toFixed(2)} وبعيدًا ${r.speedAway.toFixed(2)}`);
        assert.ok(r.greenMen > 1.3 && r.greenWomen < 1.15, `بين العلمين: الرجال ${r.greenMen.toFixed(2)} والنساء ${r.greenWomen.toFixed(2)}`);
        // كثافة الحشود من القائمة
        await page.keyboard.press('Escape');
        await page.click('[data-density="0.35"]');
        assert.equal(await page.evaluate(() => window.__umrah.world.crowds.active.mataf), 133);
        await page.click('[data-density="1"]');
        await page.click('#menuClose');
        assert.equal(await page.evaluate(() => window.__umrah.world.crowds.active.mataf), 380);
      });

    // الطبقة 4 من docs/realism-plan.md: تفاصيل المعالم تُبنى، وما تستبدله من المشهد القديم مخفي
    if (mode === 'desktop')
      test('تفاصيل المعالم: الأقواس والأعمدة والكعبة والحِجر والمسعى', async () => {
        const r = await page.evaluate(() => {
          const w = window.__umrah.world;
          const arches = w.landmarkDetail.filter((o) => o.isInstancedMesh && o.material === w.archMat);
          return {
            arches: arches.map((a) => a.count),
            oldArcadeHidden: w.arcadeWalls.every((a) => !a.visible),
            columnVerts: w.columns.geometry.attributes.position.count,
            shadharwanHidden: !w.shadharwan.visible,
            doorX: w.door.position.x,
            masaColumns: [w.masaColumns.count, w.masaColumns.visible],
            parts: w.landmarkDetail.length,
          };
        });
        assert.deepEqual(r.arches, [60, 60], 'أقواس الرواقين');
        assert.ok(r.oldArcadeHidden, 'نسيج الأقواس القديم ما زال ظاهرًا');
        assert.ok(r.columnVerts > 120, 'الأعمدة بلا قاعدة وتاج');
        assert.ok(r.shadharwanHidden, 'الشاذروان القديم ما زال ظاهرًا');
        assert.ok(r.doorX > 6.1, 'الباب ليس بارزًا عن الجدار');
        assert.ok(r.masaColumns[0] >= 30 && r.masaColumns[1], 'صفّا أعمدة المسعى');
        assert.ok(r.parts >= 8, `أجزاء المعالم ${r.parts}`);
      });

    // الطبقة 5 من docs/realism-plan.md: خرائط الخشونة والمعدنية، ودقة الكسوة بحسب المستوى
    if (mode === 'desktop' || mode === 'mobile')
      test('الأنسجة والمواد: رخام مصقول، وكسوة بلمعان النقش، وذهب معدني', async () => {
        const r = await page.evaluate(() => {
          const { world: w, materials: m } = window.__umrah;
          const floor = w.mats.floor;
          return {
            floor: [!!floor.roughnessMap, !!floor.bumpMap, floor.roughness],
            arcadeFloor: !!m.arcadeFloor && m.arcadeFloor.material.map !== floor.map,
            kiswa: [m.kiswaRes, w.kiswaMat.roughnessMap.image.width],
            gold: [w.bandMat, w.door.material].map((x) => !!x.metalnessMap && x.metalnessMap === x.roughnessMap),
          };
        });
        assert.deepEqual(r.floor, [true, true, 1], 'رخام المطاف بلا خشونة أو تفاصيل');
        assert.ok(r.arcadeFloor, 'رخام الأروقة نفس رخام المطاف');
        // المستوى العالي (الحاسوب) 2048، والمنخفض (الجوال) 1024
        const res = mode === 'desktop' ? 2048 : 1024;
        assert.deepEqual(r.kiswa, [res, res], 'دقة نسيج الكسوة');
        assert.deepEqual(r.gold, [true, true], 'حزام الكسوة والباب بلا خريطة معدنية');
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

    // بعد العمرة كاملة، فلا يغيّر عدّاداتها. العصا بالقيم مباشرة: اللمس الحقيقي اختُبر في «المشي والالتفات»
    if (mode === 'mobile')
      test('المشي الموجّه: الطواف والكعبة عن اليسار، وحول الحِجر، والسعي إلى المروة', async () => {
        const r = await page.evaluate(() => {
          const { game, player, input, step, hud, modes } = window.__umrah;
          const J = input.joystick;
          const polar = () => {
            const p = player.getPos();
            return { x: p.x, z: p.z, r: Math.hypot(p.x, p.z), phi: Math.atan2(-p.z, p.x) };
          };
          const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
          const push = (n, each) => {
            J.y = 1;
            for (let i = 0; i < n; i++) step(1 / 30), each && each(polar());
            J.y = 0;
            step(1 / 30);
          };
          const out = {};
          // إلى خط البداية، ثم «أشِر وكبّر»
          game.jump('tawaf');
          step(1 / 30); // يطفئ الزر الذهبي الباقي من الملخص
          J.y = 1;
          for (let i = 0; i < 600 && !hud.model.action.enabled; i++) step(1 / 30);
          J.y = 0;
          step(1 / 30);
          game.act();
          out.stage = game.stage;
          // ينظر إلى الكعبة على بعد 20 م: يمشي والكعبة عن يساره، على البعد نفسه، والكاميرا مع المسار
          let p = polar();
          player.teleport(Math.cos(p.phi) * 20, -Math.sin(p.phi) * 20, -Math.cos(p.phi), Math.sin(p.phi));
          const cum0 = game.debug().T.cum;
          const rs = [];
          push(240, (q) => rs.push(q.r));
          p = polar();
          out.tawaf = { turned: game.debug().T.cum - cum0, r: [Math.min(...rs.slice(10)), Math.max(...rs)], heading: Math.abs(wrap(player.headingYaw() - p.phi)) };
          // قريبًا من الكعبة (11 م) قبل الركن العراقي: يبتعد حول الحِجر ثم يعود
          player.teleport(Math.cos(1.3) * 11, -Math.sin(1.3) * 11, -Math.sin(1.3), -Math.cos(1.3));
          const hijrSide = [];
          let last = null;
          push(520, (q) => ((last = q), q.phi > 2 && q.phi < 2.7 && hijrSide.push(q.r)));
          const d = game.debug();
          out.hijr = { entered: d.stats.hijr, wrong: d.stats.wrong, nearest: Math.min(...hijrSide), after: last.r };
          // السعي: ينظر إلى الصفا، و«مشي مستمر» يمشي به إلى المروة غربي الحاجز، ويقف عندها للدعاء
          game.jump('sai');
          step(1 / 30);
          game.act();
          step(1 / 30);
          player.teleport(72, 18, 0, 1);
          modes.setAutoWalk(true);
          let n = 0;
          let maxX = 0;
          let midHeading = null;
          while (modes.autoWalk && n++ < 1800) {
            step(1 / 30);
            const q = player.getPos();
            if (q.z < 10 && q.z > -80) maxX = Math.max(maxX, q.x);
            if (q.z < -30 && midHeading === null) midHeading = player.headingYaw();
          }
          out.sai = { n, autoWalk: modes.autoWalk, lap: game.debug().A.lap, dua: hud.model.action.enabled, maxX, midHeading };
          return out;
        });
        if (process.env.UMRAH_DEBUG) console.error('guide', JSON.stringify(r));
        assert.equal(r.stage, 'tawaf', 'المشي الموجّه لم يصل إلى خط البداية');
        assert.ok(r.tawaf.turned > 0.8, `الطواف الموجّه تقدّم ${r.tawaf.turned.toFixed(2)} راديان`);
        assert.ok(r.tawaf.r[0] > 19.4 && r.tawaf.r[1] < 20.6, `البعد عن الكعبة تغيّر: ${r.tawaf.r.map((x) => x.toFixed(2))}`);
        assert.ok(r.tawaf.heading < 0.15, 'الكاميرا لم تلتفت مع الطواف');
        assert.deepEqual([r.hijr.entered, r.hijr.wrong], [0, 0], 'المشي الموجّه دخل الحِجر أو عكس الاتجاه');
        assert.ok(r.hijr.nearest > 15, `مرّ على ${r.hijr.nearest.toFixed(1)} م من الكعبة عند الحِجر`);
        assert.ok(r.hijr.after < 12.5, 'لم يعد إلى قرب الكعبة بعد الحِجر');
        assert.deepEqual([r.sai.autoWalk, r.sai.lap, r.sai.dua], [false, 1, true], 'السعي بالمشي المستمر');
        assert.ok(r.sai.maxX < 74.5, 'الذاهب إلى المروة عبر إلى شرقي الحاجز');
        assert.ok(Math.abs(angleDiff(r.sai.midHeading, 0)) < 0.15, 'الكاميرا لم تلتفت إلى المروة');
        assert.deepEqual(errors, [], 'أخطاء في وحدة التحكم');
      });

    // «تعلّم سريع»: زر البطاقة يمشي المقاطع الطويلة، وكل منسك ما زال بزره
    if (mode === 'desktop' || mode === 'mobile')
      test('تعلّم سريع: عمرة كاملة بزر البطاقة، ولا تُختصر خطوة', async () => {
        const tap = (sel) => (M.touch ? page.tap(sel) : page.click(sel));
        // من الملخص: «أعِد التدريب»، ثم «تعلّم سريع» من القائمة
        await tap('#againBtn');
        if (mode === 'desktop') await page.keyboard.press('Escape');
        else await tap('#menuBtn');
        await tap('#menu label:has(input[data-opt="fast"])');
        await tap('#menuClose');
        assert.equal(await page.evaluate(() => window.__umrah.fast.enabled), true);
        const card = () => page.evaluate(() => window.__umrah.hud.model.cardBtn);
        await D.act('انوِ العمرة');
        await D.act('لبّيك');
        await page.waitForFunction(() => window.__umrah.hud.model.cardBtn === 'امشِ إلى خط البداية');
        await D.press('secondary');
        // يقف عند الخط والزر الذهبي مضيء: التكبير على اللاعب
        await D.act('أشِر وكبّر');
        for (let k = 1; k <= 7; k++) {
          await page.waitForFunction(() => window.__umrah.hud.model.cardBtn === 'أكمل الشوط'); // البطاقة تتغير في الإطار التالي
          await D.press('secondary');
          if (k < 7) await D.act('الله أكبر');
          else await page.waitForFunction(() => window.__umrah.game.stage === 'toMaqam', null, { timeout: 15000 });
        }
        await page.waitForFunction(() => window.__umrah.hud.model.cardBtn === 'امشِ إلى خلف المقام');
        await D.press('secondary');
        await D.act('صلِّ ركعتين');
        await page.waitForFunction(() => window.__umrah.game.stage === 'toSafa', null, { timeout: 15000 });
        assert.equal(await card(), 'انتقل إلى الصفا مباشرة', 'زر المنسك نفسه يبقى في البطاقة');
        await D.press('secondary');
        await D.act('ابدأ السعي');
        for (let lap = 1; lap <= 7; lap++) {
          await D.press('secondary');
          if (lap < 7) {
            await D.act('ادع'); // يقف عند الطرف والدعاء على اللاعب
            assert.equal((await D.dbg()).A.lap, lap, `شوط السعي ${lap}`);
          } else await page.waitForFunction(() => window.__umrah.game.stage === 'tahallul', null, { timeout: 15000 });
        }
        await D.act('حلقتُ أو قصّرتُ');
        await page.waitForFunction(() => window.__umrah.game.stage === 'done');
        const rows = Object.fromEntries(
          await page.$$eval('#sumRows div', (ds) => ds.map((d) => [d.querySelector('dt').textContent, d.querySelector('dd').textContent])),
        );
        assert.equal(rows['أشواط الطواف المحتسبة'], '٧ من ٧');
        assert.equal(rows['أشواط أُعيدت بسبب دخول الحِجر'], '٠');
        assert.equal(rows['تنبيهات عكس الاتجاه'], '٠');
        assert.equal(rows['التكبير عند محاذاة الحجر الأسود'], '٧ من ٧');
        assert.equal(rows['الوقوف للدعاء على الصفا والمروة'], '٧ من ٧');
        // الرَّمَل والإسراع بين العلمين محسوبان كما مشى: بلا هرولة فصفر، لا «—»
        assert.equal(rows['الرَّمَل في الأشواط الثلاثة الأولى'], '٠٪');
        assert.equal(rows['الإسراع بين العلمين الأخضرين'], '٠٪');
        assert.match(await page.textContent('#sumNote'), /بلا أخطاء/);
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
