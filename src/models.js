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
  backDoor: { x0: -6.25, x1: -5.0, xc: -5.625, z: 4, use: { x: -5.625, z: 2.75 } },
  gap: { z0: -3.5, z1: -1.5 }, // 仕切り壁の通路
  queue: (i) => ({ x: -0.15, z: -6.2 + 0.8 * Math.min(i, 4) }),
  entryPath: [{ x: 0.125, z: 4.2 }, { x: 0.9, z: 3.0 }],
  exitPath: [{ x: 0.6, z: -6.0 }, { x: 0.6, z: 2.9 }, { x: 0.125, z: 3.7 }, { x: 0.125, z: 6.3 }],
  spawn: { x: 0.125, z: 6.3 },
  view: { x: -3.6, z: -1.25 },
  fridge: { x: 4.25, z: -7.725, use: { x: 4.25, z: -5.8 } },
};
/** Lv.3 の増築で追加される当たり判定 */
export const EXP_COLLIDERS = [
  { x0: 3.75, x1: 4.75, z0: -8.5, z1: -7.1 }, // 水の冷蔵庫
  { x0: -4.25, x1: -2.85, z0: -8.2, z1: -6.8 }, // 水のケース（バックヤード）
];

/* 当たり判定(AABB) */
export const COLLIDERS = [
  // 仕切り壁（通路は z -3.5〜-1.5）
  { x0: -2.65, x1: -2.35, z0: -8.5, z1: LAYOUT.gap.z0 },
  { x0: -2.65, x1: -2.35, z0: LAYOUT.gap.z1, z1: 4.0 },
  // 炊飯器の台 / 握り台
  { x0: -7.0, x1: -6.0, z0: -0.25, z1: 1.5 },
  { x0: -7.0, x1: -5.95, z0: -3.0, z1: -1.0 },
  { x0: -7.0, x1: -5.95, z0: -3.95, z1: -3.15 },
  // 米袋・バケツ
  { x0: -6.75, x1: -5.35, z0: -8.2, z1: -6.8 },
  { x0: -3.5, x1: -2.9, z0: -4.8, z1: -4.2 },
  // レジカウンター（縦長）
  { x0: -1.4, x1: -0.6, z0: -8.5, z1: -5.5 },
  // 観葉植物
  { x0: 2.7, x1: 3.3, z0: 3.1, z1: 3.7 },
];
export const SHELF_COLLIDERS = [{ x0: 0.5, x1: 2.5, z0: -8.5, z1: -7.35 }];

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
export function makeOnigiri(scale = 1, kind = 'shio') {
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
    anim(dt, speed, working = false) {
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

/* ---------- 棚（おにぎり冷蔵ケース） ---------- */
export const KIND_IDS = ['shio', 'ume', 'okaka'];
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
    const key = t * 100 + i * 4 + KIND_IDS.indexOf(k);
    let o = cache.get(key);
    if (!o) {
      o = makeOnigiri(0.75, k);
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
              const o = cache.get(t * 100 + i * 4 + KIND_IDS.indexOf(k));
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

/* ---------- 炊飯器 ---------- */
export function buildCooker() {
  const g = new THREE.Group();
  bx(g, [1.75, 0.9, 1.0], '#cfd6db', [0, 0, 0], { r: 0.05 });
  bx(g, [1.85, 0.07, 1.1], '#a8b4bc', [0, 0.9, 0], { r: 0.03 });
  const c = new THREE.Group();
  c.position.set(-0.2, 0.97, 0);
  c.scale.setScalar(0.88);
  g.add(c);
  cy(c, 0.52, 0.56, 0.62, '#f6f2ea', [0, 0, 0]);
  cy(c, 0.575, 0.575, 0.1, '#d6453d', [0, 0.18, 0]);
  const lid = sp(c, 0.52, '#f6f2ea', [0, 0.62, 0], {}, 0.45);
  cy(c, 0.09, 0.09, 0.1, '#444', [0, 0.84, 0]);
  bx(c, [0.5, 0.2, 0.05], '#2f3a40', [0, 0.28, 0.54], { r: 0.02 });
  const ledMat = new THREE.MeshStandardMaterial({ color: '#555', emissive: '#000', roughness: 0.4 });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), ledMat);
  led.position.set(0.14, 0.38, 0.575);
  c.add(led);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), M('#e8e8e8'));
  lamp.position.set(-0.14, 0.38, 0.575);
  c.add(lamp);

  const steam = [];
  const smat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), smat.clone());
    s.visible = false;
    c.add(s);
    steam.push(s);
  }
  // 食器・しゃもじ
  cy(g, 0.12, 0.1, 0.1, '#ffffff', [0.6, 0.97, 0.25], 16);
  bx(g, [0.06, 0.02, 0.3], '#d8b98a', [0.62, 1.02, 0.25], { r: 0.008 });
  return {
    group: g,
    setLed(state) {
      const col = state === 'cooking' ? '#ff9a1f' : state === 'ready' ? '#38e07b' : '#555555';
      ledMat.color.set(col);
      ledMat.emissive.set(state === 'idle' ? '#000000' : col);
    },
    animateSteam(t, on) {
      steam.forEach((s, i) => {
        s.visible = on;
        if (!on) return;
        const k = (t * 0.6 + i / steam.length) % 1;
        s.position.set(Math.sin(i * 2.1 + t) * 0.15, 0.9 + k * 1.1, Math.cos(i * 1.7) * 0.12);
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
  const mkBowl = (x, kind, rimColor, fill) => {
    const b = new THREE.Group();
    b.position.set(x, 0, -0.33);
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

  return {
    group: g,
    tub, bowls,
    targets: [tub, bowls.salt, bowls.ume, bowls.okaka],
    setRice(n) {
      mound.visible = n > 0;
      mound.scale.set(1, 0.25 + Math.min(n, 16) * 0.025, 1);
    },
    setBowls(level) {
      bowls.ume.visible = level >= 2;
      bowls.okaka.visible = level >= 2;
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

/* ---------- 水の冷蔵庫（Lv.3） 幅1.0m × 奥行1.25m ---------- */
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
  const sign = plane(g, W - 0.1, 0.18, signTex('お水', '#2f7ff0', '#ffffff', 512, 64, 'bold 46px "Yu Gothic UI","Meiryo",sans-serif'), [0, 1.88, hd + 0.065]);
  sign.castShadow = false;
  bx(g, [W - 0.2, 0.03, D - 0.2], '#bfe9ff', [0, 1.7, 0.0], { r: 0.005, mat: { emissive: '#8fd3ff' } });

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.88, roughness: 0.15 });
  const mkBottle = (parent, x, y, z) => {
    const b = new THREE.Group();
    b.position.set(x, y, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 14), bodyMat);
    body.position.y = 0.1;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.06, 14), bodyMat);
    neck.position.y = 0.23;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), M('#ffffff'));
    cap.position.y = 0.275;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.07, 14), M('#2f7ff0'));
    label.position.y = 0.1;
    b.add(body, neck, cap, label);
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
    mkBottle(grp, cx - 0.07, y, cz);
    mkBottle(grp, cx + 0.07, y, cz);
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
    setCount(n) { slots.forEach((s2, i) => { s2.visible = i < n; }); },
  };
}

/* ---------- 増築（Lv.3）：売場が右に広がる ---------- */
export function buildExpansion() {
  const g = new THREE.Group();
  const x0 = B.x1, x1 = 6.0; // 3.5 → 6.0
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  const SD = SLAB.z1 - SLAB.z0;
  // 土台・床
  const slab = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.7, SD, 2, 0.1), M('#7f8f9c'));
  slab.position.set(5.4, -0.35, (SLAB.z0 + SLAB.z1) / 2);
  g.add(slab);
  floorPlane(g, 4.1, 6.7, SLAB.z0, SLAB.z1, 0.005, tileTex('#d4d7da', '#c8ccd0', '#b9bec3', 2.6, SD));
  floorPlane(g, x0, x1, B.z0, B.z1, 0.012, tileTex('#f7f5ee', '#e9ece8', '#d3d8d6', w, B.z1 - B.z0));
  // 奥の壁・ストライプ
  bx(g, [w + 0.15, 3.0, 0.3], '#f3efe4', [x0 + 0.15 + w / 2 - 0.075, 0, B.z0], { r: 0.02 });
  bx(g, [w + 0.15, 0.9, 0.31], '#cdd5da', [x0 + 0.15 + w / 2 - 0.075, 0, B.z0], { r: 0.02 });
  ['#1fa463', '#2f7ff0', '#ff8a2a'].forEach((c, i) => bx(g, [w - 0.1, 0.1, 0.02], c, [cx, 2.45 - i * 0.14, B.z0 + 0.16], { r: 0.003 }));
  // 右・手前の低い縁
  bx(g, [0.25, 0.4, B.z1 - B.z0 + 0.3], '#eceff1', [x1, 0, (B.z0 + B.z1) / 2], { r: 0.03 });
  bx(g, [w + 0.1, 0.4, 0.25], '#eceff1', [cx + 0.05, 0, B.z1], { r: 0.03 });
  // 奥の壁のポスター
  plane(g, 1.2, 0.8, signTex('冷たい水あります', '#e8f4ff', '#2f7ff0', 512, 340, 'bold 52px "Yu Gothic UI","Meiryo",sans-serif'), [5.3, 1.9, B.z0 + 0.16]);
  // バックヤード：水のケース
  for (let l = 0; l < 2; l++)
    for (let c = 0; c < 2; c++) {
      const x = -3.9 + c * 0.7;
      bx(g, [0.64, 0.34, 0.44], '#2f7ff0', [x, l * 0.34, -7.5], { r: 0.03 });
      bx(g, [0.5, 0.1, 0.02], '#ffffff', [x, l * 0.34 + 0.12, -7.27], { r: 0.004 });
      for (let b = 0; b < 3; b++) cy(g, 0.04, 0.04, 0.1, '#bfe6ff', [x - 0.18 + b * 0.18, l * 0.34 + 0.34, -7.5], 12);
    }
  g.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) { o.castShadow = true; o.receiveShadow = true; }
  });
  return { group: g };
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
