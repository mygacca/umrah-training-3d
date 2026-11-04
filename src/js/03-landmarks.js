// تفاصيل المعالم (الطبقة 4 من docs/realism-plan.md). دوال فقط، يستدعيها 11-main.js بعد بناء المشهد.
// كل شيء هندسة بالكود بلا ملفات نماذج. المتكرر InstancedMesh، والثابت مدموج بـ mergeGeometries (Bs)،
// فتزيد أوامر الرسم قليلًا. وما يُستبدل من المشهد القديم يُخفى ولا يُحذف (الاختبار يقارن الأرقام).

// قوس مدبّب عثماني لرواق واحد: جدار بعرض الرواق W وارتفاع H، فيه فتحة بعرض w تنحني من ارتفاع spring
function archBayGeometry(W, H, depth, { open = 0.7, spring = 5 } = {}) {
  const w = W * open;
  const rho = 0.6 * w; // نصف قطر كل قوس من القوسين (قوس بمركزين)
  const off = rho - w / 2; // بُعد مركز كل قوس عن المنتصف
  const apex = Math.acos(-off / rho); // زاوية الرأس على القوس الأيسر
  const s = new Es();
  s.moveTo(-W / 2, 0);
  s.lineTo(-w / 2, 0);
  s.lineTo(-w / 2, spring);
  const N = 7;
  for (let i = 1; i <= N; i++) {
    const a = Math.PI + ((apex - Math.PI) * i) / N; // القوس الأيسر: من نقطة الانطلاق إلى الرأس
    s.lineTo(off + rho * Math.cos(a), spring + rho * Math.sin(a));
  }
  for (let i = 1; i <= N; i++) {
    const a = Math.PI - apex + ((0 - (Math.PI - apex)) * i) / N; // القوس الأيمن: من الرأس إلى الانطلاق
    s.lineTo(-off + rho * Math.cos(a), spring + rho * Math.sin(a));
  }
  s.lineTo(w / 2, 0);
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, H);
  s.lineTo(-W / 2, H);
  s.closePath();
  const g = new Sr(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

// عمود بقاعدة وتاج، بدل الأسطوانة الملساء
function columnGeometry(height, rShaft, segs = 10) {
  const base = new Re(rShaft * 1.5, rShaft * 1.6, 0.32, segs);
  base.translate(0, 0.16, 0);
  const shaftH = height - 0.32 - 0.45;
  const shaft = new Re(rShaft * 0.85, rShaft, shaftH, segs, 1, true);
  shaft.translate(0, 0.32 + shaftH / 2, 0);
  const cap = new Re(rShaft * 1.5, rShaft * 0.85, 0.45, segs);
  cap.translate(0, height - 0.225, 0);
  const abacus = new Me(rShaft * 3.1, 0.14, rShaft * 3.1);
  abacus.translate(0, height + 0.07, 0);
  const parts = [base, shaft, cap, abacus];
  // mergeGeometries يشترط الصفات نفسها في كل جزء
  for (const g of parts) g.deleteAttribute("uv");
  return Bs(parts);
}

function addLandmarkDetail(scene, world) {
  const M = world.mats;
  const added = []; // ما أُضيف، للاختبار
  const add = (obj, parent = scene) => (parent.add(obj), added.push(obj), obj);
  const glow = (world.glowMats = world.glowMats || []);

  // ——— الكعبة ———
  // الشاذروان: قاعدة رخامية مائلة حول الكعبة بدل الصندوق. أسطوانة بأربعة أضلاع مُدارة 45° = مربع مائل الجوانب
  {
    const g = new Re(Math.SQRT2 * 0.936, Math.SQRT2, 0.34, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(Yt.lx / 2 + 0.45, 1, Yt.lz / 2 + 0.45);
    const m = add(new Mesh(g, Se("#f1f0ea", { roughness: 0.38, flatShading: true })), world.kaabaGroup);
    m.position.y = 0.17;
    world.shadharwan.visible = false;
  }
  // الباب: لوح ذهبي بارز بإطار، والنقش (نسيج الباب القديم) على وجهه
  {
    const d = world.door;
    const front = Yt.lx / 2;
    const slab = new Me(0.12, 4.7, 2.7);
    slab.translate(front + 0.06, d.position.y, d.position.z);
    const frame = new Me(0.07, 5.05, 3.05);
    frame.translate(front + 0.035, d.position.y, d.position.z);
    const sill = new Me(0.3, 0.12, 3.3);
    sill.translate(front + 0.15, d.position.y - 2.47, d.position.z);
    for (const g of [slab, frame, sill]) g.deleteAttribute("uv");
    add(new Mesh(Bs([slab, frame, sill]), M.gold), world.kaabaGroup);
    d.position.x = front + 0.125; // النقش على وجه اللوح
  }

  // ——— قناديل على جدار الحِجر: نحاس، وزجاج يضيء ليلًا ———
  {
    const brass = [];
    const glass = [];
    const n = 9;
    for (let i = 1; i <= n; i++) {
      const t = je.t0 + ((Math.PI - 2 * je.t0) * i) / (n + 1);
      const [x, z] = Qe(Math.cos(t) * je.a, -Yt.lz / 2 - Math.sin(t) * je.b);
      const post = new Re(0.035, 0.045, 0.55, 6);
      post.translate(x, je.h + 0.275, z);
      const cap = new Bi(0.15, 0.18, 6);
      cap.translate(x, je.h + 0.55 + 0.28 + 0.09, z);
      const base = new Re(0.12, 0.1, 0.05, 6);
      base.translate(x, je.h + 0.575, z);
      brass.push(post, cap, base);
      const lamp = new Re(0.1, 0.1, 0.28, 6);
      lamp.translate(x, je.h + 0.55 + 0.14 + 0.025, z);
      glass.push(lamp);
    }
    for (const g of [...brass, ...glass]) g.deleteAttribute("uv");
    add(new Mesh(Bs(brass), M.gold));
    const lanternMat = Se("#fff4d8", { roughness: 0.2 });
    add(new Mesh(Bs(glass), lanternMat));
    glow.push([lanternMat, "#ffd890", 1.6]);
    world.lanternMat = lanternMat;
  }

  // ——— الأروقة: أقواس ثلاثية الأبعاد بدل نسيج الأقواس المسطح ———
  {
    const archMat = Se("#eee6d4", { roughness: 0.78 });
    glow.push([archMat, "#ffcf8c", 0.22]);
    world.archMat = archMat;
    const m4 = new Matrix4();
    for (const [r, depth] of [
      [pe.arcIn, 0.8],
      [pe.arcOut, 0.8],
    ]) {
      const W = (2 * Math.PI * r) / 60;
      const arches = add(new InstancedMesh(archBayGeometry(W + 0.02, 9, depth), archMat, 60));
      for (let i = 0; i < 60; i++) {
        const a = ((i + 0.5) / 60) * le; // بين عمودين (الأعمدة عند i/60)
        m4.makeRotationY(a).setPosition(Math.sin(a) * r, 0, Math.cos(a) * r);
        arches.setMatrixAt(i, m4);
      }
    }
    for (const w of world.arcadeWalls) w.visible = false;
    glow.push([M.column, "#ffcf8c", 0.18]); // الأعمدة تضيء ليلًا مع الأقواس
    // تيجان وقواعد للأعمدة: الهندسة تُستبدل، والمصفوفات كما هي
    world.columns.geometry.dispose();
    world.columns.geometry = columnGeometry(6.3, 0.4);
    world.columns.computeBoundingSphere();
    // طبول تحت القباب، والأهلّة ترتفع بقدرها
    const drumH = 0.7;
    const drum = new Re(2.12, 2.12, drumH, 16, 1, true);
    drum.translate(0, drumH / 2, 0);
    const dome = new SphereGeometry(2.05, 16, 8, 0, le, 0, Math.PI / 2);
    dome.translate(0, drumH, 0);
    for (const g of [drum, dome]) g.deleteAttribute("uv");
    world.domes.geometry.dispose();
    world.domes.geometry = Bs([drum, dome]);
    world.domes.computeBoundingSphere();
    for (let i = 0; i < world.finials.count; i++) {
      world.finials.getMatrixAt(i, m4);
      m4.elements[13] += drumH;
      world.finials.setMatrixAt(i, m4);
    }
    world.finials.instanceMatrix.needsUpdate = true;
  }

  // ——— السور: أفاريز تُظهر طوابق التوسعة، وحافة في الأعلى ———
  {
    const q = (pe.gap[1] * Math.PI) / 180;
    const J = le - ((pe.gap[1] - pe.gap[0]) * Math.PI) / 180;
    const R = pe.outer;
    const parts = [];
    for (const [y, h, out] of [
      [11.3, 0.45, 0.32],
      [22.6, 0.45, 0.32],
      [33.6, 0.9, 0.22],
    ]) {
      const band = new Re(R - out, R - out, h, 160, 1, true, q, J);
      band.translate(0, y, 0);
      parts.push(band);
      for (const yy of [y - h / 2, y + h / 2]) {
        const ring = new RingGeometry(R - out, R, 160, 1, q - Math.PI / 2, J);
        ring.rotateX(-Math.PI / 2);
        ring.translate(0, yy, 0);
        parts.push(ring);
      }
    }
    for (const g of parts) g.deleteAttribute("uv");
    add(new Mesh(Bs(parts), Se("#e9e1cf", { side: qe, roughness: 0.8 })));
  }

  // ——— المآذن: درابزين حول الشرفتين ———
  {
    const parts = [];
    for (const deg of [28, 62, 100, 140, 175, 210, 245, 285, 318]) {
      const a = (deg * Math.PI) / 180;
      const x = Math.cos(a) * 62;
      const z = -Math.sin(a) * 62;
      for (const [y, r] of [
        [55.15, 2.85],
        [78.0, 2.45],
      ]) {
        const band = new Re(r, r, 0.6, 20, 1, true);
        band.translate(x, y + 0.3, z);
        parts.push(band);
      }
    }
    for (const g of parts) g.deleteAttribute("uv");
    const railMat = Se("#f1ebde", { side: qe, roughness: 0.75 });
    glow.push([railMat, "#ffd8a0", 0.32]);
    add(new Mesh(Bs(parts), railMat));
  }

  // ——— المسعى: صف أعمدة ثانٍ على الجدار الشرقي، وعوارض في السقف ———
  {
    const old = world.masaColumns;
    const zs = [];
    const m4 = new Matrix4();
    for (let i = 0; i < old.count; i++) old.getMatrixAt(i, m4), zs.push(m4.elements[14]);
    const cols = add(new InstancedMesh(columnGeometry(7.4, 0.48), M.column, zs.length * 2));
    zs.forEach((z, i) => {
      cols.setMatrixAt(i, m4.makeTranslation(dt.x0, 0, z));
      cols.setMatrixAt(zs.length + i, m4.makeTranslation(dt.x1 - 0.55, 0, z));
    });
    old.visible = false;
    world.masaColumns = cols;
    const beams = [];
    for (let z = dt.zS + 1; z > dt.zM - 2; z -= 6) {
      const b = new Me(dt.x1 - dt.x0, 0.45, 0.5);
      b.translate(dt.xc, 10.75, z + 3);
      b.deleteAttribute("uv");
      beams.push(b);
    }
    add(new Mesh(Bs(beams), Se("#e7dfcd", { roughness: 0.85 })));
  }

  world.landmarkDetail = added;
  return added;
}
