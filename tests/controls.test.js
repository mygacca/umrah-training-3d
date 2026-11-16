// التحكم في الجوال: اتجاه السير (العصا والسهمان) مستقل عن اتجاه النظر (السحب و✓)، و«مشي مستمر»، والأزرار.
// بلمس حقيقي عبر CDP، والزمن بـ __umrah.step ليكون ثابتًا.
// اللمسة تبقى على الشاشة بين الخطوات: العصا ممسوكة بالإبهام، والإصبع الثاني يسحب للنظر.
// في CDP: touchStart وtouchMove يذكران الأصابع كلها، وtouchEnd بإصبع يرفعه وحده، وبلا أصابع يرفعها كلها.
const { test, describe, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { openPage, toWorld, KAABA } = require('./helpers');

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const K = 0.0058; // راديان لكل بكسل سحب باللمس (createPointer في 05-input.js)
const STEER_RATE = 2; // 10-modes.js
const TURN_BTN_RATE = 1.5; // 10-modes.js
const TAWAF_BEST_R = 13; // 06-guide.js: أفضل بعد عن الكعبة في «مشي مستمر»
const TAWAF_LOOK = (50 * Math.PI) / 180; // 06-guide.js: النظر في طواف «مشي مستمر»، من اتجاه السير نحو الكعبة
const THUMB = { x: 100, y: 620, id: 0 }; // مركز العصا العائمة
const R = 46; // نصف قطر العصا

describe('التحكم في الجوال', { timeout: 10 * 60 * 1000 }, () => {
  let browser;
  let page;
  let errors;
  let D;
  let cdp;
  before(async () => {
    ({ browser, page, errors, driver: D } = await openPage('mobile'));
    cdp = await page.context().newCDPSession(page);
    await D.start();
  });
  after(async () => browser?.close());
  // اختبار فشل وإصبعه على الشاشة لا يُفسد ما بعده
  afterEach(async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }).catch(() => {});
  });

  const touch = (type, ...pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const state = () =>
    page.evaluate(() => {
      const { player, input, game, hud, modes } = window.__umrah;
      const p = player.getPos();
      return { x: p.x, z: p.z, yaw: player.yaw, head: player.head, view: player.headingYaw(), joy: [input.joystick.x, input.joystick.y], stage: game.stage, action: hud.model.action, autoWalk: modes.autoWalk };
    });
  const steps = (n) =>
    page.evaluate((n) => {
      for (let i = 0; i < n; i++) window.__umrah.step(1 / 30);
    }, n);
  // العصا: الإبهام على مركزها ثم إلى (x, y) بين -1 و1 (y إلى الأمام)
  const stick = async (x, y, ...others) => {
    await touch('touchStart', THUMB);
    await touch('touchMove', { ...THUMB, x: THUMB.x + x * R, y: THUMB.y - y * R }, ...others);
    await D.frames(1);
  };
  const thumbAt = (x, y) => ({ ...THUMB, x: THUMB.x + x * R, y: THUMB.y - y * R });
  const release = async () => {
    await touch('touchEnd');
    await D.frames(1);
  };
  // سحب للنظر بإصبع: إلى اليسار dx موجب. يبقى الإصبع على الشاشة إن كان hold
  const look = async (rad, { thumb = null, id = 1 } = {}) => {
    const px = rad / K; // سحب إلى اليمين يلتفت يمينًا: dragYaw -= dx * K
    const from = { x: 330, y: 470, id };
    const base = thumb ? [thumb] : [];
    await touch('touchStart', ...base, from);
    const n = Math.max(2, Math.ceil(Math.abs(px) / 60));
    for (let i = 1; i <= n; i++) await touch('touchMove', ...base, { ...from, x: from.x - (px * i) / n });
    await D.frames(1);
    return { ...from, x: from.x - px };
  };
  // موضع واتجاه معروفان في ساحة خالية من المطاف، فلا جدار ولا الكعبة في الطريق
  const pose = (x, z, dx, dz) => page.evaluate(([x, z, dx, dz]) => (window.__umrah.player.teleport(x, z, dx, dz), window.__umrah.step(1 / 30)), [x, z, dx, dz]);
  const dirOf = (yaw) => [-Math.sin(yaw), -Math.cos(yaw)];
  const cosBetween = (a, b) => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));

  test('شرح مناطق اللمس يظهر أول مرة، ولا يأخذ اللمس، ويختفي بعد استعمال العصا', async () => {
    assert.equal(await page.isVisible('#coach'), true, 'لا شرح عند أول بدء في الجوال');
    assert.equal(await page.evaluate(() => localStorage.getItem('umrah.coach')), '1');
    // الزر الذهبي تحت الشرح يُلمس
    await D.act('انوِ العمرة');
    assert.equal((await D.dbg()).sub, 'talbiya');
    await stick(0, 0.9);
    await steps(3);
    await release();
    await page.waitForSelector('#coach', { state: 'hidden', timeout: 8000 });
    // ومن القائمة يعود
    await page.tap('#menuBtn');
    await page.tap('#coachBtn');
    assert.equal(await page.isVisible('#coach'), true);
    await page.evaluate(() => (document.getElementById('coach').hidden = true));
  });

  test('العصا إلى الأمام: مشي مستقيم باتجاه الجسم، والميل الصغير لا يدير', async () => {
    await pose(-30, 30, 1, 0);
    const a = await state();
    await stick(0.15, 0.9); // إبهام غير دقيق: ميل جانبي صغير
    await steps(60);
    const b = await state();
    await release();
    assert.ok(Math.abs(b.yaw - a.yaw) < 1e-6, 'ميل صغير أدار الجسم');
    const mv = [b.x - a.x, b.z - a.z];
    assert.ok(Math.hypot(...mv) > 3, `مشى ${Math.hypot(...mv).toFixed(1)} م فقط في ثانيتين`);
    assert.ok(cosBetween(mv, dirOf(a.yaw)) > 0.9999, 'المشي ليس مستقيمًا باتجاه الجسم');
  });

  const walkHint = () =>
    page.evaluate(() => ({ strip: window.__umrah.modes.walkStrip.mesh.visible, pointer: parseFloat(document.getElementById('lookReset').style.getPropertyValue('--walk')) || 0 }));

  test('العصا إلى اليمين أو اليسار: اتجاه السير يدور في مكانه والنظر على حاله، ومع الأمام يمشي ويدور', async () => {
    await pose(-30, 30, 1, 0);
    assert.equal((await walkHint()).strip, false, 'شريط الأرض ظاهر والنظر إلى اتجاه السير');
    await stick(1, 0);
    const a = await state();
    await steps(30); // ثانية
    const b = await state();
    assert.ok(Math.abs(a.yaw - b.yaw - STEER_RATE) < 0.12, `دار ${(a.yaw - b.yaw).toFixed(2)} راديان في ثانية`);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 0.05, 'تحرّك وهو يدور في مكانه');
    assert.ok(Math.abs(wrap(b.view - a.view)) < 1e-6, 'العصا غيّرت اتجاه النظر');
    // ما يُري اتجاه السير: شريط الأسهم على الأرض، والمؤشر داخل ✓ (السير عن يمين النظر)
    const hint = await walkHint();
    assert.equal(hint.strip, true, 'لا شريط على الأرض واتجاه السير يخالف النظر');
    assert.ok(Math.abs(hint.pointer - b.head) < 0.02 && hint.pointer > 1.5, `مؤشر اتجاه السير ${hint.pointer}`);
    assert.equal(await lookOff(), true, '✓ لم يمتلئ واتجاه السير يخالف النظر');
    // إلى الأمام واليسار: يمشي ويدور يسارًا، والنظر على حاله
    await touch('touchMove', thumbAt(-0.7, 0.7));
    await D.frames(1);
    await steps(30);
    const c = await state();
    await release();
    assert.ok(c.yaw - b.yaw > 0.8, 'لم يدر يسارًا وهو يمشي');
    assert.ok(Math.hypot(c.x - b.x, c.z - b.z) > 1, 'لم يمشِ وهو يدور');
    assert.ok(Math.abs(wrap(c.view - a.view)) < 1e-6, 'العصا غيّرت اتجاه النظر أثناء المشي');
    // ✓: النظر إلى اتجاه السير، والسير على حاله. ويختفي شريط الأرض بعد قليل
    const still = await state(); // بعد رفع الإبهام
    await centerLook();
    const d = await state();
    assert.equal(d.head, 0, '✓ لم يعد النظر إلى اتجاه السير');
    assert.ok(Math.abs(d.yaw - still.yaw) < 1e-6, '✓ غيّر اتجاه السير');
    await steps(60);
    assert.equal((await walkHint()).strip, false, 'شريط الأرض باقٍ بعد ✓');
  });

  const centerLook = async () => {
    await page.tap('#lookReset');
    await steps(40);
  };
  const lookOff = () => page.evaluate(() => document.body.classList.contains('look-off'));
  const center = async (sel, id = 1) => {
    const b = await page.locator(sel).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2, id };
  };

  test('السحب يغيّر النظر لا اتجاه السير، والنظرة تبقى حيث تُركت، و✓ الظاهر دائمًا يعيدها إلى اتجاه السير', async () => {
    await pose(-30, 30, 1, 0);
    const a = await state();
    assert.equal(await page.isVisible('#lookReset'), true, '✓ غير ظاهر والنظر إلى الأمام');
    assert.equal(await lookOff(), false);
    await look(0.6);
    await release();
    const b = await state();
    assert.ok(Math.abs(b.head - 0.6) < 0.02, `الرأس التفت ${b.head.toFixed(2)}`);
    assert.ok(Math.abs(b.yaw - a.yaw) < 1e-6, 'السحب أدار الجسم');
    assert.ok(Math.abs(wrap(b.view - a.view) - 0.6) < 0.02, 'النظر لم يلتفت');
    assert.equal(await lookOff(), true, '✓ لم يمتلئ والنظر إلى جهة');
    // تبقى حيث تُركت: خمس ثوانٍ واقفًا ثم خمس ماشيًا، والمشي باتجاه الجسم لا النظر
    await steps(150);
    await stick(0, 1);
    await steps(150);
    const c = await state();
    await release();
    assert.ok(Math.abs(c.head - b.head) < 1e-6, `النظرة عادت وحدها (${c.head.toFixed(2)})`);
    assert.ok(Math.abs(c.yaw - a.yaw) < 1e-6, 'الجسم دار');
    assert.ok(cosBetween([c.x - a.x, c.z - a.z], dirOf(a.yaw)) > 0.9999, 'المشي ليس باتجاه الجسم');
    // ✓ يعيد النظرة إلى الأمام
    await centerLook();
    const d = await state();
    assert.equal(d.head, 0, '✓ لم يعد النظرة إلى الأمام');
    assert.ok(Math.abs(d.yaw - a.yaw) < 1e-6, '✓ أدار الجسم');
    assert.equal(await lookOff(), false);
    assert.equal(await page.locator('#lookTrack').count(), 0, 'شريط زاوية النظر ما زال في الصفحة');
  });

  test('ماشيًا بإصبعين: السحب والإبهام على العصا، والطريق لا يتغير، ولو التفت إلى الخلف', async () => {
    await pose(-36, 30, 1, 0);
    await stick(0, 1);
    await steps(20);
    const a = await state();
    const finger = await look(0.7, { thumb: thumbAt(0, 1) });
    await steps(60);
    const b = await state();
    assert.ok(b.joy[1] > 0.9, 'إصبع النظر ألغى العصا');
    assert.ok(Math.abs(b.head - 0.7) < 0.03, `الرأس ${b.head.toFixed(2)}`);
    assert.ok(Math.abs(b.yaw - a.yaw) < 1e-6, 'الالتفات بالرأس أدار الجسم');
    assert.ok(cosBetween([b.x - a.x, b.z - a.z], dirOf(a.yaw)) > 0.9999, 'الالتفات بالرأس غيّر الطريق');
    // يرفع إصبع النظر وحده: العصا باقية، والنظرة باقية
    await touch('touchEnd', finger);
    await D.frames(1);
    await steps(120);
    const c = await state();
    await release();
    assert.ok(c.joy[1] > 0.9, 'رفع إصبع النظر ألغى العصا');
    assert.ok(Math.abs(c.head - b.head) < 1e-6, 'النظرة تغيّرت بعد رفع الإصبع');
    // النظر مستقل تمامًا: يلتفت إلى الخلف واتجاه السير على حاله، ثم يمشي إلى حيث كان يمشي. و✓ ينبض لأنه يمشي إلى خلف ما يراه
    await look(2.0);
    await release();
    const d = await state();
    assert.ok(Math.abs(d.head - (c.head + 2.0)) < 0.04, `النظر ${d.head.toFixed(2)} لا ${(c.head + 2.0).toFixed(2)}`);
    assert.ok(Math.abs(d.yaw - c.yaw) < 1e-6, 'السحب الطويل أدار اتجاه السير');
    await stick(0, 1);
    await steps(30);
    const e = await state();
    const pulse = await page.evaluate(() => document.body.classList.contains('look-back'));
    await release();
    assert.ok(cosBetween([e.x - d.x, e.z - d.z], dirOf(a.yaw)) > 0.9999, 'الالتفات إلى الخلف غيّر الطريق');
    assert.equal(pulse, true, '✓ لا ينبض واللاعب يمشي إلى خلف ما يراه');
    await centerLook();
    assert.equal(await page.evaluate(() => document.body.classList.contains('look-back')), false);
  });

  test('السهمان: دوران ناعم لاتجاه السير ما دام الإصبع على السهم، والنظر على حاله، ويعملان والإبهام على العصا', async () => {
    await pose(-30, 30, 1, 0);
    const a = await state();
    // لمسة قصيرة: دورة صغيرة ناعمة ثم يقف
    const left = await center('#turnLBtn');
    await touch('touchStart', left);
    await touch('touchEnd');
    await steps(30);
    const b = await state();
    const tap = b.yaw - a.yaw;
    assert.ok(tap > 0.1 && tap < 0.4, `لمسة السهم دارت ${((tap * 180) / Math.PI).toFixed(0)}°`);
    await steps(10);
    assert.ok(Math.abs((await state()).yaw - b.yaw) < 0.01, 'الدوران لم يقف بعد اللمسة');
    // إصبع على السهم الأيمن ثانيتين: يتسارع بهدوء، ولا خطوة تتجاوز السرعة القصوى، ثم يقف بهدوء
    const b2 = await state();
    await touch('touchStart', await center('#turnRBtn'));
    const run = await page.evaluate(() => {
      const { player, step } = window.__umrah;
      const d = [];
      for (let i = 0; i < 60; i++) {
        const y = player.yaw;
        step(1 / 30);
        d.push(y - player.yaw);
      }
      return { first: d[0], maxStep: Math.max(...d), minStep: Math.min(...d), total: d.reduce((s, x) => s + x, 0), last: d[59] };
    });
    await touch('touchEnd');
    assert.ok(run.minStep >= 0, 'السهم الأيمن دار يسارًا');
    assert.ok(run.first < run.last * 0.5, 'الدوران بدأ بسرعته القصوى لا بهدوء');
    assert.ok(run.maxStep <= TURN_BTN_RATE / 30 + 1e-9, `خطوة ${run.maxStep.toFixed(3)} فوق السرعة القصوى: قفزة`);
    assert.ok(run.total > 2.2 && run.total < 3, `دار ${run.total.toFixed(2)} راديان في ثانيتين`);
    // يقف بهدوء بعد رفع الإصبع (الإطارات الحقيقية بين القياس والرفع تدير قليلًا، فالمقياس: توقف الدوران)
    await steps(25);
    const c = await state();
    await steps(10);
    assert.ok(Math.abs((await state()).yaw - c.yaw) < 0.01, 'الدوران لم يقف بعد رفع الإصبع');
    assert.ok(b2.yaw - c.yaw >= run.total - 1e-6, 'الدوران رجع بعد رفع الإصبع');
    assert.ok(Math.abs(wrap(c.view - a.view)) < 1e-6, 'السهم غيّر اتجاه النظر');
    assert.ok(Math.abs(wrap(c.head - (a.yaw - c.yaw))) < 1e-6, 'النظر لم يبقَ على حاله واتجاه السير يدور');
    // والإبهام على العصا: السهم يدير اتجاه السير والمشي مستمر
    await stick(0, 1);
    await steps(10);
    const d = await state();
    await touch('touchStart', thumbAt(0, 1), await center('#turnLBtn'));
    await steps(30);
    const e = await state();
    await release();
    await steps(20);
    assert.ok(e.joy[1] > 0.9, 'إصبع السهم ألغى العصا');
    assert.ok(e.yaw - d.yaw > 0.8, 'السهم لم يدر والإبهام على العصا');
    assert.ok(Math.hypot(e.x - d.x, e.z - d.z) > 1.5, 'المشي توقف أثناء الدوران بالسهم');
    assert.ok(Math.abs(wrap(e.view - a.view)) < 1e-6, 'السهم غيّر اتجاه النظر والإبهام على العصا');
    await centerLook();
  });

  test('الطواف بالعصا: النظر يدور مع المسار فتبقى الكعبة أمام من ينظر إليها، والسهم والجانب يقرّبان ويبعدان', async () => {
    await D.act('لبّيك');
    // إلى خط البداية بالعصا وحدها: المشي الموجّه، ويقف عند الخط
    await stick(0, 1);
    const n = await page.evaluate(() => {
      let n = 0;
      while (!window.__umrah.hud.model.action.enabled && n++ < 900) window.__umrah.step(1 / 30);
      for (let i = 0; i < 30; i++) window.__umrah.step(1 / 30);
      return n;
    });
    const atLine = await state();
    await release();
    assert.ok(n < 900 && atLine.action.label.includes('أشِر'), 'العصا لم توصل إلى خط البداية');
    const moved = await page.evaluate(() => window.__umrah.player.speed);
    assert.ok(moved < 0.1, 'لم يقف عند خط البداية والعصا مدفوعة');
    // بعد الوصول بالعصا: اتجاه السير إلى الحجر الأسود (فلا يبدأ الطواف معكوسًا)، والنظر على حاله
    await steps(90);
    const s0 = await state();
    const stone = toWorld(KAABA.lx / 2, KAABA.lz / 2);
    assert.ok(Math.abs(wrap(s0.yaw - Math.atan2(-(stone[0] - s0.x), -(stone[1] - s0.z)))) < 0.1, 'اتجاه السير ليس إلى الحجر الأسود');
    assert.ok(Math.abs(wrap(s0.view - atLine.view)) < 1e-6, 'النظر تغيّر وحده بعد الوصول بالعصا');
    await D.act('أشِر');
    // على بعد 20 م من الكعبة: خارج ما يبتعد به المسار حول الحِجر
    await page.evaluate(() => {
      const { player, step } = window.__umrah;
      const p = player.getPos();
      const k = 20 / Math.hypot(p.x, p.z);
      player.teleport(p.x * k, p.z * k, -p.x, -p.z);
      step(1 / 30);
    });
    // ينظر إلى الكعبة ويدفع العصا: يطوف والكعبة عن يساره، واتجاه السير مع المسار، والنظر ما زال إلى الكعبة
    await stick(0, 1);
    await steps(60);
    const a = await state();
    const r0 = Math.hypot(a.x, a.z);
    assert.ok(Math.abs(wrap(a.yaw - Math.atan2(-a.z, a.x))) < 0.15, 'اتجاه السير ليس مع مسار الطواف');
    assert.ok(Math.abs(wrap(a.view - Math.atan2(a.x, a.z))) < 0.2, 'النظر ترك الكعبة حين بدأ المشي');
    // بالسحب: تعديل صغير، ثم يرفع إصبعه والنظرة باقية
    const finger = await look(Math.PI / 2 - a.head - 0.12, { thumb: thumbAt(0, 1) });
    await touch('touchEnd', finger);
    await D.frames(1);
    const t = await page.evaluate(() => {
      const { step, player, game } = window.__umrah;
      const cum0 = game.debug().T.cum;
      let worst = 0;
      let rMin = 1e9;
      let rMax = 0;
      for (let i = 0; i < 300; i++) {
        step(1 / 30);
        const p = player.getPos();
        const view = player.headingYaw();
        const toKaaba = Math.atan2(p.x, p.z); // اتجاه النظر إلى مركز الكعبة
        worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(view - toKaaba), Math.cos(view - toKaaba))));
        rMin = Math.min(rMin, Math.hypot(p.x, p.z));
        rMax = Math.max(rMax, Math.hypot(p.x, p.z));
      }
      const d = game.debug();
      return { turned: d.T.cum - cum0, wrong: d.stats.wrong, hijr: d.stats.hijr, worst, rMin, rMax, head: player.head };
    });
    assert.ok(t.turned > 0.9, `تقدّم الطواف ${t.turned.toFixed(2)} راديان والنظر إلى الكعبة`);
    assert.deepEqual([t.wrong, t.hijr], [0, 0], 'تنبيه عكس أو حِجر والنظر إلى الكعبة');
    assert.ok(t.worst < 0.35, `الكعبة خرجت من وسط النظر (${t.worst.toFixed(2)} راديان)`);
    assert.ok(t.rMin > r0 - 0.5 && t.rMax < r0 + 0.5, 'البعد عن الكعبة تغيّر');
    assert.ok(t.head > 1.2, 'النظرة لم تبقَ نحو الكعبة');
    // على مسار الطواف السهم يميل بالحركة: الأيمن يبعد عن الكعبة، والنظر على حاله من المسار. ويبقى حيث وصل
    const before = await state();
    const arrow = await center('#turnRBtn');
    await touch('touchStart', thumbAt(0, 1), arrow);
    await steps(30);
    await touch('touchEnd', arrow);
    await steps(15);
    const drifted = await state();
    assert.ok(Math.hypot(drifted.x, drifted.z) - Math.hypot(before.x, before.z) > 0.8, 'السهم الأيمن لم يبعد عن الكعبة في الطواف');
    assert.ok(Math.abs(drifted.head - before.head) < 0.1, 'السهم غيّر اتجاه النظر على مسار الطواف');
    await steps(60);
    const kept = await state();
    assert.ok(Math.abs(Math.hypot(kept.x, kept.z) - Math.hypot(drifted.x, drifted.z)) < 0.3, 'لم يبقَ على البعد الذي وصل إليه بالسهم');
    // ✓ والإبهام على العصا، ثم العصا إلى الأمام واليسار: يقترب من الكعبة وما زال يطوف
    const okFinger = await center('#lookReset');
    await touch('touchStart', thumbAt(0, 1), okFinger);
    await touch('touchEnd', okFinger);
    await steps(40);
    await touch('touchMove', thumbAt(-0.8, 0.6));
    await D.frames(1);
    const b = await state();
    await steps(60);
    const c = await state();
    await release();
    assert.ok(Math.abs(c.head) < 0.1, 'النظرة لم تعد إلى اتجاه السير');
    assert.ok(Math.hypot(c.x, c.z) < Math.hypot(b.x, b.z) - 1.5, 'العصا إلى اليسار لم تقرّب من الكعبة');
    assert.equal((await D.dbg()).stats.wrong, 0);
  });

  test('مشي مستمر: يأخذ أفضل بعد عن الكعبة ونظرًا مناسبًا ولو أُطفئ المشي الموجّه، واللاعب يعدّل الاثنين', async () => {
    // في الطواف (من الاختبار السابق). المشي الموجّه مطفأ من القائمة، واللاعب متجه عكس اتجاه الطواف.
    // من بعد الركن الشامي (200°): لا حِجر ولا مقام في الطريق
    await page.tap('#menuBtn');
    await page.tap('#menu label:has(input[data-opt="guide"])');
    await page.tap('#menuClose');
    assert.equal(await page.evaluate(() => window.__umrah.modes.guide), false);
    await page.evaluate(() => {
      const { player, step } = window.__umrah;
      const phi = (200 * Math.PI) / 180;
      player.teleport(Math.cos(phi) * 18, -Math.sin(phi) * 18, Math.sin(phi), Math.cos(phi)); // مع عقارب الساعة
      step(1 / 30);
    });
    const a = await state();
    const d0 = await D.dbg();
    await page.tap('#autoWalkBtn');
    await steps(150);
    // العصا أثناءه: إلى الخلف، ثم تُرفع. المشي المستمر باقٍ
    await touch('touchStart', THUMB);
    await touch('touchMove', thumbAt(0, -1));
    await D.frames(1);
    await steps(60);
    const mid = await state();
    await release();
    assert.equal(mid.autoWalk, true, 'العصا ألغت المشي المستمر');
    await steps(120);
    const b = await state();
    const d1 = await D.dbg();
    assert.equal(b.autoWalk, true, 'المشي المستمر توقف وحده في الطواف');
    // 330 خطوة × 8 سم = 26 م على بعد 18 إلى 13 م. (المسار كله قبل الحِجر: نحو 180° من 200°)
    assert.ok(d1.T.cum - d0.T.cum > 1.6, `تقدّم الطواف ${(d1.T.cum - d0.T.cum).toFixed(2)} راديان فقط`);
    assert.equal(d1.stats.wrong - d0.stats.wrong, 0, 'المشي المستمر مشى عكس الاتجاه');
    assert.equal(d1.stats.hijr - d0.stats.hijr, 0, 'المشي المستمر دخل الحِجر');
    // أفضل موضع: اقترب من الكعبة بهدوء حتى أفضل بعد، وبقي عليه
    assert.ok(Math.hypot(a.x, a.z) > 17.5, 'لم يبدأ من 18 م');
    assert.ok(Math.abs(Math.hypot(b.x, b.z) - TAWAF_BEST_R) < 0.5, `البعد عن الكعبة ${Math.hypot(b.x, b.z).toFixed(1)} م لا ${TAWAF_BEST_R}`);
    // زاوية حركة مناسبة ونظر مناسب: السير مع المسار، والنظر منه نحو الكعبة
    assert.ok(Math.abs(wrap(b.yaw - Math.atan2(-b.z, b.x))) < 0.15, 'اتجاه السير ليس مع مسار الطواف');
    assert.ok(Math.abs(b.head - TAWAF_LOOK) < 0.08, `النظر ${b.head.toFixed(2)} عن اتجاه السير لا ${TAWAF_LOOK.toFixed(2)}`);
    assert.equal(await lookOff(), false, '✓ ممتلئ والنظر هو المناسب للمنسك');
    // اللمس يعدّل زاوية الرؤية: تبقى حيث تُركت، و✓ يعيدها إلى النظر المناسب
    await look(-0.4);
    await release();
    await steps(40);
    const v = await state();
    assert.equal(v.autoWalk, true, 'السحب ألغى المشي المستمر');
    assert.ok(Math.abs(v.head - (TAWAF_LOOK - 0.4)) < 0.08, `النظر بعد السحب ${v.head.toFixed(2)}`);
    assert.equal(await lookOff(), true);
    await page.tap('#lookReset');
    await steps(60);
    assert.ok(Math.abs((await state()).head - TAWAF_LOOK) < 0.08, '✓ لم يعد النظر المناسب للمنسك');
    // السهم يعدّل زاوية الحركة: الأيسر يقرّب من الكعبة، والنظر على حاله من المسار، ولا يُعاد إلى أفضل بعد
    const r1 = Math.hypot(v.x, v.z);
    const arrow = await center('#turnLBtn');
    await touch('touchStart', arrow);
    await steps(30);
    await touch('touchEnd', arrow);
    await steps(20);
    const near = await state();
    assert.equal(near.autoWalk, true, 'السهم ألغى المشي المستمر');
    assert.ok(r1 - Math.hypot(near.x, near.z) > 0.8, 'السهم الأيسر لم يقرّب من الكعبة');
    assert.ok(Math.abs(near.head - TAWAF_LOOK) < 0.1, 'السهم غيّر اتجاه النظر');
    await steps(60);
    const stay = await state();
    assert.ok(Math.abs(Math.hypot(stay.x, stay.z) - Math.hypot(near.x, near.z)) < 0.3, 'أُعيد إلى أفضل بعد بعد تعديل اللاعب');
    // يقف بزرّه
    await page.tap('#autoWalkBtn');
    assert.equal((await state()).autoWalk, false);
    await page.tap('#menuBtn');
    await page.tap('#menu label:has(input[data-opt="guide"])');
    await page.tap('#menuClose');
  });

  test('الأزرار والعصا والزر الذهبي لا تتداخل في مقاسات الشاشات، وكل زر يكفي الإصبع', async () => {
    const sizes = [
      [390, 844],
      [360, 640],
      [320, 568],
      [412, 915],
      [844, 390],
      [667, 375],
    ];
    // أسوأ حالة: أطول عنوان للزر الذهبي، وأطول بطاقة (بنص شرعي تحتها)
    await page.evaluate(() => {
      const { hud, game } = window.__umrah;
      game.stage = 'done'; // لا يغيّر منطق المناسك الزر ولا البطاقة أثناء القياس
      hud.setAction('اذهبي إلى المشعر الحرام', false);
      hud.setCard({ title: 'إلى بداية الطواف', text: document.getElementById('cardText').textContent.repeat(2) || 'نص '.repeat(120), say: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ' });
    });
    for (const [w, h] of sizes) {
      await page.setViewportSize({ width: w, height: h });
      await D.frames(3);
      const r = await page.evaluate(() => {
        const box = (id) => {
          const b = document.getElementById(id).getBoundingClientRect();
          return { id, x: b.left, y: b.top, w: b.width, h: b.height };
        };
        const flat = window.__umrah.panels.flat;
        const css = (name) => ({ id: name, ...flat[name].css, visible: flat[name].mesh.visible });
        return { buttons: ['turnLBtn', 'lookReset', 'turnRBtn', 'autoWalkBtn', 'jogBtn', 'menuBtn'].map(box), joy: box('joy'), action: css('action'), card: css('card'), W: innerWidth, H: innerHeight };
      });
      const hit = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
      const at = `${w}×${h}`;
      assert.ok(r.action.visible, `${at}: لا زر ذهبي`);
      for (const b of r.buttons) {
        assert.ok(b.w >= 44 && b.h >= 44, `${at}: الزر ${b.id} ${b.w.toFixed(0)}×${b.h.toFixed(0)} أصغر من 44`);
        assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.W && b.y + b.h <= r.H, `${at}: الزر ${b.id} خارج الشاشة`);
      }
      const all = [...r.buttons, r.joy, r.action];
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) assert.ok(!hit(all[i], all[j]), `${at}: ${all[i].id} فوق ${all[j].id}`);
      // أزرار الجوال والعصا لا تغطي بطاقة التعليمات
      for (const b of [...r.buttons.filter((b) => b.id !== 'menuBtn'), r.joy]) assert.ok(!hit(b, r.card), `${at}: ${b.id} فوق البطاقة`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await D.frames(3);
    assert.deepEqual(errors, [], 'أخطاء في وحدة التحكم');
  });
});
