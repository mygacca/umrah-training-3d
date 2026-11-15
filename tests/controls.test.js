// التحكم في الجوال: العصا، وشريط زاوية النظر، والأزرار. بلمس حقيقي عبر CDP، والزمن بـ __umrah.step ليكون ثابتًا.
// اللمسة تبقى على الشاشة بين الخطوات: العصا ممسوكة بالإبهام، والإصبع الثاني يسحب للنظر.
// في CDP: touchStart وtouchMove يذكران الأصابع كلها، وtouchEnd بإصبع يرفعه وحده، وبلا أصابع يرفعها كلها.
const { test, describe, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { openPage, toWorld, KAABA } = require('./helpers');

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const K = 0.0058; // راديان لكل بكسل سحب باللمس (createPointer في 05-input.js)
const STEER_RATE = 2; // 10-modes.js
const HEAD_LIMIT = (100 * Math.PI) / 180; // 06-player.js
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

  test('العصا إلى اليمين أو اليسار: الجسم يدور في مكانه، ومع الأمام يمشي ويدور', async () => {
    await pose(-30, 30, 1, 0);
    await stick(1, 0);
    const a = await state();
    await steps(30); // ثانية
    const b = await state();
    assert.ok(Math.abs(a.yaw - b.yaw - STEER_RATE) < 0.12, `دار ${(a.yaw - b.yaw).toFixed(2)} راديان في ثانية`);
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 0.05, 'تحرّك وهو يدور في مكانه');
    assert.ok(Math.abs(wrap(b.view - a.view) + STEER_RATE) < 0.12, 'النظر لم يدر مع الجسم');
    // إلى الأمام واليسار: يمشي ويدور يسارًا
    await touch('touchMove', thumbAt(-0.7, 0.7));
    await D.frames(1);
    await steps(30);
    const c = await state();
    await release();
    assert.ok(c.yaw - b.yaw > 0.8, 'لم يدر يسارًا وهو يمشي');
    assert.ok(Math.hypot(c.x - b.x, c.z - b.z) > 1, 'لم يمشِ وهو يدور');
  });

  // شريط زاوية النظر: f موضع على الشريط من يساره (0) إلى يمينه (1)
  const trackPoint = async (f, id = 1) => {
    const b = await page.locator('#lookTrack').boundingBox();
    return { x: b.x + b.width * f, y: b.y + b.height / 2, id };
  };
  const slider = () => page.evaluate(() => ({ now: +document.getElementById('lookTrack').getAttribute('aria-valuenow'), value: window.__umrah.input.lookSlider.value }));
  const centerLook = async () => {
    await page.tap('#lookReset');
    await page.evaluate(() => {
      for (let i = 0; i < 40; i++) window.__umrah.step(1 / 30);
    });
  };

  test('شريط زاوية النظر: يدير الرأس لا الجسم، ويبقى حيث تُرك، و✓ يعيده إلى الأمام', async () => {
    await pose(-30, 30, 1, 0);
    const a = await state();
    // لمسة عند ربع الشريط من اليسار: نصف الحد إلى اليسار
    const p = await trackPoint(0.25);
    await touch('touchStart', p);
    await D.frames(1);
    const b = await state();
    assert.ok(Math.abs(b.head - HEAD_LIMIT / 2) < 0.02, `الرأس ${b.head.toFixed(2)} لا نصف الحد`);
    assert.ok(Math.abs(b.yaw - a.yaw) < 1e-6, 'الشريط أدار الجسم');
    assert.ok(Math.abs(wrap(b.view - a.view) - HEAD_LIMIT / 2) < 0.02, 'النظر لم يلتفت');
    // سحب المقبض إلى أقصى اليمين: الحد إلى اليمين
    await touch('touchMove', await trackPoint(1.2));
    await D.frames(1);
    assert.ok(Math.abs((await state()).head + HEAD_LIMIT) < 0.01, 'أقصى اليمين ليس حد الرأس');
    assert.equal((await slider()).now, 100);
    await release();
    // يبقى حيث تُرك: عشر ثوانٍ واقفًا ثم ماشيًا، والمشي باتجاه الجسم لا النظر
    await steps(150);
    await stick(0, 1);
    await steps(150);
    const c = await state();
    await release();
    assert.ok(Math.abs(c.head + HEAD_LIMIT) < 0.01, `زاوية النظر عادت وحدها (${c.head.toFixed(2)})`);
    assert.ok(Math.abs(c.yaw - a.yaw) < 1e-6, 'الجسم دار');
    assert.ok(cosBetween([c.x - a.x, c.z - a.z], dirOf(a.yaw)) > 0.9999, 'المشي ليس باتجاه الجسم');
    // ✓ يعيد النظرة إلى الأمام، والمقبض إلى الوسط
    await centerLook();
    const d = await state();
    assert.equal(d.head, 0, '✓ لم يعد النظرة إلى الأمام');
    assert.ok(Math.abs(d.yaw - a.yaw) < 1e-6, '✓ أدار الجسم');
    assert.deepEqual(await slider(), { now: 0, value: 0 });
  });

  test('ماشيًا بإصبعين: الشريط والإبهام على العصا، والطريق لا يتغير', async () => {
    await pose(-36, 30, 1, 0);
    await stick(0, 1);
    await steps(20);
    const a = await state();
    const p = await trackPoint(0.1);
    await touch('touchStart', thumbAt(0, 1), p);
    await D.frames(1);
    await steps(60);
    const b = await state();
    assert.ok(b.joy[1] > 0.9, 'إصبع الشريط ألغى العصا');
    assert.ok(Math.abs(b.head - 0.8 * HEAD_LIMIT) < 0.02, `الرأس ${b.head.toFixed(2)}`);
    assert.ok(Math.abs(b.yaw - a.yaw) < 1e-6, 'الشريط أدار الجسم');
    assert.ok(cosBetween([b.x - a.x, b.z - a.z], dirOf(a.yaw)) > 0.9999, 'الشريط غيّر الطريق');
    // يرفع إصبع الشريط وحده: العصا باقية، والزاوية باقية
    await touch('touchEnd', p);
    await D.frames(1);
    await steps(120);
    const c = await state();
    await release();
    assert.ok(c.joy[1] > 0.9, 'رفع إصبع الشريط ألغى العصا');
    assert.ok(Math.abs(c.head - b.head) < 1e-6, 'الزاوية تغيّرت بعد رفع الإصبع');
    await centerLook();
  });

  test('السحب على الشاشة يلتفت أيضًا والمقبض يتبعه، ومن أكمل الالتفات دار جسمه معه', async () => {
    await pose(-30, 30, 1, 0);
    const a = await state();
    await look(0.6);
    await release();
    const b = await state();
    assert.ok(Math.abs(b.head - 0.6) < 0.02 && Math.abs(b.yaw - a.yaw) < 1e-6, 'السحب لم يدر الرأس وحده');
    assert.ok(Math.abs((await slider()).value - 0.6 / HEAD_LIMIT) < 0.02, 'مقبض الشريط لم يتبع السحب');
    await look(2.4); // أكثر مما بقي للرأس
    await release();
    const c = await state();
    assert.ok(Math.abs(c.head - HEAD_LIMIT) < 0.01, `الرأس ${c.head.toFixed(2)} لا عند حدّه`);
    assert.ok(Math.abs(c.yaw - a.yaw - (3 - HEAD_LIMIT)) < 0.04, 'ما زاد عن حد الرأس لم يدر الجسم');
    // العصا تدير الجسم والنظرة معه، وزاوية النظر كما هي
    await stick(-1, 0);
    await steps(30);
    const d = await state();
    await release();
    assert.ok(d.yaw - c.yaw > 1.8, 'العصا لم تدر الجسم يسارًا');
    assert.ok(Math.abs(d.head - c.head) < 1e-6, 'دوران الجسم غيّر زاوية النظر');
    await centerLook();
    assert.equal(await page.locator('#turnLBtn').count(), 0, 'زرّا الدوران ما زالا في الجوال');
  });

  test('الطواف: ينظر إلى الكعبة وهو يطوف، والأشواط تُحتسب، والجانب يقرّب من الكعبة', async () => {
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
    // ينظر إلى الحجر الأسود بعد الوصول
    await steps(90);
    const s0 = await state();
    const stone = toWorld(KAABA.lx / 2, KAABA.lz / 2);
    assert.ok(Math.abs(wrap(s0.view - Math.atan2(-(stone[0] - s0.x), -(stone[1] - s0.z)))) < 0.1, 'لم ينظر إلى الحجر الأسود');
    await D.act('أشِر');
    // على بعد 20 م من الكعبة: خارج ما يبتعد به المسار حول الحِجر
    await page.evaluate(() => {
      const { player, step } = window.__umrah;
      const p = player.getPos();
      const k = 20 / Math.hypot(p.x, p.z);
      player.teleport(p.x * k, p.z * k, -p.x, -p.z);
      step(1 / 30);
    });
    // يطوف، ثم يلتفت برأسه إلى الكعبة عن يساره ويبقي إصبعه
    await stick(0, 1);
    await steps(60);
    const a = await state();
    const r0 = Math.hypot(a.x, a.z);
    // بالشريط: 90° إلى اليسار، ثم يرفع إصبعه والزاوية باقية
    const finger = await trackPoint(0.5 - (Math.PI / 2 - 0.12) / HEAD_LIMIT / 2);
    await touch('touchStart', thumbAt(0, 1), finger);
    await D.frames(1);
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
    // ✓ والإبهام على العصا، ثم العصا إلى الأمام واليسار: يقترب من الكعبة وما زال يطوف
    const ok = await page.locator('#lookReset').boundingBox();
    const okFinger = { x: ok.x + ok.width / 2, y: ok.y + ok.height / 2, id: 1 };
    await touch('touchStart', thumbAt(0, 1), okFinger);
    await touch('touchEnd', okFinger);
    await steps(40);
    await touch('touchMove', thumbAt(-0.8, 0.6));
    await D.frames(1);
    const b = await state();
    await steps(60);
    const c = await state();
    await release();
    assert.ok(Math.abs(c.head) < 0.1, 'النظرة لم تعد إلى الأمام');
    assert.ok(Math.hypot(c.x, c.z) < Math.hypot(b.x, b.z) - 1.5, 'العصا إلى اليسار لم تقرّب من الكعبة');
    assert.equal((await D.dbg()).stats.wrong, 0);
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
        return { buttons: ['lookTrack', 'lookReset', 'autoWalkBtn', 'jogBtn', 'menuBtn'].map(box), joy: box('joy'), action: css('action'), card: css('card'), W: innerWidth, H: innerHeight };
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
