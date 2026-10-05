import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/* ---------- レイアウト定数（x:右, z:手前, y:上） ---------- */
export const B = { x0: -7, x1: 3.5, z0: -8.5, z1: 4, px: -2.5 }; // 建物の範囲（px = バックヤードと売場の仕切り）
export const SLAB = { z0: B.z0 - 0.6, z1: B.z1 + 2.6 }; // 土台（手前は歩道ぶん広い）
export const LAYOUT = {
  shelves: [{ x: 1.5, z: -7.85, rot: 0, use: { x: 1.9, z: -6.2 } }],
  // 左の壁ぎわの縦長テーブル（バックヤード）
  cooker: { x: -6.5, z: 0.625, rot: Math.PI / 2, use: { x: -5.2, z: 0.625 } },
  station: { x: -6.45, z: -2.0, rot: Math.PI / 2, k: 1, use: { x: -5.2, z: -2.0 } },
  // 完成したおにぎりを置くトレー台（握り台の奥側に独立。足場は別）
  tray: { x: -6.45, z: -3.55, rot: Math.PI / 2, use: { x: -5.2, z: -3.55 } },
  // 縦長カウンター：店員は仕切り側、お客さんは右側
  register: { x: -1.0, z: -7.0, rot: Math.PI / 2, len: 3.0, use: { x: -1.9, z: -6.2 }, staff: { x: -1.9, z: -7.2 } },
  // 入口は手前の壁（売場側）
  door: { x0: -0.75, x1: 1.0, xc: 0.125, z: 4 },
  // 搬入口は手前の壁（バックヤード側）
  backDoor: { x0: -6.25, x1: -5.0, xc: -5.625, z: 4, use: { x: -5.625, z: 3.05 } },
  gap: { z0: -3.5, z1: -1.5 }, // 仕切り壁の通路
  queue: (i) => ({ x: -0.15, z: -6.2 + 0.8 * Math.min(i, 4) }),
  entryPath: [{ x: 0.125, z: 4.2 }, { x: 0.9, z: 3.0 }],
  exitPath: [{ x: 0.6, z: -6.0 }, { x: 0.6, z: 2.9 }, { x: 0.125, z: 3.7 }, { x: 0.125, z: 6.3 }],
  spawn: { x: 0.125, z: 6.3 },
  view: { x: -3.6, z: -1.25 },
  fridge: { x: 4.25, z: -7.725, use: { x: 4.25, z: -5.8 } },
  // Lv.4 サンドイッチ台（左壁ぎわ）/ サンドの売り場（増築エリアの奥）
  sandTable: { x: -6.45, z: -5.15, rot: Math.PI / 2, len: 1.5, use: { x: -5.2, z: -5.15 } },
  sandCase: { x: 5.5, z: -7.725, rot: 0, use: { x: 5.6, z: -5.8 } },
  // Lv.5 揚げ物台（奥の壁ぎわ）/ ホットスナックケース（増築エリアの右壁ぎわ）
  fryer: { x: -4.0, z: -7.85, rot: 0, len: 1.4, use: { x: -4.0, z: -6.55 } },
  hotCase: { x: 5.35, z: -3.1, rot: -Math.PI / 2, use: { x: 3.75, z: -3.1 } },
  // Lv.8〜 お菓子棚 / Lv.9 弁当台（バックヤード）・お弁当のケース / Lv.11 スイーツケース（どれも増築エリアの右壁ぎわ）
  snackRack: { x: 5.35, z: 0.1, rot: -Math.PI / 2, use: { x: 3.75, z: 0.1 } },
  bentoTable: { x: -3.15, z: 2.2, rot: -Math.PI / 2, len: 1.6, use: { x: -4.55, z: 2.2 } },
  bentoCase: { x: 5.35, z: -1.5, rot: -Math.PI / 2, use: { x: 3.75, z: -1.5 } },
  sweetCase: { x: 5.35, z: 1.7, rot: -Math.PI / 2, use: { x: 3.75, z: 1.7 } },
  // Lv.13 蒸し器台（バックヤード）/ 中華まんケース（右壁ぎわ）、Lv.14 タバコ棚（奥の壁ぎわ）
  steamTable: { x: -3.5, z: -5.4, rot: -Math.PI / 2, len: 1.2, use: { x: -4.8, z: -5.4 } },
  steamCase: { x: 5.35, z: 2.9, rot: -Math.PI / 2, use: { x: 3.75, z: 2.9 } },
  tobaccoRack: { x: 3.125, z: -7.725, rot: 0, use: { x: 3.125, z: -5.8 } },
};
/** 動かせる設備の初期の当たり判定（初期配置のもの。実際は設備の位置・向きから作り直す） */
export const ITEM_BOXES = {
  cooker: { x0: -7.0, x1: -6.0, z0: -0.25, z1: 1.5 },
  station: { x0: -7.0, x1: -5.95, z0: -3.0, z1: -1.0 },
  tray: { x0: -7.0, x1: -5.95, z0: -3.95, z1: -3.15 },
  register: { x0: -1.4, x1: -0.6, z0: -8.5, z1: -5.5 },
  shelf: { x0: 0.5, x1: 2.5, z0: -8.5, z1: -7.35 },
  sand: { x0: -7.0, x1: -5.95, z0: -5.9, z1: -4.4 },
  fry: { x0: -4.7, x1: -3.3, z0: -8.5, z1: -7.35 },
  bento: { x0: -3.65, x1: -2.65, z0: 1.4, z1: 3.0 },
  fridge: { x0: 3.75, x1: 4.75, z0: -8.5, z1: -7.1 },
  sandcase: { x0: 5.0, x1: 6.0, z0: -8.5, z1: -7.1 },
  hotcase: { x0: 4.725, x1: 5.975, z0: -3.6, z1: -2.6 },
  bentocase: { x0: 4.725, x1: 5.975, z0: -2.0, z1: -1.0 },
  snackrack: { x0: 4.725, x1: 5.975, z0: -0.4, z1: 0.6 },
  sweetcase: { x0: 4.725, x1: 5.975, z0: 1.2, z1: 2.2 },
  steam: { x0: -4.05, x1: -3.0, z0: -6.0, z1: -4.8 },
  steamcase: { x0: 4.725, x1: 5.975, z0: 2.4, z1: 3.4 },
  tobaccorack: { x0: 2.625, x1: 3.625, z0: -8.5, z1: -7.1 },
};
/** Lv.3 の増築で追加される、動かせない当たり判定 */
export const EXP_COLLIDERS = [
  { x0: -3.3, x1: -2.65, z0: -8.25, z1: -6.45 }, // 飲み物のケース（バックヤード）
];

/* 当たり判定(AABB)：壁・飾りなど動かせないもの */
export const COLLIDERS = [
  // 仕切り壁（通路は z -3.5〜-1.5）
  { x0: -2.65, x1: -2.35, z0: -8.5, z1: LAYOUT.gap.z0 },
  { x0: -2.65, x1: -2.35, z0: LAYOUT.gap.z1, z1: 4.0 },
  // 米袋・バケツ
  { x0: -6.75, x1: -5.35, z0: -8.2, z1: -6.8 },
  { x0: -3.5, x1: -2.9, z0: -4.8, z1: -4.2 },
  // 観葉植物
  { x0: 2.7, x1: 3.3, z0: 3.1, z1: 3.7 },
];

/* ---------- ヘルパー ---------- */
const mats = new Map();
export function M(color, o = {}) {
  const k = color + '|' + JSON.stringify(o);
  let m = mats.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
    mats.set(k, m);
  }
  return m;
}

export function bx(parent, [w, h, d], color, [x, y, z], o = {}) {
  const r = o.r ?? Math.min(0.04, Math.min(w, h, d) / 2 - 0.002);
  const geo = r > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, o.material || M(color, o.mat));
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}
export function cy(parent, rt, rb, h, color, [x, y, z], seg = 28, mo) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(color, mo));
  m.position.set(x, y + h / 2, z);
  parent.add(m);
  return m;
}
export function sp(parent, r, color, [x, y, z], mo, sy = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), M(color, mo));
  m.position.set(x, y, z);
  m.scale.y = sy;
  parent.add(m);
  return m;
}
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function tileTex(c1, c2, line, repX, repZ) {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = c1;
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = c2;
    g.fillRect(0, 0, 128, 128);
    g.fillRect(128, 128, 128, 128);
    g.strokeStyle = line;
    g.lineWidth = 3;
    g.strokeRect(0, 0, 128, 128);
    g.strokeRect(128, 0, 128, 128);
    g.strokeRect(0, 128, 128, 128);
    g.strokeRect(128, 128, 128, 128);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX / 2, repZ / 2);
  return t;
}
function floorPlane(parent, x0, x1, z0, z1, y, tex) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  m.userData.noShadow = true;
  parent.add(m);
  return m;
}
function signTex(text, bg, fg, w = 512, h = 128, font = 'bold 76px "Yu Gothic UI","Meiryo",sans-serif') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = text.split('\n');
    const lh = parseInt(font.match(/(\d+)px/)[1], 10) * 1.2;
    lines.forEach((ln, i) => g.fillText(ln, w / 2, h / 2 + 4 + (i - (lines.length - 1) / 2) * lh));
  });
}
function plane(parent, w, h, tex, [x, y, z], ry = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, ...opts }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.userData.noShadow = true;
  parent.add(m);
  return m;
}

/* ---------- おにぎり（shio / ume / okaka） ---------- */
export function makeOnigiri(scale = 1, kind = 'shio', bag = false) {
  const g = new THREE.Group();
  const r = 0.2 * scale;
  const th = 0.15 * scale;
  const rice = new THREE.Mesh(new THREE.CylinderGeometry(r, r, th, 3), M('#fbfaf3', { roughness: 0.9 }));
  rice.rotation.x = -Math.PI / 2; // 頂点を上へ
  g.add(rice);
  const nori = new THREE.Mesh(new RoundedBoxGeometry(r * 1.12, r * 0.55, th + 0.018 * scale, 1, 0.006), M('#1c2a22', { roughness: 0.5 }));
  nori.position.y = -r * 0.27;
  g.add(nori);
  const zf = th / 2 + 0.003 * scale;
  if (kind === 'ume') {
    for (const sg of [1, -1]) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.2, 14, 10), M('#d6334a', { roughness: 0.5 }));
      d.scale.z = 0.35;
      d.position.set(0, r * 0.3, sg * zf);
      g.add(d);
    }
  } else if (kind === 'okaka') {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const sg of [1, -1]) {
      for (let i = 0; i < 9; i++) {
        const y = r * (0.05 + 0.6 * rnd());
        const w = 1.1547 * (r - y);
        const f = new THREE.Mesh(new THREE.BoxGeometry(r * 0.15, r * 0.07, 0.004 * scale + 0.002), M(i % 2 ? '#b9794a' : '#dca674'));
        f.position.set((rnd() - 0.5) * w * 0.8, y, sg * zf);
        f.rotation.z = rnd() * 3;
        g.add(f);
      }
    }
  }
  if (kind === 'sake' || kind === 'tuna') {
    let seed = kind === 'sake' ? 11 : 23;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const sg of [1, -1]) {
      if (kind === 'sake') { // 鮭：ピンクのほぐし身
        for (let i = 0; i < 9; i++) {
          const y = r * (0.04 + 0.62 * rnd());
          const w = 1.1547 * (r - y);
          const f = new THREE.Mesh(new THREE.BoxGeometry(r * 0.2, r * 0.09, 0.004 * scale + 0.002), M(i % 2 ? '#ff8a75' : '#ffb09a', { roughness: 0.6 }));
          f.position.set((rnd() - 0.5) * w * 0.8, y, sg * zf);
          f.rotation.z = rnd() * 3;
          g.add(f);
        }
      } else { // ツナマヨ：ベージュのかたまり
        for (let i = 0; i < 3; i++) {
          const y = r * (0.12 + 0.4 * rnd());
          const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 10, 8), M(i === 1 ? '#fff4d6' : '#e9d3a3', { roughness: 0.5 }));
          d.scale.z = 0.3;
          d.position.set((rnd() - 0.5) * r * 0.35, y, sg * zf);
          g.add(d);
        }
      }
    }
  }
  if (bag) {
    // フィルムの袋に入った見た目：半透明の袋＋下のシール（種類ごとに色違い）＋てっぺんの折り返し
    const film = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.24, r * 1.24, th * 2.0, 3),
      new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.12, depthWrite: false }),
    );
    film.rotation.x = -Math.PI / 2;
    film.userData.noShadow = true;
    g.add(film);
    const tone = { shio: '#4aa3ff', ume: '#e04a5a', okaka: '#e8a04a', sake: '#ff7f6e', tuna: '#7fbf5a' }[kind] || '#4aa3ff';
    const seal = new THREE.Mesh(new THREE.BoxGeometry(r * 1.55, r * 0.2, th * 2.0 + 0.012 * scale), M(tone, { roughness: 0.4 }));
    seal.position.y = -r * 0.5;
    g.add(seal);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, r * 0.22, th * 1.1), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, roughness: 0.2, depthWrite: false }));
    tab.position.y = r * 1.28;
    tab.userData.noShadow = true;
    g.add(tab);
  }
  g.position.y = r * 0.5; // 底面が y=0 になるように
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

/* ---------- 人 ---------- */
export function makePerson(o = {}) {
  const skin = o.skin || '#f7d2b0';
  const pants = o.pants || '#3b4a6b';
  const shirt = o.shirt || '#ffffff';
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const mkLimb = (x, y, size, color, parent) => {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    parent.add(p);
    bx(p, size, color, [0, -size[1], 0], { r: 0.05 });
    return p;
  };
  const legL = mkLimb(-0.13, 0.55, [0.2, 0.55, 0.22], pants, g);
  const legR = mkLimb(0.13, 0.55, [0.2, 0.55, 0.22], pants, g);
  bx(legL, [0.22, 0.1, 0.32], o.shoes || '#2b2b2b', [0, -0.55, 0.04], { r: 0.04 });
  bx(legR, [0.22, 0.1, 0.32], o.shoes || '#2b2b2b', [0, -0.55, 0.04], { r: 0.04 });

  bx(body, [0.56, 0.58, 0.34], shirt, [0, 0.55, 0], { r: 0.1 });
  if (o.apron) bx(body, [0.46, 0.42, 0.04], o.apron, [0, 0.52, 0.17], { r: 0.02 });
  if (o.stripe) bx(body, [0.58, 0.09, 0.36], o.stripe, [0, 0.95, 0], { r: 0.03 });

  const armL = mkLimb(-0.36, 1.08, [0.14, 0.5, 0.14], shirt, body);
  const armR = mkLimb(0.36, 1.08, [0.14, 0.5, 0.14], shirt, body);
  sp(armL, 0.075, skin, [0, -0.54, 0]);
  sp(armR, 0.075, skin, [0, -0.54, 0]);

  const head = new THREE.Group();
  head.position.y = 1.4;
  body.add(head);
  sp(head, 0.27, skin, [0, 0, 0]);
  sp(head, 0.285, o.hair || '#3a2a20', [0, 0.05, -0.04], {}, 0.85);
  bx(head, [0.5, 0.1, 0.1], o.hair || '#3a2a20', [0, 0.1, 0.16], { r: 0.04 }); // 前髪
  if (o.pompadour) bx(head, [0.3, 0.2, 0.36], o.hair || '#3a2a20', [0, 0.16, 0.2], { r: 0.06 }); // リーゼント
  sp(head, 0.036, '#222', [-0.095, -0.02, 0.245]);
  sp(head, 0.036, '#222', [0.095, -0.02, 0.245]);
  sp(head, 0.04, '#ff9aa2', [-0.17, -0.09, 0.2], { transparent: true, opacity: 0.55 }, 0.6);
  sp(head, 0.04, '#ff9aa2', [0.17, -0.09, 0.2], { transparent: true, opacity: 0.55 }, 0.6);
  if (o.cap) {
    cy(head, 0.29, 0.3, 0.13, o.cap, [0, 0.2, 0]);
    bx(head, [0.36, 0.03, 0.22], o.cap, [0, 0.2, 0.3], { r: 0.012 });
  }

  const hold = new THREE.Group();
  hold.position.set(0, 0.7, 0.42);
  body.add(hold);

  const person = {
    group: g,
    body,
    hold,
    armL,
    armR,
    legL,
    legR,
    phase: Math.random() * 6,
    holdArms: !!o.holdArms,
    sit: false, // true なら地べた座り（呼び出し側で全体を 0.5 下げる）
    anim(dt, speed, working = false) {
      if (this.sit) {
        this.legL.rotation.x = this.legR.rotation.x = -1.45;
        this.armL.rotation.x = -0.35;
        this.armR.rotation.x = -0.35;
        this.body.position.y = 0;
        return;
      }
      const moving = speed > 0.2;
      if (moving) this.phase += dt * (6 + speed * 1.6);
      const amp = moving ? Math.min(1, speed / 3) * 0.7 : 0;
      this.legL.rotation.x = Math.sin(this.phase) * amp;
      this.legR.rotation.x = -Math.sin(this.phase) * amp;
      if (working) {
        this.phase += dt * 14;
        this.armL.rotation.x = -0.9 + Math.sin(this.phase) * 0.35;
        this.armR.rotation.x = -0.9 - Math.sin(this.phase) * 0.35;
      } else if (this.holdArms) {
        this.armL.rotation.x = -0.7;
        this.armR.rotation.x = -0.7;
      } else {
        this.armL.rotation.x = -Math.sin(this.phase) * amp;
        this.armR.rotation.x = Math.sin(this.phase) * amp;
      }
      this.body.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.05 : 0;
    },
  };
  return person;
}

/* ---------- ロボット店員（makePerson と同じ使い方：group / body / hold / holdArms / anim） ---------- */
export function makeRobot(o = {}) {
  const col = o.color || '#2f7ff0';
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  // 走行部（タイヤ）
  bx(g, [0.66, 0.16, 0.5], '#3a4349', [0, 0.08, 0], { r: 0.06 });
  const mkWheel = (x) => {
    const w = new THREE.Group();
    w.position.set(x, 0.14, 0);
    g.add(w);
    const m = cy(w, 0.14, 0.14, 0.12, '#1d2327', [0, -0.06, 0], 20);
    m.rotation.z = Math.PI / 2;
    sp(w, 0.05, '#9aa6ad', [x > 0 ? 0.07 : -0.07, 0, 0]);
    return w;
  };
  const legL = mkWheel(-0.36);
  const legR = mkWheel(0.36);

  // 胴体
  bx(body, [0.62, 0.52, 0.44], col, [0, 0.2, 0], { r: 0.1 });
  bx(body, [0.4, 0.26, 0.04], '#1b2429', [0, 0.36, 0.22], { r: 0.02 }); // 胸のパネル
  const lampMats = [0, 1, 2].map((i) => {
    const m = new THREE.MeshStandardMaterial({ color: '#333', emissive: '#000', roughness: 0.4 });
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), m);
    l.position.set(-0.11 + i * 0.11, 0.49, 0.245);
    body.add(l);
    return m;
  });
  const pips = new THREE.Group(); // レベルの印（金のドット）
  body.add(pips);
  const apron = bx(body, [0.5, 0.08, 0.03], '#e9eef1', [0, 0.24, 0.225], { r: 0.01 });
  void apron;

  // 頭
  const head = new THREE.Group();
  head.position.y = 0.88;
  body.add(head);
  bx(head, [0.54, 0.4, 0.42], '#eef2f5', [0, -0.2, 0], { r: 0.12 });
  bx(head, [0.44, 0.24, 0.03], '#10202a', [0, -0.28, 0.215], { r: 0.02 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#66f0ff', emissive: '#33d8ee', roughness: 0.3 });
  [-0.1, 0.1].forEach((x) => {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.03), eyeMat);
    e.position.set(x, -0.2, 0.235);
    head.add(e);
  });
  cy(head, 0.015, 0.015, 0.2, '#6b767d', [0, 0.2, 0], 8);
  const bulbMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, roughness: 0.3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), bulbMat);
  bulb.position.set(0, 0.42, 0);
  head.add(bulb);
  if (o.cap) {
    cy(head, 0.2, 0.22, 0.07, o.capColor || '#ffffff', [0, 0.0, 0], 20);
    bx(head, [0.34, 0.025, 0.16], o.capColor || '#ffffff', [0, 0.0, 0.24], { r: 0.01 });
    if (o.capColor) bx(head, [0.12, 0.05, 0.02], '#ffd23f', [0, 0.04, 0.25], { r: 0.005 }); // 帽子のバッジ
  }

  // 腕
  const mkArm = (x) => {
    const p = new THREE.Group();
    p.position.set(x, 0.62, 0);
    body.add(p);
    bx(p, [0.12, 0.4, 0.12], '#c9d2d8', [0, -0.4, 0], { r: 0.04 });
    sp(p, 0.075, '#4b565d', [0, -0.42, 0]);
    sp(p, 0.06, col, [0, 0, 0]);
    return p;
  };
  const armL = mkArm(-0.38);
  const armR = mkArm(0.38);

  const hold = new THREE.Group();
  hold.position.set(0, 0.5, 0.42);
  body.add(hold);

  let lv = 0;
  const robot = {
    group: g,
    body,
    hold,
    armL,
    armR,
    legL,
    legR,
    phase: Math.random() * 6,
    holdArms: false,
    setLevel(n) {
      if (n === lv && pips.children.length) return;
      lv = n;
      pips.children.slice().forEach((c) => { pips.remove(c); c.geometry.dispose(); });
      for (let i = 0; i <= n; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M('#ffd23f', { emissive: '#a07800', emissiveIntensity: 0.6 }));
        d.position.set(-0.04 * n + i * 0.08, 0.24, 0.245);
        pips.add(d);
      }
    },
    /** 電池の残り(0〜1)。胸のランプと目の色が変わる */
    setBattery(f, dead = false) {
      const on = f > 0.66 ? 3 : f > 0.33 ? 2 : f > 0.02 ? 1 : 0;
      const c = f > 0.33 ? '#38e07b' : f > 0.12 ? '#ffb020' : '#ff4a3d';
      lampMats.forEach((m, i) => {
        m.color.set(i < on ? c : '#333');
        m.emissive.set(i < on ? c : '#000');
      });
      const e = dead ? '#ff4a3d' : '#33d8ee';
      eyeMat.color.set(dead ? '#ff7a70' : '#66f0ff');
      eyeMat.emissive.set(e);
    },
    /** 電源が入っていない（充電スポットがない）ときは目を消す */
    setPower(on) {
      eyeMat.emissiveIntensity = on ? 1 : 0.05;
      bulbMat.emissiveIntensity = on ? 0.8 : 0.05;
    },
    anim(dt, speed, working = false) {
      const moving = speed > 0.2;
      if (moving) this.phase += dt * (6 + speed * 1.6);
      if (moving) { legL.rotation.x += dt * speed * 3; legR.rotation.x += dt * speed * 3; }
      if (working) {
        this.phase += dt * 14;
        armL.rotation.x = -0.9 + Math.sin(this.phase) * 0.35;
        armR.rotation.x = -0.9 - Math.sin(this.phase) * 0.35;
      } else if (this.holdArms) {
        armL.rotation.x = -0.7;
        armR.rotation.x = -0.7;
      } else {
        const amp = moving ? Math.min(1, speed / 3) * 0.25 : 0;
        armL.rotation.x = -Math.sin(this.phase) * amp;
        armR.rotation.x = Math.sin(this.phase) * amp;
      }
      body.position.y = moving ? Math.abs(Math.sin(this.phase * 0.7)) * 0.03 : 0;
      head.rotation.z = moving ? Math.sin(this.phase * 0.5) * 0.03 : 0;
    },
  };
  robot.setLevel(0);
  robot.setBattery(1);
  return robot;
}

/* ---------- 充電スポット（床に置く充電パッド） ---------- */
export function buildCharger() {
  const g = new THREE.Group();
  bx(g, [0.7, 0.05, 0.7], '#2b363d', [0, 0, 0], { r: 0.03 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#f5c518', emissive: '#c99a00', emissiveIntensity: 0.5, roughness: 0.4 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.056;
  g.add(ring);
  const tex = canvasTex(128, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#ffe14a';
    c.beginPath();
    c.moveTo(w * 0.58, h * 0.1);
    c.lineTo(w * 0.28, h * 0.56);
    c.lineTo(w * 0.47, h * 0.56);
    c.lineTo(w * 0.4, h * 0.9);
    c.lineTo(w * 0.72, h * 0.42);
    c.lineTo(w * 0.53, h * 0.42);
    c.closePath();
    c.fill();
  });
  const boltMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), boltMat);
  bolt.rotation.x = -Math.PI / 2;
  bolt.position.y = 0.058;
  g.add(bolt);
  return {
    group: g,
    setCharging(on) {
      ringMat.color.set(on ? '#38e07b' : '#f5c518');
      ringMat.emissive.set(on ? '#1fb85c' : '#c99a00');
      ringMat.emissiveIntensity = on ? 1.1 : 0.5;
    },
  };
}

/* ---------- 棚（おにぎり冷蔵ケース） ---------- */
export const KIND_IDS = ['shio', 'ume', 'okaka', 'sake', 'tuna'];
export function buildShelf() {
  const g = new THREE.Group();
  const W = 2.0, D = 1.0;
  bx(g, [W, 0.28, D], '#cfd8dc', [0, 0, 0]);
  bx(g, [W, 1.55, 0.07], '#eaf3f7', [0, 0.28, -D / 2 + 0.035]);
  bx(g, [0.07, 1.55, D], '#eaf3f7', [-W / 2 + 0.035, 0.28, 0]);
  bx(g, [0.07, 1.55, D], '#eaf3f7', [W / 2 - 0.035, 0.28, 0]);
  // 4段（0 = いちばん上）
  const TIER_Y = [1.49, 1.11, 0.73, 0.35];
  TIER_Y.forEach((y) => bx(g, [W - 0.1, 0.05, D - 0.1], '#ffffff', [0, y, 0], { r: 0.015 }));
  bx(g, [W + 0.14, 0.22, D + 0.12], '#1fa463', [0, 1.78, 0]);
  const signMesh = plane(g, W - 0.2, 0.2, signTex('おにぎり', '#1fa463', '#ffffff', 512, 64, 'bold 46px "Yu Gothic UI","Meiryo",sans-serif'), [0, 1.89, D / 2 + 0.065]);
  signMesh.castShadow = false;
  bx(g, [W - 0.1, 0.03, 0.04], '#ffd23f', [0, 1.7, D / 2 - 0.05], { r: 0.01 });

  // 1段 最大20個（5列×4行・手前の行から）。使う分だけ作って使い回す
  const cache = new Map();
  const popping = new Set();
  const getObj = (t, i, k) => {
    const key = t * 200 + i * 8 + KIND_IDS.indexOf(k);
    let o = cache.get(key);
    if (!o) {
      o = makeOnigiri(0.75, k, true);
      const col = i % 5, row = Math.floor(i / 5);
      o.position.set(-0.72 + col * 0.36, TIER_Y[t] + 0.025, 0.33 - row * 0.22);
      o.rotation.y = (Math.random() - 0.5) * 0.12;
      o.visible = false;
      o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    /** tiers: [{kind, n}] 上から4段。各段 20 個まで */
    setTiers(tiers) {
      for (let t = 0; t < 4; t++) {
        for (let i = 0; i < 20; i++) {
          KIND_IDS.forEach((k) => {
            const want = tiers[t].kind === k && i < tiers[t].n;
            if (want) {
              const o = getObj(t, i, k);
              if (!o.visible) { o.visible = true; o.userData.pop = 0; o.scale.setScalar(0.3); popping.add(o); }
            } else {
              const o = cache.get(t * 200 + i * 8 + KIND_IDS.indexOf(k));
              if (o) o.visible = false;
            }
          });
        }
      }
    },
    /** 置いた瞬間にぽんと大きくなる */
    tick(dt) {
      popping.forEach((o) => {
        o.userData.pop += dt / 0.22;
        const t = Math.min(1, o.userData.pop);
        o.scale.setScalar(0.3 + 0.7 * (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.12);
        if (t >= 1) { o.scale.setScalar(1); popping.delete(o); }
      });
    },
  };
}

/* ---------- 炊飯器（大型化の段階ごとに見た目が変わる） ---------- */
// 段階: 0=家庭用 1=大きめ 2=ステンレス 3=業務用 4=業務用ツイン 5=金縁ツイン 6=黄金のトリプル
const COOKER_TIERS = [
  { base: '#cfd6db', top: '#a8b4bc', pots: 1, s: 0.88, body: '#f6f2ea', band: '#d6453d', lid: '#f6f2ea', panel: false },
  { base: '#cfd6db', top: '#a8b4bc', pots: 1, s: 0.9, body: '#fbf8f1', band: '#3f7fd0', lid: '#fbf8f1', panel: false },
  { base: '#c4ccd2', top: '#8d99a3', pots: 1, s: 0.9, body: '#d9dee2', band: '#2f3a40', lid: '#e4e8eb', panel: true },
  { base: '#9ea8b0', top: '#6f7b85', pots: 1, s: 0.9, body: '#e8ecef', band: '#1f8fa0', lid: '#f2f5f7', panel: true, tall: 1.25 },
  { base: '#8a949c', top: '#5f6a73', pots: 2, s: 0.74, body: '#e8ecef', band: '#1f8fa0', lid: '#f2f5f7', panel: true, tall: 1.1 },
  { base: '#5b646b', top: '#3f474d', pots: 2, s: 0.78, body: '#f2f5f7', band: '#d4a82a', lid: '#ffffff', panel: true, tall: 1.3, trim: '#d4a82a' },
  { base: '#3a3f44', top: '#d4a82a', pots: 3, s: 0.52, body: '#f4d46a', band: '#a8782a', lid: '#ffe69a', panel: true, tall: 1.35, trim: '#d4a82a' },
];
export const COOKER_MAX_TIER = COOKER_TIERS.length - 1;
export function buildCooker() {
  const g = new THREE.Group();
  const dyn = new THREE.Group();
  g.add(dyn);
  let leds = [];
  let steams = [];
  const clear = () => {
    dyn.children.slice().forEach((o) => {
      dyn.remove(o);
      o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); } });
    });
    leds = []; steams = [];
  };
  function setTier(tier) {
    const T = COOKER_TIERS[Math.max(0, Math.min(COOKER_MAX_TIER, tier))];
    clear();
    bx(dyn, [1.75, 0.9, 1.0], T.base, [0, 0, 0], { r: 0.05 });
    bx(dyn, [1.85, 0.07, 1.1], T.top, [0, 0.9, 0], { r: 0.03 });
    if (T.trim) {
      bx(dyn, [1.78, 0.05, 1.03], T.trim, [0, 0.55, 0], { r: 0.01 });
      bx(dyn, [1.78, 0.05, 1.03], T.trim, [0, 0.12, 0], { r: 0.01 });
    }
    if (T.panel) bx(dyn, [0.7, 0.16, 0.04], '#1b2227', [0.0, 0.7, 0.51], { r: 0.015 });
    const n = T.pots;
    const span = n === 1 ? 0 : (n === 2 ? 0.8 : 1.12);
    const tall = T.tall || 1;
    for (let i = 0; i < n; i++) {
      const c = new THREE.Group();
      const px = n === 1 ? -0.2 : -span / 2 + (span / (n - 1)) * i;
      c.position.set(px, 0.97, 0);
      c.scale.set(T.s, T.s * tall, T.s);
      dyn.add(c);
      cy(c, 0.52, 0.56, 0.62, T.body, [0, 0, 0]);
      cy(c, 0.575, 0.575, 0.1, T.band, [0, 0.18, 0]);
      if (T.trim) cy(c, 0.58, 0.58, 0.04, T.trim, [0, 0.52, 0]);
      sp(c, 0.52, T.lid, [0, 0.62, 0], {}, 0.45);
      cy(c, 0.09, 0.09, 0.1, T.trim || '#444', [0, 0.84, 0]);
      bx(c, [0.5, 0.2, 0.05], '#2f3a40', [0, 0.28, 0.54], { r: 0.02 });
      const ledMat = new THREE.MeshStandardMaterial({ color: '#555', emissive: '#000', roughness: 0.4 });
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), ledMat);
      led.position.set(0.14, 0.38, 0.575);
      c.add(led);
      leds.push(ledMat);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), M('#e8e8e8'));
      lamp.position.set(-0.14, 0.38, 0.575);
      c.add(lamp);
      const smat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
      for (let k = 0; k < 6; k++) {
        const st = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), smat.clone());
        st.visible = false;
        c.add(st);
        steams.push({ m: st, k, px: n === 1 ? 0 : 0 });
      }
    }
    // 食器・しゃもじ
    if (n === 1) {
      cy(dyn, 0.12, 0.1, 0.1, '#ffffff', [0.6, 0.97, 0.25], 16);
      bx(dyn, [0.06, 0.02, 0.3], '#d8b98a', [0.62, 1.02, 0.25], { r: 0.008 });
    } else {
      cy(dyn, 0.1, 0.08, 0.08, '#ffffff', [0.78, 0.97, 0.3], 16);
      bx(dyn, [0.05, 0.02, 0.26], '#d8b98a', [0.8, 1.01, 0.3], { r: 0.008 });
    }
  }
  setTier(0);
  return {
    group: g,
    setTier,
    setLed(state) {
      const col = state === 'cooking' ? '#ff9a1f' : state === 'ready' ? '#38e07b' : '#555555';
      leds.forEach((ledMat) => {
        ledMat.color.set(col);
        ledMat.emissive.set(state === 'idle' ? '#000000' : col);
      });
    },
    animateSteam(t, on) {
      steams.forEach((o, i) => {
        const s = o.m;
        s.visible = on;
        if (!on) return;
        const k = (t * 0.6 + o.k / 6 + i * 0.13) % 1;
        s.position.set(Math.sin(o.k * 2.1 + t) * 0.15, 0.9 + k * 1.1, Math.cos(o.k * 1.7) * 0.12);
        s.scale.setScalar(0.6 + k * 1.2);
        s.material.opacity = 0.55 * (1 - k);
      });
    },
  };
}

/* ---------- おにぎりを握る台（一人称の握りモードで使う小道具つき） 長さ2.0m × 奥行1.0m ---------- */
export function buildStation() {
  const g = new THREE.Group();
  bx(g, [2.0, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [2.1, 0.07, 1.1], '#e8ecef', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;

  // ごはんの桶
  const tub = new THREE.Group();
  tub.position.set(-0.62, 0, 0.15);
  g.add(tub);
  cy(tub, 0.34, 0.28, 0.3, '#8a5a35', [0, top, 0], 24);
  const mound = sp(tub, 0.31, '#fffdf4', [0, top + 0.3, 0], { roughness: 0.95 }, 0.45);
  tub.userData.fps = 'rice';

  // まな板・のり
  bx(g, [0.8, 0.05, 0.55], '#e6c690', [0.4, top, 0.2], { r: 0.02 });
  bx(g, [0.22, 0.03, 0.3], '#1c2a22', [0.1, top + 0.05, 0.3], { r: 0.01 });

  // 具材のお皿（奥の列）
  const bowls = {};
  const mkBowl = (x, kind, rimColor, fill, y = 0, z = -0.33) => {
    const b = new THREE.Group();
    b.position.set(x, y, z);
    g.add(b);
    cy(b, 0.17, 0.12, 0.12, rimColor, [0, top, 0], 24);
    fill(b);
    b.userData.fps = kind;
    bowls[kind] = b;
  };
  mkBowl(0.0, 'salt', '#ffffff', (b) => {
    sp(b, 0.145, '#f4f4f1', [0, top + 0.11, 0], { roughness: 1 }, 0.4);
    for (let i = 0; i < 8; i++) sp(b, 0.012, '#ffffff', [Math.cos(i * 2.4) * 0.1, top + 0.15, Math.sin(i * 2.4) * 0.1]);
  });
  mkBowl(0.38, 'ume', '#b8323e', (b) => {
    [[0, 0], [0.065, 0.045], [-0.065, 0.04], [0.02, -0.065], [-0.04, -0.055]].forEach(([x, z]) => sp(b, 0.055, '#c9263c', [x, top + 0.12, z], { roughness: 0.5 }, 0.85));
  });
  mkBowl(0.76, 'okaka', '#7a5a3a', (b) => {
    sp(b, 0.145, '#c99562', [0, top + 0.1, 0], { roughness: 1 }, 0.45);
    for (let i = 0; i < 10; i++) bx(b, [0.04, 0.012, 0.025], i % 2 ? '#a7653a' : '#e0b182', [Math.cos(i * 1.9) * 0.09, top + 0.155, Math.sin(i * 1.9) * 0.09], { r: 0.003 });
  });

  // 上の具材棚（Lv.8〜 鮭、Lv.9〜 ツナマヨ）
  const rack = new THREE.Group();
  g.add(rack);
  bx(rack, [1.0, 0.03, 0.3], '#d6b98a', [0.45, top + 0.27, -0.42], { r: 0.008 });
  bx(rack, [0.04, 0.27, 0.04], '#a8793f', [-0.02, top, -0.5], { r: 0.005 });
  bx(rack, [0.04, 0.27, 0.04], '#a8793f', [0.92, top, -0.5], { r: 0.005 });
  mkBowl(0.2, 'sake', '#d9674f', (b) => {
    sp(b, 0.145, '#ff9c85', [0, top + 0.1, 0], { roughness: 0.8 }, 0.5);
    for (let i = 0; i < 8; i++) bx(b, [0.05, 0.012, 0.025], i % 2 ? '#ffb7a3' : '#f27a63', [Math.cos(i * 2.1) * 0.09, top + 0.15, Math.sin(i * 2.1) * 0.09], { r: 0.003 });
  }, 0.3, -0.42);
  mkBowl(0.65, 'tuna', '#6aa84f', (b) => {
    sp(b, 0.145, '#ecd9ad', [0, top + 0.1, 0], { roughness: 0.6 }, 0.5);
    for (let i = 0; i < 5; i++) sp(b, 0.04, '#fff4d6', [Math.cos(i * 1.3) * 0.08, top + 0.15, Math.sin(i * 1.3) * 0.08], { roughness: 0.4 });
  }, 0.3, -0.42);

  return {
    group: g,
    tub, bowls,
    targets: [tub, bowls.salt, bowls.ume, bowls.okaka, bowls.sake, bowls.tuna],
    setRice(n) {
      mound.visible = n > 0;
      mound.scale.set(1, 0.25 + Math.min(n, 16) * 0.025, 1);
    },
    setBowls(level) {
      bowls.ume.visible = level >= 2;
      bowls.okaka.visible = level >= 2;
      bowls.sake.visible = level >= 8;
      bowls.tuna.visible = level >= 9;
      rack.visible = level >= 8;
    },
  };
}

/* ---------- トレー台（握り台とは別。完成したおにぎりを置く） 長さ0.8m × 奥行1.0m ---------- */
export function buildTrayStand() {
  const g = new THREE.Group();
  bx(g, [0.8, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [0.9, 0.07, 1.1], '#e8ecef', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;
  bx(g, [0.76, 0.04, 0.96], '#f2d49a', [0, top, 0], { r: 0.015 });
  bx(g, [0.8, 0.1, 0.04], '#d6a65a', [0, top, 0.48], { r: 0.012 });
  bx(g, [0.8, 0.1, 0.04], '#d6a65a', [0, top, -0.48], { r: 0.012 });
  bx(g, [0.04, 0.1, 0.96], '#d6a65a', [0.38, top, 0], { r: 0.012 });
  bx(g, [0.04, 0.1, 0.96], '#d6a65a', [-0.38, top, 0], { r: 0.012 });
  g.userData.fps = 'tray';
  const slotPos = (i) => new THREE.Vector3(-0.24 + (i % 3) * 0.24, top + 0.04, 0.33 - Math.floor(i / 3) * 0.22);
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const slot = {};
    KIND_IDS.forEach((k) => {
      const o = makeOnigiri(0.7, k);
      o.position.copy(slotPos(i));
      o.visible = false;
      g.add(o);
      slot[k] = o;
    });
    slots.push(slot);
  }
  return {
    group: g,
    /** トレー上の n 番目の置き場所（トレー台の座標） */
    traySlotLocal: slotPos,
    setTray(kinds) {
      slots.forEach((s2, i) => KIND_IDS.forEach((k) => { s2[k].visible = kinds[i] === k; }));
    },
  };
}

/* ---------- レジカウンター（長さ L。手前=+z がお客さん側。sign=-1 でレジ本体が -x 側） ---------- */
export function buildRegister(L = LAYOUT.register.len, sign = 1) {
  const g = new THREE.Group();
  const m = L / 2;
  bx(g, [L, 1.0, 0.8], '#f4f4f0', [0, 0, 0], { r: 0.05 });
  bx(g, [L, 0.12, 0.82], '#1fa463', [0, 0.35, 0], { r: 0.02 });
  bx(g, [L + 0.1, 0.07, 0.95], '#b98a5a', [0, 1.0, 0], { r: 0.03 });
  const mx = sign * (m - 0.7);
  bx(g, [0.7, 0.22, 0.5], '#39444a', [mx, 1.07, 0], { r: 0.04 });
  const scr = bx(g, [0.55, 0.34, 0.05], '#1a2226', [mx, 1.3, -0.1], { r: 0.02 });
  scr.rotation.x = -0.35;
  const screenGlow = bx(g, [0.46, 0.26, 0.01], '#6fe0a8', [mx, 1.34, -0.075], { r: 0.003, mat: { emissive: '#2c7a55' } });
  screenGlow.rotation.x = -0.35;
  bx(g, [0.3, 0.05, 0.22], '#222', [sign * (m - 1.5), 1.07, 0.05], { r: 0.015 });
  bx(g, [0.2, 0.01, 0.03], '#ff4040', [sign * (m - 1.5), 1.12, 0.05], { r: 0.003, mat: { emissive: '#ff2020' } });
  bx(g, [0.35, 0.28, 0.2], '#dff3ea', [sign * (m - 2.1), 1.07, -0.1], { r: 0.04 });
  for (let i = 0; i < 3; i++) bx(g, [0.28, 0.1, 0.12], ['#ffd23f', '#ff7a59', '#4aa3ff'][i], [sign * (m - 2.7), 1.07 + i * 0.1, 0.2], { r: 0.02 });
  return { group: g };
}

/* ---------- 自動ドア（手前の壁。左右に開く） ---------- */
export function buildDoor() {
  const g = new THREE.Group();
  const D = LAYOUT.door;
  const gm = new THREE.MeshStandardMaterial({ color: '#a8dcff', transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false });
  const panels = [];
  const w = (D.x1 - D.x0) / 2;
  bx(g, [0.08, 2.3, 0.14], '#2d3b45', [D.x0 - 0.04, 0, D.z], { r: 0.01 });
  bx(g, [0.08, 2.3, 0.14], '#2d3b45', [D.x1 + 0.04, 0, D.z], { r: 0.01 });
  for (let i = 0; i < 2; i++) {
    const p = new THREE.Group();
    const xc = D.x0 + w * (i + 0.5);
    p.position.set(xc, 0, D.z);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 2.2, 0.05), gm);
    glass.position.y = 1.1;
    glass.userData.noShadow = true;
    p.add(glass);
    bx(p, [0.05, 2.2, 0.09], '#2d3b45', [i === 0 ? -(w / 2 - 0.04) : w / 2 - 0.04, 0, 0], { r: 0.01 });
    bx(p, [w, 0.05, 0.09], '#2d3b45', [0, 2.2, 0], { r: 0.01 });
    bx(p, [w, 0.05, 0.09], '#2d3b45', [0, 0, 0], { r: 0.01 });
    p.userData.baseX = xc;
    p.userData.dir = i === 0 ? -1 : 1;
    g.add(p);
    panels.push(p);
  }
  return { group: g, panels };
}

/* ---------- バックヤードの裏口（手前の壁・食材の搬入口） ---------- */
export function buildBackDoor() {
  const g = new THREE.Group();
  const D = LAYOUT.backDoor;
  const w = D.x1 - D.x0;
  bx(g, [0.08, 2.3, 0.34], '#59646d', [D.x0 - 0.04, 0, D.z], { r: 0.01 });
  bx(g, [0.08, 2.3, 0.34], '#59646d', [D.x1 + 0.04, 0, D.z], { r: 0.01 });
  bx(g, [w + 0.16, 0.08, 0.34], '#59646d', [D.xc, 2.22, D.z], { r: 0.01 });
  const pivot = new THREE.Group();
  pivot.position.set(D.x0, 0, D.z);
  g.add(pivot);
  bx(pivot, [w, 2.2, 0.08], '#9aa6b0', [w / 2, 0, 0], { r: 0.02 });
  bx(pivot, [w - 0.3, 0.5, 0.1], '#7f8c96', [w / 2, 0.25, 0], { r: 0.02 });
  bx(pivot, [w - 0.3, 0.5, 0.1], '#7f8c96', [w / 2, 1.2, 0], { r: 0.02 });
  bx(pivot, [0.04, 0.14, 0.14], '#2d3b45', [w - 0.12, 1.0, 0.06], { r: 0.01 });
  plane(pivot, 0.9, 0.5, signTex('搬入口', '#ffd23f', '#2b2b2b', 256, 144, 'bold 64px "Yu Gothic UI","Meiryo",sans-serif'), [w / 2, 1.7, 0.05], 0);
  return { group: g, pivot };
}

/* ---------- 飲み物の冷蔵庫（Lv.3） 幅1.0m × 奥行1.25m。水・お茶・コーヒーが並ぶ ---------- */
const DRINK_COLORS = { water: '#8fd0ff', tea: '#8bbf5a', coffee: '#6b4a32' };
const DRINK_LABELS = { water: '#2f7ff0', tea: '#2f8f4f', coffee: '#e8d4a8' };
export function buildFridge() {
  const g = new THREE.Group();
  const W = 1.0, D = 1.25, hw = W / 2, hd = D / 2;
  bx(g, [W, 0.2, D], '#cfd8dc', [0, 0, 0]);
  bx(g, [W, 1.75, 0.07], '#e3eef4', [0, 0.2, -hd + 0.035]);
  bx(g, [0.07, 1.75, D], '#e3eef4', [-hw + 0.035, 0.2, 0]);
  bx(g, [0.07, 1.75, D], '#e3eef4', [hw - 0.035, 0.2, 0]);
  const levels = [0.55, 0.95, 1.35];
  levels.forEach((y) => bx(g, [W - 0.14, 0.04, D - 0.1], '#ffffff', [0, y, 0], { r: 0.01 }));
  bx(g, [W + 0.12, 0.2, D + 0.12], '#2f7ff0', [0, 1.78, 0]);
  const sign = plane(g, W - 0.1, 0.18, signTex('飲み物', '#2f7ff0', '#ffffff', 512, 64, 'bold 46px "Yu Gothic UI","Meiryo",sans-serif'), [0, 1.88, hd + 0.065]);
  sign.castShadow = false;
  bx(g, [W - 0.2, 0.03, D - 0.2], '#bfe9ff', [0, 1.7, 0.0], { r: 0.005, mat: { emissive: '#8fd3ff' } });

  const bodyMats = {};
  Object.keys(DRINK_COLORS).forEach((k) => { bodyMats[k] = new THREE.MeshStandardMaterial({ color: DRINK_COLORS[k], transparent: true, opacity: 0.88, roughness: 0.15 }); });
  const labelMats = {};
  Object.keys(DRINK_LABELS).forEach((k) => { labelMats[k] = M(DRINK_LABELS[k]); });
  const mkBottle = (parent, x, y, z) => {
    const b = new THREE.Group();
    b.position.set(x, y, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 14), bodyMats.water);
    body.position.y = 0.1;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.06, 14), bodyMats.water);
    neck.position.y = 0.23;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), M('#ffffff'));
    cap.position.y = 0.275;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.07, 14), labelMats.water);
    label.position.y = 0.1;
    b.add(body, neck, cap, label);
    b.userData.parts = { body, neck, label };
    parent.add(b);
    return b;
  };
  const slots = [];
  for (let i = 0; i < 12; i++) {
    const lv = Math.floor(i / 4), k = i % 4;
    const grp = new THREE.Group();
    const cx = k % 2 ? 0.26 : -0.26;
    const cz = k < 2 ? 0.28 : -0.28;
    const y = levels[lv] + 0.02;
    grp.userData.bottles = [mkBottle(grp, cx - 0.07, y, cz), mkBottle(grp, cx + 0.07, y, cz)];
    grp.visible = false;
    g.add(grp);
    slots.push(grp);
  }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 1.62, 0.03), new THREE.MeshStandardMaterial({ color: '#cfeeff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }));
  glass.position.set(0, 1.01, hd + 0.01);
  glass.userData.noShadow = true;
  g.add(glass);
  bx(g, [0.04, 0.5, 0.05], '#9aa6b0', [hw - 0.12, 0.8, hd + 0.05], { r: 0.01 });
  return {
    group: g,
    /** kinds: ['water','tea',...] 先頭から順に並べる */
    setItems(kinds) {
      slots.forEach((slot, i) => {
        const k = kinds[i];
        slot.visible = !!k;
        if (!k) return;
        slot.userData.bottles.forEach((b) => {
          b.userData.parts.body.material = bodyMats[k];
          b.userData.parts.neck.material = bodyMats[k];
          b.userData.parts.label.material = labelMats[k];
        });
      });
    },
  };
}

/* ---------- サンドイッチ（袋入り）・揚げ物 ---------- */
const SAND_FILL = { tamago: '#ffd84a', ham: '#f08a8a' };
const SAND_TONE = { tamago: '#ffb300', ham: '#ef6c6c' };
export function makeSandwich(kind = 'tamago', scale = 1) {
  const g = new THREE.Group();
  const r = 0.16 * scale;
  const bread = M('#f6e3b4', { roughness: 0.9 });
  const mk = (rad, y0, h, mat) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 3), mat);
    m.position.y = y0 + h / 2;
    g.add(m);
    return m;
  };
  mk(r, 0.0, 0.04 * scale, bread);
  mk(r * 0.94, 0.04 * scale, 0.036 * scale, M(SAND_FILL[kind] || '#ffd84a', { roughness: 0.7 }));
  mk(r, 0.076 * scale, 0.04 * scale, bread);
  // 袋（半透明）と種類シール
  const film = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.15 * scale, 3), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, roughness: 0.12, depthWrite: false }));
  film.position.y = 0.058 * scale;
  film.userData.noShadow = true;
  g.add(film);
  const seal = new THREE.Mesh(new THREE.BoxGeometry(r * 1.5, 0.02 * scale, 0.04 * scale), M(SAND_TONE[kind] || '#ffb300'));
  seal.position.set(0, 0.13 * scale, r * 0.2);
  g.add(seal);
  return g;
}
export function makeFried(kind = 'karaage', scale = 1) {
  const g = new THREE.Group();
  const paper = bx(g, [0.3 * scale, 0.05 * scale, 0.2 * scale], '#fff3d6', [0, 0, 0], { r: 0.01 * scale });
  paper.userData.noShadow = false;
  bx(g, [0.31 * scale, 0.012 * scale, 0.04 * scale], '#d6453d', [0, 0.04 * scale, 0.09 * scale], { r: 0.002 });
  if (kind === 'karaage') {
    [[-0.07, 0.0, 0.03], [0.05, 0.0, -0.02], [-0.01, 0.045, 0.0], [0.08, 0.0, 0.05]].forEach(([x, y, z], i) => {
      const m = sp(g, 0.052 * scale, i % 2 ? '#c27a2b' : '#b8691f', [x * scale, 0.07 * scale + y * scale, z * scale], { roughness: 0.85 });
      m.scale.set(1.05, 0.88, 0.95);
    });
  } else {
    [[-0.06, 0.0], [0.07, 0.01]].forEach(([x, z], i) => {
      const m = sp(g, 0.062 * scale, i ? '#b9722a' : '#c47a2c', [x * scale, 0.075 * scale, z * scale], { roughness: 0.9 });
      m.scale.set(1.3, 0.8, 0.9);
    });
    for (let i = 0; i < 10; i++) sp(g, 0.01 * scale, '#e3a84f', [Math.cos(i * 2.1) * 0.09 * scale, 0.1 * scale, Math.sin(i * 1.7) * 0.05 * scale]);
  }
  return g;
}

/* ---------- お弁当・お菓子・スイーツ ---------- */
export function makeBento(kind = 'bento_kara', scale = 1) {
  const g = new THREE.Group();
  const s1 = scale;
  bx(g, [0.34 * s1, 0.07 * s1, 0.24 * s1], '#2b2b2b', [0, 0, 0], { r: 0.012 * s1 });
  // ごはん（白）とおかず
  bx(g, [0.17 * s1, 0.05 * s1, 0.2 * s1], '#fbfaf3', [-0.065 * s1, 0.07 * s1, 0], { r: 0.01 * s1 });
  if (kind === 'bento_kara') {
    [[0.07, 0.0], [0.1, 0.07], [0.1, -0.06]].forEach(([x, z], i) => {
      const m = sp(g, 0.04 * s1, i % 2 ? '#c27a2b' : '#b8691f', [x * s1, 0.105 * s1, z * s1], { roughness: 0.85 });
      m.scale.set(1.05, 0.9, 1);
    });
    bx(g, [0.05 * s1, 0.025 * s1, 0.18 * s1], '#ffd84a', [0.02 * s1, 0.095 * s1, 0], { r: 0.005 });
  } else {
    bx(g, [0.17 * s1, 0.012 * s1, 0.2 * s1], '#1f3a2a', [-0.065 * s1, 0.122 * s1, 0], { r: 0.003 }); // のり
    bx(g, [0.08 * s1, 0.03 * s1, 0.07 * s1], '#e07a2e', [0.1 * s1, 0.1 * s1, -0.05 * s1], { r: 0.008 }); // 白身フライ
    bx(g, [0.05 * s1, 0.02 * s1, 0.08 * s1], '#9bc85a', [0.1 * s1, 0.09 * s1, 0.06 * s1], { r: 0.006 });
  }
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.35 * s1, 0.012 * s1, 0.25 * s1), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
  lid.position.y = 0.138 * s1;
  lid.userData.noShadow = true;
  g.add(lid);
  bx(g, [0.12 * s1, 0.014 * s1, 0.2 * s1], kind === 'bento_kara' ? '#e8a317' : '#4aa36a', [0.1 * s1, 0.146 * s1, 0], { r: 0.003 }); // 帯シール
  return g;
}
export function makeSnack(kind = 'chips', scale = 1) {
  const g = new THREE.Group();
  const s1 = scale;
  if (kind === 'chips') {
    // 立てて置く袋
    const bag = bx(g, [0.2 * s1, 0.27 * s1, 0.06 * s1], '#f2c14e', [0, 0, 0], { r: 0.015 * s1 });
    bag.rotation.x = -0.12;
    bx(g, [0.2 * s1, 0.025 * s1, 0.07 * s1], '#d6453d', [0, 0.22 * s1, 0.002], { r: 0.004 });
    const w = sp(g, 0.06 * s1, '#e8e0cf', [0, 0.13 * s1, 0.04 * s1], { roughness: 0.6 }, 0.8);
    w.scale.z = 0.25;
  } else {
    // 板チョコの箱
    bx(g, [0.2 * s1, 0.04 * s1, 0.13 * s1], '#6b3f25', [0, 0, 0], { r: 0.008 * s1 });
    bx(g, [0.14 * s1, 0.012 * s1, 0.07 * s1], '#e8c24a', [0, 0.04 * s1, 0], { r: 0.003 });
    bx(g, [0.2 * s1, 0.012 * s1, 0.02 * s1], '#d6453d', [0, 0.03 * s1, 0.06 * s1], { r: 0.002 });
  }
  return g;
}
export function makeSweet(kind = 'pudding', scale = 1) {
  const g = new THREE.Group();
  const s1 = scale;
  if (kind === 'pudding') {
    cy(g, 0.075 * s1, 0.055 * s1, 0.09 * s1, '#ffd45a', [0, 0, 0], 20, { roughness: 0.5 }); // 本体
    cy(g, 0.078 * s1, 0.078 * s1, 0.012 * s1, '#7a4a1e', [0, 0.09 * s1, 0], 20, { roughness: 0.4 }); // カラメル
    sp(g, 0.025 * s1, '#ffffff', [0, 0.115 * s1, 0], { roughness: 0.5 });
    sp(g, 0.018 * s1, '#d6453d', [0, 0.14 * s1, 0], { roughness: 0.4 });
  } else {
    const puff = sp(g, 0.075 * s1, '#d99a4a', [0, 0.07 * s1, 0], { roughness: 0.85 }, 0.8);
    puff.scale.x = 1.15;
    cy(g, 0.078 * s1, 0.078 * s1, 0.012 * s1, '#fff1d0', [0, 0.065 * s1, 0], 20, { roughness: 0.5 }); // クリーム
    sp(g, 0.04 * s1, '#ffffff', [0, 0.14 * s1, 0], { roughness: 0.6 }, 0.5);
  }
  return g;
}

/* ---------- 中華まん・たばこ ---------- */
export function makeNikuman(kind = 'nikuman', scale = 1) {
  const g = new THREE.Group();
  const s1 = scale;
  bx(g, [0.17 * s1, 0.012 * s1, 0.17 * s1], '#f2e6c8', [0, 0, 0], { r: 0.004 }); // 敷き紙
  const bun = sp(g, 0.088 * s1, '#fbf4e4', [0, 0.07 * s1, 0], { roughness: 0.9 }, 0.82);
  bun.scale.x = 1.05;
  for (let i = 0; i < 7; i++) { // 上のひだ
    const a = (i / 7) * Math.PI * 2;
    sp(g, 0.014 * s1, '#f3e8cf', [Math.cos(a) * 0.026 * s1, 0.128 * s1, Math.sin(a) * 0.026 * s1], { roughness: 0.9 });
  }
  if (kind === 'anman') sp(g, 0.016 * s1, '#d6453d', [0, 0.136 * s1, 0], { roughness: 0.6 }); // 赤いしるし
  else sp(g, 0.018 * s1, '#e8d9b4', [0, 0.14 * s1, 0], { roughness: 0.9 });
  return g;
}
export function makeTobacco(kind = 'tabaco_a', scale = 1) {
  const g = new THREE.Group();
  const s1 = scale;
  const col = kind === 'tabaco_a' ? '#c9302c' : '#2f9e5a';
  bx(g, [0.09 * s1, 0.13 * s1, 0.036 * s1], '#f3f3ef', [0, 0, 0], { r: 0.004 });
  bx(g, [0.092 * s1, 0.085 * s1, 0.038 * s1], col, [0, 0.045 * s1, 0], { r: 0.004 });
  bx(g, [0.05 * s1, 0.028 * s1, 0.002 * s1], '#f6d56a', [0, 0.07 * s1, 0.02 * s1], { r: 0.001 });
  return g;
}

/* ---------- 売り場ケース（サンドイッチ / ホットスナック / お弁当 / お菓子 / スイーツ / 中華まん / たばこ） 幅1.0m × 奥行1.25m ---------- */
const CASE_CFG = {
  sand: { tone: '#f2a33a', text: 'サンドイッチ', wall: '#f5ecdd', glow: '#fff2c8', emi: '#ffe08a', glass: '#fff4d6', kinds: ['tamago', 'ham'], make: (k) => makeSandwich(k, 0.95) },
  hot: { tone: '#d6453d', text: 'ホットスナック', wall: '#f4e4dc', glow: '#ffd9a0', emi: '#ff9a3c', glass: '#ffe9cf', kinds: ['karaage', 'korokke'], make: (k) => makeFried(k, 0.9) },
  bento: { tone: '#8a5a35', text: 'お弁当', wall: '#f3eadf', glow: '#fff2c8', emi: '#ffe08a', glass: '#fff4d6', kinds: ['bento_kara', 'bento_nori'], make: (k) => makeBento(k, 1.0) },
  snack: { tone: '#e8a317', text: 'お菓子', wall: '#f7efd8', glow: '#fff7d0', emi: '#ffe9a0', glass: '#fff9e0', kinds: ['chips', 'choco'], make: (k) => makeSnack(k, 1.0) },
  steam: { tone: '#d9772a', text: '中華まん', wall: '#f6e7d4', glow: '#ffe3b0', emi: '#ffb85a', glass: '#fff0d8', kinds: ['nikuman', 'anman'], make: (k) => makeNikuman(k, 0.95) },
  tobacco: { tone: '#3a4058', text: 'たばこ', wall: '#ece8e2', glow: '#e8f0ff', emi: '#cfe0ff', glass: '#f2f5ff', kinds: ['tabaco_a', 'tabaco_b'], make: (k) => makeTobacco(k, 1.7) },
  sweet: { tone: '#e8688a', text: 'スイーツ', wall: '#fbe9ef', glow: '#ffe3ee', emi: '#ffc2d6', glass: '#fff0f5', kinds: ['pudding', 'cream'], make: (k) => makeSweet(k, 1.0) },
};
export function buildDisplayCase(type) {
  const cfg = CASE_CFG[type];
  const g = new THREE.Group();
  const W = 1.0, D = 1.25, hw = W / 2, hd = D / 2;
  bx(g, [W, 0.2, D], '#cfd8dc', [0, 0, 0]);
  bx(g, [W, 1.75, 0.07], cfg.wall, [0, 0.2, -hd + 0.035]);
  bx(g, [0.07, 1.75, D], cfg.wall, [-hw + 0.035, 0.2, 0]);
  bx(g, [0.07, 1.75, D], cfg.wall, [hw - 0.035, 0.2, 0]);
  const levels = [0.55, 0.95, 1.35];
  levels.forEach((y) => bx(g, [W - 0.14, 0.04, D - 0.1], '#ffffff', [0, y, 0], { r: 0.01 }));
  bx(g, [W + 0.12, 0.2, D + 0.12], cfg.tone, [0, 1.78, 0]);
  const sign = plane(g, W - 0.1, 0.18, signTex(cfg.text, cfg.tone, '#ffffff', 512, 64, 'bold 40px "Yu Gothic UI","Meiryo",sans-serif'), [0, 1.88, hd + 0.065]);
  sign.castShadow = false;
  bx(g, [W - 0.2, 0.03, D - 0.2], cfg.glow, [0, 1.7, 0.0], { r: 0.005, mat: { emissive: cfg.emi } });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 1.62, 0.03), new THREE.MeshStandardMaterial({ color: cfg.glass, transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false }));
  glass.position.set(0, 1.01, hd + 0.01);
  glass.userData.noShadow = true;
  g.add(glass);
  bx(g, [0.04, 0.5, 0.05], '#9aa6b0', [hw - 0.12, 0.8, hd + 0.05], { r: 0.01 });

  const cache = new Map();
  const slotPos = (i) => {
    const lv = Math.floor(i / 4), k = i % 4;
    return new THREE.Vector3(k % 2 ? 0.2 : -0.2, levels[lv] + 0.025, k < 2 ? 0.28 : -0.28);
  };
  const getObj = (i, kind) => {
    const key = i * 10 + cfg.kinds.indexOf(kind);
    let o = cache.get(key);
    if (!o) {
      o = cfg.make(kind);
      o.position.copy(slotPos(i));
      o.traverse((m) => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } });
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    setItems(kinds) {
      cache.forEach((o) => { o.visible = false; });
      kinds.slice(0, 12).forEach((k, i) => { getObj(i, k).visible = true; });
    },
  };
}

/* ---------- サンドイッチ台（バックヤード）長さ len × 奥行 1.0 ---------- */
export function buildSandTable(len = 1.5) {
  const g = new THREE.Group();
  bx(g, [len, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [len + 0.1, 0.07, 1.1], '#e8ecef', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;
  // 食パン・まな板・具材
  bx(g, [0.5, 0.05, 0.4], '#e6c690', [-0.3, top, 0.15], { r: 0.02 });
  for (let i = 0; i < 4; i++) bx(g, [0.28, 0.025, 0.28], '#f6e3b4', [-0.3, top + 0.05 + i * 0.027, 0.15], { r: 0.008 });
  cy(g, 0.14, 0.11, 0.1, '#ffffff', [0.25, top, -0.2], 20);
  sp(g, 0.12, '#ffd84a', [0.25, top + 0.1, -0.2], {}, 0.5);
  cy(g, 0.14, 0.11, 0.1, '#ffffff', [0.55, top, -0.2], 20);
  sp(g, 0.12, '#f08a8a', [0.55, top + 0.1, -0.2], {}, 0.5);
  bx(g, [0.04, 0.02, 0.28], '#b0bcc4', [0.35, top, 0.3], { r: 0.005 });
  // 出来上がりを置くトレー
  bx(g, [0.42, 0.03, 0.34], '#f2d49a', [-0.55, top, -0.25], { r: 0.01 });
  const cache = new Map();
  const get = (i, kind) => {
    const key = i * 10 + (kind === 'ham' ? 1 : 0);
    let o = cache.get(key);
    if (!o) {
      o = makeSandwich(kind, 0.8);
      o.position.set(-0.7 + (i % 2) * 0.28, top + 0.03, -0.3 + Math.floor(i / 2) * 0.12);
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    /** 出来上がったものを台の上に見せる（最大4個） */
    setOutput(kinds) {
      cache.forEach((o) => { o.visible = false; });
      kinds.slice(0, 4).forEach((k, i) => { get(i, k).visible = true; });
    },
  };
}

/* ---------- 揚げ物台（バックヤード）長さ len × 奥行 1.0。フライヤー2槽 ---------- */
export function buildFryer(len = 1.4) {
  const g = new THREE.Group();
  bx(g, [len, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [len + 0.1, 0.07, 1.1], '#a8b4bc', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;
  const oil = [];
  [-0.32, 0.32].forEach((x) => {
    bx(g, [0.5, 0.2, 0.55], '#6b7680', [x, top, -0.05], { r: 0.03 });
    const o = bx(g, [0.42, 0.02, 0.47], '#e8b84a', [x, top + 0.19, -0.05], { r: 0.01, mat: { emissive: '#7a4a00' } });
    oil.push(o);
    bx(g, [0.04, 0.04, 0.3], '#2b2b2b', [x, top + 0.2, 0.37], { r: 0.01 }); // バスケットの持ち手
  });
  const bubbles = [];
  const bm = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.8, depthWrite: false });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), bm);
    b.visible = false;
    g.add(b);
    bubbles.push(b);
  }
  const steam = [];
  const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), sm.clone());
    s2.visible = false;
    g.add(s2);
    steam.push(s2);
  }
  // 出来上がりを置くバット
  bx(g, [0.5, 0.03, 0.3], '#d9dde0', [0.0, top, 0.34], { r: 0.01 });
  const cache = new Map();
  const get = (i, kind) => {
    const key = i * 10 + (kind === 'korokke' ? 1 : 0);
    let o = cache.get(key);
    if (!o) {
      o = makeFried(kind, 0.7);
      o.position.set(-0.22 + (i % 4) * 0.15, top + 0.03, 0.34);
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    /** 揚げているあいだ：泡と湯気 */
    animate(t, on) {
      oil.forEach((o) => { o.material.emissiveIntensity = on ? 1.4 : 0.3; });
      bubbles.forEach((b, i) => {
        b.visible = on;
        if (!on) return;
        const side = i < 6 ? -0.32 : 0.32;
        const k = (t * 2 + i * 0.37) % 1;
        b.position.set(side + Math.sin(i * 2.7) * 0.15, top + 0.21 + k * 0.05, -0.05 + Math.cos(i * 1.9) * 0.15);
        b.scale.setScalar(0.5 + k);
      });
      steam.forEach((s2, i) => {
        s2.visible = on;
        if (!on) return;
        const k = (t * 0.6 + i / steam.length) % 1;
        s2.position.set((i % 2 ? 0.32 : -0.32) + Math.sin(i * 2.1 + t) * 0.1, top + 0.3 + k * 0.9, -0.05);
        s2.scale.setScalar(0.6 + k);
        s2.material.opacity = 0.45 * (1 - k);
      });
    },
    setOutput(kinds) {
      cache.forEach((o) => { o.visible = false; });
      kinds.slice(0, 4).forEach((k, i) => { get(i, k).visible = true; });
    },
  };
}

/* ---------- 蒸し器台（バックヤード）長さ len × 奥行 1.0。せいろ2つ ---------- */
export function buildSteamTable(len = 1.4) {
  const g = new THREE.Group();
  bx(g, [len, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [len + 0.1, 0.07, 1.1], '#e8ecef', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;
  [-0.32, 0.32].forEach((x) => {
    cy(g, 0.22, 0.22, 0.06, '#7a838b', [x, top, -0.12], 24);
    for (let i = 0; i < 2; i++) cy(g, 0.24, 0.24, 0.1, '#c9a05f', [x, top + 0.06 + i * 0.1, -0.12], 24);
    cy(g, 0.26, 0.24, 0.05, '#b88a45', [x, top + 0.26, -0.12], 24);
    sp(g, 0.03, '#7a5a2a', [x, top + 0.33, -0.12]);
  });
  const steam = [];
  const sm = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), sm.clone());
    s2.visible = false;
    g.add(s2);
    steam.push(s2);
  }
  // 出来上がりを置くバット
  bx(g, [0.62, 0.03, 0.3], '#d9dde0', [0.0, top, 0.34], { r: 0.01 });
  const cache = new Map();
  const get = (i, kind) => {
    const key = i * 10 + (kind === 'anman' ? 1 : 0);
    let o = cache.get(key);
    if (!o) {
      o = makeNikuman(kind, 0.8);
      o.position.set(-0.22 + (i % 4) * 0.15, top + 0.03, 0.34);
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    /** 蒸しているあいだ：湯気 */
    animate(t, on) {
      steam.forEach((s2, i) => {
        s2.visible = on;
        if (!on) return;
        const k = (t * 0.6 + i / steam.length) % 1;
        s2.position.set((i % 2 ? 0.32 : -0.32) + Math.sin(i * 2.1 + t) * 0.1, top + 0.4 + k * 0.9, -0.12);
        s2.scale.setScalar(0.6 + k);
        s2.material.opacity = 0.5 * (1 - k);
      });
    },
    setOutput(kinds) {
      cache.forEach((o) => { o.visible = false; });
      kinds.slice(0, 4).forEach((k, i) => { get(i, k).visible = true; });
    },
  };
}

/* ---------- 弁当台（バックヤード）長さ len × 奥行 1.0 ---------- */
export function buildBentoTable(len = 1.6) {
  const g = new THREE.Group();
  bx(g, [len, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [len + 0.1, 0.07, 1.1], '#e8ecef', [0, 0.9, 0], { r: 0.03 });
  const top = 0.97;
  // ごはんの桶・おかずのバット・空の弁当箱
  cy(g, 0.26, 0.21, 0.22, '#8a5a35', [-0.5, top, 0.12], 22);
  sp(g, 0.24, '#fffdf4', [-0.5, top + 0.22, 0.12], { roughness: 0.95 }, 0.4);
  bx(g, [0.36, 0.05, 0.26], '#d9dde0', [-0.05, top, -0.2], { r: 0.01 });
  [[-0.14, -0.2], [-0.03, -0.17], [0.07, -0.22]].forEach(([x, z], i) => sp(g, 0.045, i % 2 ? '#c27a2b' : '#b8691f', [x, top + 0.08, z], { roughness: 0.85 }));
  for (let i = 0; i < 3; i++) bx(g, [0.3, 0.03, 0.22], '#2b2b2b', [0.1, top + i * 0.032, 0.2], { r: 0.008 });
  // 出来上がりを置くトレー
  bx(g, [0.5, 0.03, 0.4], '#f2d49a', [0.55, top, -0.2], { r: 0.01 });
  const cache = new Map();
  const get = (i, kind) => {
    const key = i * 10 + (kind === 'bento_nori' ? 1 : 0);
    let o = cache.get(key);
    if (!o) {
      o = makeBento(kind, 0.7);
      o.position.set(0.42 + (i % 2) * 0.24, top + 0.03, -0.3 + Math.floor(i / 2) * 0.22);
      g.add(o);
      cache.set(key, o);
    }
    return o;
  };
  return {
    group: g,
    setOutput(kinds) {
      cache.forEach((o) => { o.visible = false; });
      kinds.slice(0, 4).forEach((k, i) => { get(i, k).visible = true; });
    },
  };
}

/* ---------- 増築：売場が右に 2.5m ずつ広がる（seg=1,2,3,4） ---------- */
export const EXP_WIDTH = 2.5;
const EXP_POSTERS = [
  ['冷たい水あります', '#e8f4ff', '#2f7ff0'],
  ['あったか おでん…!?', '#fff2dc', '#d6453d'],
  ['スイーツ 新登場', '#ffe8f0', '#e8688a'],
  ['いつもありがとう', '#f3efe4', '#1fa463'],
];
export function buildExpansion(seg = 1) {
  const g = new THREE.Group();
  const x0 = B.x1 + EXP_WIDTH * (seg - 1), x1 = x0 + EXP_WIDTH;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const SD = SLAB.z1 - SLAB.z0;
  // 土台・床（手前の歩道もつなげる）
  const s0 = seg === 1 ? 4.1 : x0 + 0.7, s1 = x1 + 0.7;
  const slab = new THREE.Mesh(new RoundedBoxGeometry(s1 - s0, 0.7, SD, 2, 0.1), M('#7f8f9c'));
  slab.position.set((s0 + s1) / 2, -0.35, (SLAB.z0 + SLAB.z1) / 2);
  g.add(slab);
  floorPlane(g, s0, s1, SLAB.z0, SLAB.z1, 0.005, tileTex('#d4d7da', '#c8ccd0', '#b9bec3', s1 - s0, SD));
  floorPlane(g, x0, x1, B.z0, B.z1, 0.012, tileTex('#f7f5ee', '#e9ece8', '#d3d8d6', w, B.z1 - B.z0));
  // 奥の壁・ストライプ
  bx(g, [w + 0.15, 3.0, 0.3], '#f3efe4', [x0 + 0.15 + w / 2 - 0.075, 0, B.z0], { r: 0.02 });
  bx(g, [w + 0.15, 0.9, 0.31], '#cdd5da', [x0 + 0.15 + w / 2 - 0.075, 0, B.z0], { r: 0.02 });
  ['#1fa463', '#2f7ff0', '#ff8a2a'].forEach((c, i) => bx(g, [w - 0.1, 0.1, 0.02], c, [cx, 2.45 - i * 0.14, B.z0 + 0.16], { r: 0.003 }));
  // 右・手前の低い縁（右の縁は、さらに広げたら隠す）
  const curb = bx(g, [0.25, 0.4, B.z1 - B.z0 + 0.3], '#eceff1', [x1, 0, (B.z0 + B.z1) / 2], { r: 0.03 });
  bx(g, [w + 0.1, 0.4, 0.25], '#eceff1', [cx + 0.05, 0, B.z1], { r: 0.03 });
  // 奥の壁のポスター
  const po = EXP_POSTERS[(seg - 1) % EXP_POSTERS.length];
  plane(g, 1.2, 0.8, signTex(po[0], po[1], po[2], 512, 340, 'bold 52px "Yu Gothic UI","Meiryo",sans-serif'), [cx - 0.15, 1.9, B.z0 + 0.16]);
  // バックヤード：飲み物のケース（最初の増築のとき）
  if (seg === 1) {
    for (let l = 0; l < 2; l++)
      for (let c = 0; c < 2; c++) {
        const x = -2.98, z = -7.9 + c * 0.7;
        bx(g, [0.64, 0.34, 0.44], '#2f7ff0', [x, l * 0.34, z], { r: 0.03 });
        bx(g, [0.02, 0.1, 0.34], '#ffffff', [x + 0.325, l * 0.34 + 0.12, z], { r: 0.004 });
        for (let b = 0; b < 3; b++) cy(g, 0.04, 0.04, 0.1, '#bfe6ff', [x - 0.18 + b * 0.18, l * 0.34 + 0.34, z], 12);
      }
  }
  g.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return { group: g, curb };
}

/* ---------- 店舗・背景まるごと ---------- */
export function buildWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const cx = (B.x0 + B.x1) / 2;
  const W = B.x1 - B.x0;
  const H = B.z1 - B.z0;
  const D = LAYOUT.door;
  const BD = LAYOUT.backDoor;
  const SD = SLAB.z1 - SLAB.z0;

  // 土台（手前は歩道）
  const slab = new THREE.Mesh(new RoundedBoxGeometry(15.3, 0.7, SD, 2, 0.1), M('#7f8f9c'));
  slab.position.set(-3.55, -0.35, (SLAB.z0 + SLAB.z1) / 2);
  slab.receiveShadow = true;
  root.add(slab);
  floorPlane(root, -11.2, B.x0, SLAB.z0, SLAB.z1, 0.005, tileTex('#d4d7da', '#c8ccd0', '#b9bec3', 4.2, SD));
  floorPlane(root, B.x0, 4.1, SLAB.z0, SLAB.z1, 0.003, tileTex('#d4d7da', '#c8ccd0', '#b9bec3', 11.1, SD));
  // 売場（右）とバックヤード（左の縦長）
  floorPlane(root, B.px, B.x1, B.z0, B.z1, 0.01, tileTex('#f7f5ee', '#e9ece8', '#d3d8d6', B.x1 - B.px, H));
  floorPlane(root, B.x0, B.px, B.z0, B.z1, 0.01, tileTex('#c9c3b6', '#bdb7a9', '#a9a395', B.px - B.x0, H));
  // 入口マット
  bx(root, [D.x1 - D.x0, 0.02, 1.1], '#2c4a7c', [D.xc, 0.01, B.z1 - 0.65], { r: 0.005 });

  const wallMat = '#f3efe4';
  // 奥の壁・左の壁
  bx(root, [W + 0.3, 3.0, 0.3], wallMat, [cx, 0, B.z0], { r: 0.02 });
  bx(root, [W + 0.3, 0.9, 0.31], '#cdd5da', [cx, 0, B.z0], { r: 0.02 });
  bx(root, [0.3, 3.0, H + 0.3], wallMat, [B.x0, 0, (B.z0 + B.z1) / 2], { r: 0.02 });
  // 右・手前は低い縁（箱庭の切り欠き）。手前は搬入口と入口のところだけ開ける
  const curbRight = bx(root, [0.25, 0.4, B.z1 - B.z0 + 0.3], '#eceff1', [B.x1, 0, (B.z0 + B.z1) / 2], { r: 0.03 });
  const f0 = B.x0 - 0.15, f1 = B.x1 + 0.15;
  [[f0, BD.x0], [BD.x1, D.x0], [D.x1, f1]].forEach(([a, b]) => bx(root, [b - a, 0.4, 0.25], '#eceff1', [(a + b) / 2, 0, B.z1], { r: 0.03 }));
  // 仕切り壁（低め・縦。通路は LAYOUT.gap）
  [[B.z0, LAYOUT.gap.z0], [LAYOUT.gap.z1, B.z1]].forEach(([a, b]) => {
    bx(root, [0.3, 1.15, b - a], '#e7e2d3', [B.px, 0, (a + b) / 2], { r: 0.03 });
    bx(root, [0.36, 0.08, b - a + 0.06], '#1fa463', [B.px, 1.15, (a + b) / 2], { r: 0.02 });
  });

  // コンビニ風ストライプ
  const stripeCols = ['#1fa463', '#2f7ff0', '#ff8a2a'];
  stripeCols.forEach((c, i) => bx(root, [0.02, 0.1, H], c, [-6.84, 2.45 - i * 0.14, (B.z0 + B.z1) / 2], { r: 0.003 }));
  stripeCols.forEach((c, i) => bx(root, [W - 0.4, 0.1, 0.02], c, [cx, 2.45 - i * 0.14, B.z0 + 0.16], { r: 0.003 }));

  // ポスター・看板
  [['新発売!', '#ffd23f', '#d6453d', -5.5], ['おにぎり 150円', '#ff7a59', '#ffffff', 2.9]].forEach(([t, bg, fg, z]) => {
    const tex = signTex(t, bg, fg, 256, 340, 'bold 44px "Yu Gothic UI","Meiryo",sans-serif');
    plane(root, 0.8, 1.06, tex, [-6.84, 1.7, z], Math.PI / 2);
  });
  plane(root, 1.6, 0.8, signTex('在庫確認!', '#f3efe4', '#d6453d', 512, 256, 'bold 84px "Yu Gothic UI","Meiryo",sans-serif'), [-4.0, 1.9, B.z0 + 0.16]);
  plane(root, 1.6, 0.8, signTex('ミニマート', '#f3efe4', '#1fa463', 512, 256, 'bold 84px "Yu Gothic UI","Meiryo",sans-serif'), [-1.8, 1.9, B.z0 + 0.16]);

  // バックヤードの小物（米袋・段ボール・バケツ）
  for (let l = 0; l < 3; l++)
    for (let c = 0; c < 2; c++) {
      const x = -6.4 + c * 0.7, zo = (l % 2) * 0.05;
      bx(root, [0.66, 0.28, 0.46], '#fffaf0', [x, l * 0.28, -7.5 + zo], { r: 0.06 });
      bx(root, [0.4, 0.12, 0.02], '#d6453d', [x, l * 0.28 + 0.08, -7.26 + zo], { r: 0.004 });
    }
  bx(root, [0.55, 0.4, 0.45], '#c8964f', [-6.05, 0.84, -7.5], { r: 0.03 });
  cy(root, 0.26, 0.2, 0.42, '#3f6fb5', [-3.2, 0, -4.5], 20);
  cy(root, 0.03, 0.03, 1.2, '#b98a5a', [-3.0, 0.3, -4.5], 8).rotation.z = 0.25;

  // 観葉植物（売場）
  cy(root, 0.3, 0.24, 0.4, '#c97b4a', [3.0, 0, 3.4], 20);
  [[0, 0.7, 0, 0.32], [0.14, 0.95, 0.05, 0.26], [-0.13, 0.9, -0.05, 0.25]].forEach(([x, y, z, r]) => sp(root, r, '#48a85a', [3.0 + x, y, 3.4 + z]));

  // 屋外：ポール看板・木・植え込み・A型看板（入口の前の歩道）
  cy(root, 0.07, 0.07, 3.4, '#4b5a66', [-10.3, 0, -1.0], 10);
  bx(root, [0.12, 1.1, 1.7], '#ffffff', [-10.3, 2.7, -1.0], { r: 0.04 });
  plane(root, 1.55, 0.95, signTex('ミニマート', '#1fa463', '#ffffff', 512, 320, 'bold 92px "Yu Gothic UI","Meiryo",sans-serif'), [-10.23, 3.25, -1.0], Math.PI / 2);
  cy(root, 0.14, 0.18, 1.3, '#8a5a35', [-9.6, 0, -7.8], 12);
  [[0, 2.0, 0, 0.9], [0.5, 1.7, 0.3, 0.65], [-0.45, 1.75, -0.2, 0.7]].forEach(([x, y, z, r]) => sp(root, r, '#5fb86b', [-9.6 + x, y, -7.8 + z]));
  for (let i = 0; i < 3; i++) sp(root, 0.34, '#6fc47a', [-8.0 + (i % 2) * 0.15, 0.3, -2.4 + i * 1.0], {}, 0.8);
  bx(root, [0.8, 1.0, 0.1], '#ffffff', [2.2, 0, 5.4], { r: 0.03 });
  plane(root, 0.74, 0.9, signTex('おにぎり\n150円', '#ffd23f', '#d6453d', 256, 320, 'bold 50px "Yu Gothic UI","Meiryo",sans-serif'), [2.2, 0.5, 5.46], 0);

  root.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { root, curbRight };
}

/* ---------- 駐車場・道路・乗り物（車は +z が前） ---------- */
export const LOT = {
  x0: -11.2, x1: 14.4, z0: 6.6, z1: 21.0, // 駐車場と道路の土台
  spotsX: [-9.2, -6.4, -3.6, -0.8, 2.0, 4.8, 7.6, 10.4], // 駐車スペースの中心x
  pitch: 2.8, // スペースの幅
  spotZ: 9.9, // 停めたときの車の中心z
  frontZ: 7.6, // スペースの手前（店側）の縁
  backZ: 12.2, // スペースの奥の縁
  aisleZ: 13.4, // 車が走る通路
  roadZ: 18.4, // 道路（バスが止まる車線）
  entryX: 18.5, // 道路から入ってくる側
  exitX: -18.5,
  busX: -2.0,
};
/** 近いスペース間のすきま（人が通る道）のx */
export const LOT_GAPS = LOT.spotsX.map((x) => x + LOT.pitch / 2);

export function makeCar(kind = 'sedan', color = '#d6453d') {
  const g = new THREE.Group();
  const yank = kind === 'yankee';
  const van = kind === 'van';
  const kei = kind === 'kei';
  const W = kei ? 1.55 : 1.8, L = kei ? 3.5 : van ? 4.5 : yank ? 4.4 : 4.2;
  const bh = yank ? 0.5 : van ? 0.95 : 0.65;
  const cabH = yank ? 0.42 : van ? 0.8 : 0.58;
  const glass = '#2a4155';
  bx(g, [W, bh, L], color, [0, 0.22, 0], { r: 0.12 });
  if (van) {
    bx(g, [W - 0.06, cabH, L * 0.82], color, [0, 0.22 + bh, -0.1], { r: 0.1 });
    bx(g, [W - 0.02, cabH * 0.55, L * 0.8], glass, [0, 0.22 + bh + cabH * 0.22, -0.1], { r: 0.05 });
  } else {
    const cl = L * (yank ? 0.42 : 0.5);
    bx(g, [W - 0.16, cabH, cl], color, [0, 0.22 + bh, -L * 0.06], { r: 0.1 });
    bx(g, [W - 0.1, cabH * 0.6, cl - 0.12], glass, [0, 0.22 + bh + cabH * 0.18, -L * 0.06], { r: 0.05 });
    bx(g, [W - 0.2, 0.06, cl - 0.3], color, [0, 0.22 + bh + cabH - 0.02, -L * 0.06], { r: 0.02 });
  }
  // ライト
  const hl = M('#fff7d0', { emissive: '#ffe9a0', emissiveIntensity: 0.9 });
  const tl = M('#ff4a3d', { emissive: '#d01c10', emissiveIntensity: 0.8 });
  [-1, 1].forEach((s) => {
    bx(g, [0.3, 0.14, 0.06], '#fff7d0', [s * (W / 2 - 0.3), 0.5, L / 2 - 0.01], { r: 0.02, material: hl });
    bx(g, [0.3, 0.12, 0.06], '#ff4a3d', [s * (W / 2 - 0.3), 0.55, -L / 2 + 0.01], { r: 0.02, material: tl });
  });
  // タイヤ
  [[-1, 1.25], [1, 1.25], [-1, -1.25], [1, -1.25]].forEach(([sx, sz]) => {
    const z = sz * (L / 4.2);
    const w = cy(g, 0.32, 0.32, 0.24, '#1d2125', [sx * (W / 2 - 0.05), 0, z], 18);
    w.rotation.z = Math.PI / 2;
    w.position.y = 0.32;
  });
  if (yank) {
    // 低い車高・大きなウイング・足元のネオン
    bx(g, [W + 0.1, 0.06, 0.5], '#1b1420', [0, 1.25, -L / 2 + 0.1], { r: 0.01 });
    [-1, 1].forEach((s) => bx(g, [0.06, 0.4, 0.06], '#1b1420', [s * (W / 2 - 0.2), 0.85, -L / 2 + 0.15], { r: 0.01 }));
    const neon = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.6, L + 0.5), new THREE.MeshBasicMaterial({ color: '#ff5ad8', transparent: true, opacity: 0.55, depthWrite: false }));
    neon.rotation.x = -Math.PI / 2;
    neon.position.y = 0.03;
    neon.userData.noShadow = true;
    g.add(neon);
    bx(g, [0.5, 0.05, 1.0], '#f2f2f2', [0, 0.77, 0.55], { r: 0.01 }); // ボンネットのライン
  }
  return { group: g, length: L, width: W };
}

export function makeBus() {
  const g = new THREE.Group();
  const L = 9.4, W = 2.55, H = 3.0;
  bx(g, [W, H - 0.5, L], '#f4f6f8', [0, 0.5, 0], { r: 0.2 });
  bx(g, [W + 0.02, 0.5, L - 0.2], '#2f7ff0', [0, 0.5, 0], { r: 0.06 }); // 下の帯
  bx(g, [W + 0.02, 0.18, L - 0.2], '#1fa463', [0, 1.05, 0], { r: 0.03 });
  bx(g, [W + 0.03, 0.8, L - 1.2], '#2a4155', [0, 1.55, -0.1], { r: 0.1 }); // 窓の帯
  bx(g, [W - 0.2, 0.9, 0.05], '#2a4155', [0, 1.5, L / 2 + 0.005], { r: 0.04 }); // フロントガラス
  bx(g, [W - 0.5, 0.28, 0.05], '#ffe14a', [0, 2.65, L / 2 + 0.01], { r: 0.03 }); // 行先表示
  const hl = M('#fff7d0', { emissive: '#ffe9a0', emissiveIntensity: 0.9 });
  [-1, 1].forEach((s) => bx(g, [0.36, 0.2, 0.06], '#fff7d0', [s * (W / 2 - 0.35), 0.75, L / 2 + 0.01], { r: 0.02, material: hl }));
  [-1, 1].forEach((s) => [3.2, 2.2, -2.5, -3.5].forEach((z) => {
    const w = cy(g, 0.46, 0.46, 0.3, '#1d2125', [s * (W / 2 - 0.05), 0, z], 20);
    w.rotation.z = Math.PI / 2;
    w.position.y = 0.46;
  }));
  // 乗降口（左側 = 進行方向に向かって右。ここから降りる）
  bx(g, [0.05, 1.9, 1.2], '#a8c6d8', [-W / 2 - 0.01, 0.55, 2.6], { r: 0.02 });
  return { group: g, length: L, width: W };
}

export function buildLot() {
  const g = new THREE.Group();
  const w = LOT.x1 - LOT.x0, d = LOT.z1 - LOT.z0;
  const cx = (LOT.x0 + LOT.x1) / 2, cz = (LOT.z0 + LOT.z1) / 2;
  // 土台とアスファルト
  const slab = new THREE.Mesh(new RoundedBoxGeometry(w, 0.7, d, 2, 0.1), M('#6d7780'));
  slab.position.set(cx, -0.35, cz);
  g.add(slab);
  const asph = canvasTex(256, 256, (c, ww, hh) => {
    c.fillStyle = '#4b5158';
    c.fillRect(0, 0, ww, hh);
    for (let i = 0; i < 900; i++) {
      const v = 70 + Math.random() * 28;
      c.fillStyle = `rgba(${v},${v + 3},${v + 8},0.5)`;
      c.fillRect(Math.random() * ww, Math.random() * hh, 2, 2);
    }
  });
  asph.wrapS = asph.wrapT = THREE.RepeatWrapping;
  asph.repeat.set(w / 3, d / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: asph, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.006, cz);
  floor.receiveShadow = true;
  g.add(floor);
  // 駐車スペースの白線・輪止め
  const line = (x, z, ww, dd, col = '#ecebe4') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, dd), new THREE.MeshBasicMaterial({ color: col }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    m.userData.noShadow = true;
    g.add(m);
  };
  const lz = (LOT.frontZ + LOT.backZ) / 2, ld = LOT.backZ - LOT.frontZ;
  for (let i = 0; i <= LOT.spotsX.length; i++) {
    const x = i === 0 ? LOT.spotsX[0] - LOT.pitch / 2 : LOT.spotsX[i - 1] + LOT.pitch / 2;
    line(x, lz, 0.1, ld);
  }
  line((LOT.spotsX[0] + LOT.spotsX[LOT.spotsX.length - 1]) / 2, LOT.backZ, LOT.spotsX[LOT.spotsX.length - 1] - LOT.spotsX[0] + LOT.pitch, 0.1);
  LOT.spotsX.forEach((x) => bx(g, [1.3, 0.14, 0.2], '#b8bdc2', [x, 0, LOT.frontZ + 0.2], { r: 0.03 }));
  // 道路：中央線と歩道側の縁
  for (let x = LOT.x0 + 0.8; x < LOT.x1; x += 2.6) line(x, LOT.roadZ + 1.3, 1.4, 0.14, '#f0c93a');
  line(cx, LOT.roadZ - 2.2, w, 0.1);
  // バス停
  bx(g, [0.1, 2.6, 0.1], '#6b7780', [LOT.busX + 5.8, 0, LOT.roadZ - 2.5], { r: 0.02 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshBasicMaterial({ map: signTex('バス停', '#2f7ff0', '#ffffff', 256, 160, 'bold 72px "Yu Gothic UI","Meiryo",sans-serif') }));
  sign.position.set(LOT.busX + 5.8, 2.5, LOT.roadZ - 2.43);
  g.add(sign);
  // 看板：P
  const pSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: signTex('P', '#2f7ff0', '#ffffff', 192, 192, 'bold 140px "Yu Gothic UI","Meiryo",sans-serif') }));
  bx(g, [0.1, 2.2, 0.1], '#6b7780', [LOT.x0 + 0.8, 0, LOT.frontZ - 0.4], { r: 0.02 });
  pSign.position.set(LOT.x0 + 0.8, 2.5, LOT.frontZ - 0.33);
  g.add(pSign);
  // 街灯（夜は光る）
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff3c0', emissive: '#ffd96a', emissiveIntensity: 0.15, roughness: 0.4 });
  [-9.8, -3.2, 3.2, 9.8].forEach((x) => {
    cy(g, 0.06, 0.08, 4.2, '#59646d', [x, 0, LOT.aisleZ + 1.6], 10);
    bx(g, [0.7, 0.07, 0.07], '#59646d', [x, 4.15, LOT.aisleZ + 1.6 - 0.3], { r: 0.01 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.26), lampMat);
    head.position.set(x, 4.1, LOT.aisleZ + 1.3);
    g.add(head);
  });
  // 植え込み
  [[LOT.x0 + 0.6, 8.6], [LOT.x1 - 0.6, 8.6], [LOT.x0 + 0.6, 12.8]].forEach(([x, z]) => {
    bx(g, [0.9, 0.35, 1.8], '#a9a59a', [x, 0, z], { r: 0.05 });
    [0, 1].forEach((i) => sp(g, 0.42, '#58b368', [x + (i - 0.5) * 0.2, 0.7, z + (i - 0.5) * 0.9], {}, 0.85));
  });
  g.traverse((o) => { if (o.isMesh && !o.userData.noShadow && o !== floor) { o.castShadow = true; o.receiveShadow = true; } });
  return { group: g, lampMat };
}

