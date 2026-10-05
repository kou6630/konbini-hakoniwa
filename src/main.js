import * as THREE from 'three';
import {
  LAYOUT, COLLIDERS, SHELF_COLLIDERS, EXP_COLLIDERS, UNLOCK_COLLIDERS, KIND_IDS, bx, cy, sp,
  makeOnigiri, makeSandwich, makeFried, makeBento, makePerson, makeRobot, buildCharger, buildShelf, buildCooker, buildStation, buildTrayStand, buildRegister, buildDoor, buildBackDoor, buildFridge, buildDisplayCase, buildSandTable, buildFryer, buildBentoTable, buildExpansion, buildWorld,
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
const STATION_RICE_MAX = 24;
const TRAY_MAX = 12;
const DELIVERY_SECONDS = 8;
const expNeed = (lv) => 40 + 25 * (lv - 1);

// おにぎりの種類
const KINDS = {
  shio: { name: '塩むすび', short: '塩', price: 150, ing: 'salt', lv: 1, weight: 0.5 },
  ume: { name: '梅むすび', short: '梅', price: 200, ing: 'ume', lv: 2, weight: 0.25 },
  okaka: { name: 'おかかむすび', short: 'か', price: 200, ing: 'okaka', lv: 2, weight: 0.25 },
  sake: { name: '鮭むすび', short: '鮭', price: 220, ing: 'sake', lv: 8, weight: 0.2 },
  tuna: { name: 'ツナマヨむすび', short: 'ツ', price: 220, ing: 'tuna', lv: 9, weight: 0.2 },
};
// サンドイッチ・揚げ物・弁当（作る台で作る）／飲み物・お菓子・スイーツ（食材として注文して並べる）
const FOODS = {
  tamago: { name: 'たまごサンド', label: 'たまご', price: 230, lv: 4, cat: 'sand', weight: 0.6 },
  ham: { name: 'ハムサンド', label: 'ハム', price: 250, lv: 6, cat: 'sand', weight: 0.4 },
  karaage: { name: 'から揚げ', label: 'から揚げ', price: 180, lv: 5, cat: 'fried', weight: 0.6 },
  korokke: { name: 'コロッケ', label: 'コロッケ', price: 140, lv: 7, cat: 'fried', weight: 0.4 },
  bento_kara: { name: '唐揚げ弁当', label: '唐揚げ弁当', price: 480, lv: 9, cat: 'bento', weight: 0.6 },
  bento_nori: { name: 'のり弁当', label: 'のり弁当', price: 420, lv: 10, cat: 'bento', weight: 0.4 },
};
const DRINKS = {
  water: { name: '水', label: '水', price: 120, lv: 3, cat: 'drink', weight: 0.5 },
  tea: { name: 'お茶', label: 'お茶', price: 140, lv: 5, cat: 'drink', weight: 0.3 },
  coffee: { name: 'コーヒー', label: 'コーヒー', price: 160, lv: 7, cat: 'drink', weight: 0.2 },
};
const GOODS = {
  chips: { name: 'ポテトチップス', label: 'ポテチ', price: 160, lv: 8, cat: 'snack', weight: 0.6 },
  choco: { name: 'チョコレート', label: 'チョコ', price: 130, lv: 10, cat: 'snack', weight: 0.4 },
  pudding: { name: 'プリン', label: 'プリン', price: 180, lv: 11, cat: 'sweet', weight: 0.6 },
  cream: { name: 'シュークリーム', label: 'シュー', price: 200, lv: 12, cat: 'sweet', weight: 0.4 },
};
const FOOD_IDS = Object.keys(FOODS);
const DRINK_IDS = Object.keys(DRINKS);
const ONIGIRI_LABEL = { shio: '塩', ume: '梅', okaka: 'おかか', sake: '鮭', tuna: 'ツナマヨ' };
const ITEM = {
  ...Object.fromEntries(KIND_IDS.map((k) => [k, { ...KINDS[k], label: ONIGIRI_LABEL[k], cat: 'onigiri' }])),
  ...FOODS,
  ...DRINKS,
  ...GOODS,
};
const itemUnlocked = (id) => S.level >= ITEM[id].lv;
const CAT_ICON = { onigiri: '🍙', drink: '💧', sand: '🥪', fried: '🍗', bento: '🍱', snack: '🍿', sweet: '🍮' };
// 食材・仕入れ品（裏口から注文）
const ING = {
  rice: { name: '米', icon: '🍚', pack: 10, cost: 100, lv: 1 },
  salt: { name: '塩', icon: '🧂', pack: 10, cost: 50, lv: 1 },
  ume: { name: '梅干し', icon: '🔴', pack: 10, cost: 250, lv: 2 },
  okaka: { name: 'おかか', icon: '🐟', pack: 10, cost: 200, lv: 2 },
  water: { name: '水', icon: '💧', pack: 10, cost: 70, lv: 3 },
  bread: { name: '食パン', icon: '🍞', pack: 10, cost: 80, lv: 4 },
  egg: { name: 'たまご', icon: '🥚', pack: 10, cost: 150, lv: 4 },
  tea: { name: 'お茶', icon: '🍵', pack: 10, cost: 80, lv: 5 },
  chicken: { name: '鶏肉', icon: '🍗', pack: 10, cost: 200, lv: 5 },
  hamslice: { name: 'ハム', icon: '🥓', pack: 10, cost: 180, lv: 6 },
  potato: { name: 'じゃがいも', icon: '🥔', pack: 10, cost: 120, lv: 7 },
  coffee: { name: 'コーヒー', icon: '☕', pack: 10, cost: 100, lv: 7 },
  sake: { name: '鮭', icon: '🐟', pack: 10, cost: 300, lv: 8 },
  chips: { name: 'ポテトチップス', icon: '🍿', pack: 10, cost: 650, lv: 8 },
  tuna: { name: 'ツナマヨ', icon: '🥫', pack: 10, cost: 260, lv: 9 },
  choco: { name: 'チョコレート', icon: '🍫', pack: 10, cost: 600, lv: 10 },
  pudding: { name: 'プリン', icon: '🍮', pack: 10, cost: 800, lv: 11 },
  cream: { name: 'シュークリーム', icon: '🥐', pack: 10, cost: 900, lv: 12 },
};
const ING_IDS = ['rice', 'salt', 'ume', 'okaka', 'water', 'bread', 'egg', 'tea', 'chicken', 'hamslice', 'potato', 'coffee', 'sake', 'chips', 'tuna', 'choco', 'pudding', 'cream'];
// 作る台のレシピ（1回に batch 個。材料は 1個あたり ing ぶん）
const RECIPES = {
  tamago: { maker: 'sand', ing: { bread: 1, egg: 1 }, batch: 4 },
  ham: { maker: 'sand', ing: { bread: 1, hamslice: 1 }, batch: 4 },
  karaage: { maker: 'fry', ing: { chicken: 1 }, batch: 4 },
  korokke: { maker: 'fry', ing: { potato: 1 }, batch: 4 },
  bento_kara: { maker: 'bento', ing: { rice: 1, chicken: 1 }, batch: 4 },
  bento_nori: { maker: 'bento', ing: { rice: 1, egg: 1 }, batch: 4 },
};
const MAKER_TIME = 8;
const emptyCounts = () => Object.fromEntries(KIND_IDS.map((k) => [k, 0]));
const sumC = (c) => KIND_IDS.reduce((a, k) => a + (c[k] || 0), 0);
const listOf = (c) => {
  const a = [];
  KIND_IDS.forEach((k) => { for (let i = 0; i < c[k]; i++) a.push(k); });
  return a;
};

const defaultState = () => ({
  money: 500, exp: 0, level: 1, day: 1, time: DAY_START, opened: false, rep: 3,
  up: { shelfCap: 0, cooker: 0, craft: 0, carry: 0, poster: 0 },
  inv: { rice: 8, salt: 8, ume: 0, okaka: 0, water: 0, bread: 0, egg: 0, tea: 0, chicken: 0, hamslice: 0, potato: 0, coffee: 0, sake: 0, tuna: 0, chips: 0, choco: 0, pudding: 0, cream: 0 },
  pending: [],
  staff: {}, // 買ったロボット { role: true }
  robLv: {}, // ロボットのレベル { role: 0〜4 }
  chargers: 0, // 買った充電スポットの数
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
        // 以前の「レジ係を雇う」アップグレードは、アルバイト（レジ係）に引き継ぐ
        staff: { ...(j.s.staff || {}), cashier: !!((j.s.staff && j.s.staff.cashier) || (j.s.up && j.s.up.cashier > 0)) },
        robLv: { ...(j.s.robLv || {}) },
        // 以前のアルバイトはロボットに引き継ぐ（充電スポットを1つ進呈）
        chargers: typeof j.s.chargers === 'number' ? j.s.chargers : (Object.values(j.s.staff || {}).some(Boolean) ? 1 : 0),
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
  { id: 'cooker', name: '炊飯器を大型化', desc: '1回で炊けるごはんの量', costs: [600, 1200, 2400, 4800, 9000, 16000], vals: [4, 6, 8, 10, 13, 16, 20], fmt: (v) => `${v}膳` },
  { id: 'craft', name: '握りの腕前', desc: 'おにぎりを握る時間', costs: [700, 1400, 2800], vals: [1.6, 1.2, 0.9, 0.6], fmt: (v) => `${v}秒` },
  { id: 'carry', name: '運搬カゴ', desc: '一度に運べる数', costs: [500, 1500], vals: [8, 12, 16], fmt: (v) => `${v}個` },
  { id: 'poster', name: '集客ポスター', desc: 'お客さんの来店ペース', costs: [1000, 2000, 4000], vals: [1, 1.25, 1.5, 1.8], fmt: (v) => `×${v}` },
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
const lightCur = { color: new THREE.Color('#ffe0bd'), sun: 2.2, hemi: 1.0 };
const _c3 = new THREE.Color();
let lightSnap = true; // 次の1回は補間せずに一気に合わせる（開始直後など）
function applyLighting(h, dt = 1) {
  let a = LIGHT_KEYS[0], b = LIGHT_KEYS[LIGHT_KEYS.length - 1];
  for (let i = 0; i < LIGHT_KEYS.length - 1; i++) {
    if (h >= LIGHT_KEYS[i][0] && h <= LIGHT_KEYS[i + 1][0]) { a = LIGHT_KEYS[i]; b = LIGHT_KEYS[i + 1]; break; }
  }
  const t = a === b ? 0 : (h - a[0]) / (b[0] - a[0]);
  _c3.copy(_c1.set(a[1]).lerp(_c2.set(b[1]), t));
  const sunT = a[2] + (b[2] - a[2]) * t, hemiT = a[3] + (b[3] - a[3]) * t;
  const k = lightSnap ? 1 : 1 - Math.exp(-1.4 * dt); // 夜→朝も 2〜3 秒かけてなめらかに
  lightSnap = false;
  lightCur.color.lerp(_c3, k);
  lightCur.sun += (sunT - lightCur.sun) * k;
  lightCur.hemi += (hemiT - lightCur.hemi) * k;
  sun.color.copy(lightCur.color);
  sun.intensity = lightCur.sun;
  hemi.intensity = lightCur.hemi;
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

// Lv.3：店が右に広がる（増築）。飲み物の冷蔵庫、Lv.4 サンドの売り場、Lv.5 ホットスナックケースが増築エリアに並ぶ
const expansion = buildExpansion();
expansion.group.visible = false;
scene.add(expansion.group);
let expandT = 1;
/** 売り場ケース：種類ごとの在庫を持ち、並べる・取る・数えるができる */
class Display {
  constructor(id, kinds, cap, model, layout) {
    this.id = id;
    this.kinds = kinds;
    this.cap = cap;
    this.model = model;
    this.stock = Object.fromEntries(kinds.map((k) => [k, 0]));
    model.group.position.set(layout.x, 0, layout.z);
    model.group.rotation.y = layout.rot || 0;
    model.group.visible = false;
    scene.add(model.group);
    shadowize(model.group);
  }
  get total() { return this.kinds.reduce((a, k) => a + this.stock[k], 0); }
  count(k) { return this.stock[k] || 0; }
  take(k) {
    if (this.stock[k] > 0) { this.stock[k]--; this.refresh(); return true; }
    return false;
  }
  add(k, n) {
    const m = Math.min(n, this.cap - this.total);
    if (m > 0) { this.stock[k] += m; this.refresh(); }
    return Math.max(0, m);
  }
  refresh() {
    const list = [];
    this.kinds.forEach((k) => { for (let i = 0; i < this.stock[k]; i++) list.push(k); });
    this.model.setItems(list);
  }
}
const fridge = new Display('fridge', DRINK_IDS, 12, buildFridge(), LAYOUT.fridge);
const sandCase = new Display('sand', ['tamago', 'ham'], 12, buildDisplayCase('sand'), LAYOUT.sandCase);
const hotCase = new Display('hot', ['karaage', 'korokke'], 12, buildDisplayCase('hot'), LAYOUT.hotCase);

const bentoCase = new Display('bento', ['bento_kara', 'bento_nori'], 12, buildDisplayCase('bento'), LAYOUT.bentoCase);
const snackRack = new Display('snack', ['chips', 'choco'], 12, buildDisplayCase('snack'), LAYOUT.snackRack);
const sweetCase = new Display('sweet', ['pudding', 'cream'], 12, buildDisplayCase('sweet'), LAYOUT.sweetCase);
/** 売り場ケースの一覧（mode: 'inv'=在庫から入れる / 'carry'=持ってきたものを並べる、face=お客さんが向く向き） */
const DISPLAYS = [
  { d: fridge, stop: 'fridge', id: 'fridge', cat: 'drink', lv: 3, mode: 'inv', label: '飲み物', color: '#2f9be0', layout: LAYOUT.fridge, p: 0.35, face: Math.PI, tagY: 2.5 },
  { d: sandCase, stop: 'sand', id: 'sandcase', cat: 'sand', lv: 4, mode: 'carry', label: 'サンドイッチ', color: '#f2a33a', layout: LAYOUT.sandCase, p: 0.3, face: Math.PI, tagY: 3.1 },
  { d: hotCase, stop: 'hot', id: 'hotcase', cat: 'fried', lv: 5, mode: 'carry', label: 'ホットスナック', color: '#d6453d', layout: LAYOUT.hotCase, p: 0.3, face: Math.PI / 2, tagY: 2.5 },
  { d: snackRack, stop: 'snack', id: 'snackrack', cat: 'snack', lv: 8, mode: 'inv', label: 'お菓子', color: '#e8a317', layout: LAYOUT.snackRack, p: 0.25, face: Math.PI / 2, tagY: 2.5 },
  { d: bentoCase, stop: 'bento', id: 'bentocase', cat: 'bento', lv: 9, mode: 'carry', label: 'お弁当', color: '#8a5a35', layout: LAYOUT.bentoCase, p: 0.25, face: Math.PI / 2, tagY: 2.5 },
  { d: sweetCase, stop: 'sweet', id: 'sweetcase', cat: 'sweet', lv: 11, mode: 'inv', label: 'スイーツ', color: '#e8688a', layout: LAYOUT.sweetCase, p: 0.25, face: Math.PI / 2, tagY: 2.5 },
];
const DISP_BY_STOP = Object.fromEntries(DISPLAYS.map((x) => [x.stop, x]));
const dispShown = (def) => expanded && S.level >= def.lv;

// 作る台：サンドイッチ台（Lv.4）、揚げ物台（Lv.5）、弁当台（Lv.9）
const sandTableModel = buildSandTable(LAYOUT.sandTable.len);
sandTableModel.group.position.set(LAYOUT.sandTable.x, 0, LAYOUT.sandTable.z);
sandTableModel.group.rotation.y = LAYOUT.sandTable.rot;
const fryerModel = buildFryer(LAYOUT.fryer.len);
fryerModel.group.position.set(LAYOUT.fryer.x, 0, LAYOUT.fryer.z);
fryerModel.group.rotation.y = LAYOUT.fryer.rot;
const bentoTableModel = buildBentoTable(LAYOUT.bentoTable.len);
bentoTableModel.group.position.set(LAYOUT.bentoTable.x, 0, LAYOUT.bentoTable.z);
bentoTableModel.group.rotation.y = LAYOUT.bentoTable.rot;
[sandTableModel, fryerModel, bentoTableModel].forEach((mdl) => {
  mdl.group.visible = false;
  scene.add(mdl.group);
  shadowize(mdl.group);
});
const makers = {
  sand: { id: 'sand', name: 'サンドイッチ台', icon: '🥪', lv: 4, color: '#f2a33a', model: sandTableModel, use: LAYOUT.sandTable.use, display: sandCase, state: 'idle', recipe: null, t: 0, out: [] },
  fry: { id: 'fry', name: '揚げ物台', icon: '🍗', lv: 5, color: '#d6453d', model: fryerModel, use: LAYOUT.fryer.use, display: hotCase, state: 'idle', recipe: null, t: 0, out: [] },
  bento: { id: 'bento', name: '弁当台', icon: '🍱', lv: 9, color: '#8a5a35', model: bentoTableModel, use: LAYOUT.bentoTable.use, display: bentoCase, state: 'idle', recipe: null, t: 0, out: [] },
};

// レジロボ（購入時）
const staff = makeRobot({ color: '#2f7ff0', cap: true });
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

const emptyFood = () => Object.fromEntries(FOOD_IDS.map((k) => [k, 0]));
const carry = { rice: 0, oni: emptyCounts(), food: emptyFood() };
const foodCount = (c) => FOOD_IDS.reduce((a, k) => a + c.food[k], 0);
const carryKind = () => (carry.rice > 0 ? 'rice' : sumC(carry.oni) > 0 ? 'onigiri' : foodCount(carry) > 0 ? 'food' : null);
const carryTotal = () => carry.rice + sumC(carry.oni) + foodCount(carry);

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
  } else if (kind === 'food') {
    FOOD_IDS.flatMap((k) => Array(data[k]).fill(k)).slice(0, 4).forEach((k, i) => {
      const o = ITEM[k].cat === 'sand' ? makeSandwich(k, 0.8) : ITEM[k].cat === 'bento' ? makeBento(k, 0.7) : makeFried(k, 0.7);
      o.position.set((i % 2 - 0.5) * 0.3, (i >> 1) * 0.14 - 0.3, 0);
      hold.add(o);
    });
  } else if (kind === 'box') {
    bx(hold, [0.46, 0.32, 0.36], '#c8964f', [0, -0.2, 0], { r: 0.03 });
    bx(hold, [0.1, 0.33, 0.37], '#e8d4a8', [0, -0.2, 0], { r: 0.01 });
  }
  shadowize(hold);
}
function refreshCarry() {
  playerPerson.holdArms = !!carryKind();
  fillHold(playerPerson.hold, carryKind(), carryKind() === 'food' ? carry.food : carry.oni);
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
DISPLAYS.forEach((def) => { def.tag = new Tag().at(def.layout.x, def.tagY, def.layout.z); });
const makerTags = { sand: new Tag().at(LAYOUT.sandTable.x, 2.2, LAYOUT.sandTable.z), fry: new Tag().at(LAYOUT.fryer.x, 2.5, LAYOUT.fryer.z), bento: new Tag().at(LAYOUT.bentoTable.x, 2.2, LAYOUT.bentoTable.z) };
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
  sake: new Tag('fps').at(...sl(0.2, 1.72, -0.42).toArray()),
  tuna: new Tag('fps').at(...sl(0.65, 1.72, -0.42).toArray()),
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
  const msg = {
    2: 'Lv.2！ 梅むすび・おかかむすびが作れるように。裏口から食材を注文しよう',
    3: 'Lv.3！ 店が広がって、飲み物の冷蔵庫ができた。裏口から水を注文しよう',
    4: 'Lv.4！ サンドイッチ解禁。バックヤードにサンドイッチ台、売り場にサンドのケースができた。食パンとたまごを注文しよう',
    5: 'Lv.5！ から揚げ・お茶が登場。揚げ物台とホットスナックケースができた。鶏肉とお茶を注文しよう',
    6: 'Lv.6！ ハムサンドが作れるように。ハムを注文しよう',
    7: 'Lv.7！ コロッケとコーヒーが登場。じゃがいもとコーヒーを注文しよう',
    8: 'Lv.8！ 鮭むすびとお菓子が登場。握り台の上に鮭の棚、売り場にお菓子棚ができた。鮭とポテチを注文しよう',
    9: 'Lv.9！ ツナマヨむすびとお弁当が登場。バックヤードに弁当台、売り場にお弁当のケースができた。ツナマヨを注文しよう',
    10: 'Lv.10！ のり弁当とチョコレートが登場。チョコを注文しよう',
    11: 'Lv.11！ スイーツが登場。売り場にスイーツケースができた。プリンを注文しよう',
    12: 'Lv.12！ シュークリームが登場。注文しよう',
  }[S.level];
  if (msg) toast(msg, 6000);
  if (S.level >= 3) setExpanded(true, true);
  applyUnlocks();
  orderDirty = true;
}
/** レベルで解禁される設備（売り場ケース・調理台）の表示と当たり判定 */
function applyUnlocks() {
  DISPLAYS.forEach((def) => { def.d.model.group.visible = dispShown(def); });
  const vis = {};
  DISPLAYS.forEach((def) => { vis[def.id] = dispShown(def); });
  Object.values(makers).forEach((m) => { m.model.group.visible = S.level >= m.lv; vis[m.id] = S.level >= m.lv; });
  stations.forEach((st) => { if (st.id in vis) st.marker.visible = vis[st.id]; });
  stationModel.setBowls(S.level);
  rebuildColliders();
}
/** 増築：店を右に広げる（床・壁の追加、当たり判定、カメラ位置） */
function setExpanded(on, animate) {
  if (on === expanded) return;
  expanded = on;
  expansion.group.visible = on;
  world.curbRight.visible = !on;
  if (on && animate) { expandT = 0; } else expandT = 1;
  expansion.group.scale.y = on && animate ? 0.01 : 1;
  applyUnlocks();
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
  if (S.level >= 4) colliders.push(...UNLOCK_COLLIDERS.sand);
  if (S.level >= 5) colliders.push(...UNLOCK_COLLIDERS.fry);
  if (S.level >= 9) colliders.push(...UNLOCK_COLLIDERS.bento);
  if (expanded) DISPLAYS.forEach((def) => { if (S.level >= def.lv && UNLOCK_COLLIDERS[def.id]) colliders.push(...UNLOCK_COLLIDERS[def.id]); });
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

const totalOf = (c) => c.rice + sumC(c.oni) + foodCount(c);
const newCarrier = () => ({ rice: 0, oni: emptyCounts(), food: emptyFood() });
/** トレーのおにぎりを、置いた順に持つ */
function takeTrayInto(c) {
  let space = carryMax() - totalOf(c);
  let moved = 0;
  while (space > 0 && stn.order.length) {
    const k = stn.order.shift(); // 置いた順に取る
    stn.tray[k]--;
    c.oni[k]++;
    space--;
    moved++;
  }
  return moved;
}
function takeTray() {
  const moved = takeTrayInto(carry);
  if (moved) refreshCarry();
  return moved;
}
function cookerStart() {
  const n = Math.min(val('cooker'), S.inv.rice);
  if (n <= 0) return false;
  S.inv.rice -= n;
  cooker.batch = n;
  cooker.state = 'cooking';
  cooker.t = 0;
  orderDirty = true;
  return true;
}
function cookerTake(c) {
  const n = Math.min(carryMax() - c.rice, cooker.rice);
  if (n <= 0) return 0;
  cooker.rice -= n;
  c.rice += n;
  if (cooker.rice <= 0) cooker.state = 'idle';
  return n;
}
function stationDrop(c) {
  const n = Math.min(c.rice, STATION_RICE_MAX - stn.rice);
  if (n <= 0) return 0;
  stn.rice += n;
  c.rice -= n;
  return n;
}
/** 在庫の品（飲み物・お菓子・スイーツ）を、種類をまぜて売り場ケースへ */
function loadDisplayFromInv(d) {
  let moved = true, total = 0;
  while (moved && d.total < d.cap) {
    moved = false;
    for (const k of d.kinds) {
      if (!itemUnlocked(k) || S.inv[k] <= 0 || d.total >= d.cap) continue;
      S.inv[k]--;
      d.stock[k]++;
      moved = true;
      total++;
    }
  }
  d.refresh();
  orderDirty = true;
  return total;
}
const loadFridge = () => loadDisplayFromInv(fridge);

addStation({
  id: 'cooker', use: LAYOUT.cooker.use, radius: 1.5, clickObjs: [cookerModel.group],
  prompt() {
    if (cooker.state === 'idle') return 'ごはんを炊く';
    if (cooker.state === 'ready') return `ごはんを取る (${cooker.rice}膳)`;
    return null;
  },
  act() {
    if (cooker.state === 'idle') {
      if (!cookerStart()) return rest('米がない！ 裏口から注文しよう');
    } else if (cooker.state === 'ready') {
      if (carryKind() === 'onigiri' || carryKind() === 'food') return rest('手がふさがっている！ 先に持っているものを置こう');
      if (carryMax() - carry.rice <= 0) return rest('これ以上持てない');
      cookerTake(carry);
      refreshCarry();
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
      if (!stationDrop(carry)) return rest('握り台のごはんがいっぱい');
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
    if (c && !reg.serving) { reg.serving = c; reg.t = 0; reg.byBot = false; c.state = 'serving'; }
  },
}, '#2f7ff0');

addStation({
  id: 'backdoor', use: LAYOUT.backDoor.use, radius: 1.5, clickObjs: [backDoor.group],
  prompt() { return '食材を注文する'; },
  act() { toggleOrder(true); },
}, '#e0a020');

// 売り場ケース：在庫から入れる（飲み物・お菓子・スイーツ）／持ってきたものを並べる（サンド・揚げ物・弁当）
function placeFoodFrom(c, disp) {
  let placed = 0;
  disp.kinds.forEach((k) => {
    const m = disp.add(k, c.food[k]);
    c.food[k] -= m;
    placed += m;
  });
  return placed;
}
DISPLAYS.forEach((def) => {
  const d = def.d;
  addStation({
    id: def.id, use: def.layout.use, radius: 1.6, clickObjs: [d.model.group],
    prompt() {
      if (!dispShown(def) || d.total >= d.cap) return null;
      if (def.mode === 'inv') {
        const n = d.kinds.filter(itemUnlocked).reduce((a, k) => a + S.inv[k], 0);
        return n > 0 ? `${def.label}を入れる (在庫 ${n})` : null;
      }
      if (carryKind() !== 'food') return null;
      const n = d.kinds.reduce((a, k) => a + carry.food[k], 0);
      return n > 0 ? `${def.label}を並べる (${n}個)` : null;
    },
    act() {
      if (def.mode === 'inv') loadDisplayFromInv(d);
      else {
        if (!placeFoodFrom(carry, d)) return rest('ここには並べられない');
        refreshCarry();
      }
    },
  }, def.color);
});

// 調理台：材料を使ってまとめて作る。できあがったら受け取って、売り場ケースに並べる
function canMake(id) {
  const r = RECIPES[id];
  return S.level >= ITEM[id].lv && Object.entries(r.ing).every(([k, n]) => S.inv[k] >= n * r.batch);
}
function startBatch(m, id) {
  if (m.state !== 'idle' || m.out.length || !canMake(id)) return false;
  const r = RECIPES[id];
  Object.entries(r.ing).forEach(([k, n]) => { S.inv[k] -= n * r.batch; });
  m.state = 'making';
  m.recipe = id;
  m.t = 0;
  orderDirty = true;
  return true;
}
function takeMakerOut(m, c) {
  let space = carryMax() - carryTotal();
  let moved = 0;
  while (space > 0 && m.out.length) {
    const k = m.out.shift();
    c.food[k]++;
    space--;
    moved++;
  }
  m.model.setOutput(m.out);
  return moved;
}
Object.values(makers).forEach((m) => {
  addStation({
    id: m.id, use: m.use,
    radius: 1.5, clickObjs: [m.model.group],
    prompt() {
      if (S.level < m.lv) return null;
      if (m.out.length > 0) return carryKind() === null || carryKind() === 'food' ? `${ITEM[m.out[0]].name}を受け取る (${m.out.length}個)` : null;
      return m.state === 'idle' ? `${m.name}で作る` : null;
    },
    act() {
      if (m.out.length > 0) {
        if (!takeMakerOut(m, carry)) return rest('これ以上持てない');
        refreshCarry();
      } else if (m.state === 'idle') openMaker(m);
    },
  }, m.color);
});
function updateMakers(dt) {
  Object.values(makers).forEach((m) => {
    if (m.state === 'making') {
      m.t += dt;
      if (m.t >= MAKER_TIME) {
        const r = RECIPES[m.recipe];
        for (let i = 0; i < r.batch; i++) m.out.push(m.recipe);
        m.state = 'idle';
        m.model.setOutput(m.out);
      }
    }
    const tag = makerTags[m.id];
    tag.on = S.level >= m.lv;
    if (m.state === 'making') tag.set({ chip: `${ITEM[m.recipe].name} 調理中…`, bar: q40(m.t / MAKER_TIME) });
    else if (m.out.length) tag.set({ chip: `${ITEM[m.out[0]].name} ×${m.out.length} できた！`, tone: 'good' });
    else tag.set({ chip: `${m.icon} ${m.name}` });
  });
  fryerModel.animate(elapsed, makers.fry.state === 'making');
}

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
const fillViz = { salt: new THREE.Group(), ume: new THREE.Group(), okaka: new THREE.Group(), sake: new THREE.Group(), tuna: new THREE.Group() };
for (let i = 0; i < 12; i++) sp(fillViz.salt, 0.008, '#c9d6df', [Math.cos(i * 2.1) * 0.06, 0.075 + (i % 3) * 0.004, Math.sin(i * 2.1) * 0.06]);
sp(fillViz.ume, 0.032, '#d6334a', [0, 0.075, 0.025], { roughness: 0.5 }, 0.7);
sp(fillViz.ume, 0.022, '#c9263c', [0.03, 0.07, 0.0], { roughness: 0.5 }, 0.7);
for (let i = 0; i < 12; i++) bx(fillViz.okaka, [0.02, 0.006, 0.012], i % 2 ? '#b9794a' : '#dca674', [Math.cos(i * 1.7) * 0.055, 0.074, Math.sin(i * 1.7) * 0.055], { r: 0.002 });
for (let i = 0; i < 10; i++) bx(fillViz.sake, [0.03, 0.008, 0.016], i % 2 ? '#ffb09a' : '#f27a63', [Math.cos(i * 1.9) * 0.055, 0.074, Math.sin(i * 1.9) * 0.055], { r: 0.002 });
for (let i = 0; i < 4; i++) sp(fillViz.tuna, 0.022, i % 2 ? '#fff4d6' : '#e9d3a3', [Math.cos(i * 1.6) * 0.04, 0.075, Math.sin(i * 1.6) * 0.04], { roughness: 0.5 });
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
  toggleMaker(false);
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

const FILL_KIND = { salt: 'shio', ume: 'ume', okaka: 'okaka', sake: 'sake', tuna: 'tuna' }; // 具材 → できるおにぎり
const FILL_LV = { salt: 1, ume: 2, okaka: 2, sake: 8, tuna: 9 };
function craftPointerDown(e) {
  if (e.button !== 0 || craft.fly) return;
  const kind = fpsPick();
  const b = craft.ball;
  if (kind === 'rice') {
    if (b) return rest('もうごはんを持っている');
    if (stn.rice <= 0) return rest('ごはんがありません');
    stn.rice--;
    startBall(stationModel.tub.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.38, 0)));
  } else if (kind in FILL_KIND) {
    if (!b) return rest('先にごはんを取ろう');
    if (b.stage !== 'rice') return rest('具材はもう入っている');
    if (S.inv[kind] <= 0) return rest(`${ING[kind].name}の在庫がない…`);
    S.inv[kind]--;
    b.filling = kind;
    b.kind = FILL_KIND[kind];
    b.stage = 'filled';
    fillViz[kind].visible = true;
    const col = { salt: '#ffffff', ume: '#d6334a', okaka: '#c99562', sake: '#ff8a75', tuna: '#ecd9ad' }[kind];
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
/** 持っているおにぎりを1個、決めた段へ置く。置けたら true（silent: お知らせを出さない） */
function placeOneFrom(c, sh, silent) {
  for (const k of KIND_IDS) {
    if (c.oni[k] <= 0) continue;
    let tier = sh.tiers.find((t) => t.kind === k && t.n < tierCap());
    if (!tier && !sh.tiers.some((t) => t.kind === k)) { // その種類の段が無ければ、空いている段を使う
      const idx = sh.tiers.findIndex((t) => t.n === 0);
      if (idx >= 0) {
        tier = sh.tiers[idx];
        tier.kind = k;
        S.tiers[idx] = k;
        if (!silent) toast(`${idx + 1}段目を${KINDS[k].name}にしたよ`);
      }
    }
    if (!tier) continue;
    tier.n++;
    c.oni[k]--;
    refreshShelf(sh);
    if (!S.opened) { S.opened = true; spawnTimer = 10; }
    return true;
  }
  return false;
}
function placeOneOnShelf(sh) {
  const ok = placeOneFrom(carry, sh, false);
  if (ok) refreshCarry();
  return ok;
}
/** この種類を置ける段があるか */
function shelfRoomFor(sh, k) {
  return sh.tiers.some((t) => t.kind === k && t.n < tierCap()) || (!sh.tiers.some((t) => t.kind === k) && sh.tiers.some((t) => t.n === 0));
}
const SHELF_TIER_Y = [1.49, 1.11, 0.73, 0.35]; // 棚モデルの各段の高さ（上から）
const _tp = new THREE.Vector3();
function renderShelfUi() {
  const hold = carryKind() === 'onigiri' ? KIND_IDS.filter((k) => carry.oni[k]).map((k) => `${KINDS[k].short}${carry.oni[k]}`).join(' ') : 'なし';
  let html = `<div class="hold">持っているおにぎり：${hold}${shelfMode.full && carryKind() === 'onigiri' ? '<br>（置ける段がいっぱい）' : ''}</div>`;
  if (frontCustomer()) html += '<div class="alertq">🧾 お客さんがレジで待ってる！</div>';
  if (html !== shelfMode.ui) { shelfMode.ui = html; $('shelf-hold').innerHTML = html; }
}
/** 段ごとのボタンを、棚の各段の左横に重ねて表示する（画面上の位置に合わせる） */
function placeTierButtons(sh) {
  const W = window.innerWidth, H = window.innerHeight;
  const ready = shelfMode.t > 0.55; // ズームが終わってから出す
  const els = $('tier-btns').children;
  for (let t = 0; t < 4; t++) {
    const el = els[t];
    if (!el) continue;
    _tp.set(sh.pos.x - 1.15, SHELF_TIER_Y[t] + 0.17, sh.pos.z + 0.45).project(fpsCam);
    const x = (_tp.x * 0.5 + 0.5) * W, y = (-_tp.y * 0.5 + 0.5) * H;
    el.style.display = ready ? '' : 'none';
    el.style.transform = `translate(${(x - 10).toFixed(1)}px,${y.toFixed(1)}px) translate(-100%,-50%)`;
    const tier = sh.tiers[t];
    const html = `<b>${KINDS[tier.kind].name}</b><span>${tier.n} / ${tierCap()}</span>`;
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
  }
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
  toggleMaker(false);
  handL.visible = handR.visible = false;
  ballGroup.visible = false;
  document.body.classList.add('shelving');
  $('tier-btns').innerHTML = [0, 1, 2, 3].map((t) => `<button class="tierbtn" data-tier="${t}"></button>`).join('');
  $('shelfui').style.display = 'block';
}
function exitShelf() {
  if (!shelfMode.active) return;
  shelfMode.active = false;
  fpsCam.visible = false;
  handL.visible = handR.visible = true;
  document.body.classList.remove('shelving');
  $('tier-btns').innerHTML = '';
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
  fpsCam.updateMatrixWorld(true);
  fpsCam.visible = true;
  shelfMode.timer -= dt;
  if (shelfMode.timer <= 0 && carryKind() === 'onigiri') {
    const ok = placeOneOnShelf(sh);
    shelfMode.full = !ok;
    shelfMode.timer = ok ? 0.11 : 0.6;
  }
  renderShelfUi();
  placeTierButtons(sh);
}
function updatePlayerShelf(dt) {
  const g = playerPerson.group;
  g.position.copy(player.pos);
  g.rotation.y = lerpAngle(g.rotation.y, Math.PI, 1 - Math.exp(-12 * dt));
  playerPerson.anim(dt, 0, false);
}
$('shelf-exit').addEventListener('click', () => exitShelf());
$('tier-btns').addEventListener('click', (e) => {
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
  Object.keys(FILL_KIND).forEach((id) => {
    const locked = S.level < FILL_LV[id];
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
/** ids のうち解禁済みのものから、重みつきで n 個えらぶ */
function chooseFrom(ids, n) {
  const pool = ids.filter(itemUnlocked);
  const out = [];
  for (let i = 0; i < n; i++) {
    let r = Math.random() * pool.reduce((a, k) => a + ITEM[k].weight, 0);
    let got = pool[0];
    for (const k of pool) { r -= ITEM[k].weight; if (r <= 0) { got = k; break; } }
    out.push(got);
  }
  return out;
}
const STOP_ORDER = ['shelf', 'sand', 'bento', 'hot', 'snack', 'sweet', 'fridge']; // 店内をまわる順
const STOP_CAT = { shelf: 'onigiri', ...Object.fromEntries(DISPLAYS.map((def) => [def.stop, def.cat])) };

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
    this.wish = {}; // 立ち寄る場所ごとの「買いたいもの」
    this.plan.forEach((stop) => { this.wish[stop] = this.makeWish(stop); });
    this.bag = {}; // 買ったもの { 商品id: 個数 }
    this.stopIdx = 0;
    this.path = [...LAYOUT.entryPath.map((p) => new THREE.Vector3(p.x, 0, p.z)), this.stopTarget(0)];
    this.state = 'enter';
    this.timer = 0;
    this.sat = 0; // 希望どおり買えた数
    this.sub = 0; // 別のもので我慢した数
    this.miss = 0; // 買えなかった数
    this.patience = 1;
    this.speed = rand(2.0, 2.5);
    this.facing = Math.PI / 2;
    this.curSpeed = 0;
    this.tag = new Tag();
    this.emo = '';
    this.emoTimer = 0;
    customers.push(this);
  }
  /** 立ち寄る場所：おにぎりの棚＋（解禁され、在庫がある）売り場ケース */
  makePlan() {
    const opt = [];
    DISPLAYS.forEach((def) => {
      if (dispShown(def) && def.d.total > 0 && Math.random() < def.p) opt.push(def.stop);
    });
    const plan = (Math.random() < 0.75 || !opt.length ? ['shelf'] : []).concat(opt);
    return STOP_ORDER.filter((x) => plan.includes(x));
  }
  makeWish(stop) {
    const r = Math.random();
    if (stop === 'shelf') return Array.from({ length: r < 0.8 ? 1 : r < 0.97 ? 2 : 3 }, () => chooseKind());
    const d = DISP_BY_STOP[stop].d;
    return chooseFrom(d.kinds, r < (STOP_CAT[stop] === 'drink' ? 0.7 : 0.85) ? 1 : 2);
  }
  /** その場所の「取る・数える」の窓口 */
  source(stop) {
    const sh = this.shelf;
    if (stop === 'shelf') return { kinds: KIND_IDS, count: (k) => shelfKindCount(sh, k), take: (k) => shelfTake(sh, k), refresh: () => refreshShelf(sh) };
    return DISP_BY_STOP[stop].d;
  }
  stopTarget(i) {
    const stop = this.plan[i];
    const u = stop === 'shelf' ? this.shelf.pos.use : DISP_BY_STOP[stop].layout.use;
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
  /** 買いたいものを取る。無ければ同じ売り場の別のもので我慢（不満）、何も無ければ買えない */
  pickAt(stop) {
    const src = this.source(stop);
    for (const w of this.wish[stop]) {
      if (src.count(w) > 0) {
        src.take(w);
        this.bag[w] = (this.bag[w] || 0) + 1;
        this.sat++;
      } else {
        const alt = src.kinds.find((x) => itemUnlocked(x) && src.count(x) > 0);
        if (alt) { src.take(alt); this.bag[alt] = (this.bag[alt] || 0) + 1; this.sub++; } else this.miss++;
      }
    }
    src.refresh();
  }
  /** 頭の上の吹き出し：いま探しているもの */
  wishText() {
    const stop = this.plan[this.stopIdx];
    if (!this.wish[stop]) return '';
    const counts = {};
    this.wish[stop].forEach((k) => { counts[k] = (counts[k] || 0) + 1; });
    const parts = Object.entries(counts).map(([k, n]) => ITEM[k].label + (n > 1 ? '×' + n : ''));
    return `${CAT_ICON[STOP_CAT[stop]]} ${parts.join('・')}がほしい`;
  }
  bagTotal() { return Object.values(this.bag).reduce((a, n) => a + n, 0); }
  finishShopping() {
    if (this.bagTotal() <= 0) {
      S.stats.lost++;
      S.rep = clamp(S.rep - 0.2, 0, 5);
      ratingPopup(this, -1);
      this.setEmo('😞', 3);
      this.leave(EXIT_PATH());
      return;
    }
    const oni = emptyCounts();
    KIND_IDS.forEach((k) => { oni[k] = this.bag[k] || 0; });
    if (sumC(oni) > 0) fillHold(this.person.hold, 'onigiri', oni);
    else if (DRINK_IDS.some((k) => this.bag[k])) fillHold(this.person.hold, 'bottle');
    else fillHold(this.person.hold, 'bag', 1);
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
        const stop = this.plan[this.stopIdx];
        this.facing = stop === 'shelf' ? Math.atan2(-Math.sin(sh.pos.rot), -Math.cos(sh.pos.rot)) : DISP_BY_STOP[stop].face;
        this.timer -= dt;
        if (this.timer <= 0) {
          this.pickAt(stop);
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
  /** 買ったものを、それぞれの売り場に戻す */
  returnItems() {
    Object.entries(this.bag).forEach(([k, n]) => {
      if (ITEM[k].cat === 'onigiri') shelfAdd(this.shelf, k, n);
      else DISPLAYS.find((def) => def.d.kinds.includes(k)).d.add(k, n);
    });
    this.bag = {};
    refreshShelf(this.shelf);
  }
  pay() {
    const i = queue.indexOf(this);
    if (i >= 0) queue.splice(i, 1);
    let sum = 0, n = 0;
    Object.entries(this.bag).forEach(([k, c]) => { sum += ITEM[k].price * c; n += c; });
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
 *  ロボット（買い切り。充電スポットがないと動かない）
 * ===================================================================== */
const ROLES = {
  cashier: { name: 'レジロボ', desc: 'お客さんが会計を待っていたら、自動でレジを打つ', lv: 1, price: 5000 },
  cook: { name: '炊飯ロボ', desc: 'ごはんを炊いて、握り台まで運ぶ', lv: 2, price: 6000 },
  maker: { name: '握りロボ', desc: '握り台でおにぎりを握り、トレーに置く（棚の段の設定に合わせる）', lv: 3, price: 8000 },
  stocker: { name: '品出しロボ', desc: 'トレーや調理台の商品を売り場に並べ、飲み物・お菓子・スイーツも補充する', lv: 4, price: 7000 },
  kitchen: { name: '厨房ロボ', desc: 'サンドイッチ台・揚げ物台・弁当台で、足りなくなった商品を作る', lv: 5, price: 9000 },
};
const ROLE_IDS = ['cashier', 'cook', 'maker', 'stocker', 'kitchen'];
const ROBOT_LV = [ // spd = 動きと作業の速さ、bat = 電池が持つ秒数
  { spd: 1, bat: 100 }, { spd: 1.25, bat: 130 }, { spd: 1.5, bat: 170 }, { spd: 1.8, bat: 220 }, { spd: 2.2, bat: 300 },
];
const ROBOT_UP_COST = [2000, 4000, 8000, 16000];
const CHARGER_SPOTS = [{ x: -6.5, z: 1.95 }, { x: -5.7, z: 1.95 }, { x: -6.5, z: 2.7 }, { x: -5.7, z: 2.7 }];
const CHARGER_COSTS = [1500, 2500, 4000, 6000];
const CHARGE_SEC = 12; // 空から満タンまで
const LOW_BATTERY = 0.18;
const hasStaff = (r) => !!S.staff[r];
const robLv = (r) => Math.min(ROBOT_LV.length - 1, S.robLv[r] || 0);
const robotOn = (r) => hasStaff(r) && S.chargers > 0;
const WORKER_LOOK = {
  cook: { color: '#f2a33a' },
  maker: { color: '#8d6ae0' },
  stocker: { color: '#2f7ff0' },
  kitchen: { color: '#e86a5c' },
};
const WORKER_HOME = {
  cook: { x: -4.4, z: 0.6 },
  maker: { x: -5.1, z: -1.7 },
  stocker: { x: -4.4, z: -3.0 },
  kitchen: { x: -4.3, z: -4.3 },
};
const workers = [];
const chargerModels = CHARGER_SPOTS.map((p) => {
  const c = buildCharger();
  c.group.position.set(p.x, 0, p.z);
  c.group.visible = false;
  scene.add(c.group);
  return c;
});
const cashierTag = new Tag().at(LAYOUT.register.staff.x, 1.75, LAYOUT.register.staff.z);
/** 動き回るロボット。やることを「手順（行く・する・待つ）」の列にして、順に実行する */
class Worker {
  constructor(role) {
    this.role = role;
    const look = WORKER_LOOK[role];
    this.person = makeRobot({ color: look.color, cap: role === 'kitchen' });
    const h = WORKER_HOME[role];
    this.home = h;
    this.pos = new THREE.Vector3(h.x, 0, h.z);
    this.person.group.position.copy(this.pos);
    scene.add(this.person.group);
    shadowize(this.person.group);
    this.carry = newCarrier();
    this.steps = [];
    this.cur = null;
    this.path = [];
    this.facing = Math.PI / 2;
    this.working = false;
    this.think = 0.6;
    this.battery = 1;
    this.mode = null; // null | 'toCharge' | 'charging'
    this.pad = -1;
    this.spd = 1;
    this.tag = new Tag().set({ chip: ROLES[role].name });
  }
  refreshHold() {
    const c = this.carry;
    const k = c.rice > 0 ? 'rice' : sumC(c.oni) > 0 ? 'onigiri' : foodCount(c) > 0 ? 'food' : null;
    this.person.holdArms = !!k;
    fillHold(this.person.hold, k, k === 'food' ? c.food : c.oni);
    this.person.hold.position.set(0, 0.75, 0.42);
  }
  go(p) { return { go: p }; }
  setSteps(list) { this.steps = list; }
  /** 経路の先へ進む（進んだ速さを返す） */
  walk(dt, mul) {
    if (!this.path.length) return 0;
    const t = this.path[0];
    const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.1) { this.path.shift(); return 0; }
    const v = 2.8 * this.spd * mul;
    const m = Math.min(d, v * dt);
    this.pos.x += (dx / d) * m;
    this.pos.z += (dz / d) * m;
    this.facing = Math.atan2(dx, dz);
    return Math.min(v, 4);
  }
  stopCharging() {
    this.pad = -1;
    this.mode = null;
  }
  /** 空いている充電スポットへ向かう（なければ今の仕事を続ける） */
  goCharge() {
    let idx = -1;
    for (let i = 0; i < S.chargers; i++) {
      if (!workers.some((w) => w !== this && w.pad === i)) { idx = i; break; }
    }
    if (idx < 0) return;
    this.pad = idx;
    this.mode = 'toCharge';
    this.steps = [];
    this.cur = null;
    this.path = findPath(this.pos.x, this.pos.z, CHARGER_SPOTS[idx].x, CHARGER_SPOTS[idx].z);
  }
  update(dt) {
    this.working = false;
    const lvI = robLv(this.role);
    const L = ROBOT_LV[lvI];
    this.spd = L.spd;
    const powered = S.chargers > 0;
    this.person.setLevel(lvI);
    this.person.setPower(powered);
    let sp2 = 0;
    if (!powered) {
      if (this.mode) this.stopCharging();
    } else {
      if (this.mode === 'charging') {
        this.battery = Math.min(1, this.battery + dt / CHARGE_SEC);
        if (this.battery >= 1) this.stopCharging();
      } else if (this.mode === null && this.battery < LOW_BATTERY) this.goCharge();
      if (this.mode === 'charging') {
        const p = CHARGER_SPOTS[this.pad];
        this.pos.x += (p.x - this.pos.x) * Math.min(1, dt * 8);
        this.pos.z += (p.z - this.pos.z) * Math.min(1, dt * 8);
        this.facing = Math.PI / 2;
      } else if (this.mode === 'toCharge') {
        sp2 = this.walk(dt, this.battery <= 0 ? 0.35 : 1);
        if (!this.path.length) {
          const p = CHARGER_SPOTS[this.pad];
          if (Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 1.2) this.mode = 'charging';
          else { this.path = findPath(this.pos.x, this.pos.z, p.x, p.z); if (!this.path.length) this.stopCharging(); }
        }
      } else if (this.battery <= 0) {
        this.goCharge(); // 電池切れ：空きが出るまでその場で待つ
      } else if (this.path.length) sp2 = this.walk(dt, 1);
      else if (this.cur) this.runStep(dt);
      else {
        this.cur = this.steps.shift() || null;
        if (!this.cur) {
          this.think -= dt * this.spd;
          if (this.think <= 0) { this.think = 0.8; this.decide(); }
        }
      }
      if (this.mode !== 'charging' && (sp2 > 0 || this.working)) this.battery = Math.max(0, this.battery - dt / L.bat);
    }
    const g = this.person.group;
    g.position.copy(this.pos);
    g.rotation.y = lerpAngle(g.rotation.y, this.facing, 1 - Math.exp(-12 * dt));
    this.person.anim(dt, sp2, this.working && sp2 === 0);
    this.person.setBattery(this.battery, powered && this.battery <= 0);
    this.tag.at(this.pos.x, 1.85, this.pos.z);
    const nm = ROLES[this.role].name;
    if (!powered) this.tag.set({ chip: `${nm} ⚡充電スポットなし`, tone: 'warn' });
    else if (this.mode === 'charging') this.tag.set({ chip: `${nm} 🔋充電中`, bar: q40(this.battery), tone: 'good' });
    else if (this.battery <= 0) this.tag.set({ chip: `${nm} 電池切れ…`, tone: 'warn' });
    else this.tag.set(this.battery < 0.6 ? { chip: `${nm} Lv.${lvI + 1}`, bar: q40(this.battery) } : { chip: `${nm} Lv.${lvI + 1}` });
  }
  runStep(dt) {
    const s = this.cur;
    if (s.go) {
      if (!s.started) {
        s.started = true;
        this.path = findPath(this.pos.x, this.pos.z, s.go.x, s.go.z);
      } else this.cur = null; // 着いた
    } else if (s.act) {
      try { s.act(this); } catch (e) { /* ignore */ }
      this.cur = null;
    } else if (s.wait !== undefined) {
      s.wait -= dt * this.spd;
      this.working = true;
      if (s.wait <= 0) this.cur = null;
    } else if (s.until) {
      s.t = (s.t || 0) + dt;
      this.working = true;
      if (s.until(this) || s.t > (s.timeout || 30)) this.cur = null;
    } else this.cur = null;
  }
  /** 役割ごとに、いま何をするかを決める */
  decide() {
    const c = this.carry;
    const goHome = () => (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 0.4 ? [{ go: this.home }] : []);
    const use = (p) => ({ go: { x: p.x, z: p.z } });
    if (this.role === 'cook') {
      if (c.rice > 0) {
        this.setSteps([use(LAYOUT.station.use), { act: (w) => { stationDrop(w.carry); w.refreshHold(); } }, ...goHome()]);
        return;
      }
      const need = cooker.state !== 'idle' || (S.inv.rice > 0 && stn.rice <= STATION_RICE_MAX - val('cooker'));
      if (!need) { this.setSteps(goHome()); return; }
      this.setSteps([
        use(LAYOUT.cooker.use),
        { act: () => { if (cooker.state === 'idle') cookerStart(); } },
        { until: () => cooker.state !== 'cooking', timeout: 25 },
        { act: (w) => { if (cooker.state === 'ready') { cookerTake(w.carry); w.refreshHold(); } } },
        use(LAYOUT.station.use),
        { act: (w) => { stationDrop(w.carry); w.refreshHold(); } },
        ...goHome(),
      ]);
    } else if (this.role === 'maker') {
      const k = this.pickOnigiriKind();
      if (!k) { this.setSteps(goHome()); return; }
      this.setSteps([
        ...goHome(),
        { wait: val('craft') * 2.5 },
        { act: () => {
          if (stn.rice <= 0 || S.inv[KINDS[k].ing] <= 0 || sumC(stn.tray) >= TRAY_MAX) return;
          stn.rice--;
          S.inv[KINDS[k].ing]--;
          stn.tray[k]++;
          stn.order.push(k);
          addExp(1);
          orderDirty = true;
        } },
      ]);
    } else if (this.role === 'stocker') {
      this.decideStocker(goHome, use);
    } else if (this.role === 'kitchen') {
      this.decideKitchen(goHome, use);
    }
  }
  /** 握る種類：棚の段の設定に対して、足りない種類（材料がある）を優先 */
  pickOnigiriKind() {
    if (stn.rice <= 0 || sumC(stn.tray) >= TRAY_MAX) return null;
    const sh = shelves[0];
    let best = null, bestNeed = 0;
    KIND_IDS.forEach((k) => {
      if (!kindUnlocked(k) || S.inv[KINDS[k].ing] <= 0) return;
      const need = sh.tiers.reduce((a, t) => a + (t.kind === k ? tierCap() - t.n : 0), 0) - stn.tray[k];
      if (need > bestNeed) { best = k; bestNeed = need; }
    });
    return best;
  }
  decideStocker(goHome, use) {
    const c = this.carry;
    const sh = shelves[0];
    const back = () => ({ act: (w) => { // 置けずに余ったものは元の場所へ戻す
      KIND_IDS.forEach((k) => { for (let i = 0; i < w.carry.oni[k]; i++) { stn.tray[k]++; stn.order.push(k); } w.carry.oni[k] = 0; });
      FOOD_IDS.forEach((k) => { const m = makers[RECIPES[k].maker]; for (let i = 0; i < w.carry.food[k]; i++) m.out.push(k); w.carry.food[k] = 0; });
      Object.values(makers).forEach((m) => m.model.setOutput(m.out));
      w.refreshHold();
    } });
    // やれる仕事を集めて、その中からランダムに1つ（同じ仕事ばかりに偏らない）
    const jobs = [];
    if (stn.order.length && stn.order.some((k) => shelfRoomFor(sh, k))) {
      jobs.push([
        use(LAYOUT.tray.use),
        { act: (w) => { takeTrayInto(w.carry); w.refreshHold(); } },
        use(sh.pos.use),
        { act: (w) => { while (placeOneFrom(w.carry, sh, true)) { /* 置ける分だけ */ } w.refreshHold(); } },
        back(),
        ...goHome(),
      ]);
    }
    Object.values(makers).forEach((m) => {
      const def = DISPLAYS.find((x) => x.d === m.display);
      if (S.level >= m.lv && dispShown(def) && m.out.length && m.display.total < m.display.cap) {
        jobs.push([
          use(m.use),
          { act: (w) => { takeMakerOut(m, w.carry); w.refreshHold(); } },
          use(def.layout.use),
          { act: (w) => { placeFoodFrom(w.carry, m.display); w.refreshHold(); } },
          back(),
          ...goHome(),
        ]);
      }
    });
    DISPLAYS.filter((def) => def.mode === 'inv').forEach((def) => {
      if (dispShown(def) && def.d.total < def.d.cap && def.d.kinds.some((k) => itemUnlocked(k) && S.inv[k] > 0)) {
        jobs.push([use(def.layout.use), { act: () => { loadDisplayFromInv(def.d); } }, ...goHome()]);
      }
    });
    if (jobs.length) this.setSteps(pick(jobs));
    else if (c.rice === 0 && totalOf(c) === 0) this.setSteps(goHome());
  }
  decideKitchen(goHome, use) {
    for (const m of Object.values(makers)) {
      if (S.level < m.lv || !expanded || m.state !== 'idle' || m.out.length || m.display.total >= 8) continue;
      const ids = Object.keys(RECIPES).filter((id) => RECIPES[id].maker === m.id && canMake(id));
      if (!ids.length) continue;
      ids.sort((a, b) => m.display.count(a) - m.display.count(b)); // いちばん少ないものを作る
      this.setSteps([use(m.use), { act: () => { startBatch(m, ids[0]); } }, ...goHome()]);
      return;
    }
    this.setSteps(goHome());
  }
  dispose() {
    scene.remove(this.person.group);
    this.person.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.tag.destroy();
  }
}
/** 買ったロボットに合わせて、ロボットを出す／下げる */
function syncWorkers() {
  staff.group.visible = hasStaff('cashier');
  staff.setLevel(robLv('cashier'));
  for (let i = workers.length - 1; i >= 0; i--) {
    if (!hasStaff(workers[i].role)) { workers[i].dispose(); workers.splice(i, 1); }
  }
  ROLE_IDS.forEach((r) => {
    if (r !== 'cashier' && hasStaff(r) && !workers.some((w) => w.role === r)) workers.push(new Worker(r));
  });
  chargerModels.forEach((c, i) => { c.group.visible = i < S.chargers; });
}
function buyRobot(role) {
  const r = ROLES[role];
  if (S.level < r.lv) return rest(`Lv.${r.lv} から買えるよ`);
  if (hasStaff(role)) return;
  if (S.money < r.price) return rest('お金が足りない…');
  S.money -= r.price;
  S.staff[role] = true;
  S.robLv[role] = 0;
  syncWorkers();
  toast(S.chargers > 0 ? `${r.name}を購入！` : `${r.name}を購入！ 充電スポットを買わないと動かないよ`, 3500);
  popup(player.pos.x, 2.2, player.pos.z, `−${yen(r.price)}`, 'red');
  save();
  shopDirty = true;
}
function upgradeRobot(role) {
  if (!hasStaff(role)) return;
  const lv = robLv(role);
  if (lv >= ROBOT_UP_COST.length) return;
  const cost = ROBOT_UP_COST[lv];
  if (S.money < cost) return rest('お金が足りない…');
  S.money -= cost;
  S.robLv[role] = lv + 1;
  syncWorkers();
  toast(`${ROLES[role].name} が Lv.${lv + 2} になった！`);
  popup(player.pos.x, 2.2, player.pos.z, `−${yen(cost)}`, 'red');
  save();
  shopDirty = true;
}
function buyCharger() {
  if (S.chargers >= CHARGER_COSTS.length) return;
  const cost = CHARGER_COSTS[S.chargers];
  if (S.money < cost) return rest('お金が足りない…');
  S.money -= cost;
  S.chargers++;
  syncWorkers();
  toast('充電スポットを設置！（バックヤードの壁ぎわ）');
  popup(player.pos.x, 2.2, player.pos.z, `−${yen(cost)}`, 'red');
  save();
  shopDirty = true;
}
function updateWorkers(dt) {
  chargerModels.forEach((c, i) => c.setCharging(workers.some((w) => w.mode === 'charging' && w.pad === i)));
  workers.forEach((w) => w.update(dt));
}

/* =====================================================================
 *  アップグレード / ショップ / 注文 UI
 * ===================================================================== */
let shopDirty = true;
let orderDirty = true;
function applyUpgrades() {
  cookerModel.setTier(S.up.cooker);
  shadowize(cookerModel.group);
  shelves.forEach((sh) => {
    sh.cap = 4 * tierCap();
    sh.tiers.forEach((t, i) => { if (t.n === 0) t.kind = S.tiers[i]; }); // 空の段は保存した設定に合わせる
    refreshShelf(sh);
  });
  syncWorkers();
  stationModel.setBowls(S.level);
  setExpanded(S.level >= 3, false);
  DISPLAYS.forEach((def) => def.d.refresh());
  applyUnlocks();
  placeWipeCam();
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
  h += '<h2 style="margin-top:14px">🤖 ロボット（買い切り）</h2><div class="note">給料はありません。ただし<b>充電スポットがないと動きません</b>。電池が減ると、空いている充電スポットへ自分で充電に行きます。</div>';
  ROLE_IDS.forEach((r) => {
    const ro = ROLES[r];
    const locked = S.level < ro.lv;
    const on = hasStaff(r);
    if (!on) {
      h += `<div class="up"><div class="t"><div class="n">${ro.name}</div>
        <div class="d">${locked ? `🔒 Lv.${ro.lv} から` : ro.desc}</div></div>
        <button class="btn green" data-buy="${r}" ${locked || S.money < ro.price ? 'disabled' : ''}>${locked ? '未解禁' : yen(ro.price)}</button></div>`;
    } else {
      const lv = robLv(r);
      const maxed = lv >= ROBOT_UP_COST.length;
      const cur = ROBOT_LV[lv];
      const nx = ROBOT_LV[lv + 1];
      const spec = (x) => `速さ ×${x.spd}・電池 ${x.bat}秒`;
      h += `<div class="up"><div class="t"><div class="n">${ro.name} <span class="lv">${maxed ? 'MAX ' : ''}Lv.${lv + 1}</span></div>
        <div class="d">${ro.desc}<br>${spec(cur)}${maxed ? '' : ' → ' + spec(nx)}</div></div>
        <button class="btn green" data-rup="${r}" ${maxed || S.money < ROBOT_UP_COST[lv] ? 'disabled' : ''}>${maxed ? '最大' : 'Lv.UP ' + yen(ROBOT_UP_COST[lv])}</button></div>`;
    }
  });
  {
    const n = S.chargers;
    const full = n >= CHARGER_COSTS.length;
    h += `<div class="up"><div class="t"><div class="n">⚡ 充電スポット <span class="lv">${n} / ${CHARGER_COSTS.length}</span></div>
      <div class="d">ロボットの充電場所（バックヤードの壁ぎわに設置）。1台ずつ使うので、動かすロボットの数だけあると安心。${n === 0 ? '<b>まだ無いのでロボットは動きません！</b>' : ''}</div></div>
      <button class="btn green" data-charger="1" ${full || S.money < CHARGER_COSTS[n] ? 'disabled' : ''}>${full ? '設置済み' : yen(CHARGER_COSTS[n])}</button></div>`;
  }
  h += '<div class="foot"><button class="btn sub" id="btn-title">タイトルへ戻る</button></div>';
  $('shop').innerHTML = h;
}
let shopOpen = false;
function toggleShop(v) {
  shopOpen = v ?? !shopOpen;
  $('shop').style.display = shopOpen ? 'block' : 'none';
  if (shopOpen) { shopDirty = true; toggleOrder(false); toggleMaker(false); }
}
$('shop').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.id) purchase(b.dataset.id);
  else if (b.dataset.buy) buyRobot(b.dataset.buy);
  else if (b.dataset.rup) upgradeRobot(b.dataset.rup);
  else if (b.dataset.charger) buyCharger();
  else if (b.id === 'btn-title') {
    save();
    location.reload(); // タイトル画面へ（セーブ済み）
  }
});

let makerOpen = false;
let makerCur = null;
function renderMaker() {
  const m = makerCur;
  let h = `<h2>${m.icon} ${m.name}</h2><div class="note">作るものを選ぶと、${MAKER_TIME}秒ほどで出来上がります。材料はまとめて使います。</div>`;
  Object.keys(RECIPES).filter((id) => RECIPES[id].maker === m.id).forEach((id) => {
    const r = RECIPES[id];
    const it = ITEM[id];
    const locked = S.level < it.lv;
    const ing = Object.entries(r.ing).map(([k, n]) => `${ING[k].name}${n * r.batch}（在庫${S.inv[k]}）`).join('・');
    h += `<div class="up"><div class="t"><div class="n">${it.name} <span class="lv">${locked ? '' : '×' + r.batch}</span></div>
      <div class="d">${locked ? `🔒 Lv.${it.lv} で解禁` : `材料：${ing}`}</div></div>
      <button class="btn green" data-make="${id}" ${canMake(id) ? '' : 'disabled'}>${locked ? '未解禁' : '作る'}</button></div>`;
  });
  h += '<div class="foot"><button class="btn sub" id="btn-maker-close">閉じる</button></div>';
  $('maker').innerHTML = h;
}
function openMaker(m) { makerCur = m; toggleMaker(true); }
function toggleMaker(v) {
  makerOpen = v ?? !makerOpen;
  $('maker').style.display = makerOpen ? 'block' : 'none';
  if (makerOpen) { renderMaker(); toggleShop(false); toggleOrder(false); } else makerCur = null;
}
$('maker').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'btn-maker-close') return toggleMaker(false);
  const id = b.dataset.make;
  if (!id || !makerCur) return;
  if (!startBatch(makerCur, id)) return rest('材料が足りない…');
  toggleMaker(false);
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
  if (orderOpen) { orderDirty = true; toggleShop(false); toggleMaker(false); }
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

// 1日の終わりは画面を出さず、静かに次の日へ（お客さんはそのまま。消さない）
function nextDay() {
  S.day++;
  S.time = DAY_START;
  S.stats = { sales: 0, customers: 0, lost: 0 };
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
    else if (shopOpen || orderOpen || makerOpen) { toggleShop(false); toggleOrder(false); toggleMaker(false); }
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

  // 売り場ケースのラベル・調理台・増築アニメ
  const shown = expandT >= 1;
  DISPLAYS.forEach((def) => {
    const on = dispShown(def) && shown;
    def.tag.on = on;
    if (!on) return;
    const d = def.d;
    let chip = `${CAT_ICON[def.cat]} ${d.total} / ${d.cap}`;
    if (d.kinds.filter(itemUnlocked).length > 1) chip += '　' + d.kinds.filter((k) => itemUnlocked(k) && d.stock[k]).map((k) => `${ITEM[k].label}${d.stock[k]}`).join(' ');
    def.tag.set({ chip, tone: d.total ? 'good' : '' });
  });
  updateMakers(dt);
  updateWorkers(dt);
  if (expandT < 1) {
    expandT = Math.min(1, expandT + dt / 1.0);
    expansion.group.scale.y = Math.max(0.01, ease(expandT));
    if (expandT >= 1) placeWipeCam();
  }

  // レジ
  if (reg.serving) {
    const c = reg.serving;
    reg.t += (dt / 0.9) * (reg.byBot ? ROBOT_LV[robLv('cashier')].spd : 1);
    regTag.set({ chip: 'ピッ…', bar: q40(reg.t) });
    if (reg.t >= 1) { reg.serving = null; c.pay(); }
  } else {
    regTag.set(null);
    const c = frontCustomer();
    if (robotOn('cashier') && c) {
      reg.autoT += dt * ROBOT_LV[robLv('cashier')].spd;
      if (reg.autoT >= 2.2) { reg.autoT = 0; reg.serving = c; reg.t = 0.2; reg.byBot = true; c.state = 'serving'; }
    } else reg.autoT = 0;
  }
  staff.setPower(S.chargers > 0);
  staff.setBattery(1);
  cashierTag.set(hasStaff('cashier') ? (S.chargers > 0 ? { chip: `${ROLES.cashier.name} Lv.${robLv('cashier') + 1}` } : { chip: `${ROLES.cashier.name} ⚡充電スポットなし`, tone: 'warn' }) : null);
  staff.anim(dt, 0, !!reg.serving && reg.byBot && robotOn('cashier') && Math.hypot(player.pos.x - LAYOUT.register.use.x, player.pos.z - LAYOUT.register.use.z) > 2.2);

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
  applyLighting(S.time, dt);
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
  if (makerOpen && makerCur) {
    renderMaker();
    const u = makerCur.use;
    if (Math.hypot(player.pos.x - u.x, player.pos.z - u.z) > 2.6) toggleMaker(false);
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
    applyLighting(11, dt);
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
  lightSnap = true;
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
window.__game = { frame, fpsCam, shelfMode, DISPLAYS, workers, buyRobot, upgradeRobot, buyCharger, makers, sandCase, hotCase, S, stations, shelves, cooker, stn, customers, queue, player, view, craft, carry, fridge, addExp, findPath };
