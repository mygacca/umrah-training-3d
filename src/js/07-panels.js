// أدوات رسم مشتركة: الخطوط، وسهم اللاعب، والخريطة المصغّرة Cd، والتفاف النص Qc.
var ri = '"Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif',
  Z_ = '"Amiri", "Noto Naskh Arabic", "Traditional Arabic", serif';
function Rd(i, t, e, n, s = 1) {
  i.save(),
    i.translate(t, e),
    i.rotate(n),
    i.scale(s, s),
    i.beginPath(),
    i.moveTo(8, 0),
    i.lineTo(-5.5, 5),
    i.lineTo(-2.5, 0),
    i.lineTo(-5.5, -5),
    i.closePath(),
    (i.fillStyle = "#f6f1e4"),
    i.fill(),
    (i.lineWidth = 1.4),
    (i.strokeStyle = "#0c2a24"),
    i.stroke(),
    i.restore();
}
function Cd(i, t, e, n, s, r, a, o) {
  if (s.site) return paintSiteMap(i, t, e, n, s, r, a, o);
  i.save(), i.translate(t, e);
  let l = n / 2,
    c = n / 120,
    h = s.counter.mode === "sai" || (r && r.x > 57);
  if (
    (i.beginPath(),
    i.arc(l, l, l - 1.5 * c, 0, le),
    (i.fillStyle = "rgba(10,36,31,0.86)"),
    i.fill(),
    (i.lineWidth = 1.4 * c),
    (i.strokeStyle = "rgba(214,176,98,0.9)"),
    i.stroke(),
    h)
  ) {
    let d = 16 * c,
      u = n - 16 * c,
      f = (p) => d + ((p - dt.walkM) / (dt.walkS - dt.walkM)) * (u - d),
      g = 18 * c;
    (i.fillStyle = "rgba(246,241,228,0.16)"),
      i.beginPath(),
      i.roundRect(l - g / 2, d - 4 * c, g, u - d + 8 * c, g / 2),
      i.fill(),
      (i.fillStyle = "rgba(61,220,138,0.75)"),
      i.fillRect(l - g / 2, f(dt.gA), g, f(dt.gB) - f(dt.gA)),
      (i.fillStyle = "rgba(246,241,228,0.9)"),
      (i.font = `600 ${Math.round(9.5 * c)}px ${ri}`),
      (i.textAlign = "right"),
      (i.direction = "rtl"),
      (i.textBaseline = "middle"),
      i.fillText("المروة", l - g / 2 - 4 * c, d + 2 * c),
      i.fillText("الصفا", l - g / 2 - 4 * c, u - 2 * c);
    let m = (s.counter.mode === "sai" ? s.counter.target : "safa") === "marwa" ? d : u;
    if (
      ((i.strokeStyle = "#ffd36b"),
      (i.lineWidth = 1.6 * c),
      i.beginPath(),
      i.arc(l, m, (5 + 1.5 * Math.sin(o * 4)) * c, 0, le),
      i.stroke(),
      r)
    ) {
      let p = Math.max(d - 6 * c, Math.min(u + 6 * c, f(r.z))),
        b = l + Math.max(-1, Math.min(1, (r.x - dt.xc) / 9)) * (g / 2);
      Rd(i, b, p, -a, c);
    }
  } else {
    let d = (l - 13 * c) / 46,
      u = (g) => l + g * d,
      f = (g) => l + g * d;
    i.beginPath(),
      i.arc(l, l, 44 * d, 0, le),
      (i.fillStyle = "rgba(246,241,228,0.1)"),
      i.fill(),
      (i.strokeStyle = "#3ddc8a"),
      (i.lineWidth = 1.8 * c),
      i.beginPath(),
      i.moveTo(u(Ln.black[0]), f(Ln.black[1])),
      i.lineTo(u(Math.cos(we) * 44), f(-Math.sin(we) * 44)),
      i.stroke(),
      (i.strokeStyle = "rgba(246,241,228,0.9)"),
      (i.lineWidth = 1.6 * c),
      i.beginPath();
    for (let g = 0; g <= 24; g++) {
      let v = je.t0 + ((Math.PI - 2 * je.t0) * g) / 24,
        [m, p] = Qe(Math.cos(v) * je.a, -Yt.lz / 2 - Math.sin(v) * je.b);
      g === 0 ? i.moveTo(u(m), f(p)) : i.lineTo(u(m), f(p));
    }
    i.stroke(), i.beginPath();
    for (let g of ["black", "iraqi", "shami", "yamani"]) i.lineTo(u(Ln[g][0]), f(Ln[g][1]));
    if (
      (i.closePath(),
      (i.fillStyle = "#000"),
      i.fill(),
      (i.strokeStyle = "#d6b062"),
      (i.lineWidth = 1 * c),
      i.stroke(),
      (i.fillStyle = "#c9ced2"),
      i.beginPath(),
      i.arc(u(Ln.black[0]), f(Ln.black[1]), 1.6 * c, 0, le),
      i.fill(),
      (i.fillStyle = "#f0c96a"),
      i.beginPath(),
      i.arc(u(Sn[0]), f(Sn[1]), 2.2 * c, 0, le),
      i.fill(),
      s.counter.mode === "tawaf")
    ) {
      let g = l - 6.5 * c;
      (i.lineWidth = 4.5 * c),
        (i.strokeStyle = "rgba(246,241,228,0.14)"),
        i.beginPath(),
        i.arc(l, l, g, 0, le),
        i.stroke();
      let v = Math.max(0, Math.min(1, s.counter.progress));
      v > 0.001 &&
        ((i.strokeStyle = s.counter.invalid ? "#e8604c" : "#f0c96a"),
        (i.lineCap = "round"),
        i.beginPath(),
        i.arc(l, l, g, -we, -(we + v * le), !0),
        i.stroke(),
        (i.lineCap = "butt"));
    }
    if (s.target && Math.hypot(s.target[0], s.target[1]) < 47) {
      let g = (4 + 1.5 * Math.sin(o * 4)) * c;
      (i.strokeStyle = "#ffd36b"),
        (i.lineWidth = 1.6 * c),
        i.beginPath(),
        i.arc(u(s.target[0]), f(s.target[1]), g, 0, le),
        i.stroke();
    } else if (s.target) {
      let g = Math.atan2(s.target[1], s.target[0]),
        v = l - 7 * c;
      i.save(),
        i.translate(l + Math.cos(g) * v, l + Math.sin(g) * v),
        i.rotate(g),
        i.beginPath(),
        i.moveTo(5 * c, 0),
        i.lineTo(-4 * c, 4.5 * c),
        i.lineTo(-4 * c, -4.5 * c),
        i.closePath(),
        (i.fillStyle = "#ffd36b"),
        (i.globalAlpha = 0.65 + 0.35 * Math.sin(o * 4)),
        i.fill(),
        i.restore();
    }
    if (r) {
      let g = r.x,
        v = r.z,
        m = Math.hypot(g, v);
      m > 46 && ((g *= 46 / m), (v *= 46 / m)), Rd(i, u(g), f(v), -a, c);
    }
  }
  i.restore();
}
function Qc(i, t, e) {
  let n = t.split(/\s+/),
    s = [],
    r = "";
  for (let a of n) {
    let o = r ? r + " " + a : a;
    i.measureText(o).width > e && r ? (s.push(r), (r = a)) : (r = o);
  }
  return r && s.push(r), s;
}

// ———————————————————————————————————————————————————————————————
// لوحات التعليمات داخل المشهد. كل شيء يُرسم على canvas ويُعرض نسيجًا على مستطيل:
// - "flat" (الحاسوب والجوال): خمس لوحات مثبّتة أمام الكاميرا في أماكن واجهة الصفحة القديمة
//   (الشريط، البطاقة، الخريطة، التنبيه، الزر الذهبي)، ومقاساتها بالبكسل نفسها.
// - "board" (النظارة وعلبة VR): لوحة واحدة في العالم تتبع الرأس ببطء، فيمكن النظر إلى أزرارها.
// اللوحات لا تعرف اللعبة: تقرأ نموذج الواجهة (hud.model) وتبلّغ عن الأزرار بـ onButton(id).

var HUD_DIST = 1; // بُعد اللوحات المثبّتة أمام الكاميرا (م)
var BOARD_PX = [1024, 720]; // دقة لوحة النظارة
var BOARD_W = 1; // عرض لوحة النظارة (م)
var BOARD_K = 2; // بكسل اللوحة لكل بكسل CSS في رسوم البطاقة

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// خريطة موقع من مشاعر الحج (03-mashair.js، site.map): المعالم، وحدود عرفة، والهدف، واللاعب
function paintSiteMap(i, t, e, n, s, r, a, o) {
  const m = s.site.map;
  const l = n / 2;
  const c = n / 120;
  i.save();
  i.translate(t, e);
  i.beginPath();
  i.arc(l, l, l - 1.5 * c, 0, le);
  i.fillStyle = "rgba(10,36,31,0.86)";
  i.fill();
  i.lineWidth = 1.4 * c;
  i.strokeStyle = "rgba(214,176,98,0.9)";
  i.stroke();
  i.clip();
  const k = (l - 8 * c) / m.radius;
  const X = (x) => l + (x - m.center[0]) * k;
  const Z = (z) => l + (z - m.center[1]) * k;
  if (m.ring) {
    i.beginPath();
    i.arc(X(0), Z(0), m.ring * k, 0, le);
    i.fillStyle = "rgba(224,184,74,0.12)";
    i.fill();
    i.strokeStyle = "#e0b84a";
    i.lineWidth = 1.6 * c;
    i.stroke();
  }
  i.direction = "rtl";
  i.textAlign = "center";
  i.textBaseline = "middle";
  i.font = `600 ${Math.round(9 * c)}px ${ri}`;
  for (const p of m.marks) {
    i.beginPath();
    i.arc(X(p.x), Z(p.z), Math.max(3 * c, p.r * k), 0, le);
    i.fillStyle = p.color;
    i.fill();
    if (!p.label) continue;
    i.fillStyle = "rgba(246,241,228,0.95)";
    i.fillText(p.label, X(p.x) + Math.max(3 * c, p.r * k) + 14 * c, Z(p.z));
  }
  if (s.target) {
    i.strokeStyle = "#ffd36b";
    i.lineWidth = 1.6 * c;
    i.beginPath();
    i.arc(X(s.target[0]), Z(s.target[1]), (5 + 1.5 * Math.sin(o * 4)) * c, 0, le);
    i.stroke();
  }
  if (r) Rd(i, X(r.x), Z(r.z), -a, c);
  i.restore();
}

// الشريط: مراحل العمرة (Ti)، أو مراحل الحج (s.railList = HAJJ_RAIL) والمرحلة الحالية s.railStep من 09-hajj.js
function railIndex(s) {
  if (s.railList) return s.rite === "end" ? s.railList.length : s.railStep || 0;
  return s.rite === "end" ? Ti.length : Ti.findIndex((t) => t.k === s.rite);
}

// شريط المراحل. w وh بوحدات CSS.
function paintRail(ctx, w, h, s, { narrow = false } = {}) {
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 12);
  ctx.fillStyle = "rgba(10,36,31,0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(214,176,98,0.32)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const L = railIndex(s);
  const list = s.railList || Ti;
  const cell = (w - 20) / list.length;
  ctx.direction = "rtl";
  ctx.textBaseline = "middle";
  list.forEach((t, i) => {
    const cx = w - 10 - cell * i - cell / 2;
    const now = i === L;
    const done = i < L;
    const col = now ? "#f0c96a" : done ? "rgba(246,241,228,0.82)" : "rgba(246,241,228,0.5)";
    const showName = !narrow || now;
    ctx.font = `${now ? 800 : 500} 12.5px ${ri}`;
    const nameW = showName ? ctx.measureText(t.name).width + 6 : 0;
    const total = 19 + nameW;
    const nx = cx + total / 2 - 9.5; // الدائرة يمين الاسم
    ctx.beginPath();
    ctx.arc(nx, h / 2, 9.5, 0, le);
    if (now || done) (ctx.fillStyle = now ? "#f0c96a" : "rgba(246,241,228,0.86)"), ctx.fill();
    else (ctx.strokeStyle = col), (ctx.lineWidth = 1), ctx.stroke();
    ctx.fillStyle = now || done ? "#0c2a24" : col;
    ctx.font = `600 10.5px ${ri}`;
    ctx.textAlign = "center";
    ctx.fillText(De(i + 1), nx, h / 2 + 0.5);
    if (showName) {
      ctx.fillStyle = col;
      ctx.font = `${now ? 800 : 500} 12.5px ${ri}`;
      ctx.textAlign = "right";
      ctx.fillText(t.name, nx - 13, h / 2 + 0.5);
    }
  });
}

function counterLabel(s) {
  const c = s.counter;
  if (c.mode === "jamrah") return c.label;
  if (c.mode !== "tawaf" && c.mode !== "sai") return s.site ? s.site.name : "المسجد الحرام";
  const n = De(Math.min(c.done + 1, 7));
  return c.mode === "tawaf"
    ? `الشوط ${n} من ${De(7)}`
    : `الشوط ${n} من ${De(7)}: إلى ${c.target === "marwa" ? "المروة" : "الصفا"}`;
}

// الخريطة المصغّرة والعدّاد تحتها. size عرض الخريطة بوحدات CSS. تعيد الارتفاع.
function paintInstrument(ctx, size, s, pos, heading, time, { shadow = true } = {}) {
  if (shadow) (ctx.shadowColor = "rgba(0,0,0,0.3)"), (ctx.shadowBlur = 12), (ctx.shadowOffsetY = 4);
  Cd(ctx, 0, 0, size, s, pos, heading, time);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `700 12px ${ri}`;
  ctx.fillStyle = "#f6f1e4";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 4;
  const lines = Qc(ctx, counterLabel(s), size + 10);
  lines.forEach((l, i) => ctx.fillText(l, size / 2, size + 6 + i * 18.6));
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  let h = size + 6 + lines.length * 18.6;
  const c = s.counter;
  if (c.mode === "tawaf" || c.mode === "sai" || c.mode === "jamrah") {
    for (let i = 0; i < 7; i++) {
      const x = size / 2 + (3 - i) * 14;
      ctx.beginPath();
      ctx.arc(x, h + 9.5, 4.5, 0, le);
      if (i < c.done) (ctx.fillStyle = "#f0c96a"), ctx.fill();
      else if (i === c.done) (ctx.strokeStyle = "#f0c96a"), (ctx.lineWidth = 2), ctx.stroke();
      else (ctx.fillStyle = "rgba(246,241,228,0.3)"), ctx.fill();
    }
    h += 19;
  }
  return h;
}

function cardContent(s) {
  return s.veil
    ? { title: s.veilTitle || "ركعتا الطواف", text: s.veil, say: "" }
    : { title: s.title, text: s.text, say: s.say };
}

// البطاقة: العنوان والتعليمات والنص الشرعي وزرها. w بوحدات CSS.
// draw=false يقيس فقط. تعيد { h, buttons: [{id, x, y, w, h}] }.
function paintCard(ctx, w, s, { narrow = false, maxH = 1e9, collapsed = false, hover = null, chevron = true } = {}, draw = true) {
  const f = narrow ? { title: 15, text: 12.5, lh: 1.85, say: 18.5, px: 12, pt: 9, pb: 10 } : { title: 16.5, text: 13.5, lh: 1.9, say: 21, px: 14, pt: 10, pb: 12 };
  const c = cardContent(s);
  const right = w - f.px;
  const inner = w - 2 * f.px;
  const buttons = [];
  ctx.direction = "rtl";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${f.title}px ${ri}`;
  const titleLines = Qc(ctx, c.title || "", inner - (chevron ? 26 : 0));
  const tl = f.title * 1.5;
  let y = f.pt;
  const headH = f.pt + titleLines.length * tl;
  const ops = []; // أوامر الرسم تُنفَّذ بعد معرفة الارتفاع
  titleLines.forEach((l) => {
    const yy = y + tl / 2;
    ops.push(() => {
      ctx.font = `800 ${f.title}px ${ri}`;
      ctx.fillStyle = "#f6f1e4";
      ctx.textAlign = "right";
      ctx.fillText(l, right, yy);
    });
    y += tl;
  });
  if (chevron) {
    const cy = f.pt + tl / 2;
    ops.push(() => {
      ctx.save();
      ctx.translate(f.px + 9, cy);
      if (collapsed) ctx.rotate(Math.PI / 2);
      ctx.strokeStyle = "#d6b062";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-6, -3);
      ctx.lineTo(0, 3);
      ctx.lineTo(6, -3);
      ctx.stroke();
      ctx.restore();
    });
  }
  buttons.push({ id: "collapse", x: 0, y: 0, w, h: headH, always: true });
  if (!collapsed) {
    const textLH = f.text * f.lh;
    ctx.font = `400 ${f.text}px ${ri}`;
    let lines = c.text ? Qc(ctx, c.text, inner) : [];
    ctx.font = `400 ${f.say}px ${Z_}`;
    const sayLH = f.say * 1.95;
    let sayLines = c.say ? Qc(ctx, c.say, inner) : [];
    const btnH = s.cardBtn ? 46 : 0;
    // يقصّ الأسطر إن تجاوزت البطاقة أقصى ارتفاع
    const budget = maxH - headH - f.pb - btnH - 4;
    let need = lines.length * textLH + (sayLines.length ? 18 + sayLines.length * sayLH : 0);
    while (need > budget && sayLines.length > 1) sayLines.pop(), (need -= sayLH), (sayLines[sayLines.length - 1] += " …");
    while (need > budget && lines.length > 1) lines.pop(), (need -= textLH), (lines[lines.length - 1] += " …");
    y += 4;
    lines.forEach((l) => {
      const yy = y + textLH / 2;
      ops.push(() => {
        ctx.font = `400 ${f.text}px ${ri}`;
        ctx.fillStyle = "rgba(246,241,228,0.78)";
        ctx.textAlign = "right";
        ctx.fillText(l, right, yy);
      });
      y += textLH;
    });
    if (sayLines.length) {
      y += 10;
      const ly = y;
      ops.push(() => {
        ctx.fillStyle = "rgba(214,176,98,0.28)";
        ctx.fillRect(f.px, ly, inner, 1);
      });
      y += 8;
      sayLines.forEach((l) => {
        const yy = y + sayLH / 2;
        ops.push(() => {
          ctx.font = `400 ${f.say}px ${Z_}`;
          ctx.fillStyle = "#f0c96a";
          ctx.textAlign = "right";
          ctx.fillText(l, right, yy);
        });
        y += sayLH;
      });
    }
    if (s.cardBtn) {
      y += 10;
      ctx.font = `600 13px ${ri}`;
      const bw = Math.min(inner, ctx.measureText(s.cardBtn).width + 28);
      const b = { id: "secondary", x: right - bw, y, w: bw, h: 36 };
      buttons.push(b);
      ops.push(() => {
        roundRect(ctx, b.x, b.y, b.w, b.h, 10);
        ctx.fillStyle = hover === "secondary" ? "rgba(240,201,106,0.18)" : "transparent";
        ctx.fill();
        ctx.strokeStyle = hover === "secondary" ? "#f0c96a" : "rgba(214,176,98,0.65)";
        ctx.lineWidth = hover === "secondary" ? 2 : 1;
        ctx.stroke();
        ctx.font = `600 13px ${ri}`;
        ctx.fillStyle = "#f0c96a";
        ctx.textAlign = "center";
        ctx.fillText(s.cardBtn, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
      });
      y += 36;
    }
  }
  const h = Math.ceil(Math.min(maxH, y + f.pb));
  if (draw) {
    ctx.clearRect(0, 0, w + 2, h + 2);
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, 14);
    ctx.fillStyle = "rgba(10,36,31,0.8)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214,176,98,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ops.forEach((op) => op());
  }
  return { h, buttons };
}

function toastStyle(kind) {
  return kind === "warn"
    ? ["rgba(207,66,47,0.97)", "#fff"]
    : kind === "ok"
      ? ["rgba(240,201,106,0.97)", "#0c2a24"]
      : ["rgba(9,32,28,0.94)", "#f6f1e4"];
}

// التنبيه. maxW بوحدات CSS. تعيد { w, h, lines }.
function measureToast(ctx, msg, maxW) {
  ctx.font = `700 15px ${ri}`;
  const lines = Qc(ctx, msg, maxW - 36);
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 36);
  return { w: Math.ceil(w), h: Math.ceil(24 + lines.length * 26.25), lines };
}
function paintToast(ctx, t, kind) {
  const [bg, fg] = toastStyle(kind);
  roundRect(ctx, 0, 0, t.w, t.h, 14);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 15px ${ri}`;
  ctx.fillStyle = fg;
  t.lines.forEach((l, i) => ctx.fillText(l, t.w / 2, 12 + 26.25 * (i + 0.5)));
}

// الزر الذهبي. w وh بوحدات CSS.
function paintAction(ctx, w, h, s, { hint = "", hover = false, progress = 0 } = {}) {
  const a = s.action;
  const r = h / 2;
  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, r);
  if (a.enabled) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#f6d683");
    g.addColorStop(1, "#d0a54a");
    ctx.fillStyle = g;
  } else ctx.fillStyle = "rgba(10,36,31,0.62)";
  ctx.fill();
  ctx.strokeStyle = hover ? "#f6f1e4" : a.enabled ? "rgba(0,0,0,0)" : "rgba(246,241,228,0.25)";
  ctx.lineWidth = hover ? 3 : 1;
  ctx.stroke();
  if (progress > 0) {
    // تقدّم الاختيار بالنظر: شريط داخل الزر
    ctx.save();
    roundRect(ctx, 0.5, 0.5, w - 1, h - 1, r);
    ctx.clip();
    ctx.fillStyle = "rgba(12,42,36,0.28)";
    ctx.fillRect(w * (1 - progress), 0, w * progress, h);
    ctx.restore();
  }
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = a.enabled ? "#0c2a24" : "rgba(246,241,228,0.66)";
  ctx.font = `${a.enabled ? 800 : 700} 15px ${ri}`;
  const showHint = hint && a.enabled;
  ctx.fillText(a.label, w / 2, h / 2 - (showHint ? 7 : 0));
  if (showHint) {
    ctx.font = `400 11px ${ri}`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(hint, w / 2, h / 2 + 13);
    ctx.globalAlpha = 1;
  }
}

// زر صغير في لوحة النظارة (المشي والدوران في علبة VR)
function paintChip(ctx, b, label, { hover = false, on = false, progress = 0 } = {}) {
  roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
  ctx.fillStyle = on ? "#f6f1e4" : "rgba(10,36,31,0.7)";
  ctx.fill();
  ctx.strokeStyle = hover ? "#f0c96a" : "rgba(246,241,228,0.4)";
  ctx.lineWidth = hover ? 3 : 1;
  ctx.stroke();
  if (progress > 0) {
    ctx.save();
    roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
    ctx.clip();
    ctx.fillStyle = "rgba(240,201,106,0.35)";
    ctx.fillRect(b.x + b.w * (1 - progress), b.y, b.w * progress, b.h);
    ctx.restore();
  }
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 14px ${ri}`;
  ctx.fillStyle = on ? "#0c2a24" : "#f6f1e4";
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
}

// مستطيل عليه canvas يُحدَّث نسيجه
function createCanvasPlane(name, renderOrder) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2;
  const ctx = canvas.getContext("2d");
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new Mesh(new PlaneGeometry(1, 1), mat);
  mesh.name = name;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  mesh.visible = false;
  const p = { name, canvas, ctx, tex, mesh, buttons: [], css: { x: 0, y: 0, w: 0, h: 0 } };
  // يضبط حجم canvas (بالبكسل الحقيقي) ويعيد ctx مضبوطًا على وحدات CSS
  p.begin = (cssW, cssH, scale) => {
    const w = Math.max(2, Math.ceil(cssW * scale));
    const h = Math.max(2, Math.ceil(cssH * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      tex.dispose(); // WebGL2 لا يغيّر حجم نسيج قائم
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, cssW + 1, cssH + 1);
    return ctx;
  };
  p.end = () => (tex.needsUpdate = true);
  return p;
}

// الحواف الآمنة (النتوء وأطراف الشاشة المنحنية) كما يراها CSS: env(safe-area-inset-*)
function readSafeArea() {
  let probe = document.getElementById("safe-probe");
  if (!probe) {
    probe = document.createElement("div");
    probe.id = "safe-probe";
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;" +
      "padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}

function createPanels({ scene, camera, model }) {
  const s = model;
  const ui = {
    kind: "flat", // "flat" أو "board"
    active: false, // تظهر اللوحات بعد «ابدأ» فقط
    hint: "", // تلميح تحت عنوان الزر الذهبي (مفتاح المسافة في الحاسوب)
    boardHint: "",
    cardboardButtons: false,
    walking: false, // حالة زر المشي في علبة VR
    collapsed: false,
    hover: null, // الزر تحت النظر أو الذراع
    progress: 0, // تقدّم الاختيار بالنظر 0..1
    onButton: null,
    dirty: true,
  };
  const s2 = new Vector2();

  // ——— اللوحات المثبّتة أمام الكاميرا ———
  const hud = new Group();
  hud.name = "hud-panels";
  hud.position.z = -HUD_DIST;
  hud.visible = false;
  camera.add(hud);
  const flat = {
    rail: createCanvasPlane("rail", 1001),
    card: createCanvasPlane("card", 1002),
    instrument: createCanvasPlane("instrument", 1001),
    action: createCanvasPlane("action", 1002),
    toast: createCanvasPlane("toast", 1003),
  };
  Object.values(flat).forEach((p) => hud.add(p.mesh));

  // ——— لوحة النظارة ———
  const board = createCanvasPlane("board", 1000);
  board.mesh.scale.set(BOARD_W, (BOARD_W * BOARD_PX[1]) / BOARD_PX[0], 1);
  scene.add(board.mesh);
  const boardState = { yaw: 0, placed: false, dist: 1.25, drop: 0.3, follow: 0.6 };
  let boardTimer = 0;

  ui.markDirty = () => (ui.dirty = true);
  ui.setKind = (kind, opts = {}) => {
    ui.kind = kind;
    Object.assign(boardState, opts.board || {});
    ui.hint = opts.hint || "";
    ui.boardHint = opts.boardHint || "";
    ui.cardboardButtons = !!opts.cardboardButtons;
    boardState.placed = false;
    ui.hover = null;
    ui.progress = 0;
    ui.dirty = true;
  };
  ui.setHover = (id, progress = 0) => {
    if (id !== ui.hover || Math.abs(progress - ui.progress) > 0.02) ui.dirty = true;
    ui.hover = id;
    ui.progress = progress;
  };
  const enabled = (b) => b && (b.always || b.id !== "action" || s.action.enabled);
  ui.press = (id) => {
    if (id === "collapse") {
      ui.collapsed = !ui.collapsed;
      ui.dirty = true;
      return true;
    }
    if (id === "action" && !s.action.enabled) return false;
    if (ui.onButton) ui.onButton(id);
    return true;
  };

  // ——— رسم وتخطيط اللوحات المثبّتة ———
  let instrumentTimer = 0;
  let safeCache = null;
  function layoutFlat(dt, time, pos, heading) {
    const W = innerWidth;
    const H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (ui.dirty || !safeCache) safeCache = readSafeArea(); // getComputedStyle مرة عند التغيير لا كل إطار
    const safe = safeCache;
    const safeT = safe.t;
    const narrow = W <= 460;
    const landscapeSmall = H <= 480 && W > H;
    // من بكسل CSS إلى أمتار على مستوى اللوحات
    const k = (2 * Math.tan((camera.fov * Math.PI) / 360) * HUD_DIST) / H;
    const place = (p, x, y, w, h) => {
      p.css = { x, y, w, h };
      p.mesh.scale.set(w * k, h * k, 1);
      p.mesh.position.set((x + w / 2 - W / 2) * k, (H / 2 - (y + h / 2)) * k, 0);
      p.mesh.visible = w > 0 && h > 0;
    };
    // الخريطة: أعلى اليسار. تُرسم 15 مرة في الثانية، فرفع نسيجها كل إطار كلفة بلا فائدة على الجوال
    const isz = landscapeSmall ? 100 : 124;
    instrumentTimer -= dt;
    if (instrumentTimer <= 0 || ui.dirty) {
      instrumentTimer = 1 / 15;
      const p = flat.instrument;
      const ih = isz + 6 + 2 * 18.6 + 19 + 6;
      const ctx = p.begin(isz + 12, ih, dpr);
      ctx.translate(6, 2);
      paintInstrument(ctx, isz, s, pos, heading, time);
      p.end();
      place(p, 8 - 6, 56 + safeT - 2, isz + 12, ih);
    }
    if (!ui.dirty) return;
    // الشريط: أعلى الشاشة، يترك مكان زر القائمة على اليمين
    {
      const p = flat.rail;
      const w = W - 64;
      p.begin(w, 40, dpr);
      paintRail(p.ctx, w, 40, s, { narrow });
      p.end();
      place(p, 8, 8 + safeT, w, 40);
    }
    // البطاقة: أعلى اليمين
    {
      const p = flat.card;
      const w = landscapeSmall ? Math.min(380, W - 300) : narrow ? W - 152 : Math.min(440, W - 148);
      const maxH = (landscapeSmall ? 0.52 : 0.46) * H;
      const o = { narrow, maxH, collapsed: ui.collapsed, hover: ui.hover };
      const m = paintCard(p.ctx, w, s, o, false);
      p.begin(w, m.h, dpr);
      const r = paintCard(p.ctx, w, s, o, true);
      p.buttons = r.buttons;
      p.end();
      place(p, W - 8 - w, 56 + safeT, w, m.h);
    }
    // الزر الذهبي: أسفل اليمين
    {
      const p = flat.action;
      if (!s.action.label) p.mesh.visible = false;
      else {
        p.ctx.font = `800 15px ${ri}`;
        const w = Math.round(Math.min(0.62 * W, Math.max(150, p.ctx.measureText(s.action.label).width + 48)));
        const h = 64;
        p.begin(w, h, dpr);
        paintAction(p.ctx, w, h, s, { hint: ui.hint, hover: ui.hover === "action" });
        p.buttons = [{ id: "action", x: 0, y: 0, w, h }];
        p.end();
        const bottom = (landscapeSmall ? 14 : 24) + safe.b;
        place(p, W - 18 - w, H - bottom - h, w, h);
      }
    }
    ui.dirty = false;
  }
  function layoutToastFlat(time) {
    const p = flat.toast;
    const show = s.toast.msg && time < s.toast.until;
    if (!show) return (p.mesh.visible = false), (p.shown = null);
    const key = s.toast.msg + "|" + s.toast.kind + "|" + innerWidth + "x" + innerHeight;
    if (p.shown === key) return;
    p.shown = key;
    const W = innerWidth;
    const H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const k = (2 * Math.tan((camera.fov * Math.PI) / 360) * HUD_DIST) / H;
    const t = measureToast(p.ctx, s.toast.msg, Math.min(0.86 * W, 520));
    p.begin(t.w, t.h, dpr);
    paintToast(p.ctx, t, s.toast.kind);
    p.end();
    p.css = { x: W / 2 - t.w / 2, y: 0.4 * H - t.h / 2, w: t.w, h: t.h };
    p.mesh.scale.set(t.w * k, t.h * k, 1);
    p.mesh.position.set(0, (H / 2 - 0.4 * H) * k, 0);
    p.mesh.visible = true;
  }

  // ——— رسم لوحة النظارة ———
  function drawBoard(time, pos, heading) {
    const [BW, BH] = BOARD_PX;
    const K = BOARD_K;
    const ctx = board.begin(BW / K, BH / K, K); // نرسم بوحدات CSS: 512×360
    const W = BW / K;
    const H = BH / K;
    const buttons = [];
    roundRect(ctx, 1, 1, W - 2, H - 2, 17);
    ctx.fillStyle = "rgba(10,36,31,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214,176,98,0.9)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // الشريط
    ctx.save();
    ctx.translate(12, 8);
    paintRail(ctx, W - 24, 30, s);
    ctx.restore();
    // الخريطة والعدّاد على اليسار
    ctx.save();
    ctx.translate(22, 50);
    paintInstrument(ctx, 132, s, pos, heading, time, { shadow: false });
    ctx.restore();
    // البطاقة على اليمين
    const cardX = 180;
    const cardW = W - cardX - 12;
    const actionY = H - 34 - 12 - (ui.boardHint || ui.cardboardButtons ? 26 : 0);
    ctx.save();
    ctx.translate(cardX, 50);
    const card = paintCard(ctx, cardW, s, { maxH: actionY - 50 - 8, hover: ui.hover, chevron: false }, true);
    ctx.restore();
    card.buttons.filter((b) => b.id !== "collapse").forEach((b) => buttons.push({ ...b, x: b.x + cardX, y: b.y + 50 }));
    // التنبيه فوق أسفل البطاقة
    if (s.toast.msg && time < s.toast.until) {
      const t = measureToast(ctx, s.toast.msg, cardW);
      ctx.save();
      ctx.translate(cardX + (cardW - t.w) / 2, actionY - 8 - t.h);
      paintToast(ctx, t, s.toast.kind);
      ctx.restore();
    }
    // الزر الذهبي
    if (s.action.label) {
      const b = { id: "action", x: cardX, y: actionY, w: cardW, h: 34 };
      ctx.save();
      ctx.translate(b.x, b.y);
      paintAction(ctx, b.w, b.h, s, { hover: ui.hover === "action", progress: ui.hover === "action" ? ui.progress : 0 });
      ctx.restore();
      buttons.push(b);
    }
    // صف أسفل اللوحة: أزرار علبة VR أو تلميح التحكم
    if (ui.cardboardButtons) {
      const y = H - 32;
      const turnL = { id: "turnL", x: 16, y, w: 74, h: 24 };
      const walk = { id: "walk", x: 98, y, w: 74, h: 24 };
      const turnR = { id: "turnR", x: 180, y, w: 74, h: 24 };
      for (const [b, label, on] of [
        [turnR, "دُر يمينًا", false],
        [walk, ui.walking ? "قف" : "امشِ", ui.walking],
        [turnL, "دُر يسارًا", false],
      ]) {
        paintChip(ctx, b, label, { hover: ui.hover === b.id, on, progress: ui.hover === b.id ? ui.progress : 0 });
        buttons.push(b);
      }
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.font = `400 9.5px ${ri}`;
      ctx.fillStyle = "rgba(246,241,228,0.55)";
      ctx.fillText(ui.boardHint, W - 14, y + 12);
    } else if (ui.boardHint) {
      ctx.direction = "rtl";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.font = `400 9.5px ${ri}`;
      ctx.fillStyle = "rgba(246,241,228,0.5)";
      ctx.fillText(ui.boardHint, W - 14, H - 20);
    }
    board.end();
    // الأزرار بوحدات CSS للوحة (512×360)
    board.buttons = buttons;
    ui.dirty = false;
  }

  // تتبّع الرأس ببطء: تبقى اللوحة مكانها ما دام الرأس في حدود 35° منها
  const hp = new Vector3();
  const dirV = new Vector3();
  function placeBoard(dt) {
    camera.getWorldPosition(hp);
    camera.getWorldDirection(dirV);
    const headYaw = Math.atan2(-dirV.x, -dirV.z);
    const diff = ll(headYaw - boardState.yaw);
    if (!boardState.placed || Math.abs(diff) > boardState.follow) boardState.target = headYaw;
    if (!boardState.placed) boardState.yaw = headYaw;
    if (boardState.target != null) {
      const d = ll(boardState.target - boardState.yaw);
      boardState.yaw += d * Math.min(1, dt * 3);
      if (Math.abs(d) < 0.01) boardState.target = null;
    }
    const tx = hp.x - Math.sin(boardState.yaw) * boardState.dist;
    const tz = hp.z - Math.cos(boardState.yaw) * boardState.dist;
    const ty = hp.y - boardState.drop;
    const m = board.mesh;
    if (!boardState.placed) m.position.set(tx, ty, tz);
    else {
      const f = 1 - Math.exp(-dt * 8);
      m.position.x += (tx - m.position.x) * f;
      m.position.y += (ty - m.position.y) * f;
      m.position.z += (tz - m.position.z) * f;
    }
    m.rotation.set(0, boardState.yaw, 0);
    boardState.placed = true;
  }

  ui.update = (dt, { time = 0, pos = null, heading = 0 } = {}) => {
    hud.visible = ui.active && ui.kind === "flat";
    board.mesh.visible = ui.active && ui.kind === "board";
    if (!ui.active) return;
    if (ui.kind === "flat") {
      layoutFlat(dt, time, pos, heading);
      layoutToastFlat(time);
    } else {
      placeBoard(dt);
      boardTimer -= dt;
      if (ui.dirty || boardTimer <= 0) drawBoard(time, pos, heading), (boardTimer = 0.12);
    }
  };

  // ——— الإصابة ———
  // نقطة على الشاشة (بكسل CSS) في اللوحات المثبّتة
  ui.hitScreen = (cx, cy) => {
    if (ui.kind !== "flat" || !ui.active) return null;
    for (const p of [flat.toast, flat.action, flat.card]) {
      if (!p.mesh.visible) continue;
      const c = p.css;
      if (cx < c.x || cx > c.x + c.w || cy < c.y || cy > c.y + c.h) continue;
      const lx = cx - c.x;
      const ly = cy - c.y;
      const b = p.buttons.find((b) => lx >= b.x && lx <= b.x + b.w && ly >= b.y && ly <= b.y + b.h);
      if (enabled(b)) return { id: b.id };
      return { id: null }; // على لوحة لكن ليس على زر
    }
    return null;
  };
  // شعاع في العالم (من النظر أو من ذراع النظارة) على لوحة النظارة
  const inv = new Matrix4();
  const o = new Vector3();
  const d = new Vector3();
  ui.hitRay = (origin, dir) => {
    if (ui.kind !== "board" || !board.mesh.visible) return null;
    board.mesh.updateMatrixWorld(true);
    inv.copy(board.mesh.matrixWorld).invert();
    o.copy(origin).applyMatrix4(inv);
    d.copy(origin).add(dir).applyMatrix4(inv).sub(o);
    if (Math.abs(d.z) < 1e-6) return null;
    const t = -o.z / d.z;
    if (t <= 0) return null;
    const x = o.x + d.x * t;
    const y = o.y + d.y * t;
    if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) return null;
    const bx = (x + 0.5) * (BOARD_PX[0] / BOARD_K);
    const by = (0.5 - y) * (BOARD_PX[1] / BOARD_K);
    const b = board.buttons.find((b) => bx >= b.x && bx <= b.x + b.w && by >= b.y && by <= b.y + b.h);
    const point = new Vector3(x, y, 0).applyMatrix4(board.mesh.matrixWorld);
    return { id: enabled(b) ? b.id : null, point, distance: point.distanceTo(origin) };
  };
  // مركز زر في العالم (للاختبار وللتصويب)
  ui.buttonWorld = (id) => {
    if (ui.kind === "board") {
      const b = board.buttons.find((b) => b.id === id);
      if (!b) return null;
      board.mesh.updateMatrixWorld(true);
      const x = (b.x + b.w / 2) / (BOARD_PX[0] / BOARD_K) - 0.5;
      const y = 0.5 - (b.y + b.h / 2) / (BOARD_PX[1] / BOARD_K);
      return new Vector3(x, y, 0).applyMatrix4(board.mesh.matrixWorld);
    }
    return null;
  };
  // مركز زر على الشاشة (بكسل CSS) في اللوحات المثبّتة
  ui.buttonScreen = (id) => {
    for (const p of [flat.action, flat.card]) {
      if (!p.mesh.visible) continue;
      const b = p.buttons.find((b) => b.id === id);
      if (b) return { x: p.css.x + b.x + b.w / 2, y: p.css.y + b.y + b.h / 2 };
    }
    return null;
  };
  ui.flat = flat;
  ui.board = board;
  return ui;
}

// مؤشر النظر في علبة VR: حلقة في وسط الرؤية تمتلئ خلال ثانية فوق الزر.
function createGazeReticle(camera) {
  const p = createCanvasPlane("reticle", 1004);
  camera.add(p.mesh);
  let last = "";
  return {
    set(visible, distance = 2, progress = 0, onButton = false) {
      p.mesh.visible = visible;
      if (!visible) return;
      const dist = Math.max(0.6, Math.min(4, distance));
      p.mesh.position.set(0, 0, -dist);
      const size = 0.026 * dist;
      p.mesh.scale.set(size, size, 1);
      const key = `${onButton}|${progress.toFixed(2)}`;
      if (key === last) return;
      last = key;
      const ctx = p.begin(64, 64, 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(12,42,36,0.75)";
      ctx.beginPath();
      ctx.arc(32, 32, onButton ? 22 : 12, 0, le);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = onButton ? "#f0c96a" : "#f6f1e4";
      ctx.beginPath();
      ctx.arc(32, 32, onButton ? 22 : 12, 0, le);
      ctx.stroke();
      if (progress > 0) {
        ctx.lineWidth = 7;
        ctx.strokeStyle = "#f0c96a";
        ctx.beginPath();
        ctx.arc(32, 32, 22, -Math.PI / 2, -Math.PI / 2 + progress * le);
        ctx.stroke();
      }
      p.end();
    },
  };
}
