var Yt = { lx: 12, lz: 11.2, h: 13.1, rot: Math.PI / 4 },
  rl = Math.cos(Yt.rot),
  al = Math.sin(Yt.rot);
function ol(i, t) {
  return [i * rl - t * al, i * al + t * rl];
}
function Qe(i, t) {
  return [i * rl + t * al, -i * al + t * rl];
}
var le = Math.PI * 2,
  qr = (i, t) => Math.atan2(-t, i),
  ll = (i) => {
    for (; i <= -Math.PI; ) i += le;
    for (; i > Math.PI; ) i -= le;
    return i;
  },
  Ln = {
    black: Qe(Yt.lx / 2, Yt.lz / 2),
    iraqi: Qe(Yt.lx / 2, -Yt.lz / 2),
    shami: Qe(-Yt.lx / 2, -Yt.lz / 2),
    yamani: Qe(-Yt.lx / 2, Yt.lz / 2),
  },
  we = qr(Ln.black[0], Ln.black[1]),
  je = { a: 6, b: 8.4, t0: 0.27, h: 1.3, w: 1 },
  Xn = [Yt.lx / 2 + 10.5, 1.2],
  Sn = Qe(Xn[0], Xn[1]),
  pe = { arcIn: 44, arcOut: 51, outer: 56, walk: 54.4, gap: [71, 85] },
  dt = {
    x0: 66,
    x1: 84,
    xc: 75,
    zS: 26,
    zM: -96,
    walkS: 24.4,
    walkM: -94.4,
    safaZone: 14,
    marwaZone: -84,
    gA: -14,
    gB: -48,
    pass: { x0: 50, x1: 67, z0: 6, z1: 18 },
    divider: { x0: 74.5, x1: 75.5, z0: -82, z1: 12 },
  },
  Yr = { phi: (35 * Math.PI) / 180, r: 28 };
function Xc(i, t) {
  let [e, n] = ol(i, t),
    s = -(n + Yt.lz / 2),
    r = e / je.a,
    a = s / je.b;
  return { xl: e, zl: n, zz: s, r: Math.hypot(r, a), t: Math.atan2(a, r) };
}
function qc(i, t) {
  let e = Xc(i, t);
  return e.zz > 0 && e.r < 0.93;
}
function zs(i, t) {
  if (Math.hypot(i, t) < pe.walk) return !0;
  let e = dt.pass;
  return (
    (i >= e.x0 && i <= e.x1 && t >= e.z0 && t <= e.z1) ||
    (i >= dt.x0 + 0.7 && i <= dt.x1 - 0.7 && t <= dt.walkS && t >= dt.walkM)
  );
}
var Ei = 0.35;
function Yc(i, t) {
  let [e, n] = ol(i, t),
    s = Yt.lx / 2 + 0.3 + Ei,
    r = Yt.lz / 2 + 0.3 + Ei;
  if (Math.abs(e) < s && Math.abs(n) < r) {
    let g = s - Math.abs(e),
      v = r - Math.abs(n);
    g < v ? (e = Math.sign(e || 1) * s) : (n = Math.sign(n || 1) * r), ([i, t] = Qe(e, n));
  }
  let a = Xc(i, t),
    o = (je.a + je.b) / 2,
    l = (je.w / 2 + Ei) / o;
  if (a.zz > -0.2 && a.t >= je.t0 - 0.05 && a.t <= Math.PI - je.t0 + 0.05 && Math.abs(a.r - 1) < l) {
    let g = a.r < 1 ? 1 - l : 1 + l,
      v = g * Math.cos(a.t) * je.a,
      m = g * Math.sin(a.t) * je.b;
    [i, t] = Qe(v, -m - Yt.lz / 2);
  }
  let c = i - Sn[0],
    h = t - Sn[1],
    d = Math.hypot(c, h),
    u = 1.05 + Ei;
  if (d < u) {
    let g = d > 1e-4 ? u / d : 1;
    (i = Sn[0] + (d > 1e-4 ? c : u) * g), (t = Sn[1] + (d > 1e-4 ? h : 0) * g);
  }
  let f = dt.divider;
  return (
    i > f.x0 - Ei && i < f.x1 + Ei && t > f.z0 && t < f.z1 && (i = i < dt.xc ? f.x0 - Ei : f.x1 + Ei), [i, t]
  );
}
function xd(i, t, e, n) {
  let s = i,
    r = t;
  return zs(e, n) ? ((s = e), (r = n)) : zs(e, t) ? (s = e) : zs(i, n) && (r = n), Yc(s, r);
}
function Zc(i, t) {
  let e = Math.hypot(i, t);
  return e > 8.4 && e < 43 && Math.abs(ll(qr(i, t) - we)) < 0.1;
}
function $c(i, t) {
  let [e, n] = ol(i, t);
  return e > Xn[0] + 1.3 && e < Xn[0] + 16 && Math.abs(n - Xn[1]) < 5.5;
}
var Jc = (i, t) => i > dt.x0 && t < dt.walkS + 1 && t > dt.walkM - 1,
  cl = (i, t) => Jc(i, t) && t > dt.safaZone,
  Kc = (i, t) => Jc(i, t) && t < dt.marwaZone,
  yd = (i, t) => Jc(i, t) && t < dt.gA && t > dt.gB;
function vd(i = 720) {
  let t = new Float32Array(i);
  for (let e = 0; e < i; e++) {
    let n = (e / i) * le,
      s = Math.cos(n),
      r = -Math.sin(n),
      [a, o] = ol(s, r),
      c =
        Math.min(
          (Yt.lx / 2 + 0.4) / Math.max(Math.abs(a), 1e-6),
          (Yt.lz / 2 + 0.4) / Math.max(Math.abs(o), 1e-6),
        ) + 0.9,
      h = 0;
    for (let d = 0; d < 26; d += 0.2) {
      let u = Xc(s * d, r * d);
      u.zz > -0.3 && u.r < 1.12 && (h = d);
    }
    h > 0 && (c = Math.max(c, h + 0.9)), (t[e] = c);
  }
  return t;
}
