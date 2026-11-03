function Xr(i) {
  let t = i >>> 0;
  return () => ((t = (t * 1664525 + 1013904223) >>> 0), t / 4294967296);
}
function Wn(i, t) {
  let e = document.createElement("canvas");
  return (e.width = i), (e.height = t), e;
}
function Mn(i, { repeat: t = [1, 1], srgb: e = !0, aniso: n = 8, wrap: s = !0 } = {}) {
  let r = new Ui(i);
  return (
    e && (r.colorSpace = We), s && (r.wrapS = r.wrapT = fs), r.repeat.set(t[0], t[1]), (r.anisotropy = n), r
  );
}
function Gc({
  base: i = "#eef0ee",
  vein: t = "110,116,118",
  grout: e = "rgba(140,146,140,0.45)",
  seed: n = 7,
} = {}) {
  let r = Wn(512, 512),
    a = r.getContext("2d"),
    o = Xr(n);
  (a.fillStyle = i), a.fillRect(0, 0, 512, 512);
  for (let l = 0; l < 4; l++) {
    let c = (l % 2) * 256,
      h = Math.floor(l / 2) * 256,
      d = 245 + Math.floor(o() * 9);
    (a.fillStyle = `rgba(${d},${d},${d - 2},0.35)`), a.fillRect(c, h, 256, 256);
    for (let u = 0; u < 7; u++) {
      (a.strokeStyle = `rgba(${t},${0.05 + o() * 0.11})`), (a.lineWidth = 0.6 + o() * 1.6), a.beginPath();
      let f = c + o() * 256,
        g = h + o() * 256;
      a.moveTo(f, g);
      for (let v = 0; v < 4; v++) {
        let m = f + (o() - 0.5) * 140,
          p = g + (o() - 0.5) * 140;
        a.quadraticCurveTo(f + (o() - 0.5) * 90, g + (o() - 0.5) * 90, m, p), (f = m), (g = p);
      }
      a.stroke();
    }
  }
  (a.strokeStyle = e), (a.lineWidth = 2);
  for (let l = 0; l <= 2; l++)
    a.beginPath(),
      a.moveTo(l * 256, 0),
      a.lineTo(l * 256, 512),
      a.moveTo(0, l * 256),
      a.lineTo(512, l * 256),
      a.stroke();
  return r;
}
function ud() {
  let t = Wn(512, 512),
    e = t.getContext("2d");
  (e.fillStyle = "#0c0c0d"), e.fillRect(0, 0, 512, 512);
  let n = 64;
  for (let s = 0; s <= 512; s += n)
    for (let r = 0; r <= 512; r += n) {
      let a = (s / n) % 2 ? n / 2 : 0;
      (e.strokeStyle = "rgba(70,70,74,0.22)"),
        (e.lineWidth = 2),
        e.beginPath(),
        e.moveTo(r + a, s - 22),
        e.lineTo(r + a + 22, s),
        e.lineTo(r + a, s + 22),
        e.lineTo(r + a - 22, s),
        e.closePath(),
        e.stroke(),
        (e.fillStyle = "rgba(60,60,64,0.18)"),
        e.beginPath(),
        e.arc(r + a, s, 6, 0, Math.PI * 2),
        e.fill();
    }
  return t;
}
function Vc(i, t, e, n, s, r = 8) {
  i.beginPath();
  for (let a = 0; a < r * 2; a++) {
    let o = a % 2 ? s : n,
      l = (a * Math.PI) / r - Math.PI / 2;
    i.lineTo(t + Math.cos(l) * o, e + Math.sin(l) * o);
  }
  i.closePath();
}
function dd() {
  let e = Wn(1024, 128),
    n = e.getContext("2d"),
    s = n.createLinearGradient(0, 0, 0, 128);
  s.addColorStop(0, "#3a2a0c"),
    s.addColorStop(0.12, "#1a1406"),
    s.addColorStop(0.5, "#141006"),
    s.addColorStop(0.88, "#1a1406"),
    s.addColorStop(1, "#3a2a0c"),
    (n.fillStyle = s),
    n.fillRect(0, 0, 1024, 128);
  let r = n.createLinearGradient(0, 0, 0, 128);
  r.addColorStop(0, "#f3d98b"),
    r.addColorStop(0.5, "#c99a3b"),
    r.addColorStop(1, "#f0d27c"),
    (n.strokeStyle = r),
    (n.fillStyle = r),
    (n.lineWidth = 5),
    n.strokeRect(4, 6, 1016, 116),
    (n.lineWidth = 2),
    n.strokeRect(12, 14, 1e3, 100);
  let a = 4,
    o = 1024 / a;
  for (let l = 0; l < a; l++) {
    let c = l * o;
    (n.lineWidth = 3),
      n.beginPath(),
      n.roundRect(c + 52, 26, o - 104, 76, 34),
      n.stroke(),
      (n.lineWidth = 4.5);
    for (let h = 0; h < 5; h++) {
      let d = c + 74 + h * ((o - 148) / 5);
      n.beginPath(),
        n.moveTo(d, 128 / 2 + 14),
        n.bezierCurveTo(d + 10, 128 / 2 - 30, d + 32, 128 / 2 - 30, d + 36, 128 / 2 + 2),
        n.bezierCurveTo(d + 38, 128 / 2 + 22, d + 20, 128 / 2 + 24, d + 16, 128 / 2 + 8),
        n.stroke();
    }
    Vc(n, c, 128 / 2, 26, 12, 8),
      n.fill(),
      (n.fillStyle = "#141006"),
      n.beginPath(),
      n.arc(c, 128 / 2, 6, 0, Math.PI * 2),
      n.fill(),
      (n.fillStyle = r);
  }
  return e;
}
function fd() {
  let e = Wn(512, 1024),
    n = e.getContext("2d");
  (n.fillStyle = "#0d0d0e"), n.fillRect(0, 0, 512, 1024);
  let s = n.createLinearGradient(0, 0, 512, 1024);
  s.addColorStop(0, "#f2d688"),
    s.addColorStop(0.5, "#c8973a"),
    s.addColorStop(1, "#ecca72"),
    (n.strokeStyle = s),
    (n.fillStyle = s),
    (n.lineWidth = 10),
    n.strokeRect(14, 14, 484, 996),
    (n.lineWidth = 3),
    n.strokeRect(34, 34, 444, 956);
  let r = [
    [60, 70, 392, 150],
    [60, 250, 392, 330],
    [60, 610, 392, 150],
    [60, 790, 392, 170],
  ];
  for (let [a, o, l, c] of r) {
    (n.lineWidth = 4), n.beginPath(), n.roundRect(a, o, l, c, 18), n.stroke(), (n.lineWidth = 5);
    for (let h = 0; h < 4; h++) {
      let d = a + 30 + h * ((l - 60) / 4);
      n.beginPath(),
        n.moveTo(d, o + c / 2 + 16),
        n.bezierCurveTo(d + 12, o + c / 2 - 34, d + 40, o + c / 2 - 34, d + 46, o + c / 2),
        n.bezierCurveTo(d + 48, o + c / 2 + 24, d + 24, o + c / 2 + 26, d + 20, o + c / 2 + 8),
        n.stroke();
    }
  }
  return (
    Vc(n, 512 / 2, 415, 92, 46, 8),
    n.fill(),
    (n.fillStyle = "#0d0d0e"),
    Vc(n, 512 / 2, 415, 60, 30, 8),
    n.fill(),
    (n.fillStyle = s),
    n.beginPath(),
    n.arc(512 / 2, 415, 18, 0, Math.PI * 2),
    n.fill(),
    e
  );
}
function pd() {
  let e = Wn(256, 256),
    n = e.getContext("2d"),
    s = n.createLinearGradient(0, 0, 0, 256);
  s.addColorStop(0, "#efe9dc"),
    s.addColorStop(1, "#e2dacb"),
    (n.fillStyle = s),
    n.fillRect(0, 0, 256, 256),
    (n.fillStyle = "#d3c8b2"),
    n.fillRect(0, 0, 256, 16),
    (n.fillStyle = "#bfa77a"),
    n.fillRect(0, 16, 256, 4);
  let r = (a) => {
    let o = 28 + a,
      l = 228 - a,
      c = 118 + a * 0.3,
      h = 46 + a;
    n.beginPath(),
      n.moveTo(o, 256),
      n.lineTo(o, c),
      n.quadraticCurveTo(o, h + 18, 256 / 2, h),
      n.quadraticCurveTo(l, h + 18, l, c),
      n.lineTo(l, 256),
      n.closePath();
  };
  n.save(), r(-12), n.clip();
  for (let a = 0; a < 14; a++) {
    (n.fillStyle = a % 2 ? "#cfc2a6" : "#e9e2d2"), n.beginPath(), n.moveTo(256 / 2, 150);
    let o = Math.PI + (a / 14) * Math.PI,
      l = Math.PI + ((a + 1) / 14) * Math.PI;
    n.lineTo(256 / 2 + Math.cos(o) * 220, 150 + Math.sin(o) * 220),
      n.lineTo(256 / 2 + Math.cos(l) * 220, 150 + Math.sin(l) * 220),
      n.closePath(),
      n.fill();
  }
  return (
    n.restore(),
    (n.strokeStyle = "#b89c62"),
    (n.lineWidth = 2),
    r(-12),
    n.stroke(),
    (n.globalCompositeOperation = "destination-out"),
    r(0),
    n.fill(),
    (n.globalCompositeOperation = "source-over"),
    e
  );
}
function Wc() {
  let e = Wn(256, 512),
    n = e.getContext("2d");
  (n.fillStyle = "#e4dccb"), n.fillRect(0, 0, 256, 512);
  let s = 3;
  for (let r = 0; r < s; r++) {
    let a = 40 + r * 150;
    (n.fillStyle = "#cfc4ad"), n.fillRect(0, a - 10, 256, 8);
    for (let o = 0; o < 2; o++) {
      let l = 20 + o * 128,
        c = 88,
        h = 112;
      (n.fillStyle = "#5d5a52"),
        n.beginPath(),
        n.moveTo(l, a + h),
        n.lineTo(l, a + 36),
        n.quadraticCurveTo(l, a + 6, l + c / 2, a),
        n.quadraticCurveTo(l + c, a + 6, l + c, a + 36),
        n.lineTo(l + c, a + h),
        n.closePath(),
        n.fill(),
        (n.strokeStyle = "#b39a66"),
        (n.lineWidth = 3),
        n.stroke(),
        (n.fillStyle = "rgba(255,214,140,0.55)"),
        n.beginPath(),
        n.arc(l + c / 2, a + 30, 5, 0, Math.PI * 2),
        n.fill();
    }
  }
  (n.fillStyle = "#d6cbb4"), n.fillRect(0, 0, 256, 14);
  for (let r = 0; r < 256; r += 32) (n.fillStyle = "#cdbf9f"), n.fillRect(r + 8, 0, 16, 8);
  return e;
}
function md() {
  let t = Wn(256, 256),
    e = t.getContext("2d"),
    n = e.createRadialGradient(256 / 2, 256 / 2, 256 * 0.18, 256 / 2, 256 / 2, 256 / 2);
  return (
    n.addColorStop(0, "rgba(0,0,0,0.42)"),
    n.addColorStop(1, "rgba(0,0,0,0)"),
    (e.fillStyle = n),
    e.fillRect(0, 0, 256, 256),
    t
  );
}
function gd(i = "255,255,255") {
  let e = Wn(128, 128),
    n = e.getContext("2d"),
    s = n.createRadialGradient(128 / 2, 128 / 2, 0, 128 / 2, 128 / 2, 128 / 2);
  return (
    s.addColorStop(0, `rgba(${i},1)`),
    s.addColorStop(0.25, `rgba(${i},0.55)`),
    s.addColorStop(1, `rgba(${i},0)`),
    (n.fillStyle = s),
    n.fillRect(0, 0, 128, 128),
    e
  );
}
function _d(i, { size: t = 46, sub: e = "" } = {}) {
  let n = `600 ${t}px "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif`,
    s = `400 ${Math.round(t * 0.55)}px "Noto Kufi Arabic", "Noto Sans Arabic", Tahoma, sans-serif`,
    r = Wn(8, 8).getContext("2d");
  r.font = n;
  let a = r.measureText(i).width;
  r.font = s;
  let o = e ? r.measureText(e).width : 0,
    l = t * 0.7,
    c = Math.ceil(Math.max(a, o) + l * 2),
    h = Math.ceil(t * (e ? 2.35 : 1.75)),
    d = Wn(c, h),
    u = d.getContext("2d");
  (u.direction = "rtl"),
    (u.fillStyle = "rgba(12,38,32,0.82)"),
    u.beginPath(),
    u.roundRect(2, 2, c - 4, h - 4, h * 0.28),
    u.fill(),
    (u.strokeStyle = "rgba(214,178,98,0.9)"),
    (u.lineWidth = 2),
    u.stroke(),
    (u.fillStyle = "#f5efe1"),
    (u.textAlign = "center"),
    (u.textBaseline = "middle"),
    (u.font = n),
    u.fillText(i, c / 2, e ? h * 0.38 : h * 0.53),
    e && ((u.font = s), (u.fillStyle = "rgba(232,214,170,0.92)"), u.fillText(e, c / 2, h * 0.74));
  let f = Mn(d, { wrap: !1, aniso: 4 });
  return (f.minFilter = Fe), (f.generateMipmaps = !1), { texture: f, aspect: c / h };
}
