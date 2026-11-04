// الأنسجة والمواد (الطبقة 5 من docs/realism-plan.md). دوال فقط، يستدعيها 11-main.js بعد بناء المشهد.
// كل الأنسجة تُرسم على canvas عند التحميل، فلا يزيد الملف. والقاعدة في three.js:
// roughnessMap تقرأ القناة الخضراء، وmetalnessMap الزرقاء، فنسيج واحد (ORM) يخدم الاثنين.

function cpuCanvas(w, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d", { willReadFrequently: true });
  return c;
}

// خشونة الرخام بنفس شبكة بلاط Gc (2×2 بلاطة لكل نسيج 512): البلاط مصقول يلمع، والفواصل خشنة،
// ولكل بلاطة صقل يختلف قليلًا كما في الأرض الحقيقية
function marbleRoughness(seed, { polish = 0.2 } = {}) {
  const c = cpuCanvas(512);
  const x = c.getContext("2d");
  const rnd = Xr(seed + 101);
  for (let t = 0; t < 4; t++) {
    const g = Math.round(255 * (polish + rnd() * 0.08));
    x.fillStyle = `rgb(255,${g},0)`;
    x.fillRect((t % 2) * 256, Math.floor(t / 2) * 256, 256, 256);
    // بقع خفيفة من الاستعمال
    for (let k = 0; k < 6; k++) {
      const cx = (t % 2) * 256 + rnd() * 256;
      const cy = Math.floor(t / 2) * 256 + rnd() * 256;
      const r = 20 + rnd() * 60;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, `rgba(255,${g + 40},0,0.35)`);
      gr.addColorStop(1, `rgba(255,${g},0,0)`);
      x.fillStyle = gr;
      x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
  }
  x.strokeStyle = "rgb(255,235,0)";
  x.lineWidth = 3;
  for (let l = 0; l <= 2; l++) {
    x.beginPath();
    x.moveTo(l * 256, 0);
    x.lineTo(l * 256, 512);
    x.moveTo(0, l * 256);
    x.lineTo(512, l * 256);
    x.stroke();
  }
  return c;
}
// حبيبات الحجر عن قرب (تُستعمل bumpMap بتكرار كثيف)
function stoneDetail() {
  const c = cpuCanvas(256);
  const x = c.getContext("2d");
  const img = x.createImageData(256, 256);
  const rnd = Xr(77);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 118 + rnd() * 20 + (rnd() < 0.02 ? 50 : 0);
    img.data.set([v, v, v, 255], i * 4);
  }
  x.putImageData(img, 0, 0);
  // تنعيم بالرسم فوق نفسها مزاحة قليلًا (الحبيبات صغيرة لكن غير حادة)
  x.globalAlpha = 0.5;
  x.drawImage(c, 1, 0);
  x.drawImage(c, 0, 1);
  return c;
}
// نسيج من canvas مع التكرار والتحسين نفسيهما (Mn في 01-textures.js للألوان)
function dataTexture(canvas, repeat, { srgb = false } = {}) {
  const t = new CanvasTexture(canvas);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = fs;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// ذهب على أسود (حزام الكسوة والباب): المعدن حيث اللون ذهبي، والباقي حرير أسود مطفأ.
// يُشتق من نسيج اللون نفسه، فيطابقه تمامًا
function goldORM(colorCanvas) {
  const w = colorCanvas.width;
  const h = colorCanvas.height;
  const c = cpuCanvas(w, h);
  const x = c.getContext("2d");
  x.drawImage(colorCanvas, 0, 0);
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    // ذهبي: فاتح ومائل إلى الأحمر والأخضر أكثر من الأزرق
    const gold = Math.max(0, Math.min(1, (r - 70) / 110)) * (r > b * 1.25 ? 1 : 0);
    d[i] = 255;
    d[i + 1] = Math.round(255 * (0.78 - 0.52 * gold)); // الخشونة: 0.26 للذهب، و0.78 للحرير
    d[i + 2] = Math.round(255 * gold); // المعدنية
  }
  x.putImageData(img, 0, 0);
  return c;
}

// الكسوة: حرير أسود، والنقش يظهر باللمعان لا باللون، كما في نسج الجاكار.
// النقش هندسي فقط: لا نكتب نصًا شرعيًا في النسيج (قاعدة CLAUDE.md)
function kiswaPattern(x, size, kind) {
  const cells = 8;
  const s = size / cells;
  const rough = kind === "rough";
  x.fillStyle = rough ? "rgb(255,220,0)" : "#0c0c0d"; // الخلفية: خشونة 0.86
  x.fillRect(0, 0, size, size);
  const line = rough ? "rgb(255,135,0)" : "rgba(70,70,74,0.22)"; // النقش: خشونة 0.53 (أقل تباينًا من الخلفية 0.86، كالجاكار)
  x.strokeStyle = line;
  x.fillStyle = line;
  x.lineWidth = Math.max(1, s * 0.035);
  for (let row = 0; row <= cells; row++)
    for (let col = 0; col <= cells; col++) {
      const ox = (row % 2 ? s / 2 : 0) + col * s;
      const oy = row * s;
      const k = s * 0.34;
      x.beginPath();
      x.moveTo(ox, oy - k);
      x.lineTo(ox + k, oy);
      x.lineTo(ox, oy + k);
      x.lineTo(ox - k, oy);
      x.closePath();
      x.stroke();
      // نجمة ثمانية في كل خلية، ودائرة في مركزها
      Vc(x, ox, oy, s * 0.17, s * 0.08, 8);
      x.stroke();
      x.beginPath();
      x.arc(ox, oy, s * 0.04, 0, le);
      x.fill();
      // خيوط النسج الأفقية الدقيقة (تظهر في الخشونة فقط)
      if (rough) {
        x.save();
        x.globalAlpha = 0.25;
        x.lineWidth = 1;
        for (let t = 0; t < 6; t++) {
          const yy = oy + (t / 6) * s;
          x.beginPath();
          x.moveTo(ox - s / 2, yy);
          x.lineTo(ox + s / 2, yy);
          x.stroke();
        }
        x.restore();
      }
    }
}

function upgradeMaterials(scene, world) {
  const mats = { kiswaRes: 0 };
  const detail = dataTexture(stoneDetail(), [1, 1]);

  // ——— الأرض ———
  // المطاف: رخام أبيض بارد يلمع
  const floor = world.mats.floor;
  {
    const rep = [floor.map.repeat.x, floor.map.repeat.y];
    floor.map = Mn(Gc({ base: "#f3f6f7", vein: "140,150,160", grout: "rgba(150,158,162,0.4)", seed: 7 }), { repeat: rep });
    floor.roughnessMap = dataTexture(marbleRoughness(7, { polish: 0.14 }), rep);
    floor.roughness = 1;
    floor.bumpMap = dataTexture(stoneDetail(), [rep[0] * 9, rep[1] * 9]);
    floor.bumpScale = 0.25;
    floor.envMapIntensity = 1.15;
    floor.needsUpdate = true;
  }
  // الأروقة: رخام دافئ أقل صقلًا. حلقة بنفس إسقاط قرص المطاف، فتتصل الشبكة بين الرخامين
  {
    const R = pe.outer + 0.5;
    const rep = [floor.map.repeat.x, floor.map.repeat.y];
    const warm = Se("#ffffff", {
      map: Mn(Gc({ base: "#efe5d3", vein: "170,140,100", grout: "rgba(160,140,110,0.45)", seed: 31 }), { repeat: rep }),
      roughnessMap: dataTexture(marbleRoughness(31, { polish: 0.3 }), rep),
      roughness: 1,
      bumpMap: floor.bumpMap,
      bumpScale: 0.25,
    });
    const ring = new Mesh(new RingGeometry(pe.arcIn - 0.5, R, 128, 1), warm);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    scene.add(ring);
    mats.arcadeFloor = ring;
  }
  // المسعى: رخام أبيض مصقول كالمطاف
  {
    const m = world.masaFloorMat;
    const rep = [m.map.repeat.x, m.map.repeat.y];
    m.roughnessMap = dataTexture(marbleRoughness(21, { polish: 0.16 }), rep);
    m.roughness = 1;
    m.bumpMap = dataTexture(stoneDetail(), [rep[0] * 9, rep[1] * 9]);
    m.bumpScale = 0.25;
    m.needsUpdate = true;
  }

  // ——— الذهب: حزام الكسوة والباب ———
  for (const m of [world.bandMat, world.door.material]) {
    const orm = dataTexture(goldORM(m.map.image), [m.map.repeat.x, m.map.repeat.y]);
    m.roughnessMap = m.metalnessMap = orm;
    m.roughness = m.metalness = 1;
    m.envMapIntensity = 1.4;
    m.needsUpdate = true;
  }

  // ——— الكسوة ———
  const kiswa = world.kiswaMat;
  {
    const rep = [kiswa.map.repeat.x, kiswa.map.repeat.y];
    const color = cpuCanvas(512);
    kiswaPattern(color.getContext("2d"), 512, "color");
    kiswa.map = Mn(color, { repeat: rep });
    kiswa.metalness = 0.04;
    kiswa.roughness = 1;
    kiswa.needsUpdate = true;
    mats.kiswaRepeat = rep;
  }
  // الدقة بحسب مستوى الجودة: 2048 في العالي، و1024 في غيره (05-quality.js)
  mats.setKiswaRes = (res) => {
    if (res === mats.kiswaRes) return;
    mats.kiswaRes = res;
    const c = cpuCanvas(res);
    kiswaPattern(c.getContext("2d"), res, "rough");
    const old = kiswa.roughnessMap;
    kiswa.roughnessMap = dataTexture(c, mats.kiswaRepeat);
    kiswa.needsUpdate = true;
    if (old) old.dispose();
  };
  mats.setKiswaRes(1024);

  // ——— الأعمدة والأقواس: رخام أصقل قليلًا ———
  world.mats.column.roughness = 0.6;
  if (world.archMat) world.archMat.roughness = 0.7;

  world.materials = mats;
  return mats;
}
