var Td = 1.62;
function wd({ scene: i, camera: t, renderer: e, canvas: n, joyEl: s, knobEl: r, onAction: a }) {
  let o = new nn();
  (o.name = "rig"), i.add(o), o.add(t), t.position.set(0, Td, 0);
  let l = {
      rig: o,
      enabled: !1,
      yaw: 0,
      pitch: 0,
      jogToggle: !1,
      jogKey: !1,
      jogXR: !1,
      moving: !1,
      speed: 0,
      xr: !1,
    },
    c = new Set(),
    h = { x: 0, y: 0, id: null },
    d = new U(),
    u = new U(),
    f = new U(),
    g = new U(),
    v = null;
  addEventListener("keydown", (M) => {
    (M.target &&
      (M.target.tagName === "INPUT" || M.target.tagName === "BUTTON") &&
      (M.code === "Space" || M.code === "Enter")) ||
      (c.add(M.code),
      l.enabled &&
        ((M.code === "Space" || M.code === "Enter" || M.code === "KeyE") && (M.preventDefault(), a()),
        (M.code === "ShiftLeft" || M.code === "ShiftRight") && (l.jogKey = !0)));
  }),
    addEventListener("keyup", (M) => {
      c.delete(M.code), (M.code === "ShiftLeft" || M.code === "ShiftRight") && (l.jogKey = !1);
    }),
    addEventListener("blur", () => {
      c.clear(), (l.jogKey = !1);
    });
  let m = new Map();
  n.addEventListener("pointerdown", (M) => {
    !l.enabled ||
      l.xr ||
      (m.set(M.pointerId, { x: M.clientX, y: M.clientY, touch: M.pointerType !== "mouse" }),
      n.setPointerCapture(M.pointerId));
  }),
    n.addEventListener("pointermove", (M) => {
      let P = m.get(M.pointerId);
      if (!P) return;
      let I = P.touch ? 0.0058 : 0.0034;
      (l.yaw -= (M.clientX - P.x) * I),
        (l.pitch -= (M.clientY - P.y) * I),
        (l.pitch = Math.max(-1.25, Math.min(1.1, l.pitch))),
        (P.x = M.clientX),
        (P.y = M.clientY);
    });
  let p = (M) => m.delete(M.pointerId);
  if ((n.addEventListener("pointerup", p), n.addEventListener("pointercancel", p), s)) {
    let P = (L, T) => {
        r.style.transform = `translate(calc(-50% + ${L}px), calc(-50% + ${T}px))`;
      },
      I = (L) => {
        let T = s.getBoundingClientRect(),
          F = L.clientX - (T.left + T.width / 2),
          H = L.clientY - (T.top + T.height / 2),
          V = Math.hypot(F, H);
        V > 46 && ((F = (F / V) * 46), (H = (H / V) * 46)), P(F, H), (h.x = F / 46), (h.y = -H / 46);
      };
    s.addEventListener("pointerdown", (L) => {
      l.enabled && ((h.id = L.pointerId), s.setPointerCapture(L.pointerId), s.classList.add("active"), I(L));
    }),
      s.addEventListener("pointermove", (L) => {
        L.pointerId === h.id && I(L);
      });
    let A = (L) => {
      L.pointerId === h.id && ((h.id = null), (h.x = h.y = 0), P(0, 0), s.classList.remove("active"));
    };
    s.addEventListener("pointerup", A), s.addEventListener("pointercancel", A);
  }
  let b = { ready: !0 },
    C = new Fi(0.025, 0.09, 4, 8);
  C.rotateX(Math.PI / 2);
  let y = new Rn({ color: "#e9e2d0", roughness: 0.5 });
  for (let M = 0; M < 2; M++) {
    let P = e.xr.getController(M);
    P.addEventListener("selectstart", (A) => {
      l.enabled && (A.data && A.data.handedness === "left" ? (l.jogXR = !0) : a());
    }),
      P.addEventListener("selectend", (A) => {
        A.data && A.data.handedness === "left" && (l.jogXR = !1);
      }),
      o.add(P);
    let I = e.xr.getControllerGrip(M);
    I.add(new Pt(C, y)), o.add(I);
  }
  function E(M) {
    return t.getWorldPosition(M), M;
  }
  function w(M) {
    o.updateMatrixWorld(!0),
      E(d),
      (o.rotation.y += M),
      o.updateMatrixWorld(!0),
      E(u),
      (o.position.x += d.x - u.x),
      (o.position.z += d.z - u.z);
  }
  (l.headingPhi = () => (t.getWorldDirection(f), Math.atan2(-f.z, f.x))),
    (l.getPos = () => (E(d), { x: d.x, z: d.z })),
    (l.isJogging = () => l.jogToggle || l.jogKey || l.jogXR),
    (l.teleport = (M, P, I, A) => {
      let L = Math.atan2(-I, -A);
      if (l.xr) {
        o.updateMatrixWorld(!0), t.getWorldDirection(f);
        let T = Math.atan2(-f.x, -f.z);
        w(L - T), E(d), (o.position.x += M - d.x), (o.position.z += P - d.z);
      } else (l.yaw = L), (l.pitch = -0.05), o.position.set(M, 0, P);
      (v = null), o.updateMatrixWorld(!0), E(g);
    }),
    (l.setXR = (M) => {
      (l.xr = M),
        M
          ? (t.position.set(0, 0, 0), t.rotation.set(0, 0, 0), (o.rotation.y = l.yaw))
          : (t.position.set(0, Td, 0), (l.jogXR = !1)),
        (v = null);
    });
  function D() {
    let M = e.xr.getSession(),
      P = { mx: 0, my: 0, turn: 0, a: !1 };
    if (!M) return P;
    for (let I of M.inputSources) {
      let A = I.gamepad;
      if (!A) continue;
      let L = A.axes[2] || 0,
        T = A.axes[3] || 0;
      Math.abs(L) + Math.abs(T) < 0.05 && A.axes.length >= 2 && ((L = A.axes[0] || 0), (T = A.axes[1] || 0)),
        I.handedness === "left"
          ? ((P.mx = L), (P.my = -T), A.buttons[1] && A.buttons[1].pressed && (l.jogXR = !0))
          : ((P.turn = L), A.buttons[4] && A.buttons[4].pressed && (P.a = !0));
    }
    return P;
  }
  let x = !1;
  return (
    (l.update = (M) => {
      o.updateMatrixWorld(!0), E(d);
      let P = d.clone(),
        I = 0,
        A = 0;
      if (l.enabled)
        if (l.xr) {
          let F = D();
          (I = F.my),
            (A = F.mx),
            Math.abs(F.turn) > 0.7 && b.ready
              ? (w(-Math.sign(F.turn) * (Math.PI / 6)), (b.ready = !1))
              : Math.abs(F.turn) < 0.3 && (b.ready = !0),
            F.a && !x && a(),
            (x = F.a);
        } else {
          let F = (V) => (c.has(V) ? 1 : 0);
          (I = F("KeyW") + F("ArrowUp") - F("KeyS") - F("ArrowDown") + h.y),
            (A = F("KeyD") - F("KeyA") + h.x);
          let H = F("ArrowLeft") - F("ArrowRight");
          H && (l.yaw += H * M * 1.8);
        }
      let L = Math.hypot(I, A);
      if (
        (L > 1 && ((I /= L), (A /= L)),
        l.xr || ((o.rotation.y = l.yaw), t.rotation.set(l.pitch, 0, 0)),
        L > 0.08)
      ) {
        let F, H;
        if (l.xr) {
          t.getWorldDirection(f);
          let Gt = Math.hypot(f.x, f.z) || 1;
          (F = f.x / Gt), (H = f.z / Gt);
        } else (F = -Math.sin(l.yaw)), (H = -Math.cos(l.yaw));
        let V = -H,
          Q = F,
          G = l.isJogging(),
          j = l.xr ? (G ? 3 : 1.8) : G ? 3.9 : 2.4,
          tt = (F * I + V * A) * j * M,
          At = (H * I + Q * A) * j * M,
          [Et, jt] = xd(d.x, d.z, d.x + tt, d.z + At);
        (o.position.x += Et - d.x), (o.position.z += jt - d.z), o.updateMatrixWorld(!0), E(d);
      }
      if (!zs(d.x, d.z) && v)
        (o.position.x += v.x - d.x), (o.position.z += v.z - d.z), o.updateMatrixWorld(!0), E(d);
      else {
        let [F, H] = Yc(d.x, d.z);
        (F !== d.x || H !== d.z) &&
          ((o.position.x += F - d.x), (o.position.z += H - d.z), o.updateMatrixWorld(!0), E(d));
      }
      zs(d.x, d.z) && (v = (v || new U()).copy(d));
      let T = Math.hypot(d.x - P.x, d.z - P.z);
      (l.speed = M > 0 ? T / M : 0), (l.moving = l.speed > 0.5);
    }),
    l
  );
}
