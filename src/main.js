import * as THREE from 'three';
import {
  LAYOUT, COLLIDERS, SHELF_COLLIDERS, EXP_COLLIDERS, KIND_IDS, bx, cy, sp,
  makeOnigiri, makePerson, buildShelf, buildCooker, buildStation, buildTrayStand, buildRegister, buildDoor, buildBackDoor, buildFridge, buildExpansion, buildWorld,
} from './models.js';

/* =====================================================================
 *  ユーティリティ
 * ===================================================================== */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const yen = (n) => '¥' + Math.round(n).toLocaleString('ja-JP');
const rad = (d) => (d * Math.PI) / 180;
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* =====================================================================
 *  データ定義
 * ===================================================================== */
const OLD_SAVE_KEY = 'konbini-hakoniwa-v2';
const SLOT_COUNT = 3;
const slotKey = (n) => `konbini-hakoniwa-v2-slot${n}`;
const COOK_TIME = 6;
const DAY_START = 7;
const DAY_END = 22;
const DAY_SECONDS = 240; // 1日の長さ(実時間)
const STATION_RICE_MAX = 16;
const TRAY_MAX = 12;
const DELIVERY_SECONDS = 8;
const expNeed = (lv) => 40 + 25 * (lv - 1);

// おにぎりの種類
const KINDS = {
  shio: { name: '塩むすび', short: '塩', price: 150, ing: 'salt', lv: 1, weight: 0.5 },
  ume: { name: '梅むすび', short: '梅', price: 200, ing: 'ume', lv: 2, weight: 0.25 },
  okaka: { name: 'おかかむすび', short: 'か', price: 200, ing: 'okaka', lv: 2, weight: 0.25 },
};
// 食材（裏口から注文）
const ING = {
  rice: { name: '米', icon: '🍚', pack: 10, cost: 100, lv: 1 },
  salt: { name: '塩', icon: '🧂', pack: 10, cost: 50, lv: 1 },
  ume: { name: '梅干し', icon: '🔴', pack: 10, cost: 250, lv: 2 },
  okaka: { name: 'おかか', icon: '🐟', pack: 10, cost: 200, lv: 2 },
  water: { name: '水', icon: '💧', pack: 10, cost: 70, lv: 3 },
};
const ING_IDS = ['rice', 'salt', 'ume', 'okaka', 'water'];
const WATER_PRICE = 120;
const emptyCounts = () => ({ shio: 0, ume: 0, okaka: 0 });
const sumC = (c) => c.shio + c.ume + c.okaka;
const listOf = (c) => {
  const a = [];
  KIND_IDS.forEach((k) => { for (let i = 0; i < c[k]; i++) a.push(k); });
  return a;
};

const defaultState = () => ({
  money: 500, exp: 0, level: 1, day: 1, time: DAY_START, opened: false, rep: 3,
  up: { shelfCap: 0, cooker: 0, craft: 0, carry: 0, poster: 0, cashier: 0 },
  inv: { rice: 8, salt: 8, ume: 0, okaka: 0, water: 0 },
  pending: [],
  tiers: ['shio', 'shio', 'shio', 'shio'], // 棚の各段（上から）に置くおにぎり
  stats: { sales: 0, customers: 0, lost: 0 },
});
let S = defaultState();
let currentSlot = 0; // 0 = タイトル画面（未開始）
let started = false;
let paused = false;
const kindUnlocked = (k) => S.level >= KINDS[k].lv;

function readSlot(n) {
  try {
    const j = JSON.parse(localStorage.getItem(slotKey(n)) || 'null');
    if (j && j.v === 2) {
      const d = defaultState();
      return {
        ...d, ...j.s, up: { ...d.up, ...j.s.up }, inv: { ...d.inv, ...j.s.inv },
        stats: { ...d.stats, ...j.s.stats }, pending: Array.isArray(j.s.pending) ? j.s.pending : [], opened: false,
        tiers: Array.isArray(j.s.tiers) && j.s.tiers.length === 4 && j.s.tiers.every((k) => KINDS[k]) ? j.s.tiers : d.tiers,
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}
function save() {
  if (!currentSlot) return;
  try { localStorage.setItem(slotKey(currentSlot), JSON.stringify({ v: 2, s: S })); } catch (e) { /* ignore */ }
}
try { // 旧セーブをスロット1へ
  const old = localStorage.getItem(OLD_SAVE_KEY);
  if (old) {
    if (!localStorage.getItem(slotKey(1))) localStorage.setItem(slotKey(1), old);
    localStorage.removeItem(OLD_SAVE_KEY);
  }
} catch (e) { /* ignore */ }

const UPG = [
  { id: 'shelfCap', name: '棚の収納量アップ', desc: '1段に置けるおにぎりの数', costs: [600, 1200, 2400, 4800], vals: [4, 8, 12, 16, 20], fmt: (v) => `${v}個` },
  { id: 'cooker', name: '炊飯器を大型化', desc: '1回で炊けるごはんの量', costs: [600, 1200, 2400], vals: [4, 6, 8, 10], fmt: (v) => `${v}膳` },
  { id: 'craft', name: '握りの腕前', desc: 'おにぎりを握る時間', costs: [700, 1400, 2800], vals: [1.6, 1.2, 0.9, 0.6], fmt: (v) => `${v}秒` },
  { id: 'carry', name: '運搬カゴ', desc: '一度に運べる数', costs: [500, 1500], vals: [8, 12, 16], fmt: (v) => `${v}個` },
  { id: 'poster', name: '集客ポスター', desc: 'お客さんの来店ペース', costs: [1000, 2000, 4000], vals: [1, 1.25, 1.5, 1.8], fmt: (v) => `×${v}` },
  { id: 'cashier', name: 'レジ係を雇う', desc: '店員がレジを自動で打ってくれる', costs: [3000], vals: [0, 1], fmt: (v) => (v ? '雇用中' : 'なし') },
];
const UPG_BY_ID = Object.fromEntries(UPG.map((u) => [u.id, u]));
const val = (id) => UPG_BY_ID[id].vals[S.up[id]];

/* =====================================================================
 *  レンダラー / カメラ / ライト
 * ===================================================================== */
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 300);
const view = { az: rad(40), el: rad(41), dist: 27, target: new THREE.Vector3(LAYOUT.view.x, 0.3, LAYOUT.view.z) };
let userZoomed = false;
let expanded = false; // Lv.3 の増築済みか
function defaultDist() {
  const a = window.innerWidth / window.innerHeight;
  const base = !(a > 0) || a >= 1.75 ? 30.5 : 30.5 * Math.min(1.75 / a, 1.8);
  return base * (expanded ? 1.1 : 1);
}
view.dist = defaultDist();
function updateCamera() {
  const { az, el, dist, target } = view;
  camera.position.set(
    target.x + dist * Math.cos(el) * Math.sin(az),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(el) * Math.cos(az),
  );
  camera.lookAt(target);
}
// 握りモード用：左上のワイプに映す店内カメラ（固定）
const wipeCam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 300);
wipeCam.position.set(
  LAYOUT.view.x + 29 * Math.cos(rad(41)) * Math.sin(rad(40)),
  0.3 + 29 * Math.sin(rad(41)),
  LAYOUT.view.z + 29 * Math.cos(rad(41)) * Math.cos(rad(40)),
);
wipeCam.lookAt(LAYOUT.view.x, 0.3, LAYOUT.view.z);

function onResize() {
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  fpsCam.aspect = w / h;
  fpsCam.updateProjectionMatrix();
  if (!userZoomed) view.dist = defaultDist();
}
const fpsCam = new THREE.PerspectiveCamera(58, 1, 0.05, 60);
window.addEventListener('resize', onResize);
onResize();

const hemi = new THREE.HemisphereLight('#ffffff', '#a9b8c4', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
sun.position.set(LAYOUT.view.x + 10, 22, LAYOUT.view.z + 14);
sun.target.position.set(LAYOUT.view.x, 0, LAYOUT.view.z);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 13, bottom: -13, near: 1, far: 80 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const LIGHT_KEYS = [
  [7, '#ffe0bd', 2.2, 1.0], [10, '#fff4e4', 2.7, 1.1], [14, '#ffffff', 3.0, 1.15],
  [17, '#ffc88a', 2.4, 1.0], [19.5, '#ff9f7d', 1.8, 0.9], [22, '#8aa0e0', 1.2, 0.85],
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function applyLighting(h) {
  let a = LIGHT_KEYS[0], b = LIGHT_KEYS[LIGHT_KEYS.length - 1];
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    if (h >= LIGHT_KEYS[i][0] && h <= LIGHT_KEYS[i + 1][0]) { a = LIGHT_KEYS[i]; b = LIGHT_KEYS[i + 1]; break; }
  }
  const t = a === b ? 0 : (h - a[0]) / (b[0] - a[0]);
  sun.color.copy(_c1.set(a[1]).lerp(_c2.set(b[1]), t));
  sun.intensity = a[2] + (b[2] - a[2]) * t;
  hemi.intensity = a[3] + (b[3] - a[3]) * t;
}

/* =====================================================================
 *  世界のオブジェクト
 * ===================================================================== */
const world = buildWorld(scene);
function shadowize(o) {
  o.traverse((m) => { if (m.isMesh && !m.userData.noShadow) { m.castShadow = true; m.receiveShadow = true; } });
}
const clickRoots = []; // クリックで反応するもの

// 店の自動ドア（正面）
const door = buildDoor();
scene.add(door.group);
let doorOpen = 0, doorWasOpen = false;

// 裏口（食材の搬入口）
const backDoor = buildBackDoor();
scene.add(backDoor.group);
shadowize(backDoor.group);
let backDoorOpen = 0;

// 炊飯器
const cookerModel = buildCooker();
cookerModel.group.position.set(LAYOUT.cooker.x, 0, LAYOUT.cooker.z);
cookerModel.group.rotation.y = LAYOUT.cooker.rot;
scene.add(cookerModel.group);
shadowize(cookerModel.group);
const cooker = { state: 'idle', t: 0, rice: 0, batch: 0 };

// 握り台
const stationModel = buildStation();
stationModel.group.position.set(LAYOUT.station.x, 0, LAYOUT.station.z);
stationModel.group.rotation.y = LAYOUT.station.rot;
const STATION_K = LAYOUT.station.k; // 通常は小さく、握りモード中だけ実寸
stationModel.group.scale.setScalar(STATION_K);
scene.add(stationModel.group);
shadowize(stationModel.group);
// トレー台（握り台とは別の足場）
const trayModel = buildTrayStand();
trayModel.group.position.set(LAYOUT.tray.x, 0, LAYOUT.tray.z);
trayModel.group.rotation.y = LAYOUT.tray.rot;
scene.add(trayModel.group);
shadowize(trayModel.group);
const stn = { rice: 0, tray: emptyCounts(), order: [], armed: true };

// レジ
const regModel = buildRegister(LAYOUT.register.len, -1);
regModel.group.position.set(LAYOUT.register.x, 0, LAYOUT.register.z);
regModel.group.rotation.y = LAYOUT.register.rot;
scene.add(regModel.group);
shadowize(regModel.group);
const reg = { serving: null, t: 0, autoT: 0 };

// 棚（おにぎりの棚は1つ）：4段、1段に12個まで、1段に1種類
const tierCap = () => val('shelfCap'); // 1段に置ける数（アップグレードで 4→8→12→16→20）
const shelves = LAYOUT.shelves.map((pos, i) => {
  const model = buildShelf();
  model.group.position.set(pos.x, 0, pos.z);
  model.group.rotation.y = pos.rot;
  scene.add(model.group);
  shadowize(model.group);
  const sh = { i, pos, model, cap: 4 * tierCap(), tiers: [0, 1, 2, 3].map(() => ({ kind: 'shio', n: 0 })) };
  // 種類ごとの在庫（読み取り専用）
  Object.defineProperty(sh, 'stock', { get() { const c = emptyCounts(); sh.tiers.forEach((t) => { c[t.kind] += t.n; }); return c; } });
  return sh;
});
const shelfTotal = (sh) => sh.tiers.reduce((a, t) => a + t.n, 0);
const shelfKindCount = (sh, k) => sh.tiers.reduce((a, t) => a + (t.kind === k ? t.n : 0), 0);
function shelfTake(sh, k) {
  const t = sh.tiers.find((x) => x.kind === k && x.n > 0);
  if (!t) return false;
  t.n--;
  return true;
}
function shelfAdd(sh, k, n) {
  let left = n;
  for (const t of sh.tiers) {
    if (t.kind !== k) continue;
    const m = Math.min(left, tierCap() - t.n);
    t.n += m;
    left -= m;
  }
  return n - left;
}
function refreshShelf(sh) { sh.model.setTiers(sh.tiers); }

// Lv.3：店が右に広がり、水の冷蔵庫ができる
const expansion = buildExpansion();
expansion.group.visible = false;
scene.add(expansion.group);
const fridgeModel = buildFridge();
fridgeModel.group.position.set(LAYOUT.fridge.x, 0, LAYOUT.fridge.z);
fridgeModel.group.visible = false;
scene.add(fridgeModel.group);
shadowize(fridgeModel.group);
const fridge = { stock: 0, cap: 12 };
let expandT = 1;
function refreshFridge() { fridgeModel.setCount(fridge.stock); }

// 店員（雇用時）
const staff = makePerson({ shirt: '#2f7ff0', apron: '#ffffff', stripe: '#1fa463', cap: '#2f7ff0', hair: '#6b3f25', skin: '#f2c9a5' });
staff.group.position.set(LAYOUT.register.staff.x, 0, LAYOUT.register.staff.z);
staff.group.rotation.y = Math.PI / 2;
scene.add(staff.group);
shadowize(staff.group);

/* =====================================================================
 *  プレイヤー / 持ち物
 * ===================================================================== */
const playerPerson = makePerson({ shirt: '#1fa463', apron: '#ffffff', stripe: '#2f7ff0', cap: '#1fa463', hair: '#3a2a20', pants: '#2f3b52' });
scene.add(playerPerson.group);
shadowize(playerPerson.group);
const player = {
  pos: new THREE.Vector3(LAYOUT.station.use.x, 0, -3.0), vel: new THREE.Vector3(), facing: 0,
  path: [], target: null,
};
playerPerson.group.position.copy(player.pos);

const carry = { rice: 0, oni: emptyCounts() };
const carryKind = () => (carry.rice > 0 ? 'rice' : sumC(carry.oni) > 0 ? 'onigiri' : null);
const carryTotal = () => carry.rice + sumC(carry.oni);

function clearGroup(g) {
  while (g.children.length) {
    const c = g.children[0];
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    g.remove(c);
  }
}
function fillHold(hold, kind, data) {
  clearGroup(hold);
  if (kind === 'rice') {
    cy(hold, 0.24, 0.19, 0.2, '#ffffff', [0, -0.14, 0], 20);
    sp(hold, 0.22, '#fffdf4', [0, 0.04, 0], {}, 0.5);
  } else if (kind === 'onigiri') {
    listOf(data).slice(0, 4).forEach((k, i) => {
      const o = makeOnigiri(0.8, k);
      o.position.set((i % 2 - 0.5) * 0.28, (i >> 1) * 0.22 - 0.16, 0);
      hold.add(o);
    });
  } else if (kind === 'bag') {
    bx(hold, [0.32, 0.38, 0.16], '#e6f6ee', [0, -0.3, 0], { r: 0.05 });
    bx(hold, [0.18, 0.04, 0.03], '#1fa463', [0, 0.04, 0], { r: 0.01 });
  } else if (kind === 'bottle') {
    [-0.07, 0.07].forEach((x) => {
      cy(hold, 0.045, 0.045, 0.2, '#8fd0ff', [x, -0.28, 0], 14);
      cy(hold, 0.022, 0.022, 0.05, '#ffffff', [x, -0.08, 0], 12);
    });
  } else if (kind === 'box') {
    bx(hold, [0.46, 0.32, 0.36], '#c8964f', [0, -0.2, 0], { r: 0.03 });
    bx(hold, [0.1, 0.33, 0.37], '#e8d4a8', [0, -0.2, 0], { r: 0.01 });
  }
  shadowize(hold);
}
function refreshCarry() {
  playerPerson.holdArms = !!carryKind();
  fillHold(playerPerson.hold, carryKind(), carry.oni);
  playerPerson.hold.position.set(0, 0.75, 0.42);
}
const carryMax = () => val('carry');

/* =====================================================================
 *  ラベル（WebGL スプライト）
 *  HTML の重ね表示だとカメラ操作中に 3D とズレてガクつくので、
 *  シーンの中で一緒に描画して完全に同期させる。
 *  mode: 'world'（俯瞰・ワイプに表示） / 'fps'（握りモード中のみ表示）
 * ===================================================================== */
const TAG_SS = Math.max(2, Math.ceil(window.devicePixelRatio || 1)); // 超解像倍率
const FONT = '"Yu Gothic UI","Meiryo","Segoe UI Emoji","Segoe UI",sans-serif';
const measureCtx = document.createElement('canvas').getContext('2d');
const TONES = {
  '': ['#ffffff', '#22313a'],
  good: ['#e7fbef', '#157a48'],
  warn: ['#fff0ee', '#c0392b'],
};
const allTags = new Set();
const q40 = (p) => Math.round(clamp(p, 0, 1) * 40) / 40;

function drawTag(tag, spec) {
  const cv = tag.canvas;
  const pad = 8, gap = 3;
  const items = [];
  measureCtx.font = `700 13px ${FONT}`;
  if (spec.pop) {
    measureCtx.font = `900 22px ${FONT}`;
    items.push({ t: 'pop', w: measureCtx.measureText(spec.pop).width + 8, h: 30 });
  }
  if (spec.emo) items.push({ t: 'emo', w: 34, h: 34 });
  if (spec.chip) items.push({ t: 'chip', w: measureCtx.measureText(spec.chip).width + 20, h: 24 });
  if (spec.bar !== undefined) items.push({ t: 'bar', w: 64, h: 8 });
  const W = Math.ceil(Math.max(...items.map((i) => i.w)) + pad * 2);
  const H = Math.ceil(items.reduce((a, i) => a + i.h, 0) + gap * (items.length - 1) + pad * 2);
  const resized = cv.width !== W * TAG_SS || cv.height !== H * TAG_SS;
  cv.width = W * TAG_SS;
  cv.height = H * TAG_SS;
  const g = cv.getContext('2d');
  g.setTransform(TAG_SS, 0, 0, TAG_SS, 0, 0);
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let y = pad;
  for (const it of items) {
    const cx = W / 2;
    if (it.t === 'pop') {
      g.font = `900 22px ${FONT}`;
      g.lineJoin = 'round';
      g.lineWidth = 5;
      g.strokeStyle = spec.tone === 'red' ? '#a12b22' : '#1b6b43';
      g.strokeText(spec.pop, cx, y + it.h / 2);
      g.fillStyle = '#ffffff';
      g.fillText(spec.pop, cx, y + it.h / 2);
    } else if (it.t === 'emo') {
      g.font = `26px ${FONT}`;
      g.fillStyle = '#000';
      g.fillText(spec.emo, cx, y + it.h / 2 + 1);
    } else if (it.t === 'chip') {
      const [bg, fg] = TONES[spec.tone || ''] || TONES[''];
      g.save();
      g.shadowColor = 'rgba(20,40,60,.28)';
      g.shadowBlur = 5;
      g.shadowOffsetY = 2;
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(cx - it.w / 2, y, it.w, it.h, 10);
      g.fill();
      g.restore();
      g.font = `700 13px ${FONT}`;
      g.fillStyle = fg;
      g.fillText(spec.chip, cx, y + it.h / 2 + 1);
    } else if (it.t === 'bar') {
      const x0 = cx - it.w / 2;
      g.fillStyle = 'rgba(20,40,60,.3)';
      g.beginPath();
      g.roundRect(x0, y, it.w, it.h, 4);
      g.fill();
      const p = spec.bar;
      if (p > 0) {
        g.fillStyle = spec.barTone === 'pat' ? (p < 0.3 ? '#e8554a' : '#37c871') : '#ff9a2a';
        g.beginPath();
        g.roundRect(x0, y, Math.max(it.h, it.w * p), it.h, 4);
        g.fill();
      }
    }
    y += it.h + gap;
  }
  tag.cw = W;
  tag.ch = H;
  if (resized) tag.tex.dispose();
  tag.tex.needsUpdate = true;
}

class Tag {
  constructor(mode = 'world') {
    this.mode = mode;
    this.canvas = document.createElement('canvas');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mat = new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, toneMapped: false });
    this.sprite = new THREE.Sprite(this.mat);
    this.sprite.center.set(0.5, 0);
    this.sprite.renderOrder = 10;
    this.sprite.visible = false;
    scene.add(this.sprite);
    this.pos = new THREE.Vector3();
    this.on = true;
    this.empty = true;
    this.key = null;
    this.cw = 1;
    this.ch = 1;
    allTags.add(this);
  }
  set(spec) {
    const key = spec ? JSON.stringify(spec) : '';
    if (key === this.key) return this;
    this.key = key;
    if (!spec || (!spec.emo && !spec.chip && !spec.pop && spec.bar === undefined)) { this.empty = true; return this; }
    this.empty = false;
    drawTag(this, spec);
    return this;
  }
  at(x, y, z) { this.pos.set(x, y, z); return this; }
  destroy() {
    allTags.delete(this);
    scene.remove(this.sprite);
    this.tex.dispose();
    this.mat.dispose();
  }
}
/** 描画パスごとに、表示するラベルとサイズ（画面上の px 固定）を決める */
function updateTags(mode, cam, vh, scale = 1) {
  const k = ((2 * Math.tan(rad(cam.fov / 2))) / Math.max(1, vh)) * scale;
  for (const t of allTags) {
    const vis = t.mode === mode && t.on && !t.empty;
    t.sprite.visible = vis;
    if (!vis) continue;
    t.sprite.position.copy(t.pos);
    t.sprite.scale.set(t.cw * k, t.ch * k, 1);
  }
}
const popups = [];
function popup(x, y, z, text, tone = '') {
  const tag = new Tag().at(x, y, z).set({ pop: text, tone });
  popups.push({ tag, y0: y, life: 0 });
}
function updatePopups(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.life += dt;
    const t = p.life / 1.3;
    p.tag.pos.y = p.y0 + Math.sin(Math.min(1, t) * Math.PI * 0.5) * 1.1;
    p.tag.mat.opacity = t < 0.15 ? t / 0.15 : Math.max(0, 1 - (t - 0.5) / 0.5);
    if (t >= 1) { p.tag.destroy(); popups.splice(i, 1); }
  }
}

const carryHeadTag = new Tag();
const cookerTag = new Tag().at(LAYOUT.cooker.x + 0.5, 2.7, LAYOUT.cooker.z);
const stationTag = new Tag().at(LAYOUT.station.x, 2.2, LAYOUT.station.z);
const trayTag = new Tag().at(LAYOUT.tray.x, 2.2, LAYOUT.tray.z);
const regTag = new Tag().at(LAYOUT.register.x, 2.1, LAYOUT.register.z - 0.2);
const backDoorTag = new Tag().at(LAYOUT.backDoor.xc, 2.6, 3.5);
shelves.forEach((sh) => { sh.tag = new Tag().at(sh.pos.x, 2.5, sh.pos.z); });
const fridgeTag = new Tag().at(LAYOUT.fridge.x, 2.5, LAYOUT.fridge.z);
// 握りモードで見えるラベル
const SX = LAYOUT.station.x, SZ = LAYOUT.station.z;
// 握り台の向きに合わせた座標変換（lx=台の長さ方向, lz=手前=お客さん側）
const SROT = LAYOUT.station.rot;
const sl = (lx, ly, lz) => new THREE.Vector3(
  SX + lx * Math.cos(SROT) + lz * Math.sin(SROT), ly, SZ - lx * Math.sin(SROT) + lz * Math.cos(SROT));
const fpsTags = {
  rice: new Tag('fps').at(...sl(-0.62, 1.5, 0.15).toArray()),
  salt: new Tag('fps').at(...sl(0.0, 1.3, -0.33).toArray()),
  ume: new Tag('fps').at(...sl(0.38, 1.3, -0.33).toArray()),
  okaka: new Tag('fps').at(...sl(0.76, 1.3, -0.33).toArray()),
  tray: new Tag('fps').at(...sl(1.55, 1.4, 0).toArray()),
};

let toastTimer = 0;
function toast(msg, ms = 2000) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
}
function rest(msg) { toast(msg); }

/* ---- 経験値 ---- */
function addExp(n) {
  S.exp += n;
  let up = false;
  while (S.exp >= expNeed(S.level)) {
    S.exp -= expNeed(S.level);
    S.level++;
    up = true;
    onLevelUp();
  }
  if (up) {
    popup(player.pos.x, 2.3, player.pos.z, `LEVEL UP! Lv.${S.level}`);
    save();
  }
}
function onLevelUp() {
  stationModel.setBowls(S.level);
  if (S.level === 2) toast('Lv.2！ 梅むすび・おかかむすびが作れるように。裏口から食材を注文しよう', 5000);
  if (S.level === 3) toast('Lv.3！ 店が広がって、水の冷蔵庫ができた。裏口から水を注文しよう', 5000);
  if (S.level >= 3) setExpanded(true, true);
  orderDirty = true;
}
/** 増築：店を右に広げる（床・壁・冷蔵庫の追加、当たり判定、カメラ位置） */
function setExpanded(on, animate) {
  if (on === expanded) return;
  expanded = on;
  expansion.group.visible = on;
  fridgeModel.group.visible = on;
  world.curbRight.visible = !on;
  if (on && animate) { expandT = 0; } else expandT = 1;
  expansion.group.scale.y = on && animate ? 0.01 : 1;
  const st = stations.find((x) => x.id === 'fridge');
  if (st) st.marker.visible = on;
  rebuildColliders();
}
function placeWipeCam() {
  const tx = expanded ? -2.9 : LAYOUT.view.x;
  const d = expanded ? 38 : 35;
  wipeCam.position.set(tx + d * Math.cos(rad(41)) * Math.sin(rad(40)), 0.3 + d * Math.sin(rad(41)), LAYOUT.view.z + d * Math.cos(rad(41)) * Math.cos(rad(40)));
  wipeCam.lookAt(tx, 0.3, LAYOUT.view.z);
}

/* =====================================================================
 *  当たり判定 / 経路探索
 * ===================================================================== */
const NAV = { x0: -6.575, x1: 5.65, z0: -8.1, z1: 3.65, cs: 0.25 };
NAV.nx = Math.floor((NAV.x1 - NAV.x0) / NAV.cs) + 1;
NAV.nz = Math.floor((NAV.z1 - NAV.z0) / NAV.cs) + 1;
let colliders = [];
const blocked = new Uint8Array(NAV.nx * NAV.nz);
function distToBox(x, z, b) {
  const dx = x - clamp(x, b.x0, b.x1), dz = z - clamp(z, b.z0, b.z1);
  return Math.hypot(dx, dz);
}
function rebuildColliders() {
  colliders = [...COLLIDERS, ...SHELF_COLLIDERS];
  if (expanded) colliders.push(...EXP_COLLIDERS);
  else colliders.push({ x0: 3.5, x1: 9, z0: -7, z1: 6 }); // 増築前は右側に出られない
  for (let iz = 0; iz < NAV.nz; iz++) {
    for (let ix = 0; ix < NAV.nx; ix++) {
      const x = NAV.x0 + ix * NAV.cs, z = NAV.z0 + iz * NAV.cs;
      blocked[iz * NAV.nx + ix] = colliders.some((b) => distToBox(x, z, b) < 0.38) ? 1 : 0;
    }
  }
}
function collide(p, r) {
  for (const b of colliders) {
    const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        const l = p.x - b.x0, rr = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) p.x = b.x0 - r; else if (m === rr) p.x = b.x1 + r;
        else if (m === t) p.z = b.z0 - r; else p.z = b.z1 + r;
      }
    }
  }
  p.x = clamp(p.x, NAV.x0, NAV.x1);
  p.z = clamp(p.z, NAV.z0, NAV.z1);
}
function findPath(sx, sz, tx, tz) {
  const { x0, z0, cs, nx, nz } = NAV;
  const cell = (x, z) => [clamp(Math.round((x - x0) / cs), 0, nx - 1), clamp(Math.round((z - z0) / cs), 0, nz - 1)];
  const id = (cx, cz) => cz * nx + cx;
  const [scx, scz] = cell(sx, sz);
  let [gx, gz] = cell(tx, tz);
  if (blocked[id(gx, gz)]) {
    let found = false;
    for (let r = 1; r < 8 && !found; r++) {
      for (let dz = -r; dz <= r && !found; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const X = gx + dx, Z = gz + dz;
          if (X < 0 || Z < 0 || X >= nx || Z >= nz || blocked[id(X, Z)]) continue;
          gx = X; gz = Z; found = true; break;
        }
      }
    }
  }
  const N = nx * nz;
  const g = new Float32Array(N).fill(1e9);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const start = id(scx, scz), goal = id(gx, gz);
  const open = [start];
  g[start] = 0;
  let ok = false;
  while (open.length) {
    let bi = 0, bf = 1e9;
    for (let i = 0; i < open.length; i++) {
      const n = open[i];
      const f = g[n] + Math.hypot((n % nx) - gx, ((n / nx) | 0) - gz);
      if (f < bf) { bf = f; bi = i; }
    }
    const n = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (n === goal) { ok = true; break; }
    if (closed[n]) continue;
    closed[n] = 1;
    const x = n % nx, z = (n / nx) | 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const X = x + dx, Z = z + dz;
        if (X < 0 || Z < 0 || X >= nx || Z >= nz) continue;
        const m = id(X, Z);
        if (blocked[m] || closed[m]) continue;
        if (dx && dz && (blocked[id(x + dx, z)] || blocked[id(x, z + dz)])) continue;
        const ng = g[n] + (dx && dz ? 1.414 : 1);
        if (ng < g[m]) { g[m] = ng; came[m] = n; open.push(m); }
      }
    }
  }
  if (!ok) return [];
  const cells = [];
  for (let n = goal; n !== -1; n = came[n]) cells.push(n);
  cells.reverse();
  const pts = cells.map((n) => ({ x: x0 + (n % nx) * cs, z: z0 + ((n / nx) | 0) * cs }));
  pts[0] = { x: sx, z: sz };
  const targetFree = !blocked[id(...cell(tx, tz))];
  if (targetFree) pts[pts.length - 1] = { x: tx, z: tz };
  const free = (x, z) => !blocked[id(...cell(x, z))];
  const los = (a, b) => {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.12);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (!free(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  };
  const out = [];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !los(pts[i], pts[j])) j--;
    out.push(new THREE.Vector3(pts[j].x, 0, pts[j].z));
    i = j;
  }
  return out;
}

/* =====================================================================
 *  ステーション（操作できる場所）
 * ===================================================================== */
const stations = [];
const markerGeo = new THREE.RingGeometry(0.5, 0.64, 40);
const markerDisc = new THREE.CircleGeometry(0.5, 40);
function addStation(def, color) {
  const st = { ...def, use: new THREE.Vector3(def.use.x, 0, def.use.z) };
  const g = new THREE.Group();
  const ring = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
  const disc = new THREE.Mesh(markerDisc, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, depthWrite: false }));
  ring.rotation.x = disc.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  disc.position.y = 0.024;
  ring.userData.noShadow = disc.userData.noShadow = true;
  g.add(ring, disc);
  g.position.copy(st.use);
  scene.add(g);
  st.marker = g;
  st.markerRing = ring;
  (def.clickObjs || []).forEach((o) => { o.userData.station = st; clickRoots.push(o); });
  g.userData.station = st;
  clickRoots.push(g);
  stations.push(st);
  return st;
}

function takeTray() {
  let space = carryMax() - carryTotal();
  let moved = 0;
  while (space > 0 && stn.order.length) {
    const k = stn.order.shift(); // 置いた順に取る
    stn.tray[k]--;
    carry.oni[k]++;
    space--;
    moved++;
  }
  if (moved) { refreshCarry(); }
  return moved;
}

addStation({
  id: 'cooker', use: LAYOUT.cooker.use, radius: 1.5, clickObjs: [cookerModel.group],
  prompt() {
    if (cooker.state === 'idle') return 'ごはんを炊く';
    if (cooker.state === 'ready') return `ごはんを取る (${cooker.rice}膳)`;
    return null;
  },
  act() {
    if (cooker.state === 'idle') {
      const n = Math.min(val('cooker'), S.inv.rice);
      if (n <= 0) return rest('米がない！ 裏口から注文しよう');
      S.inv.rice -= n;
      cooker.batch = n;
      cooker.state = 'cooking';
      cooker.t = 0;
      orderDirty = true;
    } else if (cooker.state === 'ready') {
      if (carryKind() === 'onigiri') return rest('手がふさがっている！ 先におにぎりを置こう');
      const space = carryMax() - carry.rice;
      if (space <= 0) return rest('これ以上持てない');
      const n = Math.min(space, cooker.rice);
      cooker.rice -= n;
      carry.rice += n;
      refreshCarry();
      if (cooker.rice <= 0) cooker.state = 'idle';
    }
  },
}, '#ff9a1f');

addStation({
  id: 'station', use: LAYOUT.station.use, radius: 1.5, clickObjs: [stationModel.group],
  prompt() {
    if (carry.rice > 0) return `ごはんを置く (${carry.rice}膳)`;
    if (stn.rice > 0 && sumC(stn.tray) < TRAY_MAX) return 'おにぎりを握る';
    return null;
  },
  act() {
    if (carry.rice > 0) {
      const n = Math.min(carry.rice, STATION_RICE_MAX - stn.rice);
      if (n <= 0) return rest('握り台のごはんがいっぱい');
      stn.rice += n;
      carry.rice -= n;
      refreshCarry();
    } else if (stn.rice > 0 && sumC(stn.tray) < TRAY_MAX) enterCraft();
  },
}, '#a56bff');

// トレーの足場：ここでおにぎりを受け取る
addStation({
  id: 'tray', use: LAYOUT.tray.use, radius: 1.3, clickObjs: [trayModel.group],
  prompt() { return sumC(stn.tray) > 0 && carryKind() !== 'rice' ? `おにぎりを受け取る (${sumC(stn.tray)}個)` : null; },
  act() { if (!takeTray()) rest('これ以上持てない'); },
}, '#d6a65a');

shelves.forEach((sh) => {
  addStation({
    id: 'shelf' + sh.i, use: sh.pos.use, radius: 1.6, clickObjs: [sh.model.group],
    prompt() {
      if (carryKind() === 'onigiri') return `おにぎりを棚に並べる (${sumC(carry.oni)}個)`;
      if (carryKind() === null) return '棚の段を決める';
      return null;
    },
    act() { enterShelf(sh); },
  }, '#1fa463');
});

addStation({
  id: 'register', use: LAYOUT.register.use, radius: 1.6, clickObjs: [regModel.group],
  prompt() { return frontCustomer() && !reg.serving ? 'レジを打つ' : null; },
  act() {
    const c = frontCustomer();
    if (c && !reg.serving) { reg.serving = c; reg.t = 0; c.state = 'serving'; }
  },
}, '#2f7ff0');

addStation({
  id: 'backdoor', use: LAYOUT.backDoor.use, radius: 1.5, clickObjs: [backDoor.group],
  prompt() { return '食材を注文する'; },
  act() { toggleOrder(true); },
}, '#e0a020');

const fridgeStation = addStation({
  id: 'fridge', use: LAYOUT.fridge.use, radius: 1.6, clickObjs: [fridgeModel.group],
  prompt() {
    if (!expanded) return null;
    if (fridge.stock >= fridge.cap) return null;
    return S.inv.water > 0 ? `水を冷蔵庫に入れる (在庫 ${S.inv.water})` : null;
  },
  act() {
    const n = Math.min(S.inv.water, fridge.cap - fridge.stock);
    if (n <= 0) return;
    S.inv.water -= n;
    fridge.stock += n;
    refreshFridge();
    orderDirty = true;
    if (!S.opened) { /* 開店は棚から */ }
  },
}, '#2f9be0');
fridgeStation.marker.visible = false;

/* =====================================================================
 *  握りモード（一人称）
 * ===================================================================== */
const craft = {
  active: false, t: 0, ball: null, hold: false, hover: null, fly: null,
};
const FPS_POS = sl(0.5, 1.95, 1.75);
const FPS_LOOK = sl(0.5, 0.88, -0.1);
const FPS_RIGHT = sl(1, 0, 0).sub(sl(0, 0, 0)); // 画面の右方向（世界座標）
// 画面が縦に近いほど視野を広げて、台の左右が見切れないようにする
const fpsBaseFov = () => {
  const a = window.innerWidth / window.innerHeight;
  if (!(a > 0)) return 54; // 最小化などでサイズが 0 のとき
  return Math.min(76, (2 * Math.atan(Math.tan(rad(31)) * 2.0 / Math.max(1.2, a)) * 180) / Math.PI);
};
fpsCam.position.copy(FPS_POS);
fpsCam.lookAt(FPS_LOOK);
fpsCam.visible = false;
scene.add(fpsCam);

// 手
function makeHand() {
  const h = new THREE.Group();
  bx(h, [0.13, 0.13, 0.55], '#1fa463', [0, -0.065, 0.3], { r: 0.04 });
  bx(h, [0.14, 0.14, 0.07], '#ffffff', [0, -0.07, 0.03], { r: 0.03 });
  const palm = sp(h, 0.07, '#f7d2b0', [0, 0, -0.04], {}, 1);
  palm.scale.set(1, 0.65, 1.3);
  sp(h, 0.03, '#f7d2b0', [0.055, 0.015, -0.07]);
  return h;
}
const handL = makeHand(), handR = makeHand();
handL.scale.setScalar(0.85);
handR.scale.setScalar(0.85);
const HAND_IDLE = { L: new THREE.Vector3(-0.36, -0.34, -0.8), R: new THREE.Vector3(0.36, -0.34, -0.8) };
const HAND_BALL = { L: new THREE.Vector3(-0.15, -0.24, -0.72), R: new THREE.Vector3(0.15, -0.24, -0.72) };
handL.position.copy(HAND_IDLE.L);
handR.position.copy(HAND_IDLE.R);
fpsCam.add(handL, handR);

// ごはんの塊 / 具材 / 完成おにぎり
const HOLD = new THREE.Vector3(0, -0.15, -0.82);
const ballGroup = new THREE.Group();
ballGroup.visible = false;
fpsCam.add(ballGroup);
const lump = sp(ballGroup, 0.11, '#fbfaf3', [0, 0, 0], { roughness: 0.95 }, 0.82);
const fillViz = { salt: new THREE.Group(), ume: new THREE.Group(), okaka: new THREE.Group() };
for (let i = 0; i < 12; i++) sp(fillViz.salt, 0.008, '#c9d6df', [Math.cos(i * 2.1) * 0.06, 0.075 + (i % 3) * 0.004, Math.sin(i * 2.1) * 0.06]);
sp(fillViz.ume, 0.032, '#d6334a', [0, 0.075, 0.025], { roughness: 0.5 }, 0.7);
sp(fillViz.ume, 0.022, '#c9263c', [0.03, 0.07, 0.0], { roughness: 0.5 }, 0.7);
for (let i = 0; i < 12; i++) bx(fillViz.okaka, [0.02, 0.006, 0.012], i % 2 ? '#b9794a' : '#dca674', [Math.cos(i * 1.7) * 0.055, 0.074, Math.sin(i * 1.7) * 0.055], { r: 0.002 });
Object.values(fillViz).forEach((g) => { g.visible = false; ballGroup.add(g); });
const doneViz = {};
KIND_IDS.forEach((k) => {
  const o = makeOnigiri(0.85, k);
  o.position.y = -0.085;
  o.visible = false;
  ballGroup.add(o);
  doneViz[k] = o;
});
ballGroup.userData.fps = 'ball';

// 飛び散る粒（具材を入れる時の演出）
const particles = [];
const partGeo = new THREE.BoxGeometry(0.014, 0.014, 0.014);
const partMats = {};
function burst(color, n, from) {
  partMats[color] = partMats[color] || new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, partMats[color]);
    m.position.copy(from).add(new THREE.Vector3(rand(-0.03, 0.03), rand(0, 0.03), rand(-0.03, 0.03)));
    fpsCam.add(m);
    particles.push({ m, v: new THREE.Vector3(rand(-0.15, 0.15), rand(0.1, 0.3), rand(-0.1, 0.1)), life: 0.6 });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.v.y -= 1.6 * dt;
    p.m.position.addScaledVector(p.v, dt);
    if (p.life <= 0) { fpsCam.remove(p.m); particles.splice(i, 1); }
  }
}

const mouse = new THREE.Vector2(0, 0);
const fpsRay = new THREE.Raycaster();
function fpsPick() {
  stationModel.group.updateMatrixWorld(true);
  trayModel.group.updateMatrixWorld(true);
  fpsCam.updateMatrixWorld(true);
  fpsRay.setFromCamera(mouse, fpsCam);
  const cands = [...stationModel.targets, trayModel.group].filter((o) => o.visible);
  if (craft.ball && ballGroup.visible) cands.push(ballGroup);
  const hits = fpsRay.intersectObjects(cands, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !o.userData.fps) o = o.parent;
  return o ? o.userData.fps : null;
}
function worldToCamLocal(v) { return fpsCam.worldToLocal(v.clone()); }

function startBall(fromWorld) {
  craft.ball = { stage: 'rice', filling: null, kind: null, press: 0, tw: 0, from: worldToCamLocal(fromWorld) };
  ballGroup.scale.set(1, 1, 1);
  lump.visible = true;
  Object.values(fillViz).forEach((g) => { g.visible = false; });
  KIND_IDS.forEach((k) => { doneViz[k].visible = false; });
  ballGroup.visible = true;
}

function enterCraft() {
  craft.active = true;
  handL.visible = handR.visible = true;
  stationModel.group.scale.setScalar(1);
  craft.t = 0;
  craft.ball = null;
  craft.hold = false;
  craft.fly = null;
  player.path = [];
  player.vel.set(0, 0, 0);
  player.target = null;
  keys.clear();
  ballGroup.visible = false;
  document.body.classList.add('crafting');
  $('wipe').style.display = 'block';
  $('craftui').style.display = 'block';
  shopOpen && toggleShop(false);
  toggleOrder(false);
}
function exitCraft() {
  if (!craft.active) return;
  if (craft.fly) finishPlace(craft.fly); // 飛んでいる最中のものはその場でトレーへ
  const b = craft.ball;
  if (b) { // 途中のものは返す
    if (b.stage === 'done') { stn.tray[b.kind]++; stn.order.push(b.kind); }
    else {
      stn.rice++;
      if (b.filling) S.inv[b.filling]++;
    }
    craft.ball = null;
  }
  craft.fly = null;
  craft.active = false;
  stationModel.group.scale.setScalar(STATION_K);
  craft.hold = false;
  ballGroup.visible = false;
  fpsCam.visible = false;
  document.body.classList.remove('crafting');
  $('wipe').style.display = 'none';
  $('craftui').style.display = 'none';
  stn.armed = false; // 一度離れるまで自動では入らない
  orderDirty = true;
}

function craftPointerDown(e) {
  if (e.button !== 0 || craft.fly) return;
  const kind = fpsPick();
  const b = craft.ball;
  if (kind === 'rice') {
    if (b) return rest('もうごはんを持っている');
    if (stn.rice <= 0) return rest('ごはんがありません');
    stn.rice--;
    startBall(stationModel.tub.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.38, 0)));
  } else if (kind === 'salt' || kind === 'ume' || kind === 'okaka') {
    if (!b) return rest('先にごはんを取ろう');
    if (b.stage !== 'rice') return rest('具材はもう入っている');
    if (S.inv[kind] <= 0) return rest(`${ING[kind].name}の在庫がない…`);
    S.inv[kind]--;
    b.filling = kind;
    b.kind = kind === 'salt' ? 'shio' : kind;
    b.stage = 'filled';
    fillViz[kind].visible = true;
    const col = kind === 'salt' ? '#ffffff' : kind === 'ume' ? '#d6334a' : '#c99562';
    burst(col, 12, new THREE.Vector3(0, 0.1, -0.82));
    orderDirty = true;
  } else if (kind === 'ball') {
    if (!b) return;
    if (b.stage === 'rice') rest('具材を入れよう');
    else if (b.stage === 'filled') craft.hold = true;
  } else if (kind === 'tray') {
    if (!b) return rest('ごはんから始めよう');
    if (b.stage !== 'done') return rest(b.stage === 'rice' ? '具材を入れよう' : 'ボールを長押しして握ろう');
    if (sumC(stn.tray) >= TRAY_MAX) return rest('トレーがいっぱい。受け取りに行こう');
    // おにぎりを、トレーの空いている場所へ置きに行く
    const slot = trayModel.group.localToWorld(trayModel.traySlotLocal(stn.order.length));
    slot.y += 0.085 * 0.82;
    craft.fly = { t: 0, from: ballGroup.position.clone(), to: worldToCamLocal(slot), kind: b.kind };
    craft.ball = null;
  }
}
window.addEventListener('pointerup', () => { craft.hold = false; });

/* =====================================================================
 *  棚モード（棚にアップ。段ごとに置くおにぎりを決めて、持ってきた分を並べる）
 * ===================================================================== */
const shelfMode = { active: false, sh: null, t: 0, timer: 0, ui: '', full: false };
function shelfFov() {
  const a = window.innerWidth / window.innerHeight;
  if (!(a > 0)) return 42;
  return Math.min(72, (2 * Math.atan(Math.tan(rad(21)) * 1.78 / Math.min(1.78, a)) * 180) / Math.PI);
}
/** 持っているおにぎりを1個、決めた段へ置く。置けたら true */
function placeOneOnShelf(sh) {
  for (const k of KIND_IDS) {
    if (carry.oni[k] <= 0) continue;
    let tier = sh.tiers.find((t) => t.kind === k && t.n < tierCap());
    if (!tier && !sh.tiers.some((t) => t.kind === k)) { // その種類の段が無ければ、空いている段を使う
      const idx = sh.tiers.findIndex((t) => t.n === 0);
      if (idx >= 0) {
        tier = sh.tiers[idx];
        tier.kind = k;
        S.tiers[idx] = k;
        toast(`${idx + 1}段目を${KINDS[k].name}にしたよ`);
      }
    }
    if (!tier) continue;
    tier.n++;
    carry.oni[k]--;
    refreshCarry();
    refreshShelf(sh);
    if (!S.opened) { S.opened = true; spawnTimer = 10; }
    return true;
  }
  return false;
}
function renderShelfUi() {
  const sh = shelfMode.sh;
  const rows = sh.tiers.map((t, i) => `<div class="trow"><span class="tn">${i + 1}段目</span><button class="tsel" data-tier="${i}">${KINDS[t.kind].name}</button><span class="tc">${t.n} / ${tierCap()}</span></div>`).join('');
  const hold = carryKind() === 'onigiri' ? KIND_IDS.filter((k) => carry.oni[k]).map((k) => `${KINDS[k].short}${carry.oni[k]}`).join(' ') : 'なし';
  let html = rows + `<div class="hold">持っているおにぎり：${hold}${shelfMode.full && carryKind() === 'onigiri' ? '<br>（置ける段がいっぱい）' : ''}</div>`;
  if (frontCustomer()) html += '<div class="alertq">🧾 お客さんがレジで待ってる！</div>';
  if (html !== shelfMode.ui) { shelfMode.ui = html; $('tier-rows').innerHTML = html; }
}
function enterShelf(sh) {
  shelfMode.active = true;
  shelfMode.sh = sh;
  shelfMode.t = 0;
  shelfMode.timer = 0.35;
  shelfMode.ui = '';
  shelfMode.full = false;
  player.path = [];
  player.vel.set(0, 0, 0);
  player.target = null;
  keys.clear();
  toggleShop(false);
  toggleOrder(false);
  handL.visible = handR.visible = false;
  ballGroup.visible = false;
  document.body.classList.add('shelving');
  $('shelfui').style.display = 'block';
}
function exitShelf() {
  if (!shelfMode.active) return;
  shelfMode.active = false;
  fpsCam.visible = false;
  handL.visible = handR.visible = true;
  document.body.classList.remove('shelving');
  $('shelfui').style.display = 'none';
}
function updateShelfMode(dt) {
  const sh = shelfMode.sh;
  shelfMode.t += dt;
  const zi = ease(shelfMode.t / 0.5);
  const fov = shelfFov() + 22 * (1 - zi);
  if (Math.abs(fpsCam.fov - fov) > 0.01) { fpsCam.fov = fov; fpsCam.updateProjectionMatrix(); }
  fpsCam.position.set(sh.pos.x - 0.6, 1.65, sh.pos.z + 3.2);
  fpsCam.lookAt(sh.pos.x - 0.6, 0.95, sh.pos.z);
  fpsCam.visible = true;
  shelfMode.timer -= dt;
  if (shelfMode.timer <= 0 && carryKind() === 'onigiri') {
    const ok = placeOneOnShelf(sh);
    shelfMode.full = !ok;
    shelfMode.timer = ok ? 0.11 : 0.6;
  }
  renderShelfUi();
}
function updatePlayerShelf(dt) {
  const g = playerPerson.group;
  g.position.copy(player.pos);
  g.rotation.y = lerpAngle(g.rotation.y, Math.PI, 1 - Math.exp(-12 * dt));
  playerPerson.anim(dt, 0, false);
}
$('shelf-exit').addEventListener('click', () => exitShelf());
$('tier-rows').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !shelfMode.active) return;
  const i = Number(b.dataset.tier);
  const sh = shelfMode.sh;
  const t = sh.tiers[i];
  if (t.n > 0) return rest('先にその段を空にしてね（お客さんが買うと空きます）');
  const pool = KIND_IDS.filter(kindUnlocked);
  const next = pool[(pool.indexOf(t.kind) + 1) % pool.length] || pool[0];
  t.kind = next;
  S.tiers[i] = next;
  refreshShelf(sh);
  shelfMode.ui = '';
});

function finishPlace(f) {
  stn.tray[f.kind]++;
  stn.order.push(f.kind);
  addExp(3);
  craft.fly = null;
  ballGroup.visible = false;
  ballGroup.scale.setScalar(1);
  doneViz[f.kind].rotation.y = 0;
}

function updateCraft(dt) {
  stationModel.group.updateMatrixWorld(true);
  trayModel.group.updateMatrixWorld(true);
  craft.t += dt;
  const b = craft.ball;
  // ズームイン演出 + マウスで少し見回す
  const zi = ease(craft.t / 0.45);
  const fov = fpsBaseFov() + 24 * (1 - zi);
  if (Math.abs(fpsCam.fov - fov) > 0.01) { fpsCam.fov = fov; fpsCam.updateProjectionMatrix(); }
  fpsCam.position.set(FPS_POS.x, FPS_POS.y + Math.sin(craft.t * 1.7) * 0.004, FPS_POS.z);
  fpsCam.lookAt(FPS_LOOK.x + FPS_RIGHT.x * mouse.x * 0.1, FPS_LOOK.y + mouse.y * 0.05, FPS_LOOK.z + FPS_RIGHT.z * mouse.x * 0.1);
  fpsCam.visible = true;

  craft.hover = fpsPick();
  canvas.style.cursor = craft.hover && craft.hover !== 'ball' ? 'pointer' : craft.hover === 'ball' && b && b.stage === 'filled' ? 'grab' : 'default';

  // ボール
  const k = 1 - Math.exp(-16 * dt);
  if (b) {
    b.tw = Math.min(1, b.tw + dt / 0.3);
    const e = ease(b.tw);
    ballGroup.position.lerpVectors(b.from, HOLD, e);
    ballGroup.position.y += Math.sin(Math.PI * b.tw) * 0.07;
    if (b.stage === 'filled') {
      if (craft.hold) {
        b.press += dt / val('craft');
        if (b.press >= 1) {
          b.press = 1;
          b.stage = 'done';
          craft.hold = false;
          lump.visible = false;
          Object.values(fillViz).forEach((g) => { g.visible = false; });
          doneViz[b.kind].visible = true;
        }
      } else b.press = Math.max(0, b.press - dt * 0.7);
      const p = b.press;
      lump.scale.set(1 + 0.25 * p, 0.82 - 0.3 * p, 1 + 0.25 * p);
      ballGroup.position.y += craft.hold ? Math.sin(craft.t * 32) * 0.006 : 0;
    } else if (b.stage === 'done') {
      doneViz[b.kind].rotation.y = Math.sin(craft.t * 2) * 0.35;
    }
    // 手
    const pressing = b.stage === 'filled' && craft.hold;
    const wob = pressing ? Math.sin(craft.t * 22) * 0.03 : 0;
    const inX = pressing ? 0.035 * b.press : 0;
    handL.position.x += (HAND_BALL.L.x + inX - wob - handL.position.x) * k;
    handR.position.x += (HAND_BALL.R.x - inX + wob - handR.position.x) * k;
    handL.position.y += (HAND_BALL.L.y - handL.position.y) * k;
    handR.position.y += (HAND_BALL.R.y - handR.position.y) * k;
    handL.position.z += (HAND_BALL.L.z - handL.position.z) * k;
    handR.position.z += (HAND_BALL.R.z - handR.position.z) * k;
    handL.rotation.y += (-0.45 - handL.rotation.y) * k;
    handR.rotation.y += (0.45 - handR.rotation.y) * k;
  } else {
    handL.position.lerp(HAND_IDLE.L, k);
    handR.position.x += (HAND_IDLE.R.x + mouse.x * 0.22 - handR.position.x) * k;
    handR.position.y += (HAND_IDLE.R.y + mouse.y * 0.12 - handR.position.y) * k;
    handR.position.z += (HAND_IDLE.R.z - handR.position.z) * k;
    handL.rotation.y += (-0.15 - handL.rotation.y) * k;
    handR.rotation.y += (0.15 - handR.rotation.y) * k;
  }
  // トレーへ飛ばす
  if (craft.fly) {
    const f = craft.fly;
    f.t += dt / 0.3;
    ballGroup.position.lerpVectors(f.from, f.to, ease(f.t));
    ballGroup.position.y += Math.sin(Math.PI * Math.min(1, f.t)) * 0.1;
    ballGroup.scale.setScalar(1 - 0.18 * ease(f.t));
    doneViz[f.kind].rotation.y *= 1 - ease(f.t);
    if (f.t >= 1) finishPlace(f);
  }
  updateParticles(dt);

  // 小道具・ラベル
  stationModel.setRice(stn.rice);
  const hov = craft.hover;
  [...stationModel.targets, trayModel.group].forEach((o) => {
    const want = o.userData.fps === hov ? 1.03 : 1;
    o.scale.setScalar(o.scale.x + (want - o.scale.x) * k);
  });
  fpsTags.rice.set({ chip: `🍚 ごはん ×${stn.rice}`, tone: stn.rice ? 'good' : 'warn' });
  ['salt', 'ume', 'okaka'].forEach((id) => {
    const locked = (id === 'ume' || id === 'okaka') && S.level < 2;
    fpsTags[id].on = !locked;
    fpsTags[id].set({ chip: `${id === 'salt' ? '🧂' : ING[id].icon} ${ING[id].name} ×${S.inv[id]}`, tone: S.inv[id] ? 'good' : 'warn' });
  });
  fpsTags.tray.set({ chip: `🍙 トレー ${sumC(stn.tray)} / ${TRAY_MAX}`, tone: sumC(stn.tray) >= TRAY_MAX ? 'warn' : '' });

  // 画面の案内
  const step = !b ? 1 : b.stage === 'rice' ? 2 : b.stage === 'filled' ? 3 : 4;
  const stepEls = document.querySelectorAll('#craftui .step');
  stepEls.forEach((el, i) => el.classList.toggle('on', i + 1 === step));
  const pb = $('press');
  if (b && b.stage === 'filled') {
    pb.style.display = 'block';
    $('press-i').style.width = `${Math.round(b.press * 100)}%`;
  } else pb.style.display = 'none';
  // ワイプ内の状況
  const wq = $('wipe-q');
  const front = frontCustomer();
  const txt = front ? '🧾 お客さんがレジで待ってる！' : queue.length ? `🧾 レジ待ち ${queue.length}人` : customers.length ? `🚶 来店中 ${customers.length}人` : '店内は静か';
  if (wq.textContent !== txt) wq.textContent = txt;
  wq.classList.toggle('alert', !!front);
}

/* =====================================================================
 *  お客さん
 * ===================================================================== */
const customers = [];
const queue = [];
let spawnTimer = 0;
const SHIRTS = ['#e86a5c', '#f2b134', '#5aa9e6', '#8d6ae0', '#58b368', '#e88fb4', '#f28c4a', '#6fcfc2', '#d9d9d9', '#3d4f7a'];
const PANTS = ['#35405a', '#5b4a3a', '#2f3b52', '#7a7a86', '#3d5a45'];
const HAIRS = ['#2b2118', '#4a3322', '#7a4a28', '#c9a25a', '#222a3a', '#8c8c94'];
const SKINS = ['#f7d2b0', '#f0c19a', '#e6ad84', '#fbdcc0'];
const EXIT_PATH = () => LAYOUT.exitPath.map((p) => new THREE.Vector3(p.x, 0, p.z));
function chooseKind() {
  const pool = KIND_IDS.filter(kindUnlocked);
  let r = Math.random() * pool.reduce((a, k) => a + KINDS[k].weight, 0);
  for (const k of pool) { r -= KINDS[k].weight; if (r <= 0) return k; }
  return pool[0];
}

class Customer {
  constructor(shelf) {
    this.shelf = shelf;
    this.person = makePerson({ shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIRS), skin: pick(SKINS) });
    this.person.group.scale.setScalar(rand(0.9, 1.04));
    this.pos = new THREE.Vector3(LAYOUT.spawn.x + rand(-0.3, 0.3), 0, LAYOUT.spawn.z);
    this.person.group.position.copy(this.pos);
    scene.add(this.person.group);
    shadowize(this.person.group);
    this.plan = this.makePlan();
    this.stopIdx = 0;
    this.path = [...LAYOUT.entryPath.map((p) => new THREE.Vector3(p.x, 0, p.z)), this.stopTarget(0)];
    this.state = 'enter';
    this.timer = 0;
    const r = Math.random();
    this.want = r < 0.8 ? 1 : r < 0.97 ? 2 : 3;
    this.wantWater = Math.random() < 0.7 ? 1 : 2;
    this.wishes = Array.from({ length: this.want }, () => chooseKind()); // 買いたいおにぎり
    this.sat = 0; // 希望どおり買えた数
    this.sub = 0; // 別のもので我慢した数
    this.miss = 0; // 買えなかった数
    this.items = emptyCounts();
    this.water = 0;
    this.patience = 1;
    this.speed = rand(2.0, 2.5);
    this.facing = Math.PI / 2;
    this.curSpeed = 0;
    this.tag = new Tag();
    this.emo = '';
    this.emoTimer = 0;
    customers.push(this);
  }
  /** 立ち寄る場所：おにぎりの棚 / 水の冷蔵庫 */
  makePlan() {
    if (expanded && fridge.stock > 0) {
      const r = Math.random();
      if (r < 0.35) return ['shelf', 'fridge'];
      if (r < 0.45) return ['fridge'];
    }
    return ['shelf'];
  }
  stopTarget(i) {
    const u = this.plan[i] === 'shelf' ? this.shelf.pos.use : LAYOUT.fridge.use;
    return new THREE.Vector3(u.x + rand(-0.4, 0.4), 0, u.z);
  }
  setEmo(e, t = 0) { this.emo = e; this.emoTimer = t; }
  step(dt) {
    if (!this.path.length) return true;
    const t = this.path[0];
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) { this.path.shift(); return this.path.length === 0; }
    const m = Math.min(d, this.speed * dt);
    this.pos.x += (dx / d) * m;
    this.pos.z += (dz / d) * m;
    this.facing = Math.atan2(dx, dz);
    this.curSpeed = this.speed;
    return false;
  }
  leave(path) {
    this.state = 'leave';
    this.path = path;
  }
  /** 棚から買いたいおにぎりを取る。無ければ別のもので我慢（不満）、何も無ければ買えない */
  pickItems() {
    const sh = this.shelf;
    const got = emptyCounts();
    for (const w of this.wishes) {
      if (shelfKindCount(sh, w) > 0) {
        shelfTake(sh, w);
        got[w]++;
        this.sat++;
      } else {
        const k = KIND_IDS.find((x) => shelfKindCount(sh, x) > 0);
        if (k) { shelfTake(sh, k); got[k]++; this.sub++; } else this.miss++;
      }
    }
    return got;
  }
  /** 頭の上の吹き出し：いま探しているもの */
  wishText() {
    if (this.plan[this.stopIdx] === 'fridge') return `💧 水${this.wantWater > 1 ? '×' + this.wantWater : ''}がほしい`;
    const c = emptyCounts();
    this.wishes.forEach((k) => { c[k]++; });
    return '🍙 ' + KIND_IDS.filter((k) => c[k]).map((k) => WISH_NAME[k] + (c[k] > 1 ? '×' + c[k] : '')).join('・') + 'がほしい';
  }
  finishShopping() {
    if (sumC(this.items) + this.water <= 0) {
      S.stats.lost++;
      S.rep = clamp(S.rep - 0.2, 0, 5);
      ratingPopup(this, -1);
      this.setEmo('😞', 3);
      this.leave(EXIT_PATH());
      return;
    }
    if (sumC(this.items) > 0) fillHold(this.person.hold, 'onigiri', this.items);
    else fillHold(this.person.hold, 'bottle');
    this.person.hold.position.set(0, 0.75, 0.42);
    this.person.holdArms = true;
    this.state = 'queue';
    queue.push(this);
    this.path = [];
    this.setEmo('');
  }
  update(dt) {
    this.curSpeed = 0;
    const sh = this.shelf;
    switch (this.state) {
      case 'enter':
        if (this.step(dt)) { this.state = 'browse'; this.timer = rand(1.2, 2.2); this.setEmo(''); }
        break;
      case 'browse': {
        const kind = this.plan[this.stopIdx];
        this.facing = kind === 'shelf' ? Math.atan2(-Math.sin(sh.pos.rot), -Math.cos(sh.pos.rot)) : Math.PI;
        this.timer -= dt;
        if (this.timer <= 0) {
          if (kind === 'shelf') {
            const got = this.pickItems();
            KIND_IDS.forEach((k) => { this.items[k] += got[k]; });
            refreshShelf(sh);
          } else {
            const n = Math.min(this.wantWater, fridge.stock);
            fridge.stock -= n;
            this.water += n;
            this.sat += n;
            this.miss += this.wantWater - n;
            refreshFridge();
          }
          if (this.sub || this.miss) this.setEmo('😕', 2.2);
          this.stopIdx++;
          if (this.stopIdx < this.plan.length) {
            this.state = 'enter';
            this.path = [this.stopTarget(this.stopIdx)];
            this.setEmo('');
          } else this.finishShopping();
        }
        break;
      }
      case 'queue':
      case 'waitPay': {
        this.tickPatience(dt);
        const idx = queue.indexOf(this);
        const q = LAYOUT.queue(idx);
        const dx = q.x - this.pos.x, dz = q.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.06) {
          const m = Math.min(d, this.speed * dt);
          this.pos.x += (dx / d) * m;
          this.pos.z += (dz / d) * m;
          this.facing = Math.atan2(dx, dz);
          this.curSpeed = this.speed;
        } else {
          this.facing = -Math.PI / 2; // カウンター（左）の方を向く
          if (idx === 0) this.state = 'waitPay';
        }
        break;
      }
      case 'serving':
        this.facing = -Math.PI / 2;
        break;
      case 'leave':
        if (this.step(dt)) this.dispose();
        break;
      default: break;
    }
    // 見た目の反映
    const g = this.person.group;
    g.position.copy(this.pos);
    g.rotation.y = lerpAngle(g.rotation.y, this.facing, 1 - Math.exp(-12 * dt));
    this.person.anim(dt, this.curSpeed);
    // 吹き出し
    if (this.emoTimer > 0) { this.emoTimer -= dt; if (this.emoTimer <= 0) this.emo = ''; }
    const waiting = this.state === 'queue' || this.state === 'waitPay' || this.state === 'serving';
    const spec = {};
    if (this.emo) spec.emo = this.emo;
    if (waiting) { spec.bar = q40(this.patience); spec.barTone = 'pat'; }
    const wishing = this.state === 'enter' || this.state === 'browse';
    if (wishing) spec.chip = this.wishText();
    this.tag.at(this.pos.x, 2.15 * g.scale.y, this.pos.z).set(this.emo || waiting || wishing ? spec : null);
  }
  tickPatience(dt) {
    if (reg.serving === this) return;
    this.patience -= dt / 48;
    if (this.patience < 0.35 && !this.emo) this.setEmo('💦');
    if (this.patience <= 0) this.giveUp();
  }
  giveUp() {
    const i = queue.indexOf(this);
    if (i >= 0) queue.splice(i, 1);
    this.returnItems();
    clearGroup(this.person.hold);
    S.stats.lost++;
    S.rep = clamp(S.rep - 0.2, 0, 5);
    ratingPopup(this, -1);
    this.setEmo('💢', 4);
    this.leave(EXIT_PATH());
  }
  returnItems() {
    const sh = this.shelf;
    KIND_IDS.forEach((k) => { shelfAdd(sh, k, this.items[k]); });
    this.items = emptyCounts();
    refreshShelf(sh);
    fridge.stock = Math.min(fridge.cap, fridge.stock + this.water);
    this.water = 0;
    refreshFridge();
  }
  pay() {
    const i = queue.indexOf(this);
    if (i >= 0) queue.splice(i, 1);
    let sum = this.water * WATER_PRICE, n = this.water;
    KIND_IDS.forEach((k) => { sum += this.items[k] * KINDS[k].price; n += this.items[k]; });
    S.money += sum;
    S.stats.sales += sum;
    S.stats.customers++;
    // 希望どおりなら評価アップ、我慢させたり買えなかったりで評価ダウン
    const delta = 0.06 * this.sat - 0.1 * (this.sub + this.miss);
    S.rep = clamp(S.rep + delta, 0, 5);
    if (delta !== 0) ratingPopup(this, delta);
    shopDirty = orderDirty = true;
    popup(LAYOUT.register.x - 0.4, 1.9, LAYOUT.register.z, `+${yen(sum)}`);
    addExp(n * 5);
    fillHold(this.person.hold, 'bag', 1);
    this.person.hold.position.set(0.3, 0.7, 0.2);
    this.setEmo(delta < 0 ? '😕' : '😊', 2.5);
    this.leave(EXIT_PATH());
  }
  dispose() {
    scene.remove(this.person.group);
    this.person.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.tag.destroy();
    const i = customers.indexOf(this);
    if (i >= 0) customers.splice(i, 1);
  }
}
const WISH_NAME = { shio: '塩', ume: '梅', okaka: 'おかか' };
function ratingPopup(c, delta) {
  popup(c.pos.x, 2.7, c.pos.z, delta > 0 ? '評価 ▲' : '評価 ▼', delta > 0 ? '' : 'red');
}
function frontCustomer() {
  const c = queue[0];
  return c && c.state === 'waitPay' ? c : null;
}
function rateMult(h) {
  if (h < 9) return 1.3;
  if (h >= 11.5 && h < 13.5) return 1.5;
  if (h >= 17 && h < 19.5) return 1.5;
  if (h >= 19.5) return 0.8;
  return 1.0;
}
/** レベルが上がるほど客足が増える（Lv.1 は約35秒に1人） */
function nextSpawnDelay() {
  const levelMult = 1 + 0.4 * (S.level - 1);
  const mult = rateMult(S.time) * levelMult * val('poster') * (0.4 + S.rep * 0.24);
  return (35 / mult) * rand(0.75, 1.25);
}
function spawnCustomer() {
  const stocked = shelves.filter((s) => shelfTotal(s) > 0);
  new Customer(pick(stocked.length ? stocked : shelves));
}

/* =====================================================================
 *  食材の配達（裏口）
 * ===================================================================== */
const couriers = [];
class Courier {
  constructor(entry) {
    this.entry = entry;
    entry.courier = true;
    this.person = makePerson({ shirt: '#ffb300', pants: '#37474f', cap: '#ffb300', hair: '#3a2a20', holdArms: true });
    this.pos = new THREE.Vector3(LAYOUT.backDoor.xc, 0, 6.5);
    this.person.group.position.copy(this.pos);
    scene.add(this.person.group);
    shadowize(this.person.group);
    fillHold(this.person.hold, 'box');
    this.person.hold.position.set(0, 0.85, 0.42);
    this.target = new THREE.Vector3(LAYOUT.backDoor.xc, 0, 3.2);
    this.state = 'in';
    this.facing = Math.PI / 2;
    couriers.push(this);
  }
  update(dt) {
    const t = this.target;
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    let sp2 = 0;
    if (d > 0.08) {
      const m = Math.min(d, 2.6 * dt);
      this.pos.x += (dx / d) * m;
      this.pos.z += (dz / d) * m;
      this.facing = Math.atan2(dx, dz);
      sp2 = 2.6;
    } else if (this.state === 'in') {
      this.deliver();
    } else {
      this.dispose();
      return;
    }
    const g = this.person.group;
    g.position.copy(this.pos);
    g.rotation.y = lerpAngle(g.rotation.y, this.facing, 1 - Math.exp(-12 * dt));
    this.person.anim(dt, sp2);
  }
  deliver() {
    const e = this.entry;
    S.inv[e.id] += e.qty;
    S.pending.splice(S.pending.indexOf(e), 1);
    popup(LAYOUT.backDoor.xc, 1.9, 3.3, `入荷！ ${ING[e.id].name} +${e.qty}`);
    orderDirty = true;
    save();
    clearGroup(this.person.hold);
    this.person.holdArms = false;
    this.state = 'out';
    this.target = new THREE.Vector3(LAYOUT.backDoor.xc, 0, 6.6);
  }
  dispose() {
    scene.remove(this.person.group);
    this.person.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    const i = couriers.indexOf(this);
    if (i >= 0) couriers.splice(i, 1);
  }
}
function updateDeliveries(dt) {
  for (const p of S.pending) {
    p.t -= dt;
    if (p.t <= 0 && !p.courier) new Courier(p);
  }
  [...couriers].forEach((c) => c.update(dt));
  const near = couriers.some((c) => c.pos.z > 3.0 && c.pos.z < 6.4);
  backDoorOpen += ((near ? 1 : 0) - backDoorOpen) * (1 - Math.exp(-7 * dt));
  backDoor.pivot.rotation.y = -backDoorOpen * 1.45;
  const waiting = S.pending.filter((p) => !p.courier);
  const arriving = S.pending.some((p) => p.courier);
  if (arriving) backDoorTag.set({ chip: '📦 配達員が来た！', tone: 'good' });
  else if (waiting.length) backDoorTag.set({ chip: `📦 配達まで ${Math.ceil(Math.min(...waiting.map((p) => p.t)))}秒`, bar: q40(1 - Math.min(...waiting.map((p) => p.t)) / DELIVERY_SECONDS) });
  else backDoorTag.set({ chip: '📦 搬入口' });
}

/* =====================================================================
 *  アップグレード / ショップ / 注文 UI
 * ===================================================================== */
let shopDirty = true;
let orderDirty = true;
function applyUpgrades() {
  shelves.forEach((sh) => {
    sh.cap = 4 * tierCap();
    sh.tiers.forEach((t, i) => { if (t.n === 0) t.kind = S.tiers[i]; }); // 空の段は保存した設定に合わせる
    refreshShelf(sh);
  });
  staff.group.visible = S.up.cashier > 0;
  stationModel.setBowls(S.level);
  setExpanded(S.level >= 3, false);
  rebuildColliders();
  placeWipeCam();
  refreshFridge();
  shopDirty = orderDirty = true;
}
function purchase(id) {
  const u = UPG_BY_ID[id];
  const lv = S.up[id];
  if (lv >= u.costs.length) return;
  const cost = u.costs[lv];
  if (S.money < cost) return rest('お金が足りない…');
  S.money -= cost;
  S.up[id]++;
  applyUpgrades();
  toast(`${u.name} を購入！`);
  popup(player.pos.x, 2.2, player.pos.z, `−${yen(cost)}`, 'red');
  save();
}
function renderShop() {
  let h = '<h2>🛒 ショップ</h2>';
  for (const u of UPG) {
    const lv = S.up[u.id];
    const maxed = lv >= u.costs.length;
    const cur = u.fmt(u.vals[lv]);
    const nxt = maxed ? '' : ` → ${u.fmt(u.vals[lv + 1])}`;
    h += `<div class="up"><div class="t"><div class="n">${u.name} <span class="lv">${maxed ? 'MAX' : 'Lv.' + (lv + 1)}</span></div>
      <div class="d">${u.desc}：${cur}${nxt}</div></div>
      <button class="btn green" data-id="${u.id}" ${maxed || S.money < u.costs[lv] ? 'disabled' : ''}>${maxed ? '購入済み' : yen(u.costs[lv])}</button></div>`;
  }
  h += '<div class="foot"><button class="btn sub" id="btn-title">タイトルへ戻る</button></div>';
  $('shop').innerHTML = h;
}
let shopOpen = false;
function toggleShop(v) {
  shopOpen = v ?? !shopOpen;
  $('shop').style.display = shopOpen ? 'block' : 'none';
  if (shopOpen) { shopDirty = true; toggleOrder(false); }
}
$('shop').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.id) purchase(b.dataset.id);
  else if (b.id === 'btn-title') {
    save();
    location.reload(); // タイトル画面へ（セーブ済み）
  }
});

let orderOpen = false;
function renderOrder() {
  let h = '<h2>📦 食材を注文</h2><div class="note">注文すると、しばらくして裏口に配達員が届けてくれるよ。</div>';
  ING_IDS.forEach((id) => {
    const g = ING[id];
    const locked = S.level < g.lv;
    const pend = S.pending.filter((p) => p.id === id).reduce((a, p) => a + p.qty, 0);
    h += `<div class="up"><div class="t"><div class="n">${g.icon} ${g.name} <span class="lv">在庫 ${S.inv[id]}</span></div>
      <div class="d">${locked ? `🔒 Lv.${g.lv} で解禁` : `${g.pack}個入り${pend ? `　配達中 +${pend}` : ''}`}</div></div>
      <button class="btn green" data-order="${id}" ${locked || S.money < g.cost ? 'disabled' : ''}>${locked ? '未解禁' : yen(g.cost)}</button></div>`;
  });
  h += '<div class="foot"><button class="btn sub" id="btn-order-close">閉じる</button></div>';
  $('order').innerHTML = h;
}
function toggleOrder(v) {
  orderOpen = v ?? !orderOpen;
  $('order').style.display = orderOpen ? 'block' : 'none';
  if (orderOpen) { orderDirty = true; toggleShop(false); }
}
$('order').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'btn-order-close') return toggleOrder(false);
  const id = b.dataset.order;
  if (!id) return;
  const g = ING[id];
  if (S.level < g.lv) return rest(`Lv.${g.lv} で解禁されるよ`);
  if (S.money < g.cost) return rest('お金が足りない…');
  S.money -= g.cost;
  S.pending.push({ id, qty: g.pack, t: DELIVERY_SECONDS });
  orderDirty = true;
  save();
});

// 1日の終わりは画面を出さず、静かに次の日へ
function nextDay() {
  [...customers].forEach((c) => {
    c.returnItems();
    c.dispose();
  });
  queue.length = 0;
  reg.serving = null;
  S.day++;
  S.time = DAY_START;
  S.stats = { sales: 0, customers: 0, lost: 0 };
  spawnTimer = 12;
  save();
}

/* =====================================================================
 *  入力
 * ===================================================================== */
const keys = new Set();
let bestStation = null;
window.addEventListener('keydown', (e) => {
  if (e.repeat) { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); return; }
  if (!started) return;
  if (e.code === 'Escape') { // Esc：パネルが開いていれば閉じる／なければポーズ（もう一度でもどる）
    e.preventDefault();
    if (paused) setPause(false);
    else if (shopOpen || orderOpen) { toggleShop(false); toggleOrder(false); }
    else setPause(true);
    return;
  }
  if (paused) return;
  if (shelfMode.active) { // 棚モード：E / Q / 移動キーで抜ける
    if (['KeyE', 'KeyQ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
      exitShelf();
    }
    return;
  }
  if (craft.active) {
    // 握りモード：E / Q / 移動キーで抜ける（Esc はポーズ）
    if (['KeyE', 'KeyQ', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
      exitCraft();
    }
    return;
  }
  keys.add(e.code);
  if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
    e.preventDefault();
    if (bestStation) { bestStation.act(); shopDirty = orderDirty = true; }
  } else if (e.code === 'KeyB') toggleShop();
  else if (e.code === 'KeyR') { view.az = rad(40); view.el = rad(41); userZoomed = false; view.dist = defaultDist(); }
  else if (e.code.startsWith('Arrow')) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
});
$('craft-exit').addEventListener('click', () => exitCraft());

function setPause(v) {
  paused = v;
  $('pause').style.display = v ? 'flex' : 'none';
  if (v) { keys.clear(); craft.hold = false; drag = null; }
}
$('pause').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.pause === 'resume') setPause(false);
  else if (b.dataset.pause === 'title') { save(); location.reload(); }
});
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  if (!started || paused || shelfMode.active) return;
  if (craft.active) { craftPointerDown(e); return; }
  if (e.button === 2 || e.button === 1) {
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    return;
  }
  if (e.button !== 0) return;
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(clickRoots.filter((o) => o.visible), true);
  let st = null;
  if (hits.length) {
    let o = hits[0].object;
    while (o && !o.userData.station) o = o.parent;
    if (o) st = o.userData.station;
  }
  if (st) {
    player.path = findPath(player.pos.x, player.pos.z, st.use.x, st.use.z);
    player.target = st;
    return;
  }
  if (raycaster.ray.intersectPlane(groundPlane, _hit)) {
    if (_hit.x > -7 && _hit.x < (expanded ? 6.0 : 3.5) && _hit.z > -8.5 && _hit.z < 4) {
      player.path = findPath(player.pos.x, player.pos.z, _hit.x, _hit.z);
      player.target = null;
      showClickMark(_hit.x, _hit.z);
    }
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  view.az = clamp(view.az - (e.clientX - drag.x) * 0.006, rad(2), rad(88));
  view.el = clamp(view.el + (e.clientY - drag.y) * 0.004, rad(22), rad(72));
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (!started || craft.active || shelfMode.active || paused) return;
  userZoomed = true;
  view.dist = clamp(view.dist * Math.exp(e.deltaY * 0.001), 10, 50);
}, { passive: false });

const clickMark = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.22, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
clickMark.rotation.x = -Math.PI / 2;
clickMark.position.y = 0.04;
clickMark.userData.noShadow = true;
scene.add(clickMark);
let clickMarkT = 0;
function showClickMark(x, z) { clickMark.position.x = x; clickMark.position.z = z; clickMarkT = 0.6; }

/* =====================================================================
 *  更新処理
 * ===================================================================== */
let elapsed = 0;
function updatePlayer(dt) {
  const f = { x: -Math.sin(view.az), z: -Math.cos(view.az) };
  const r = { x: -f.z, z: f.x };
  const up = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const rt = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  let dx = 0, dz = 0;
  const speed = 4.6;
  if (up || rt) {
    dx = f.x * up + r.x * rt;
    dz = f.z * up + r.z * rt;
    const l = Math.hypot(dx, dz);
    dx /= l; dz /= l;
    player.path = [];
    player.target = null;
  } else if (player.path.length) {
    const t = player.path[0];
    const ex = t.x - player.pos.x, ez = t.z - player.pos.z;
    const d = Math.hypot(ex, ez);
    if (d < 0.12) player.path.shift();
    else { dx = ex / d; dz = ez / d; }
  }
  const k = 1 - Math.exp(-14 * dt);
  player.vel.x += (dx * speed - player.vel.x) * k;
  player.vel.z += (dz * speed - player.vel.z) * k;
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  collide(player.pos, 0.35);

  if (player.target && !player.path.length) {
    const st = player.target;
    player.target = null;
    if (player.pos.distanceTo(st.use) < st.radius + 0.3 && st.prompt()) { st.act(); shopDirty = orderDirty = true; }
  }

  const sp2 = Math.hypot(player.vel.x, player.vel.z);
  if (sp2 > 0.3) player.facing = Math.atan2(player.vel.x, player.vel.z);
  const g = playerPerson.group;
  g.position.copy(player.pos);
  g.rotation.y = lerpAngle(g.rotation.y, player.facing, 1 - Math.exp(-14 * dt));
  playerPerson.anim(dt, sp2, false);
}
function updatePlayerCrafting(dt) {
  // 握りモード中：台の前に立ったまま、手を動かす
  const g = playerPerson.group;
  g.position.copy(player.pos);
  g.rotation.y = lerpAngle(g.rotation.y, -Math.PI / 2, 1 - Math.exp(-12 * dt));
  const pressing = craft.ball && craft.ball.stage === 'filled' && craft.hold;
  playerPerson.anim(dt, 0, !!pressing);
}

function updateWorld(dt) {
  const time = elapsed;
  // 炊飯器
  if (cooker.state === 'cooking') {
    cooker.t += dt;
    if (cooker.t >= COOK_TIME) {
      cooker.state = 'ready';
      cooker.rice = cooker.batch;
    }
  }
  cookerModel.setLed(cooker.state);
  cookerModel.animateSteam(time, cooker.state === 'cooking');
  if (cooker.state === 'idle') cookerTag.set({ chip: '🍚 炊飯器' });
  else if (cooker.state === 'cooking') cookerTag.set({ chip: '炊飯中…', bar: q40(cooker.t / COOK_TIME) });
  else cookerTag.set({ chip: `ごはん ×${cooker.rice}`, tone: 'good' });

  // 握り台：ごはんを置いて、台の前に立つと握りモードへ
  const dStn = Math.hypot(player.pos.x - LAYOUT.station.use.x, player.pos.z - LAYOUT.station.use.z);
  if (dStn > 1.8) stn.armed = true;
  if (!craft.active && stn.armed && stn.rice > 0 && carryKind() === null && sumC(stn.tray) < TRAY_MAX
    && dStn < 0.9 && Math.hypot(player.vel.x, player.vel.z) < 0.6) enterCraft();
  stationModel.setRice(stn.rice);
  trayModel.setTray(stn.order);
  stationTag.set({ chip: `🍚 ${stn.rice}` });
  trayTag.set({ chip: `🍙 ${sumC(stn.tray)} / ${TRAY_MAX}`, tone: sumC(stn.tray) ? 'good' : '' });

  // 棚
  shelves.forEach((sh) => {
    sh.model.tick(dt);
    const tot = shelfTotal(sh);
    let chip = `🍙 ${tot} / ${sh.cap}`;
    if (S.level >= 2 && tot) chip += '　' + KIND_IDS.filter((k) => sh.stock[k]).map((k) => `${KINDS[k].short}${sh.stock[k]}`).join(' ');
    sh.tag.set({ chip, tone: tot ? 'good' : '' });
  });

  // 冷蔵庫・増築アニメ
  if (expanded) fridgeTag.set({ chip: `💧 水 ${fridge.stock} / ${fridge.cap}`, tone: fridge.stock ? 'good' : '' });
  fridgeTag.on = expanded && expandT >= 1;
  if (expandT < 1) {
    expandT = Math.min(1, expandT + dt / 1.0);
    expansion.group.scale.y = Math.max(0.01, ease(expandT));
    if (expandT >= 1) placeWipeCam();
  }

  // レジ
  if (reg.serving) {
    const c = reg.serving;
    reg.t += dt / 0.9;
    regTag.set({ chip: 'ピッ…', bar: q40(reg.t) });
    if (reg.t >= 1) { reg.serving = null; c.pay(); }
  } else {
    regTag.set(null);
    const c = frontCustomer();
    if (S.up.cashier > 0 && c) {
      reg.autoT += dt;
      if (reg.autoT >= 2.2) { reg.autoT = 0; reg.serving = c; reg.t = 0.2; c.state = 'serving'; }
    } else reg.autoT = 0;
  }
  staff.anim(dt, 0, !!reg.serving && S.up.cashier > 0 && Math.hypot(player.pos.x - LAYOUT.register.use.x, player.pos.z - LAYOUT.register.use.z) > 2.2);

  // お客さん（レベルが上がるほど増える）
  if (S.opened) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      if (customers.length < Math.min(9, 2 + S.level)) spawnCustomer();
      spawnTimer = nextSpawnDelay();
    }
  }
  [...customers].forEach((c) => c.update(dt));
  updateDeliveries(dt);

  // 自動ドア
  const wantOpen = customers.some((c) => Math.abs(c.pos.x - LAYOUT.door.xc) < 1.6 && c.pos.z > 2.6 && c.pos.z < 6.2);
  doorWasOpen = wantOpen;
  doorOpen += ((wantOpen ? 1 : 0) - doorOpen) * (1 - Math.exp(-8 * dt));
  door.panels.forEach((p) => { p.position.x = p.userData.baseX + p.userData.dir * doorOpen * 0.8; });

  // 時間（見た目の昼夜サイクルだけ。画面には出さない）
  if (S.opened) {
    S.time += (dt * (DAY_END - DAY_START)) / DAY_SECONDS;
    if (S.time >= DAY_END) nextDay();
  }
  applyLighting(S.time);
}

function pickStation() {
  bestStation = null;
  let bd = 1e9, bp = null;
  if (!craft.active && !shelfMode.active) {
    for (const st of stations) {
      const d = Math.hypot(player.pos.x - st.use.x, player.pos.z - st.use.z);
      if (d < st.radius && d < bd) {
        const p = st.prompt();
        if (p) { bd = d; bestStation = st; bp = p; }
      }
    }
  }
  const pe = $('prompt');
  if (bp) {
    pe.style.display = 'block';
    const h = `<kbd>E</kbd>${bp}`;
    if (pe._h !== h) { pe._h = h; pe.innerHTML = h; }
  } else pe.style.display = 'none';
  stations.forEach((st) => {
    const active = st === bestStation;
    st.markerRing.material.opacity = active ? 0.7 + Math.sin(elapsed * 8) * 0.3 : 0.55;
    st.marker.scale.setScalar(active ? 1.1 + Math.sin(elapsed * 8) * 0.05 : 1);
  });
}

const hudCache = {};
function setText(id, v) {
  if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; }
}
let orderTimer = 0;
function updateHud(dt) {
  setText('money-v', yen(S.money));
  setText('lv-v', `Lv.${S.level}`);
  const need = expNeed(S.level);
  setText('exp-v', `EXP ${S.exp} / ${need}`);
  const w = `${Math.round((S.exp / need) * 100)}%`;
  if (hudCache.expw !== w) { hudCache.expw = w; $('exp-bar').style.width = w; }
  const kind = carryKind();
  carryHeadTag.at(player.pos.x, 2.1, player.pos.z).set(kind && !craft.active ? { chip: `${kind === 'rice' ? '🍚' : '🍙'}×${carryTotal()}` } : null);
  if (shopOpen && shopDirty) renderShop();
  shopDirty = false;
  if (orderOpen) {
    orderTimer -= dt;
    if (orderDirty || orderTimer <= 0) { renderOrder(); orderDirty = false; orderTimer = 0.4; }
    if (Math.hypot(player.pos.x - LAYOUT.backDoor.use.x, player.pos.z - LAYOUT.backDoor.use.z) > 2.6) toggleOrder(false);
  }
}

/* =====================================================================
 *  描画（握りモードは FPS 視点 + 左上に店内のワイプ）
 * ===================================================================== */
function render() {
  const W = Math.max(1, window.innerWidth), H = Math.max(1, window.innerHeight);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);
  if (started && craft.active) {
    // メイン：一人称
    playerPerson.group.visible = false;
    fpsCam.visible = true;
    updateTags('fps', fpsCam, H);
    renderer.render(scene, fpsCam);
    // ワイプ：店内（自分も映る）
    playerPerson.group.visible = true;
    fpsCam.visible = false;
    const r = $('wipe').getBoundingClientRect();
    const bw = 3;
    const x = Math.round(r.left + bw), w = Math.round(r.width - bw * 2), h = Math.round(r.height - bw * 2);
    const y = Math.round(H - (r.top + bw) - h);
    wipeCam.aspect = w / h;
    wipeCam.updateProjectionMatrix();
    renderer.setScissorTest(true);
    renderer.setViewport(x, y, w, h);
    renderer.setScissor(x, y, w, h);
    updateTags('world', wipeCam, h, 0.62);
    stationModel.group.scale.setScalar(STATION_K);
    renderer.render(scene, wipeCam);
    stationModel.group.scale.setScalar(1);
    stationModel.group.updateMatrixWorld(true);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
  } else if (started && shelfMode.active) {
    playerPerson.group.visible = false;
    fpsCam.visible = true;
    updateTags('shelf', fpsCam, H);
    renderer.render(scene, fpsCam);
    playerPerson.group.visible = true;
  } else {
    playerPerson.group.visible = true;
    fpsCam.visible = false;
    updateTags('world', camera, H);
    renderer.render(scene, camera);
  }
}

/* =====================================================================
 *  メインループ
 * ===================================================================== */
applyUpgrades();
document.addEventListener('click', () => setTimeout(() => document.activeElement && document.activeElement.blur && document.activeElement.blur(), 0));
const clock = new THREE.Clock();
let saveT = 0;
function loop() {
  requestAnimationFrame(loop);
  frame(Math.min(clock.getDelta(), 0.05));
}
function frame(dt) {
  if (started && paused) { updateCamera(); render(); return; } // ポーズ中は時間を止める
  elapsed += dt;
  if (started) {
    if (craft.active) updatePlayerCrafting(dt);
    else if (shelfMode.active) updatePlayerShelf(dt);
    else updatePlayer(dt);
    updateWorld(dt);
    if (craft.active) updateCraft(dt);
    else canvas.style.cursor = '';
    if (shelfMode.active) updateShelfMode(dt);
    updatePopups(dt);
    pickStation();
    updateHud(dt);
  } else {
    // タイトル画面：店をゆっくり回して見せる
    view.az = rad(40) + Math.sin(elapsed * 0.25) * rad(16);
    view.el = rad(41);
    applyLighting(11);
    cookerModel.animateSteam(elapsed, false);
  }
  if (clickMarkT > 0) {
    clickMarkT -= dt;
    clickMark.material.opacity = Math.max(0, clickMarkT / 0.6);
    clickMark.scale.setScalar(1 + (1 - clickMarkT / 0.6) * 1.2);
  }
  saveT += dt;
  if (saveT > 20) { saveT = 0; save(); }
  // 増築したら、画面の中心と距離をなめらかに調整
  view.target.x += ((expanded ? -2.9 : LAYOUT.view.x) - view.target.x) * (1 - Math.exp(-3 * dt));
  if (!userZoomed) view.dist += (defaultDist() - view.dist) * (1 - Math.exp(-3 * dt));
  updateCamera();
  render();
}
window.addEventListener('beforeunload', save);

/* =====================================================================
 *  タイトル画面
 * ===================================================================== */
const titleEl = $('title');
let delArm = 0; // 「データ消去」を1回押して確認待ちのスロット
function renderSlots() {
  let h = '<h3>セーブスロットを選ぶ</h3>';
  for (let n = 1; n <= SLOT_COUNT; n++) {
    const d = readSlot(n);
    h += `<div class="slot"><button class="slot-main" data-slot="${n}">
      <span class="sn">スロット${n}</span>
      <span class="si">${d ? `Lv.${d.level}　${yen(d.money)}　${d.day}日目` : '― 空き（はじめから） ―'}</span></button>
      ${d ? `<button class="slot-del${delArm === n ? ' armed' : ''}" data-del="${n}">${delArm === n ? '本当に消す？' : 'データ消去'}</button>` : ''}</div>`;
  }
  h += '<button class="mbtn back" data-act="back">もどる</button>';
  $('menu-slots').innerHTML = h;
}
function showMenu(name) {
  delArm = 0;
  ['main', 'slots', 'options'].forEach((m) => { $('menu-' + m).hidden = m !== name; });
  if (name === 'slots') renderSlots();
}
function quitGame() {
  if (window.konbiniApp && window.konbiniApp.quit) window.konbiniApp.quit();
  else window.close();
}
function startGame(n) {
  currentSlot = n;
  S = readSlot(n) || defaultState();
  S.opened = false; // 在庫は持ち越さないので、棚に並べるまで準備中
  window.__game.S = S;
  applyUpgrades();
  view.az = rad(40);
  view.el = rad(41);
  userZoomed = false;
  view.dist = defaultDist();
  started = true;
  titleEl.style.display = 'none';
  $('hud').style.display = 'flex';
  save();
}
titleEl.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const act = b.dataset.act;
  if (b.dataset.del) {
    const n = Number(b.dataset.del);
    if (delArm === n) {
      try { localStorage.removeItem(slotKey(n)); } catch (er) { /* ignore */ }
      delArm = 0;
    } else delArm = n;
    renderSlots();
    return;
  }
  delArm = 0;
  if (act === 'start') showMenu('slots');
  else if (act === 'options') showMenu('options');
  else if (act === 'back') showMenu('main');
  else if (act === 'quit') quitGame();
  else if (b.dataset.slot) startGame(Number(b.dataset.slot));
});
showMenu('main');

loop();
// 動作確認用
window.__game = { frame, shelfMode, S, stations, shelves, cooker, stn, customers, queue, player, view, craft, carry, fridge, addExp, findPath };
