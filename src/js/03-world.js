var bd = new U(-0.62, 0.52, 0.34).normalize();
function Se(i, t = {}) {
  return new Rn({ color: i, roughness: 0.85, metalness: 0, ...t });
}
function Md(i, t, e, n) {
  let s = i.attributes.position.count,
    r = new Float32Array(s * 3);
  for (let a = 0; a < s; a++) (r[a * 3] = t), (r[a * 3 + 1] = e), (r[a * 3 + 2] = n);
  return i.setAttribute("color", new Ue(r, 3)), i;
}
function Sd() {
  return new rn({
    side: Oe,
    depthWrite: !1,
    fog: !1,
    toneMapped: !1,
    uniforms: {
      top: { value: new Jt("#5b8fc8") },
      horizon: { value: new Jt("#f2dcb6") },
      bottom: { value: new Jt("#cdbd9c") },
      sunDir: { value: bd.clone() },
      sunCol: { value: new Jt("#fff0cf") },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(horizon, top, smoothstep(0.0, 0.62, h));
        c = mix(bottom, c, smoothstep(-0.06, 0.03, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 22.0) * 0.16);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
function Ed(i, t) {
  let e = { labels: [], showLabels: !0, suppressLabels: !0, showCrowd: !0 },
    n = Math.min(8, t.capabilities.getMaxAnisotropy()),
    s = new Pt(new fn(900, 32, 16), Sd());
  (s.renderOrder = -10), i.add(s), (e.sky = s);
  let r = new Fs(t),
    a = new Di();
  a.add(new Pt(new fn(10, 32, 16), Sd())), (e.envScene = a);
  // السماء والبيئة والضوءان مكشوفة لأوقات المشهد في 03-atmosphere.js
  (e.hemi = new Ar("#dcecff", "#d9c7a4", 1.05)),
    (i.environment = r.fromScene(a, 0.04).texture),
    (i.environmentIntensity = 0.55),
    r.dispose(),
    (i.fog = new ar("#eedfc4", 150, 780)),
    i.add(e.hemi);
  let o = new Cr("#ffe6be", 2.5);
  e.sun = o;
  o.position.copy(bd).multiplyScalar(120), i.add(o);
  let l = Mn(Gc(), { repeat: [46, 46], aniso: n }),
    c = Se("#ffffff", { map: l, roughness: 0.3, envMapIntensity: 1 }),
    h = Se("#ece5d6", { roughness: 0.82 }),
    d = Se("#efe8d9", { roughness: 0.8 }),
    u = Se("#d9ad4f", { metalness: 0.85, roughness: 0.32, envMapIntensity: 1.4 }),
    f = Se("#9aa2a8", { metalness: 0.35, roughness: 0.55 }),
    g = new Pt(new Oi(800, 64), Se("#cfc5b0", { roughness: 0.96 }));
  (g.rotation.x = -Math.PI / 2), i.add(g);
  let v = new Pt(new Oi(pe.outer + 0.5, 128), c);
  (v.rotation.x = -Math.PI / 2), (v.position.y = 0.01), i.add(v);
  let m = new Pt(
    new Ve(Yt.lx + 8, Yt.lz + 8),
    new Le({ map: Mn(md(), { wrap: !1 }), transparent: !0, depthWrite: !1 }),
  );
  m.rotation.set(-Math.PI / 2, 0, Yt.rot), (m.position.y = 0.02), i.add(m), (e.kaabaShade = m);
  let p = new nn();
  (p.rotation.y = Yt.rot), i.add(p);
  let b = new Pt(new Me(Yt.lx + 0.6, 0.32, Yt.lz + 0.6), Se("#f4f3ef", { roughness: 0.35 }));
  (b.position.y = 0.16), p.add(b);
  let C = Mn(ud(), { repeat: [3, 3], aniso: n }),
    y = Se("#ffffff", { map: C, roughness: 0.74, metalness: 0.06 }),
    E = Se("#6c6c6a", { roughness: 0.9 }),
    w = new Pt(new Me(Yt.lx, Yt.h, Yt.lz), [y, y, E, E, y, y]);
  (w.position.y = Yt.h / 2), p.add(w);
  let D = Mn(dd(), { repeat: [1.5, 1], aniso: n }),
    x = Se("#ffffff", { map: D, metalness: 0.55, roughness: 0.4, envMapIntensity: 1.3 }),
    M = new Le({ visible: !1 }),
    P = new Pt(new Me(Yt.lx + 0.05, 0.98, Yt.lz + 0.05), [x, x, M, M, x, x]);
  (P.position.y = Yt.h * 0.68), p.add(P);
  let I = new Pt(
    new Ve(2.7, 4.7),
    Se("#ffffff", { map: Mn(fd(), { wrap: !1, aniso: n }), metalness: 0.45, roughness: 0.45 }),
  );
  (I.rotation.y = Math.PI / 2), I.position.set(Yt.lx / 2 + 0.04, 4.15, Yt.lz / 2 - 2.95), p.add(I);
  let A = new nn(),
    L = new Pt(
      new ni(0.26, 0.08, 12, 32),
      Se("#d9dde0", { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.5 }),
    );
  L.scale.set(1, 1.25, 1);
  let T = new Pt(new fn(0.2, 20, 14), Se("#2b1c18", { roughness: 0.45 }));
  T.scale.set(1, 1.2, 0.45),
    A.add(L, T),
    (A.rotation.y = Math.PI / 4),
    A.position.set(Yt.lx / 2 + 0.05, 1.5, Yt.lz / 2 + 0.05),
    p.add(A);
  let F = new Pt(new Me(0.36, 0.3, 2.3), u);
  F.position.set(0, Yt.h - 0.4, -Yt.lz / 2 - 1.05), p.add(F);
  {
    let { a: q, b: J, t0: ct, w: _t, h: it } = je,
      N = new Es(),
      St = 48;
    for (let k = 0; k <= St; k++) {
      let Y = ct + ((Math.PI - 2 * ct) * k) / St,
        lt = Math.cos(Y) * (q + _t / 2),
        pt = Math.sin(Y) * (J + _t / 2);
      k === 0 ? N.moveTo(lt, pt) : N.lineTo(lt, pt);
    }
    for (let k = St; k >= 0; k--) {
      let Y = ct + ((Math.PI - 2 * ct) * k) / St;
      N.lineTo(Math.cos(Y) * (q - _t / 2), Math.sin(Y) * (J - _t / 2));
    }
    let Tt = new Sr(N, { depth: it, bevelEnabled: !1, curveSegments: 1 });
    Tt.rotateX(-Math.PI / 2), Tt.translate(0, 0, -Yt.lz / 2);
    let R = new Pt(Tt, Se("#f6f5f0", { roughness: 0.4 }));
    p.add(R);
    let _ = [];
    for (let k = 0; k <= St; k++) {
      let Y = ct + ((Math.PI - 2 * ct) * k) / St;
      _.push(new U(Math.cos(Y) * q, it + 0.02, -Yt.lz / 2 - Math.sin(Y) * J));
    }
    let z = new Pt(new Er(new bs(_), 64, 0.06, 6), u);
    p.add(z);
  }
  {
    let q = new nn(),
      J = new Pt(new Re(1, 1.08, 0.5, 8), Se("#3d3d40", { roughness: 0.4 }));
    J.position.y = 0.25;
    let ct = new Pt(
      new Re(0.72, 0.72, 1.5, 24, 1, !0),
      new Rn({
        color: "#d8ecf2",
        transparent: !0,
        opacity: 0.22,
        roughness: 0.05,
        metalness: 0.2,
        side: qe,
        depthWrite: !1,
      }),
    );
    ct.position.y = 1.25;
    let _t = new Pt(new Me(0.46, 0.42, 0.46), u);
    (_t.position.y = 0.72), q.add(J, ct, _t);
    for (let Tt = 0; Tt < 8; Tt++) {
      let R = (Tt / 8) * le,
        _ = new Pt(new Re(0.035, 0.035, 1.5, 6), u);
      _.position.set(Math.cos(R) * 0.76, 1.25, Math.sin(R) * 0.76), q.add(_);
    }
    for (let Tt of [0.52, 2]) {
      let R = new Pt(new ni(0.77, 0.055, 8, 32), u);
      (R.rotation.x = Math.PI / 2), (R.position.y = Tt), q.add(R);
    }
    let it = new Pt(new fn(0.78, 24, 12, 0, le, 0, Math.PI / 2), u);
    it.position.y = 2;
    let N = new Pt(new Re(0.03, 0.05, 0.4, 6), u);
    N.position.y = 2.95;
    let St = new Pt(new ni(0.13, 0.03, 8, 20, 4.4), u);
    (St.position.y = 3.25),
      (St.rotation.z = Math.PI / 2 + 0.95),
      q.add(it, N, St),
      q.position.set(Sn[0], 0, Sn[1]),
      i.add(q);
  }
  let H = new nn();
  {
    let J = new Pt(
      new Ve(34.4, 0.24),
      new Le({ color: "#35d07f", transparent: !0, opacity: 0.55, depthWrite: !1 }),
    );
    J.rotation.set(-Math.PI / 2, 0, we);
    let ct = 8.6 + 34.4 / 2;
    J.position.set(Math.cos(we) * ct, 0.03, -Math.sin(we) * ct), H.add(J), i.add(H);
  }
  let V = Mn(gd("80,255,160"), { wrap: !1 });
  {
    let q = pe.arcIn - 0.7,
      J = Math.cos(we) * q,
      ct = -Math.sin(we) * q,
      _t = new Pt(new Me(0.6, 0.6, 0.2), new Le({ color: "#46f59a" }));
    _t.position.set(J, 4.3, ct), (_t.rotation.y = Math.atan2(-Math.cos(we), Math.sin(we)));
    let it = new ys(new Ni({ map: V, blending: Is, depthWrite: !1, transparent: !0 }));
    it.scale.set(3.2, 3.2, 1),
      it.position.copy(_t.position),
      i.add(_t, it),
      (e.greenLightPos = _t.position.clone());
  }
  {
    let J = Mn(pd(), { repeat: [60, 1], aniso: n }),
      ct = (e.arcadeMat = Se("#ffffff", { map: J, alphaTest: 0.5, side: qe, roughness: 0.82 })),
      _t = new Pt(new Re(pe.arcIn, pe.arcIn, 9, 240, 1, !0), ct);
    _t.position.y = 4.5;
    let it = new Pt(new Re(pe.arcOut, pe.arcOut, 9, 240, 1, !0), ct);
    it.position.y = 4.5;
    let N = new Pt(new ws(pe.arcIn - 0.3, pe.arcOut + 0.3, 120, 1), Se("#e7e0d0", { side: qe }));
    (N.rotation.x = -Math.PI / 2), (N.position.y = 9), i.add(_t, it, N);
    let St = new Re(0.34, 0.42, 6.3, 10);
    St.translate(0, 3.15, 0);
    let Tt = new kn(St, h, 120),
      R = new fn(2.05, 16, 8, 0, le, 0, Math.PI / 2),
      _ = new kn(R, f, 60),
      z = new Bi(0.14, 0.9, 6),
      k = new kn(z, u, 60),
      Y = new ue();
    for (let lt = 0; lt < 60; lt++) {
      let pt = (lt / 60) * le;
      Y.makeTranslation(Math.sin(pt) * (pe.arcIn - 0.45), 0, Math.cos(pt) * (pe.arcIn - 0.45)),
        Tt.setMatrixAt(lt, Y),
        Y.makeTranslation(Math.sin(pt) * (pe.arcOut + 0.45), 0, Math.cos(pt) * (pe.arcOut + 0.45)),
        Tt.setMatrixAt(60 + lt, Y);
      let K = ((lt + 0.5) / 60) * le,
        nt = (pe.arcIn + pe.arcOut) / 2;
      Y.makeTranslation(Math.sin(K) * nt, 9, Math.cos(K) * nt),
        _.setMatrixAt(lt, Y),
        Y.makeTranslation(Math.sin(K) * nt, 11.4, Math.cos(K) * nt),
        k.setMatrixAt(lt, Y);
    }
    i.add(Tt, _, k);
  }
  {
    let q = (pe.gap[1] * Math.PI) / 180,
      J = le - ((pe.gap[1] - pe.gap[0]) * Math.PI) / 180,
      ct = Mn(Wc(), { repeat: [30, 1], aniso: n }),
      _t = new Pt(
        new Re(pe.outer, pe.outer, 34, 180, 1, !0, q, J),
        Se("#ffffff", { map: ct, side: qe, roughness: 0.85 }),
      );
    (_t.position.y = 17), i.add(_t);
    for (let _ of pe.gap) {
      let z = (_ * Math.PI) / 180,
        k = new Pt(new Me(2.4, 34, 2.4), d);
      k.position.set(Math.sin(z) * pe.outer, 17, Math.cos(z) * pe.outer), (k.rotation.y = z), i.add(k);
    }
    let it = (pe.gap[0] * Math.PI) / 180,
      N = (pe.gap[1] * Math.PI) / 180,
      St = new U(Math.sin(it) * pe.outer, 0, Math.cos(it) * pe.outer),
      Tt = new U(Math.sin(N) * pe.outer, 0, Math.cos(N) * pe.outer),
      R = new Pt(new Me(St.distanceTo(Tt) + 2.4, 3, 2.2), d);
    R.position.copy(St).add(Tt).multiplyScalar(0.5),
      (R.position.y = 12.5),
      (R.rotation.y = Math.atan2(-(Tt.z - St.z), Tt.x - St.x)),
      i.add(R);
  }
  {
    let q = [],
      J = [],
      ct = (it, N) => {
        let St = (R, _, z = q) => {
          R.translate(it, _, N), z.push(R);
        };
        St(new Me(5, 24, 5), 12),
          St(new Re(1.9, 2.15, 30, 12), 39),
          St(new Re(2.9, 2.5, 1.1, 16), 54.6),
          St(new Re(1.6, 1.8, 22, 12), 66),
          St(new Re(2.5, 2.1, 1, 16), 77.5),
          St(new Re(1.25, 1.4, 12, 12), 84),
          St(new Bi(1.7, 7, 12), 93.5),
          St(new fn(0.5, 10, 8), 97.4, J);
        let Tt = new ni(0.75, 0.13, 8, 20, 4.4);
        Tt.rotateZ(Math.PI / 2 + 0.95), St(Tt, 99, J);
      },
      _t = [28, 62, 100, 140, 175, 210, 245, 285, 318];
    for (let it of _t) {
      let N = (it * Math.PI) / 180;
      ct(Math.cos(N) * 62, -Math.sin(N) * 62);
    }
    i.add(new Pt(Bs(q), (e.minaretMat = Se("#f1ebde", { roughness: 0.75 })))), i.add(new Pt(Bs(J), u));
  }
  {
    let q = [],
      J = (it, N, St, Tt) => {
        it.translate(N, St, Tt), q.push(it);
      };
    J(new Me(150, 70, 90), 0, 35, 430),
      J(new Me(44, 240, 44), 0, 190, 430),
      J(new Re(17, 21, 44, 8), 0, 332, 430),
      J(new Bi(6, 70, 8), 0, 389, 430),
      i.add(new Pt(Bs(q), Se("#d8cfbd", { roughness: 0.9 })));
    let ct = new Pt(new Oi(16, 40), new Le({ color: "#f4f6ee" }));
    ct.position.set(0, 255, 430 - 22.2), (ct.rotation.y = Math.PI), i.add(ct);
    let _t = new Pt(new ni(16.5, 1.1, 8, 40), new Le({ color: "#2e8f5b" }));
    _t.position.copy(ct.position), i.add(_t);
  }
  {
    let q = dt.zS + 5 - (dt.zM - 5),
      J = (dt.zS + 5 + dt.zM - 5) / 2,
      ct = dt.x1 - dt.x0,
      _t = Mn(Gc({ seed: 21 }), { repeat: [ct / 2.4, q / 2.4], aniso: n }),
      it = new Pt(new Ve(ct, q), Se("#ffffff", { map: _t, roughness: 0.3 }));
    (it.rotation.x = -Math.PI / 2), it.position.set(dt.xc, 0.015, J);
    let N = new Pt(new Ve(ct, q), Se("#f1ebdf", { roughness: 0.9 }));
    (N.rotation.x = Math.PI / 2), N.position.set(dt.xc, 11, J), i.add(it, N);
    let St = Mn(Wc(), { repeat: [q / 9, 0.34], aniso: n });
    St.offset.y = 0.66;
    let Tt = new Pt(new Ve(q, 11), Se("#ffffff", { map: St, roughness: 0.85 }));
    (Tt.rotation.y = -Math.PI / 2), Tt.position.set(dt.x1, 5.5, J);
    let R = new Pt(new Ve(q, 3.6), Se("#ece5d6", { side: qe }));
    (R.rotation.y = Math.PI / 2), R.position.set(dt.x0, 11 - 1.8, J);
    let _ = new Pt(new Ve(ct, 11), d);
    (_.rotation.y = Math.PI), _.position.set(dt.xc, 5.5, dt.zS + 5);
    let z = new Pt(new Ve(ct, 11), d);
    z.position.set(dt.xc, 5.5, dt.zM - 5), i.add(Tt, R, _, z);
    let k = new Re(0.42, 0.5, 7.4, 10);
    k.translate(0, 3.7, 0);
    let Y = [];
    for (let Ut = dt.zS + 2; Ut > dt.zM - 3; Ut -= 6)
      (Ut < dt.pass.z0 - 1 || Ut > dt.pass.z1 + 1) && Y.push(Ut);
    let lt = new kn(k, h, Y.length),
      pt = new ue();
    Y.forEach((Ut, O) => {
      pt.makeTranslation(dt.x0, 0, Ut), lt.setMatrixAt(O, pt);
    }),
      i.add(lt);
    let K = [];
    for (let Ut = dt.zS + 1; Ut > dt.zM - 2; Ut -= 6)
      for (let O of [70, 80]) {
        let mt = new Ve(3.2, 1);
        mt.rotateX(Math.PI / 2), mt.translate(O, 10.97, Ut), K.push(mt);
      }
    i.add(new Pt(Bs(K), new Le({ color: "#fff7e4" })));
    let nt = new Le({ color: "#2fe084" }),
      bt = new Le({ color: "#1fae66" });
    for (let Ut of [dt.gA, dt.gB]) {
      let O = new Pt(new Me(ct - 0.2, 0.3, 1.3), nt);
      O.position.set(dt.xc, 10.8, Ut);
      let mt = new Pt(new Me(0.2, 6, 0.6), nt);
      mt.position.set(dt.x1 - 0.12, 4, Ut), i.add(O, mt);
    }
    for (let Ut of [72, 78]) {
      let O = new Pt(new Me(0.45, 0.12, dt.gA - dt.gB), bt);
      O.position.set(Ut, 10.9, (dt.gA + dt.gB) / 2), i.add(O);
    }
    let Lt = dt.divider,
      wt = new Pt(new Me(Lt.x1 - Lt.x0, 0.95, Lt.z1 - Lt.z0), Se("#f3f1ea", { roughness: 0.4 }));
    wt.position.set(dt.xc, 0.475, (Lt.z0 + Lt.z1) / 2);
    let vt = new Pt(new Me(0.16, 0.08, Lt.z1 - Lt.z0), u);
    vt.position.set(dt.xc, 1, (Lt.z0 + Lt.z1) / 2), i.add(wt, vt);
    let zt = (Ut, O) => {
      let mt = new br(4.2, 3),
        st = Xr(O),
        yt = mt.attributes.position,
        Mt = new U(),
        at = new Float32Array(yt.count * 3),
        kt = new Map();
      for (let oe = 0; oe < yt.count; oe++) {
        Mt.fromBufferAttribute(yt, oe);
        let ce = `${Mt.x.toFixed(3)},${Mt.y.toFixed(3)},${Mt.z.toFixed(3)}`,
          Ge = kt.get(ce);
        Ge === void 0 && ((Ge = 0.82 + st() * 0.36), kt.set(ce, Ge)),
          Mt.multiplyScalar(Ge),
          yt.setXYZ(oe, Mt.x, Mt.y, Mt.z);
        let an = 0.07 + (Ge - 0.82) * 0.22 + st() * 0.03;
        (at[oe * 3] = an + 0.035), (at[oe * 3 + 1] = an + 0.018), (at[oe * 3 + 2] = an);
      }
      mt.setAttribute("color", new Ue(at, 3)), mt.computeVertexNormals();
      let Ft = new Pt(mt, new Rn({ vertexColors: !0, roughness: 0.95, flatShading: !0 }));
      Ft.scale.set(1.7, 0.72, 0.95), Ft.position.set(dt.xc, 0.4, Ut), i.add(Ft);
    };
    zt(dt.zS + 2.6, 11), zt(dt.zM - 2.6, 29);
    let qt = new Rn({ color: "#cfe8f3", transparent: !0, opacity: 0.25, roughness: 0.05, depthWrite: !1 });
    for (let Ut of [dt.walkS + 0.45, dt.walkM - 0.45]) {
      let O = new Pt(new Me(14, 1.1, 0.1), qt);
      O.position.set(dt.xc, 0.55, Ut);
      let mt = new Pt(new Me(14, 0.07, 0.16), u);
      mt.position.set(dt.xc, 1.12, Ut), i.add(O, mt);
    }
  }
  let Q = (q, J, ct, _t, it = 0.8, N = "") => {
    let St = it * 0.6,
      { texture: Tt, aspect: R } = _d(q, { sub: N }),
      _ = new ys(new Ni({ map: Tt, depthWrite: !1, transparent: !0, fog: !1 }));
    return (
      _.scale.set(St * R, St, 1),
      (_.userData = { h: St, aspect: R }),
      _.position.set(J, ct, _t),
      (_.renderOrder = 5),
      i.add(_),
      e.labels.push(_),
      _
    );
  };
  (e.rebuildLabels = () => {
    for (let _t of e.labels) i.remove(_t), _t.material.map.dispose(), _t.material.dispose();
    e.labels.length = 0;
    let q = (_t, it, N) => Qe(_t + Math.sign(_t) * N, it + Math.sign(it) * N),
      J = q(Yt.lx / 2, Yt.lz / 2, 1.2);
    Q("الحجر الأسود", J[0], 3.4, J[1], 0.95),
      (J = Qe(Yt.lx / 2 + 0.8, Yt.lz / 2 - 2.95)),
      Q("باب الكعبة", J[0], 7.4, J[1], 0.85),
      (J = q(Yt.lx / 2, -Yt.lz / 2, 1.1)),
      Q("الركن العراقي", J[0], 3, J[1]),
      (J = q(-Yt.lx / 2, -Yt.lz / 2, 1.1)),
      Q("الركن الشامي", J[0], 3, J[1]),
      (J = q(-Yt.lx / 2, Yt.lz / 2, 1.1)),
      Q("الركن اليماني", J[0], 3, J[1], 0.9),
      (J = Qe(0, -Yt.lz / 2 - 5.2)),
      Q("حِجر إسماعيل", J[0], 2.7, J[1], 0.9),
      Q("مقام إبراهيم", Sn[0], 4, Sn[1], 0.85);
    let ct = e.greenLightPos;
    Q(
      "الضوء الأخضر",
      ct.x * 0.97,
      6,
      ct.z * 0.97,
      0.95,
      "محاذاة الحجر الأسود: بداية الطواف",
    ),
      Q("الصفا", dt.xc, 5.2, dt.walkS - 0.5, 1.1),
      Q("المروة", dt.xc, 5.2, dt.walkM + 0.5, 1.1),
      Q(
        "العلم الأخضر",
        dt.xc,
        8.6,
        dt.gA,
        0.85,
        "بداية الإسراع للرجال",
      ),
      Q(
        "العلم الأخضر",
        dt.xc,
        8.6,
        dt.gB,
        0.85,
        "نهاية الإسراع",
      ),
      Q("المسعى", 57, 15, 12.5, 1.6);
    for (let _t of e.labels) _t.visible = e.showLabels && !e.suppressLabels;
  }),
    e.rebuildLabels(),
    (e.setLabels = (q) => {
      e.showLabels = q;
      for (let J of e.labels) J.visible = q && !e.suppressLabels;
    }),
    (e.setLabelsSuppressed = (q) => {
      (e.suppressLabels = q), e.setLabels(e.showLabels);
    });
  let G = new nn(),
    j = new Pt(
      new ws(0.85, 1.12, 48),
      new Le({ color: "#ffd36b", transparent: !0, opacity: 0.9, depthWrite: !1 }),
    );
  (j.rotation.x = -Math.PI / 2), (j.position.y = 0.04);
  let tt = new Pt(
    new Re(0.9, 0.9, 16, 32, 1, !0),
    new Le({ color: "#ffcf5a", transparent: !0, opacity: 0.13, blending: Is, depthWrite: !1, side: qe }),
  );
  (tt.position.y = 8),
    G.add(j, tt),
    (G.visible = !1),
    i.add(G),
    (e.setTarget = (q) => {
      if (!q) {
        G.visible = !1;
        return;
      }
      (G.visible = !0), G.position.set(q[0], 0, q[1]);
    }),
    (e.setStartAid = (q) => {
      H.visible = q;
    });
  // الحشود في 03-crowds.js: هيئات تمشي، وبطاقات للبعيدين، وبقع ظل
  let crowds = createCrowds(i);
  e.crowds = crowds;
  // مستويات الجودة (05-quality.js) ترسم جزءًا من الحشود فقط
  e.setCrowdFraction = (f) => crowds.setFraction(f);
  e.setCrowd = (q) => {
    (e.showCrowd = q), crowds.setVisible(q);
  };
  let ht = 0;
  return (
    (e.update = (q, J) => {
      if (((ht += q), e.showLabels && J))
        for (let it of e.labels) {
          let N = Math.hypot(it.position.x - J.x, it.position.y - 1.6, it.position.z - J.z),
            St = Math.max(0.5, Math.min(3.2, N / 13)),
            { h: Tt, aspect: R } = it.userData;
          it.scale.set(Tt * R * St, Tt * St, 1);
        }
      if (G.visible) {
        let it = 1 + 0.12 * Math.sin(ht * 3.2);
        j.scale.set(it, it, 1), (tt.material.opacity = 0.1 + 0.05 * Math.sin(ht * 3.2));
      }
      crowds.update(q, J);
    }),
    (e.corners = Ln),
    e
  );
}
