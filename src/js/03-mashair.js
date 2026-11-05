// مشاعر الحج (09-hajj.js): منى بخيامها والجمرات الثلاث، وعرفة بحدودها وجبل الرحمة، ومزدلفة والمشعر الحرام. دوال فقط.
// مبسّطة وكلها حول الأصل نفسه: حين يدخل اللاعب موقعًا يُخفى المسجد الحرام كله (world.haramRoot) ويظهر الموقع،
// ويأخذ SITE في 02-layout.js المشي والتصادم. والمسافات مصغّرة كالمسجد:
//   بين الجمرات 25 و30 م (في الواقع نحو 150 و250 م)، وحدود عرفة دائرة نصف قطرها 55 م.
var MINA_JAMARAT = [
  { k: "sughra", name: "الجمرة الصغرى", x: 0, z: -20 },
  { k: "wusta", name: "الجمرة الوسطى", x: 0, z: -45 },
  { k: "aqaba", name: "جمرة العقبة", x: 0, z: -75 },
];
var MINA_TENT_X = [-55, -45, -35, -25, 25, 35, 45, 55];
var JAMRAH_BASIN = 4.6; // نصف قطر الحوض
var THROW_RANGE = 8; // يُرمى من هذا البعد عن مركز الحوض أو أقرب
var ARAFAT_R = 55;
var ARAFAT_HILL = { x: 30, z: -32, r: 19 };
var MUZ_PEBBLES = { x: 24, z: 24, r: 9 };
var MUZ_MASHAR = { x: 0, z: -58, w: 40, d: 22, zone: 26 }; // المسجد، ومنطقة الوقوف أمامه

function createMashair({ scene, world }) {
  const inRect = (x, z, r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3];
  const outOfCircle = (x, z, cx, cz, R) => {
    const dx = x - cx;
    const dz = z - cz;
    const d = Math.hypot(dx, dz);
    return d >= R ? [x, z] : d < 1e-4 ? [cx + R, cz] : [cx + (dx / d) * R, cz + (dz / d) * R];
  };
  const outOfBox = (x, z, cx, cz, hx, hz) => {
    const ox = hx - Math.abs(x - cx);
    const oz = hz - Math.abs(z - cz);
    if (ox <= 0 || oz <= 0) return [x, z];
    return ox < oz ? [cx + Math.sign(x - cx || 1) * hx, z] : [x, cz + Math.sign(z - cz || 1) * hz];
  };
  const rnd = Xr(311);
  const mat = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.9, ...o });

  // ——— ما تشترك فيه المواقع ———
  function ground(color, radius = 420) {
    const g = new CircleGeometry(radius, 48);
    g.rotateX(-Math.PI / 2);
    return new Mesh(g, mat(color, { roughness: 0.97 }));
  }
  // جبال مكة حول الوادي: مخاريط منخفضة المضلعات
  function mountains(seed) {
    const r = Xr(seed);
    const n = 34;
    const m = new InstancedMesh(new ConeGeometry(1, 1, 6), mat("#8b6f55", { flatShading: true }), n);
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * le + r() * 0.15;
      const d = 240 + r() * 140;
      const h = 35 + r() * 80;
      o.position.set(Math.cos(a) * d, h / 2 - 2, Math.sin(a) * d);
      o.scale.set(45 + r() * 55, h, 45 + r() * 55);
      o.rotation.y = r() * le;
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    return m;
  }
  // حجاج واقفون: هيئات الحشود (03-crowds.js) بلا مشي. الرجال بالإحرام مغطّو الكتفين: لا اضطباع خارج الطواف
  const geos = [manGeometry(false), womanGeometry()];
  const crowdMat = crowdMaterial();
  const WOMEN = ["#1d1d22", "#f1eee6", "#3b3a40", "#6b5a4a", "#e8e1d2", "#24324a"];
  function pilgrims(n, place, { raise = 0 } = {}) {
    const g = new Group();
    const o = new Object3D();
    const col = new Color();
    const counts = [Math.round(n * 0.6), n - Math.round(n * 0.6)];
    geos.forEach((geo, kind) => {
      const k = counts[kind];
      const m = new InstancedMesh(geo.clone(), crowdMat, k);
      const anim = new InstancedBufferAttribute(new Float32Array(k * 4), 4);
      for (let i = 0; i < k; i++) {
        const [x, z, yaw] = place(rnd);
        o.position.set(x, 0, z);
        o.rotation.y = yaw;
        o.scale.setScalar(0.92 + rnd() * 0.16);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
        m.setColorAt(i, kind ? col.set(WOMEN[Math.floor(rnd() * WOMEN.length)]) : col.setRGB(0.95, 0.94, 0.9).multiplyScalar(0.9 + rnd() * 0.1));
        anim.setXYZW(i, rnd() * le, 0, 1, rnd() < raise ? 0.85 : 0);
      }
      m.geometry.setAttribute("iAnim", anim);
      g.add(m);
    });
    return g;
  }
  let labelsBuilt = false;
  const labelSpecs = [];
  // اللافتات تُبنى عند أول دخول إلى المواقع، بعد تحميل الخطوط
  function label(group, text, x, y, z, h = 1.4, sub = "") {
    labelSpecs.push({ group, text, x, y, z, h, sub, sprite: null });
  }
  function buildLabels() {
    if (labelsBuilt) return;
    labelsBuilt = true;
    for (const L of labelSpecs) {
      const { texture, aspect } = _d(L.text, { sub: L.sub });
      const s = new Sprite(new SpriteMaterial({ map: texture, depthWrite: false, transparent: true, fog: false }));
      s.scale.set(L.h * aspect, L.h, 1);
      s.position.set(L.x, L.y, L.z);
      s.renderOrder = 5;
      L.group.add(s);
      L.sprite = s;
    }
  }
  function signPost(group, x, z, color = "#2f7d5a") {
    const p = new Mesh(new BoxGeometry(0.18, 3.2, 0.18), mat("#d8d2c4"));
    p.position.set(x, 1.6, z);
    const b = new Mesh(new BoxGeometry(2.6, 0.9, 0.12), mat(color, { emissive: color, emissiveIntensity: 0.25 }));
    b.position.set(x, 3.1, z);
    b.lookAt(0, 3.1, 0);
    group.add(p, b);
  }

  // ——— منى: الخيام شمال الطريق، والجمرات جنوبه ———
  const mina = (() => {
    const g = new Group();
    g.add(ground("#cdb995"), mountains(41));
    const road = new Mesh(new PlaneGeometry(26, 222), mat("#77706a", { roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 21);
    const plaza = new Mesh(new PlaneGeometry(38, 84), mat("#d9d3c6", { roughness: 0.6 }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.03, -48);
    g.add(road, plaza);
    // الخيام: صفوف بيضاء بممرات بينها
    const tentGeo = Bs([new BoxGeometry(6, 2.6, 6).translate(0, 1.3, 0), new ConeGeometry(4.3, 2, 4).rotateY(Math.PI / 4).translate(0, 3.6, 0)]);
    const tents = [];
    for (const x of MINA_TENT_X) for (let z = 26; z <= 116; z += 10) tents.push([x, z]);
    const tm = new InstancedMesh(tentGeo, mat("#f4f2ec", { roughness: 0.75 }), tents.length);
    const o = new Object3D();
    tents.forEach(([x, z], i) => (o.position.set(x, 0, z), o.updateMatrix(), tm.setMatrixAt(i, o.matrix)));
    g.add(tm);
    // الجمرات: حوض بجدار منخفض، وفي وسطه جدار الشاخص
    const basins = Bs(
      MINA_JAMARAT.map((j) => new CylinderGeometry(JAMRAH_BASIN, JAMRAH_BASIN, 1.1, 32, 1, true).translate(j.x, 0.55, j.z)),
    );
    const rims = Bs(MINA_JAMARAT.map((j) => new TorusGeometry(JAMRAH_BASIN, 0.14, 6, 40).rotateX(Math.PI / 2).translate(j.x, 1.1, j.z)));
    const pillars = Bs(MINA_JAMARAT.map((j) => new BoxGeometry(5.4, 6, 0.9).translate(j.x, 3, j.z)));
    const floors = Bs(MINA_JAMARAT.map((j) => new CircleGeometry(JAMRAH_BASIN, 32).rotateX(-Math.PI / 2).translate(j.x, 0.05, j.z)));
    g.add(
      new Mesh(basins, mat("#b9b2a5", { side: DoubleSide })),
      new Mesh(rims, mat("#8c857a")),
      new Mesh(pillars, mat("#a59d90")),
      new Mesh(floors, mat("#8f8a80")),
    );
    for (const j of MINA_JAMARAT) label(g, j.name, j.x, 8, j.z, 1.6);
    label(g, "خيام منى", -30, 8, 40, 1.8);
    // حجاج في الطريق وبين الخيام وحول الجمرات
    g.add(
      pilgrims(150, (r) => {
        const near = r() < 0.55;
        if (near) {
          const j = MINA_JAMARAT[Math.floor(r() * 3)];
          const a = r() * le;
          const d = JAMRAH_BASIN + 2.5 + r() * 9;
          return [j.x + Math.cos(a) * d, j.z + Math.sin(a) * d, Math.atan2(Math.cos(a), Math.sin(a))];
        }
        return [(r() - 0.5) * 22, 10 + r() * 110, r() < 0.5 ? 0 : Math.PI];
      }),
    );
    const walk = (x, z) => inRect(x, z, [-12.5, 12.5, -88, 130]) || inRect(x, z, [-18.5, 18.5, -89, -7]) || inRect(x, z, [-62, 62, 20, 122]);
    const collide = (x, z) => {
      for (const j of MINA_JAMARAT) [x, z] = outOfCircle(x, z, j.x, j.z, JAMRAH_BASIN + 0.45);
      // الخيام على شبكة 10 م: يُدفع اللاعب إلى الممر بينها
      if (z > 20 && Math.abs(x) > 12) {
        const gx = Math.round((x - 5) / 10) * 10 + 5;
        const gz = Math.round((z - 26) / 10) * 10 + 26;
        if (MINA_TENT_X.includes(gx) && gz >= 26 && gz <= 116) [x, z] = outOfBox(x, z, gx, gz, 3.4, 3.4);
      }
      return [x, z];
    };
    return {
      key: "mina",
      name: "منى",
      group: g,
      walk,
      collide,
      time: "duha",
      map: {
        center: [0, 20],
        radius: 110,
        marks: [
          // ثلاث نقاط متقاربة على الخريطة: اسم واحد لها، عند العقبة
          ...MINA_JAMARAT.map((j) => ({ x: j.x, z: j.z, r: JAMRAH_BASIN, label: j.k === "wusta" ? "الجمرات" : "", color: "#d9d3c6" })),
          { x: -30, z: 70, r: 26, label: "الخيام", color: "rgba(246,241,228,0.35)" },
        ],
      },
      // الخيام، ومدخل الجمرات أيام التشريق، ويوم النحر عند جمرة العقبة
      spawns: { tents: [0, 100, 0, -1], jamarat: [0, 2, 0, -1], nahr: [6, -56, -0.3, -1] },
    };
  })();

  // ——— عرفة: سهل بحدود مُعلَّمة، وجبل الرحمة ———
  const arafat = (() => {
    const g = new Group();
    g.add(ground("#d6c098"), mountains(53));
    // حدود عرفة: حلقة على الأرض ولوحات
    const ring = new Mesh(new RingGeometry(ARAFAT_R - 0.6, ARAFAT_R + 0.6, 128), new MeshBasicMaterial({ color: "#e0b84a", transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    g.add(ring);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * le + 0.3;
      signPost(g, Math.cos(a) * (ARAFAT_R + 1.5), Math.sin(a) * (ARAFAT_R + 1.5));
      if (i % 2 === 0) label(g, "حدود عرفة", Math.cos(a) * (ARAFAT_R + 1.5), 5, Math.sin(a) * (ARAFAT_R + 1.5), 1.3);
    }
    // جبل الرحمة وشاخصه الأبيض
    const hill = new Mesh(new ConeGeometry(ARAFAT_HILL.r, 17, 10, 3), mat("#9a7c5e", { flatShading: true }));
    hill.position.set(ARAFAT_HILL.x, 8.5, ARAFAT_HILL.z);
    const pillar = new Mesh(new CylinderGeometry(0.55, 0.75, 7, 8), mat("#f2efe8"));
    pillar.position.set(ARAFAT_HILL.x, 20.5, ARAFAT_HILL.z);
    g.add(hill, pillar);
    label(g, "جبل الرحمة", ARAFAT_HILL.x, 27, ARAFAT_HILL.z, 2);
    // أشجار النيم وظلال
    const r = Xr(77);
    const n = 46;
    const trunks = new InstancedMesh(new CylinderGeometry(0.18, 0.24, 2.6, 6).translate(0, 1.3, 0), mat("#6d5640"), n);
    const crowns = new InstancedMesh(new IcosahedronGeometry(2.2, 0).translate(0, 3.6, 0), mat("#5f7f45", { flatShading: true }), n);
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      const a = r() * le;
      const d = 8 + r() * (ARAFAT_R - 12);
      o.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      if (Math.hypot(o.position.x - ARAFAT_HILL.x, o.position.z - ARAFAT_HILL.z) < ARAFAT_HILL.r + 3) o.position.x -= 30;
      o.scale.setScalar(0.8 + r() * 0.5);
      o.updateMatrix();
      trunks.setMatrixAt(i, o.matrix);
      crowns.setMatrixAt(i, o.matrix);
    }
    g.add(trunks, crowns);
    // الحجاج داخل الحدود، كثير منهم يدعو رافعًا يده
    g.add(
      pilgrims(
        170,
        (rr) => {
          let x, z;
          do {
            const a = rr() * le;
            const d = 6 + rr() * (ARAFAT_R - 9);
            (x = Math.cos(a) * d), (z = Math.sin(a) * d);
          } while (Math.hypot(x - ARAFAT_HILL.x, z - ARAFAT_HILL.z) < ARAFAT_HILL.r + 1);
          return [x, z, Math.PI * 0.75 + (rr() - 0.5) * 0.6]; // نحو القبلة تقريبًا
        },
        { raise: 0.35 },
      ),
    );
    return {
      key: "arafat",
      name: "عرفة",
      group: g,
      walk: (x, z) => Math.hypot(x, z) < 95,
      collide: (x, z) => outOfCircle(x, z, ARAFAT_HILL.x, ARAFAT_HILL.z, ARAFAT_HILL.r * 0.92),
      time: "asr",
      inside: (x, z) => Math.hypot(x, z) < ARAFAT_R - 0.5,
      map: {
        center: [0, 8],
        radius: 80,
        ring: ARAFAT_R,
        marks: [{ x: ARAFAT_HILL.x, z: ARAFAT_HILL.z, r: ARAFAT_HILL.r, label: "جبل الرحمة", color: "rgba(154,124,94,0.8)" }],
      },
      spawns: { road: [0, 78, 0, -1] },
    };
  })();

  // ——— مزدلفة: ليلًا، والمشعر الحرام في جهتها ———
  const muzdalifah = (() => {
    const g = new Group();
    g.add(ground("#a39684"), mountains(67));
    // المشعر الحرام: مسجد بمئذنتين مضيئتين
    const M = MUZ_MASHAR;
    const glow = mat("#efe6d2", { emissive: "#ffd9a0", emissiveIntensity: 0.18 });
    const body = new Mesh(new BoxGeometry(M.w, 9, M.d), glow);
    body.position.set(M.x, 4.5, M.z);
    const mins = Bs(
      [-1, 1].map((s) => new CylinderGeometry(0.9, 1.1, 26, 8).translate(M.x + s * (M.w / 2 - 1), 13, M.z + M.d / 2 - 1)),
    );
    g.add(body, new Mesh(mins, glow));
    label(g, "المشعر الحرام", M.x, 14, M.z + M.d / 2 + 1, 1.8);
    // مكان الحصى: حصى صغير على الأرض
    const pr = Xr(91);
    const pn = 260;
    const peb = new InstancedMesh(new IcosahedronGeometry(0.07, 0), mat("#7a7064"), pn);
    const o = new Object3D();
    for (let i = 0; i < pn; i++) {
      const a = pr() * le;
      const d = Math.sqrt(pr()) * MUZ_PEBBLES.r;
      o.position.set(MUZ_PEBBLES.x + Math.cos(a) * d, 0.04, MUZ_PEBBLES.z + Math.sin(a) * d);
      o.scale.setScalar(0.7 + pr() * 1.2);
      o.updateMatrix();
      peb.setMatrixAt(i, o.matrix);
    }
    g.add(peb);
    label(g, "التقاط الحصى", MUZ_PEBBLES.x, 3.2, MUZ_PEBBLES.z, 1.3);
    // أعمدة إنارة: رؤوسها تضيء ليلًا
    const ln = 24;
    const poles = new InstancedMesh(new CylinderGeometry(0.12, 0.16, 8, 6).translate(0, 4, 0), mat("#5c5a56"), ln);
    const heads = new InstancedMesh(new SphereGeometry(0.45, 8, 6).translate(0, 8.2, 0), new MeshBasicMaterial({ color: "#ffe3a8" }), ln);
    for (let i = 0; i < ln; i++) {
      o.position.set(((i % 6) - 2.5) * 26, 0, (Math.floor(i / 6) - 1.5) * 40);
      o.scale.setScalar(1);
      o.updateMatrix();
      poles.setMatrixAt(i, o.matrix);
      heads.setMatrixAt(i, o.matrix);
    }
    g.add(poles, heads);
    g.add(pilgrims(110, (r) => [(r() - 0.5) * 140, (r() - 0.5) * 130 + 10, r() * le]));
    return {
      key: "muzdalifah",
      name: "مزدلفة",
      group: g,
      walk: (x, z) => inRect(x, z, [-80, 80, -90, 90]),
      collide: (x, z) => outOfBox(x, z, M.x, M.z, M.w / 2 + 0.4, M.d / 2 + 0.4),
      time: "night",
      atPebbles: (x, z) => Math.hypot(x - MUZ_PEBBLES.x, z - MUZ_PEBBLES.z) < MUZ_PEBBLES.r,
      atMashar: (x, z) => Math.hypot(x - M.x, z - (M.z + M.d / 2)) < M.zone,
      map: {
        center: [0, 5],
        radius: 90,
        marks: [
          { x: M.x, z: M.z, r: 14, label: "المشعر", color: "rgba(239,230,210,0.85)" },
          { x: MUZ_PEBBLES.x, z: MUZ_PEBBLES.z, r: MUZ_PEBBLES.r, label: "الحصى", color: "rgba(122,112,100,0.9)" },
        ],
      },
      spawns: { road: [0, 72, 0, -1] },
    };
  })();

  const sites = { mina, arafat, muzdalifah };
  for (const s of Object.values(sites)) (s.group.visible = false), scene.add(s.group);

  // علامة الهدف في الموقع: حلقة ذهبية تنبض
  const target = new Mesh(new RingGeometry(1.1, 1.5, 40), new MeshBasicMaterial({ color: "#f0c96a", transparent: true, opacity: 0.85, depthWrite: false }));
  target.rotation.x = -Math.PI / 2;
  target.position.y = 0.08;
  target.visible = false;
  scene.add(target);
  // حصاة تُرمى نحو الحوض
  const pebble = new Mesh(new SphereGeometry(0.09, 8, 6), mat("#6e665c"));
  pebble.visible = false;
  scene.add(pebble);
  const flight = { t: 1, from: new Vector3(), to: new Vector3() };

  const ms = { sites, site: null, onChange: null };
  // إلى موقع (اسمه)، أو null للعودة إلى المسجد الحرام
  ms.enter = (key) => {
    const s = key ? sites[key] : null;
    if (s) buildLabels();
    for (const x of Object.values(sites)) x.group.visible = x === s;
    world.haramRoot.visible = !s;
    world.crowdsPaused = !!s;
    world.setLabelsSuppressed(!!s);
    world.setTarget(null);
    SITE = s;
    ms.site = s;
    target.visible = false;
    pebble.visible = false;
    if (ms.onChange) ms.onChange(s);
  };
  ms.setTarget = (p) => {
    target.visible = !!p && !!ms.site;
    if (p) target.position.set(p[0], 0.08, p[1]);
  };
  ms.throwPebble = (from, j) => {
    flight.from.copy(from);
    flight.to.set(j.x + (rnd() - 0.5) * 1.6, 0.4, j.z + (rnd() - 0.5) * 1.6);
    flight.t = 0;
    pebble.visible = true;
  };
  ms.nearestJamrah = (x, z) => {
    let best = null;
    for (const j of MINA_JAMARAT) {
      const d = Math.hypot(x - j.x, z - j.z);
      if (!best || d < best.d) best = { j, d };
    }
    return best;
  };
  ms.update = (dt, time) => {
    if (target.visible) {
      const k = 1 + 0.12 * Math.sin(time * 3.2);
      target.scale.set(k, k, 1);
    }
    if (flight.t < 1) {
      flight.t = Math.min(1, flight.t + dt / 0.55);
      const t = flight.t;
      pebble.position.lerpVectors(flight.from, flight.to, t);
      pebble.position.y += Math.sin(t * Math.PI) * 2.2;
      if (t >= 1) pebble.visible = false;
    }
    for (const L of labelSpecs) if (L.sprite) L.sprite.visible = world.showLabels;
  };
  return ms;
}
