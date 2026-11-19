import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TEX } from './textures.js';

// ---------------------------------------------------------------------------
// Species plumage. Colours are painted per-vertex so each bird gets realistic
// markings (cheek patches, masks, rumps, wing bars) from one shared material.
// ---------------------------------------------------------------------------
export const SPECIES = {
  cockatielGrey: { label: 'Grey cockatiel', body: 0x878a8f, belly: 0x93969b, back: 0x7b7e83, wing: 0x7e8187, flight: 0x55585e, wingPatch: 0xf3f1e8,
    head: 0x9c9ea2, face: 0xf2cf3a, forehead: 0xf5d84a, crown: 0xe9d46a, cheek: 0xef7d26, eye: 0x1a110a, beak: 0x8d8e8f, beakType: 'hook', beakLen: 0.2, beakW: 0.12,
    crest: 'cockatiel', crestColor: 0xe9d25a, crestTip: 0x8f9296, tail: { len: 0.95, w: 0.13, n: 5, color: 0x63666b, tip: 0x4d5055 }, legs: 0x8f8781, zygo: true, weight: '92 g' },
  cockatielLutino: { label: 'Lutino cockatiel', body: 0xfbf2d6, belly: 0xfdf6e3, back: 0xf7eac6, wing: 0xf6e7c1, flight: 0xeedcac, wingPatch: 0xfffbf0,
    head: 0xfdf3cf, face: 0xfde062, forehead: 0xfde66e, crown: 0xfde68a, cheek: 0xf47a2a, eye: 0x7a0c0c, beak: 0xe8cfa8, beakType: 'hook', beakLen: 0.2, beakW: 0.12,
    crest: 'cockatiel', crestColor: 0xfde062, crestTip: 0xfdf0b8, tail: { len: 0.95, w: 0.13, n: 5, color: 0xf1e1b0, tip: 0xe9d59a }, legs: 0xe3b2a4, zygo: true, weight: '88 g' },
  cockatielPearl: { label: 'Pearl cockatiel', body: 0x8f8670, belly: 0xc8b886, back: 0x7f765f, wing: 0x857c66, flight: 0x55503f, wingPatch: 0xf3efe0, spots: 0xf3e5a6,
    head: 0x9a9078, face: 0xf3d64a, crown: 0xe8d070, cheek: 0xee8a3a, eye: 0x1a110a, beak: 0x9a9690, beakType: 'hook', beakLen: 0.2, beakW: 0.12,
    crest: 'cockatiel', crestColor: 0xe7cf5f, crestTip: 0x8f8670, tail: { len: 0.95, w: 0.13, n: 5, color: 0xd9c78c, tip: 0x5d5646 }, legs: 0x8f8781, zygo: true, weight: '95 g' },
  lovebirdPeach: { label: 'Peach-faced lovebird', body: 0x56b937, belly: 0x86d25a, back: 0x4aa82f, wing: 0x47a52f, flight: 0x2b6a2a, rump: 0x2b9be0,
    head: 0xe5402a, forehead: 0xd22816, face: 0xf0583a, throat: 0xff8a66, headOnNeck: true, eye: 0x111111, eyeRing: 0xf2efe8,
    beak: 0xf2e1c2, beakType: 'hook', beakLen: 0.2, beakW: 0.15, crest: 'none', headR: 0.39,
    tail: { len: 0.4, w: 0.2, n: 5, color: 0x3fa43a, tip: 0x2b9be0 }, legs: 0x8f8f8f, zygo: true, weight: '52 g' },
  lovebirdLutino: { label: 'Lutino lovebird', body: 0xf5de3c, belly: 0xf9e86a, back: 0xeed232, wing: 0xf2d838, flight: 0xe8cf7a, rump: 0xfff6cc,
    head: 0xff6a2a, forehead: 0xf2401c, face: 0xff7a3a, throat: 0xff9a70, headOnNeck: true, eye: 0x7a0c0c, eyeRing: 0xf7f3ea,
    beak: 0xf6e7cc, beakType: 'hook', beakLen: 0.2, beakW: 0.15, crest: 'none', headR: 0.39,
    tail: { len: 0.4, w: 0.2, n: 5, color: 0xf2dc4a, tip: 0xfff3c0 }, legs: 0xe3b2a4, zygo: true, weight: '55 g' },
  condor: { label: 'Andean condor', body: 0x1e1e21, belly: 0x2a2a2e, back: 0x18181b, wing: 0x1c1c1f, flight: 0x111113, wingPatch: 0xe8e8e2, ruff: 0xf3f3ee,
    head: 0xb2857a, crown: 0x8f5f55, eye: 0x4a170c, beak: 0xd8c6a6, beakTip: 0x4d4033, beakType: 'raptor', beakLen: 0.24, beakW: 0.12, crest: 'none',
    tail: { len: 0.5, w: 0.2, n: 6, color: 0x18181b, tip: 0x111111 }, legs: 0x6b6460, weight: '11.3 kg' },
  eagle: { label: 'Bald eagle', body: 0x4a2f1b, belly: 0x553520, back: 0x3d2716, wing: 0x45301d, flight: 0x2a1b10, head: 0xf6f4ee, eye: 0xd9a516,
    beak: 0xffc21a, cere: 0xf2b51a, beakType: 'raptor', beakLen: 0.26, beakW: 0.13, crest: 'none', tail: { len: 0.55, w: 0.2, n: 6, color: 0xf6f4ee, tip: 0xeeeae0 }, legs: 0xf6c21c, weight: '4.7 kg' },
  raven: { label: 'Common raven', body: 0x16161c, belly: 0x1b1b22, back: 0x121218, wing: 0x1a1a24, flight: 0x0f0f14, head: 0x15151b, eye: 0x161210,
    beak: 0x1b1b1f, beakType: 'heavy', beakLen: 0.32, beakW: 0.12, crest: 'none', tail: { len: 0.6, w: 0.18, n: 6, color: 0x121218, tip: 0x0f0f14 }, legs: 0x1b1b1f, weight: '1.2 kg' },
  flamingo: { label: 'American flamingo', body: 0xff7fa4, belly: 0xffa0bd, back: 0xff6e98, wing: 0xff5c8c, flight: 0x151515, head: 0xff88aa, eye: 0xf2c230,
    beak: 0xf6dcd2, beakTip: 0x151515, beakType: 'flamingo', beakLen: 0.4, beakW: 0.1, crest: 'none', tail: { len: 0.35, w: 0.18, n: 5, color: 0xff6e98, tip: 0xff5c8c }, legs: 0xff7aa0, weight: '2.8 kg' },
  owl: { label: 'Great horned owl', body: 0x86684a, belly: 0xd4bf98, back: 0x6d5238, wing: 0x7a5c40, flight: 0x4d3a26, head: 0x7f6246, facialDisc: 0xc89b62, throat: 0xf0e8d8,
    eye: 0x111111, iris: 0xf59e1b, owlEyes: true, beak: 0x3a3634, beakType: 'raptor', beakLen: 0.13, beakW: 0.08, crest: 'tufts', crestColor: 0x6d5238, crestTip: 0x3d2c1c,
    tail: { len: 0.45, w: 0.2, n: 6, color: 0x7a5c40, tip: 0x4d3a26 }, legs: 0xc8b089, weight: '1.4 kg', headR: 0.41, bars: true },
  hawk: { label: 'Red-tailed hawk', body: 0x7a4b2a, belly: 0xf1e3cb, back: 0x6a3f22, wing: 0x6e4426, flight: 0x3c2414, head: 0x6e4428, throat: 0xf1e3cb, eye: 0x7a4418,
    beak: 0x2e2e2e, cere: 0xf2d35a, beakType: 'raptor', beakLen: 0.2, beakW: 0.11, crest: 'none', tail: { len: 0.55, w: 0.2, n: 6, color: 0xb84a2b, tip: 0x8f3a22 }, legs: 0xf2cf4a, weight: '1.1 kg' },
  toucan: { label: 'Toco toucan', body: 0x101012, belly: 0x101012, back: 0x0d0d0f, wing: 0x111113, flight: 0x0a0a0c, head: 0x101012, face: 0xfffdf5, throat: 0xfffdf5, eye: 0x0d0d0d, eyeRing: 0x3aa3e0,
    rump: 0xf4f4f0, beak: 0xff8a1a, beakTip: 0xe0301a, beakType: 'toucan', beakLen: 0.85, beakW: 0.17, crest: 'none', tail: { len: 0.6, w: 0.2, n: 5, color: 0x101012, tip: 0x0a0a0c }, legs: 0x5a7ab0, zygo: true, weight: '620 g' },
  pelican: { label: 'Great white pelican', body: 0xf3efe6, belly: 0xf6f2ea, back: 0xe9e3d6, wing: 0xe6dfd0, flight: 0x2a2a2a, head: 0xf7f3e8, crown: 0xf6e7b0, eye: 0x6b2a1a,
    beak: 0xf2b06a, beakTip: 0xe88a4a, pouch: 0xf5cc80, beakType: 'pelican', beakLen: 0.95, beakW: 0.12, crest: 'none', tail: { len: 0.35, w: 0.2, n: 6, color: 0xe9e3d6, tip: 0xdcd5c6 }, legs: 0xf2b06a, weight: '9.5 kg' },
  robin: { label: 'American robin', body: 0x5d5047, belly: 0xd9622b, back: 0x51463e, wing: 0x564a42, flight: 0x3a322c, head: 0x2e2a28, throat: 0xf0ece6, eye: 0x111111, eyeRing: 0xf3f3f3,
    beak: 0xf0c419, beakTip: 0x8a6a10, beakType: 'cone', beakLen: 0.22, beakW: 0.07, crest: 'none', tail: { len: 0.55, w: 0.16, n: 5, color: 0x2e2a28, tip: 0x26221f }, legs: 0x6b5a4a, weight: '77 g' },
  magpie: { label: 'Black-billed magpie', body: 0x111114, belly: 0xf6f6f4, back: 0x111114, wing: 0x1b2c50, flight: 0x14203d, wingPatch: 0xf6f6f4, head: 0x111114, eye: 0x111111,
    beak: 0x111111, beakType: 'heavy', beakLen: 0.24, beakW: 0.09, crest: 'none', tail: { len: 1.0, w: 0.15, n: 5, color: 0x14243f, tip: 0x1b3b2a }, legs: 0x111111, weight: '180 g' },
  bluejay: { label: 'Blue jay', body: 0x4c80d4, belly: 0xe8eef3, back: 0x4878c8, wing: 0x3f74d0, flight: 0x24489a, wingPatch: 0xf4f6f8, head: 0x5a8de0, throat: 0xf0f4f7, eye: 0x111111,
    beak: 0x161616, beakType: 'cone', beakLen: 0.24, beakW: 0.08, crest: 'spike', crestColor: 0x5a8de0, crestTip: 0x3d6dc0, tail: { len: 0.7, w: 0.16, n: 5, color: 0x3f74d0, tip: 0x1d1d1d }, legs: 0x2a2a2a, weight: '85 g' },
  cardinal: { label: 'Northern cardinal', body: 0xc81e1e, belly: 0xd62a2a, back: 0xa81818, wing: 0xb01a1a, flight: 0x8a1414, head: 0xd02020, mask: 0x111111, eye: 0x111111,
    beak: 0xff5a2a, beakType: 'cone', beakLen: 0.2, beakW: 0.11, crest: 'spike', crestColor: 0xd02020, crestTip: 0xb01a1a, tail: { len: 0.65, w: 0.16, n: 5, color: 0xa01616, tip: 0x801212 }, legs: 0x8a5a5a, weight: '45 g' },
  sparrow: { label: 'House sparrow', body: 0x8b6a4a, belly: 0xd8d0c0, back: 0x6e4e30, wing: 0x7a5434, flight: 0x4e3420, wingPatch: 0xf0ebe0, head: 0x8a8580, crown: 0x7a8088, cheek: 0xdcd6cc, throat: 0x262626, eye: 0x111111,
    beak: 0x3a3a3a, beakType: 'cone', beakLen: 0.18, beakW: 0.09, crest: 'none', tail: { len: 0.5, w: 0.15, n: 5, color: 0x5e4428, tip: 0x4a3420 }, legs: 0xb08a70, weight: '30 g', bars: true },
  goldfinch: { label: 'American goldfinch', body: 0xf5d41c, belly: 0xf8e04a, back: 0xf0cc18, wing: 0x151515, flight: 0x111111, wingPatch: 0xfafafa, head: 0xf5d41c, forehead: 0x111111, eye: 0x111111,
    beak: 0xf2a77a, beakType: 'cone', beakLen: 0.16, beakW: 0.08, crest: 'none', tail: { len: 0.5, w: 0.15, n: 5, color: 0x151515, tip: 0x222222 }, legs: 0xc8a080, weight: '14 g' },
  pigeon: { label: 'Rock pigeon', body: 0x8d93a0, belly: 0x9aa0ad, back: 0x9ca2ae, wing: 0xa0a6b2, flight: 0x4b4f58, head: 0x6f7684, throat: 0x6e5a8c, eye: 0xd9631e,
    beak: 0x3a3a3a, cere: 0xf0f0f0, beakType: 'cone', beakLen: 0.16, beakW: 0.06, crest: 'none', tail: { len: 0.5, w: 0.2, n: 6, color: 0x7f8592, tip: 0x3d4048 }, legs: 0xd65a5a, weight: '350 g' },
  macaw: { label: 'Scarlet macaw', body: 0xd7261e, belly: 0xd7261e, back: 0xc81f1a, wing: 0x1f6fd1, flight: 0x1a4fa8, wingPatch: 0xf5d020, head: 0xdc2a20, face: 0xf3efe6, eye: 0xd8d0b0,
    beak: 0xece2d0, beakTip: 0x1a1a1a, beakType: 'hook', beakLen: 0.3, beakW: 0.17, crest: 'none', tail: { len: 1.1, w: 0.14, n: 5, color: 0xd7261e, tip: 0x1f6fd1 }, legs: 0x5a5a5a, zygo: true, weight: '1 kg' },
  budgie: { label: 'Budgerigar', body: 0x6cc43c, belly: 0x86d24e, back: 0x7ac943, wing: 0x7ac943, flight: 0x2a4a1a, head: 0xf6e04a, face: 0xf8e660, eye: 0x111111, cere: 0x4a7ad8,
    beak: 0xe2c9a0, beakType: 'hook', beakLen: 0.14, beakW: 0.09, crest: 'none', tail: { len: 0.8, w: 0.1, n: 4, color: 0x2a5aa0, tip: 0x1d3f7a }, legs: 0x8fa0c0, zygo: true, weight: '35 g', bars: true },
  gull: { label: 'Herring gull', body: 0xf5f5f3, belly: 0xf8f8f6, back: 0xa9b3bd, wing: 0xa9b3bd, flight: 0x222222, head: 0xf8f8f6, eye: 0xe8d070,
    beak: 0xf5c518, beakTip: 0xd8301a, beakType: 'heavy', beakLen: 0.26, beakW: 0.08, crest: 'none', tail: { len: 0.45, w: 0.2, n: 6, color: 0xf5f5f3, tip: 0xe8e8e6 }, legs: 0xf0b8a0, weight: '1 kg' },
  mallard: { label: 'Mallard', body: 0xa7a59f, belly: 0xb6b3ab, back: 0x6e6a60, wing: 0x8a8478, flight: 0x3a3a3a, wingPatch: 0x3a4ab0, head: 0x1d5a3a, throat: 0x6b3a26, eye: 0x111111,
    beak: 0xe8c43a, beakType: 'duck', beakLen: 0.24, beakW: 0.1, crest: 'none', tail: { len: 0.3, w: 0.2, n: 5, color: 0x222222, tip: 0xf0f0f0 }, legs: 0xf08a2a, weight: '1.1 kg' },
};

const COLOR_KEYS = ['body', 'belly', 'back', 'wing', 'flight', 'wingPatch', 'rump', 'head', 'face', 'forehead', 'crown', 'cheek', 'throat', 'eye', 'eyeRing', 'iris',
  'beak', 'beakTip', 'cere', 'legs', 'ruff', 'spots', 'crestColor', 'crestTip', 'pouch', 'mask', 'facialDisc', 'glove', 'trunks', 'trim', 'cuff'];

function resolveSpec(opts) {
  const base = SPECIES[opts.species] || SPECIES.sparrow;
  const s = { headR: 0.36, ...base, ...opts };
  s.tail = { ...base.tail, ...(opts.tail || {}) };
  const P = { ...s };
  for (const k of COLOR_KEYS) if (typeof s[k] === 'number') P[k] = new THREE.Color(s[k]);
  P.tail.color = new THREE.Color(s.tail.color); P.tail.tip = new THREE.Color(s.tail.tip ?? s.tail.color);
  return P;
}

// ---------------------------------------------------------------------------
// Shared materials (colour comes from vertex colours)
// ---------------------------------------------------------------------------
let MATS = null;
function mats() {
  if (MATS) return MATS;
  const fb = TEX.featherBody();
  fb.repeat.set(7, 6);
  MATS = {
    body: new THREE.MeshStandardMaterial({ vertexColors: true, map: fb, bumpMap: fb, bumpScale: 1.2, roughness: 0.9 }),
    feather: new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.featherVane(), roughness: 0.8, side: THREE.DoubleSide }),
    smooth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
    fabric: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffffff) }),
    eye: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 }),
  };
  return MATS;
}

// Plain material helper used by the world for props.
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...opts }));
  return matCache.get(key);
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function prep(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

function deform(geo, fn) {
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); fn(v); pos.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return geo;
}

function paint(geo, fn) {
  const g = prep(geo);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const arr = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i);
    const col = fn(p, n, uv.getY(i), c.setRGB(1, 1, 1));
    arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const solid = (col) => { const c0 = col instanceof THREE.Color ? col : new THREE.Color(col); return (p, n, v, c) => c.copy(c0); };
const along = (a, b, from = 0.5) => (p, n, v, c) => c.copy(a).lerp(b, sstep(from, 1, v));

function place(g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) {
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  return g;
}
const merge = (list) => mergeGeometries(list.filter(Boolean), false);

// A single tapered, curved feather lying in the XY plane (length along +y).
function featherGeo(len, width, bend = 0.15, segs = 6) {
  const pos = [], uvs = [];
  const row = (t) => {
    const w = width * 0.5 * (t < 0.12 ? 0.35 + (t / 0.12) * 0.65 : Math.pow(Math.max(0, 1 - (t - 0.12) / 0.88), 0.55));
    return [w, t * len, -bend * len * t * t, t];
  };
  for (let i = 0; i < segs; i++) {
    const [w0, y0, z0, t0] = row(i / segs), [w1, y1, z1, t1] = row((i + 1) / segs);
    pos.push(-w0, y0, z0, w0, y0, z0, w1, y1, z1, -w0, y0, z0, w1, y1, z1, -w1, y1, z1);
    uvs.push(0, t0, 1, t0, 1, t1, 0, t0, 1, t1, 0, t1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

const noiseMul = (p) => 1 + Math.sin(p.x * 23.1 + p.y * 17.3) * Math.sin(p.z * 19.7 + p.y * 7.1) * 0.05;

// ---------------------------------------------------------------------------
// Part builders (big upright boxer birds; bird faces +z, feet at y=0)
// ---------------------------------------------------------------------------
function bodyGeo(P) {
  const prof = [[0.001, 0.42], [0.24, 0.45], [0.43, 0.56], [0.56, 0.73], [0.61, 0.93], [0.6, 1.12], [0.54, 1.32], [0.44, 1.5], [0.32, 1.63], [0.25, 1.73], [0.22, 1.84]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 32, Math.PI);
  deform(g, (v) => {
    v.z *= 0.86;
    if (v.z > 0) v.z *= 1 + 0.14 * sstep(0.75, 1.05, v.y) * sstep(1.6, 1.25, v.y);
  });
  return paint(g, (p, n, v, c) => {
    c.copy(P.body);
    if (P.back) c.lerp(P.back, sstep(-0.15, -0.6, n.z));
    if (P.rump) c.lerp(P.rump, sstep(-0.3, -0.75, n.z) * sstep(1.1, 0.8, p.y));
    c.lerp(P.belly, sstep(0.05, 0.5, n.z) * sstep(1.75, 1.45, p.y));
    if (P.throat && !P.headOnNeck) c.lerp(P.throat, sstep(0.1, 0.5, n.z) * sstep(1.5, 1.72, p.y));
    const side = sstep(0.45, 0.8, Math.abs(n.x)) * sstep(0.8, 0.98, p.y) * sstep(1.58, 1.42, p.y) * sstep(0.45, 0.1, n.z);
    c.lerp(P.wing, side);
    if (P.wingPatch) c.lerp(P.wingPatch, side * sstep(1.16, 1.26, p.y) * sstep(1.46, 1.36, p.y));
    if (P.flight) c.lerp(P.flight, side * sstep(1.02, 0.86, p.y));
    if (P.spots && n.z < 0.3 && Math.sin(p.x * 41) * Math.sin(p.y * 37) * Math.sin(p.z * 43) > 0.3) c.lerp(P.spots, 0.75);
    if (P.bars && n.z < 0.1) c.multiplyScalar(0.82 + 0.18 * sstep(-0.3, 0.3, Math.sin(p.y * 46)));
    if (P.headOnNeck) c.lerp(P.head, sstep(1.6, 1.78, p.y));
    else if (P.head) c.lerp(P.head, sstep(1.72, 1.84, p.y) * 0.6);
    if (P.ruff) c.lerp(P.ruff, sstep(1.6, 1.68, p.y));
    return c.multiplyScalar(noiseMul(p));
  });
}

function headGeo(P) {
  const R = P.headR;
  const g = new THREE.SphereGeometry(R, 32, 22);
  deform(g, (v) => { v.z *= 1.06; if (P.owlEyes && v.z > 0) v.z *= 0.8; });
  const cheekDir = [new THREE.Vector3(-0.74, -0.2, 0.64).normalize(), new THREE.Vector3(0.74, -0.2, 0.64).normalize()];
  return paint(g, (p, n, v, c) => {
    c.copy(P.head || P.body);
    if (P.crown) c.lerp(P.crown, sstep(0.45, 0.85, n.y));
    if (P.face) c.lerp(P.face, sstep(0.0, 0.5, n.z) * sstep(-0.8, -0.3, n.y));
    if (P.forehead) c.lerp(P.forehead, sstep(0.3, 0.7, n.z) * sstep(-0.05, 0.35, n.y));
    if (P.throat) c.lerp(P.throat, sstep(-0.2, -0.7, n.y) * sstep(-0.2, 0.4, n.z));
    if (P.cheek) for (const d of cheekDir) c.lerp(P.cheek, sstep(0.84, 0.92, n.dot(d)));
    if (P.mask) c.lerp(P.mask, sstep(0.5, 0.8, n.z) * sstep(0.3, 0.0, n.y));
    if (P.facialDisc) c.lerp(P.facialDisc, sstep(0.25, 0.6, n.z));
    if (P.bars && n.y > 0.2) c.multiplyScalar(0.85 + 0.15 * sstep(-0.3, 0.3, Math.sin(p.y * 60)));
    return c.multiplyScalar(noiseMul(p));
  });
}

function eyesGeo(P) {
  const R = P.headR, list = [];
  const owl = P.owlEyes;
  const er = owl ? 0.1 : 0.062;
  for (const s of [-1, 1]) {
    const e = (owl ? new THREE.Vector3(0.36 * s, 0.1, 0.88) : new THREE.Vector3(0.62 * s, 0.17, 0.6)).normalize();
    const c = e.clone().multiplyScalar(R * (owl ? 0.82 : 0.94)); c.z *= 1.06;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), e);
    const ball = paint(new THREE.SphereGeometry(er, 16, 12), solid(owl ? P.iris : P.eye));
    ball.applyMatrix4(new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 0.75)));
    list.push(ball);
    if (owl) {
      const pupil = paint(new THREE.SphereGeometry(er * 0.55, 12, 10), solid(0x050505));
      pupil.applyMatrix4(new THREE.Matrix4().compose(c.clone().addScaledVector(e, er * 0.35), q, new THREE.Vector3(1, 1, 0.6)));
      list.push(pupil);
    }
    const hl = paint(new THREE.SphereGeometry(er * 0.22, 8, 6), solid(0xffffff));
    hl.translate(c.x + e.x * er * 0.7, c.y + er * 0.35, c.z + e.z * er * 0.7 + 0.01);
    list.push(hl);
    if (P.eyeRing) {
      const ring = paint(new THREE.TorusGeometry(er * 1.12, er * 0.28, 8, 20), solid(P.eyeRing));
      ring.applyMatrix4(new THREE.Matrix4().compose(c.clone().addScaledVector(e, -er * 0.15), q, new THREE.Vector3(1, 1, 1)));
      list.push(ring);
    }
  }
  return merge(list);
}

function beakGeo(P) {
  const R = P.headR, L = P.beakLen, W = P.beakW;
  const z0 = R * 0.96, y0 = -R * 0.14;
  const tip = P.beakTip || P.beak;
  const list = [];
  const cone = (rad, len, seg = 14, hseg = 8) => { const g = new THREE.ConeGeometry(rad, len, seg, hseg); g.rotateX(Math.PI / 2); g.translate(0, 0, len / 2); return g; };
  const shade = (len, base = P.beak, tipC = tip, from = 0.6) => (p, n, v, c) => c.copy(base).lerp(tipC, sstep(from, 1, (p.z - z0 + 0.06) / len));
  const t = P.beakType;
  if (t === 'hook' || t === 'raptor') {
    const ul = L * 1.3;
    const up = deform(cone(W, ul), (v) => { const k = v.z / ul; v.y -= (t === 'raptor' ? 0.85 : 1.15) * L * k * k; v.x *= 1 - 0.3 * k; if (v.y > 0) v.y *= 1 + 0.5 * (1 - k); });
    up.translate(0, y0 + W * 0.3, z0 - 0.05);
    list.push(paint(up, shade(ul)));
    const lo = deform(cone(W * 0.78, L * 0.62, 12, 4), (v) => { const k = v.z / (L * 0.62); v.y += 0.18 * L * k * k; });
    lo.rotateX(0.2); lo.translate(0, y0 - W * 0.4, z0 - 0.05);
    list.push(paint(lo, solid(P.lowerBeak || P.beak)));
  } else if (t === 'cone' || t === 'heavy') {
    const rad = t === 'heavy' ? W * 1.15 : W;
    const g = deform(cone(rad, L), (v) => { const k = v.z / L; v.y -= (t === 'heavy' ? 0.25 : 0.08) * L * k * k; if (v.y < 0) v.y *= 0.8; });
    g.translate(0, y0, z0 - 0.04);
    list.push(paint(g, shade(L)));
  } else if (t === 'toucan') {
    const g = deform(cone(W, L, 16, 10), (v) => { const k = v.z / L; v.y -= 0.22 * L * k * k; v.y *= 1.3; v.x *= 0.75; });
    g.translate(0, y0 + 0.02, z0 - 0.08);
    list.push(paint(g, (p, n, v, c) => { const k = (p.z - z0) / L; c.copy(P.beak).lerp(tip, sstep(0.7, 0.95, k)); if (p.y > y0 + W * 0.9 && k < 0.6) c.lerp(new THREE.Color(0xf5d020), 0.5); return c; }));
  } else if (t === 'pelican') {
    const g = deform(cone(W, L, 12, 10), (v) => { const k = v.z / L; v.y *= 0.4; v.x *= 1.1 - 0.4 * k; if (k > 0.92) v.y -= (k - 0.92) * 1.5; });
    g.translate(0, y0 + 0.02, z0 - 0.06);
    list.push(paint(g, shade(L, P.beak, tip, 0.8)));
    const pouch = paint(new THREE.SphereGeometry(1, 16, 12), solid(P.pouch || P.beak));
    pouch.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, y0 - W * 1.1, z0 + L * 0.38), new THREE.Quaternion(), new THREE.Vector3(W * 0.95, W * 1.3, L * 0.42)));
    list.push(pouch);
  } else if (t === 'flamingo') {
    const g = deform(cone(W, L, 12, 10), (v) => { const k = v.z / L; v.y -= sstep(0.35, 0.65, k) * L * 0.55 * (k - 0.35); v.y *= 1.2; });
    g.translate(0, y0, z0 - 0.04);
    list.push(paint(g, (p, n, v, c) => c.copy(P.beak).lerp(tip, sstep(0.5, 0.58, (p.z - z0) / L))));
  } else if (t === 'duck') {
    const g = new THREE.SphereGeometry(1, 14, 8);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, y0, z0 + L * 0.45), new THREE.Quaternion(), new THREE.Vector3(W * 1.1, W * 0.35, L * 0.55)));
    list.push(paint(g, solid(P.beak)));
  }
  if (P.cere) {
    const cer = paint(new THREE.CylinderGeometry(W * 1.02, W * 1.08, 0.07, 14), solid(P.cere));
    cer.rotateX(Math.PI / 2); cer.translate(0, y0 + W * 0.25, z0 - 0.03);
    list.push(cer);
  }
  return merge(list);
}

function crestGeo(P) {
  const list = [];
  const col = along(P.crestColor || P.head || P.body, P.crestTip || P.crestColor || P.body, 0.3);
  if (P.crest === 'cockatiel') {
    for (let i = 0; i < 8; i++) {
      const len = 0.42 + Math.sin(i / 7 * Math.PI) * 0.2;
      const f = featherGeo(len, 0.075, -0.32);
      place(f, [(i % 2 ? 1 : -1) * 0.012 * i, 0, -i * 0.028], [-i * 0.05, 0, (i - 3.5) * 0.045]);
      list.push(paint(f, col));
    }
  } else if (P.crest === 'spike') {
    for (let i = 0; i < 5; i++) {
      const f = featherGeo(0.32 - i * 0.02, 0.12, 0.35);
      place(f, [0, 0, -i * 0.05], [-0.2 - i * 0.12, 0, (i - 2) * 0.05]);
      list.push(paint(f, col));
    }
  } else if (P.crest === 'tufts') {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const f = featherGeo(0.26 - i * 0.03, 0.09, 0.1);
      place(f, [s * 0.18, -0.06, -i * 0.04], [-0.25, 0, -s * (0.35 + i * 0.12)]);
      list.push(paint(f, col));
    }
  }
  return list.length ? merge(list) : null;
}

function tailGeo(P) {
  const T = P.tail, list = [];
  const mid = (T.n - 1) / 2;
  for (let i = 0; i < T.n; i++) {
    const len = T.len * (1 - Math.abs(i - mid) * 0.07);
    const f = featherGeo(len, T.w, 0.06);
    place(f, [0, 0.74, -0.44 - Math.abs(i - mid) * 0.01], [-(Math.PI / 2 + 0.55), 0, (i - mid) * 0.13]);
    list.push(paint(f, along(T.color, T.tip, 0.55)));
  }
  if (P.ruff) {
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const f = featherGeo(0.2, 0.12, -0.2);
      f.rotateX(1.75);
      f.rotateY(a);
      f.translate(Math.sin(a) * 0.24, 1.62, Math.cos(a) * 0.21);
      list.push(paint(f, solid(P.ruff)));
    }
  }
  return merge(list);
}

function legGeo(P, outfit) {
  const list = [];
  if (outfit) {
    const shorts = paint(new THREE.CylinderGeometry(0.21, 0.235, 0.3, 18), (p, n, v, c) => c.copy(p.y < -0.11 ? P.trim : P.trunks));
    shorts.translate(0, -0.04, 0);
    list.push(shorts);
  } else {
    const thigh = paint(new THREE.SphereGeometry(0.2, 12, 10), solid(P.belly));
    thigh.scale(1, 1.1, 1); thigh.translate(0, -0.02, 0);
    list.push(thigh);
  }
  const tars = paint(new THREE.CylinderGeometry(0.048, 0.056, 0.36, 8), solid(P.legs));
  tars.translate(0, -0.34, 0);
  list.push(tars);
  const toes = P.zygo ? [[0.32, 0.21], [-0.32, 0.21], [Math.PI - 0.38, 0.16], [Math.PI + 0.38, 0.16]] : [[-0.45, 0.2], [0, 0.22], [0.45, 0.2], [Math.PI, 0.15]];
  const claw = new THREE.Color(0x2a2522);
  for (const [a, len] of toes) {
    const toe = paint(new THREE.CylinderGeometry(0.03, 0.036, len, 6), solid(P.legs));
    toe.rotateX(Math.PI / 2); toe.translate(0, 0, len / 2); toe.rotateY(a); toe.translate(0, -0.52, 0);
    const cl = paint(new THREE.ConeGeometry(0.022, 0.07, 6), solid(claw));
    cl.rotateX(Math.PI / 2 + 0.6); cl.translate(0, -0.015, len + 0.02); cl.rotateY(a); cl.translate(0, -0.52, 0);
    list.push(toe, cl);
  }
  return merge(list);
}

function trunksGeo(P) {
  const list = [];
  list.push(paint(new THREE.CylinderGeometry(0.62, 0.66, 0.42, 32), solid(P.trunks)).translate(0, 0.74, 0));
  list.push(paint(new THREE.CylinderGeometry(0.635, 0.632, 0.13, 32), solid(P.trim)).translate(0, 0.93, 0));
  for (const s of [-1, 1]) list.push(paint(new THREE.BoxGeometry(0.04, 0.36, 0.16), solid(P.trim)).translate(s * 0.655, 0.72, 0));
  return merge(list);
}

function wingGeo(P) {
  // Built in arm space: +y along the arm (0..1, scaled to length), +z toward the trailing edge.
  const list = [];
  const bone = new THREE.SphereGeometry(1, 16, 10);
  bone.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.5, 0.05), new THREE.Quaternion(), new THREE.Vector3(0.12, 0.52, 0.17)));
  list.push(paint(bone, (p, n, v, c) => {
    c.copy(P.wing);
    if (P.wingPatch) c.lerp(P.wingPatch, sstep(0.28, 0.38, p.y) * sstep(0.72, 0.62, p.y) * sstep(-0.2, 0.3, p.z));
    if (n.z < -0.4) c.offsetHSL(0, 0, 0.04);
    return c.multiplyScalar(noiseMul(p));
  }));
  const perm = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  for (let k = 0; k < 7; k++) {
    const f = featherGeo(0.34 + k * 0.055, 0.17, 0.08);
    f.applyMatrix4(perm);
    f.rotateX(-0.3 - k * 0.09);
    f.translate(0, 0.28 + k * 0.11, 0.1);
    list.push(paint(f, along(P.flight || P.wing, (P.flight || P.wing).clone().multiplyScalar(0.7), 0.4)));
  }
  return merge(list);
}

function gloveGeo(P, side) {
  const list = [];
  const main = new THREE.SphereGeometry(0.21, 20, 16);
  main.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.03), new THREE.Quaternion(), new THREE.Vector3(0.95, 0.9, 1.18)));
  list.push(paint(main, (p, n, v, c) => c.copy(P.glove).multiplyScalar(n.z > 0.6 ? 1.05 : 1)));
  const thumb = paint(new THREE.CapsuleGeometry(0.06, 0.12, 4, 10), solid(P.glove));
  thumb.rotateX(Math.PI / 2 - 0.3); thumb.translate(-side * 0.16, 0.05, 0.02);
  list.push(thumb);
  const cuff = paint(new THREE.CylinderGeometry(0.155, 0.17, 0.2, 20), solid(P.cuff));
  cuff.rotateX(Math.PI / 2); cuff.translate(0, 0, -0.2);
  list.push(cuff);
  const band = paint(new THREE.CylinderGeometry(0.173, 0.173, 0.045, 20), solid(P.trim));
  band.rotateX(Math.PI / 2); band.translate(0, 0, -0.25);
  list.push(band);
  return merge(list);
}

const geoCache = new Map();
function cached(key, fn) { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); }

// ---------------------------------------------------------------------------
// Poses (glove positions in the bird's local space)
// ---------------------------------------------------------------------------
export const POSES = {
  idle: { l: [-0.62, 1.0, 0.25], r: [0.62, 1.0, 0.25] },
  guard: { l: [-0.3, 1.62, 0.62], r: [0.34, 1.55, 0.5] },
  block: { l: [-0.16, 1.9, 0.6], r: [0.16, 1.9, 0.6] },
  glide: { l: [-1.6, 1.45, -0.15], r: [1.6, 1.45, -0.15] },
  flapUp: { l: [-1.25, 2.35, -0.25], r: [1.25, 2.35, -0.25] },
  cheer: { l: [-0.45, 2.65, 0.2], r: [0.45, 2.65, 0.2] },
  droop: { l: [-0.5, 1.15, 0.45], r: [0.5, 1.15, 0.45] },
  folded: { l: [-0.58, 0.95, -0.2], r: [0.58, 0.95, -0.2] },
};

const UP = new THREE.Vector3(0, 1, 0), FWD = new THREE.Vector3(0, 0, 1);
const _d = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _x = new THREE.Vector3(), _m = new THREE.Matrix4(), _hint = new THREE.Vector3(0, -0.25, -1);

// ---------------------------------------------------------------------------
// makeBird: an upright, anatomically-shaped bird. With gloves:true it wears
// boxing gloves and trunks.
// ---------------------------------------------------------------------------
export function makeBird(opts = {}) {
  const o = { species: 'sparrow', gloves: true, shadow: true, glove: 0xc0141c, trunks: 0x1e3a8a, trim: 0xf5f5f5, cuff: 0xf5f5f5, ...opts };
  const P = resolveSpec(o);
  const M = mats();
  const key = (part) => `${part}|${o.species}|${JSON.stringify(opts.tail || '')}|${o.headR || ''}|${P.crest}`;
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const mesh = (geo, material, parent) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = o.shadow; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  const bodyMesh = mesh(cached(key('body'), () => bodyGeo(P)), M.body, rig);
  const tailMesh = mesh(cached(key('tail'), () => tailGeo(P)), M.feather, rig);
  if (o.gloves) mesh(cached(`trunks|${o.trunks}|${o.trim}`, () => trunksGeo(P)), M.fabric, rig);

  const head = new THREE.Group(); head.position.y = 1.86; rig.add(head);
  mesh(cached(key('head'), () => headGeo(P)), M.body, head);
  mesh(cached(key('beak'), () => beakGeo(P)), M.smooth, head);
  mesh(cached(key('eyes'), () => eyesGeo(P)), M.eye, head).castShadow = false;
  const crestPivot = new THREE.Group();
  if (P.crest === 'cockatiel') crestPivot.position.set(0, P.headR * 0.72, P.headR * 0.42);
  else if (P.crest === 'spike') crestPivot.position.set(0, P.headR * 0.85, 0.05);
  else crestPivot.position.set(0, P.headR * 0.8, 0);
  head.add(crestPivot);
  const cg = cached(key('crest'), () => crestGeo(P));
  if (cg) mesh(cg, M.feather, crestPivot);

  const legs = [];
  const legG = cached(key('leg') + (o.gloves ? `|${o.trunks}|${o.trim}` : ''), () => legGeo(P, o.gloves));
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.22 * s, 0.56, 0); rig.add(hip);
    mesh(legG, M.smooth, hip);
    legs.push(hip);
  }

  const wingG = cached(key('wing'), () => wingGeo(P));
  const gloveMat = o.gloves ? new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.25, emissive: 0xff2020, emissiveIntensity: 0 }) : null;
  const mk = (side) => {
    const arm = new THREE.Group(); rig.add(arm);
    mesh(wingG, M.body, arm);
    let glove;
    if (o.gloves) glove = mesh(cached(`glove|${side}|${o.glove}|${o.trim}|${o.cuff}`, () => gloveGeo(P, side)), gloveMat, rig);
    else { glove = new THREE.Object3D(); rig.add(glove); }
    const p = POSES.idle[side < 0 ? 'l' : 'r'];
    return { glove, arm, side, shoulder: new THREE.Vector3(0.5 * side, 1.4, 0.0), cur: new THREE.Vector3(...p), target: new THREE.Vector3(...p) };
  };
  const L = mk(-1), R = mk(1);
  if (!o.gloves) { L.target.set(...POSES.folded.l); R.target.set(...POSES.folded.r); L.cur.copy(L.target); R.cur.copy(R.target); }

  let swell = null;
  const bird = {
    root, rig, head, legs, L, R, crestPivot, species: o.species, spec: P,
    opts: { ...o, body: SPECIES[o.species] ? SPECIES[o.species].body : 0x888888 },
    walkPhase: 0, armSpeed: 14, bob: 0, crest: 0.6, crestTarget: 0.6, idleLook: !o.gloves, breathT: Math.random() * 6,
    lookT: 0, lookYaw: 0, lookPitch: 0, gloveMat,
    setPose(name, speed) {
      const p = typeof name === 'string' ? POSES[name] : name;
      L.target.set(...p.l); R.target.set(...p.r);
      if (speed) bird.armSpeed = speed;
    },
    setHand(hand, xyz, speed) {
      (hand === 'l' ? L : R).target.set(...xyz);
      if (speed) bird.armSpeed = speed;
    },
    setCrest(v) { bird.crestTarget = v; },
    setGlow(v) { if (gloveMat) gloveMat.emissiveIntensity = v; },
    setDamage(v) {
      if (!swell && v > 0.05) {
        swell = [];
        const sm = new THREE.MeshStandardMaterial({ color: 0x9a4a5a, roughness: 0.6 });
        for (const s of [-1, 1]) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), sm);
          const e = new THREE.Vector3(0.62 * s, 0.24, 0.6).normalize().multiplyScalar(P.headR * 0.97);
          m.position.copy(e); head.add(m); swell.push(m);
        }
      }
      if (swell) swell.forEach((m, i) => { const k = Math.max(0, v - (i ? 0.15 : 0)); m.scale.setScalar(0.01 + k * 1.3); m.visible = k > 0.02; });
    },
    snap() { L.cur.copy(L.target); R.cur.copy(R.target); bird.crest = bird.crestTarget; bird.update(0); },
    walk(dt, amount) {
      bird.walkPhase += dt * (4 + amount * 1.6);
      const a = Math.min(1, amount / 4);
      legs[0].rotation.x = Math.sin(bird.walkPhase) * 0.7 * a;
      legs[1].rotation.x = -Math.sin(bird.walkPhase) * 0.7 * a;
      bird.bob = Math.abs(Math.sin(bird.walkPhase)) * 0.07 * a;
      bodyMesh.rotation.z = Math.sin(bird.walkPhase) * 0.045 * a;
    },
    update(dt) {
      const k = 1 - Math.exp(-bird.armSpeed * dt);
      for (const h of [L, R]) {
        if (dt > 0) h.cur.lerp(h.target, k);
        _d.copy(h.cur).sub(h.shoulder);
        const len = Math.max(0.12, _d.length() - 0.12);
        _y.copy(_d).normalize();
        _z.copy(_hint).addScaledVector(_y, -_hint.dot(_y));
        if (_z.lengthSq() < 1e-3) _z.set(0, -1, 0).addScaledVector(_y, -_y.y);
        _z.normalize();
        _x.crossVectors(_y, _z);
        _m.makeBasis(_x, _y, _z);
        h.arm.quaternion.setFromRotationMatrix(_m);
        h.arm.position.copy(h.shoulder);
        h.arm.scale.set(1, len, 1);
        h.glove.position.copy(h.cur);
        if (o.gloves) h.glove.quaternion.setFromUnitVectors(FWD, _y);
      }
      bird.breathT += dt;
      const br = 1 + Math.sin(bird.breathT * 2.3) * 0.012;
      bodyMesh.scale.set(br, 1, br);
      bodyMesh.position.y = bird.bob;
      tailMesh.position.y = bird.bob;
      head.position.y = 1.86 + bird.bob * 0.6;
      if (bird.idleLook) {
        bird.lookT -= dt;
        if (bird.lookT <= 0) { bird.lookT = 0.4 + Math.random() * 2; bird.lookYaw = (Math.random() - 0.5) * 1.4; bird.lookPitch = (Math.random() - 0.4) * 0.4; }
        const hk = Math.min(1, dt * 16);
        head.rotation.y += (bird.lookYaw - head.rotation.y) * hk;
        head.rotation.x += (bird.lookPitch - head.rotation.x) * hk;
      }
      bird.crest += (bird.crestTarget - bird.crest) * Math.min(1, dt * 6);
      crestPivot.rotation.x = -1.15 + bird.crest * 0.95;
    },
  };
  bird.update(0);
  return bird;
}

// Turn every mesh of a bird into one material (e.g. a golden statue).
export function recolorBird(bird, material) {
  bird.root.traverse((m) => { if (m.isMesh) m.material = material; });
}

// ---------------------------------------------------------------------------
// Small horizontal birds for flocks, pigeons, ducks and wire perchers.
// ---------------------------------------------------------------------------
const smallCache = new Map();
function smallGeos(species) {
  if (smallCache.has(species)) return smallCache.get(species);
  const P = resolveSpec({ species });
  const list = [];
  const body = new THREE.SphereGeometry(0.25, 16, 12);
  body.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0, 0.3, 0), new THREE.Quaternion(), new THREE.Vector3(0.85, 0.8, 1.45)));
  list.push(paint(body, (p, n, v, c) => {
    c.copy(P.body);
    if (P.back) c.lerp(P.back, sstep(0.3, 0.8, n.y));
    c.lerp(P.belly, sstep(-0.1, -0.6, n.y));
    if (P.rump) c.lerp(P.rump, sstep(0.2, 0.6, n.y) * sstep(-0.5, -0.8, n.z));
    if (P.headOnNeck || P.throat) c.lerp(P.headOnNeck ? P.head : P.throat, sstep(0.55, 0.85, n.z));
    if (P.wing) c.lerp(P.wing, sstep(0.6, 0.9, Math.abs(n.x)) * 0.8);
    return c.multiplyScalar(noiseMul(p));
  }));
  const R = 0.165;
  const hp = new THREE.SphereGeometry(R, 16, 12);
  hp.scale(1, 1, 1.05);
  const cheekDir = [new THREE.Vector3(-0.74, -0.2, 0.64).normalize(), new THREE.Vector3(0.74, -0.2, 0.64).normalize()];
  const headG = paint(hp, (p, n, v, c) => {
    c.copy(P.head || P.body);
    if (P.crown) c.lerp(P.crown, sstep(0.45, 0.85, n.y));
    if (P.face) c.lerp(P.face, sstep(0.0, 0.5, n.z) * sstep(-0.8, -0.3, n.y));
    if (P.forehead) c.lerp(P.forehead, sstep(0.3, 0.7, n.z) * sstep(-0.05, 0.35, n.y));
    if (P.throat) c.lerp(P.throat, sstep(-0.2, -0.7, n.y) * sstep(-0.2, 0.4, n.z));
    if (P.cheek) for (const d of cheekDir) c.lerp(P.cheek, sstep(0.84, 0.92, n.dot(d)));
    if (P.mask) c.lerp(P.mask, sstep(0.5, 0.8, n.z) * sstep(0.3, 0.0, n.y));
    return c;
  });
  headG.translate(0, 0.46, 0.3);
  list.push(headG);
  const bl = Math.max(0.08, P.beakLen * 0.5), bw = Math.max(0.035, P.beakW * 0.45);
  const beak = new THREE.ConeGeometry(bw, bl, 8, 4); beak.rotateX(Math.PI / 2); beak.translate(0, 0, bl / 2);
  deform(beak, (v) => { const k = v.z / bl; if (P.beakType === 'hook' || P.beakType === 'raptor') v.y -= 0.9 * bl * k * k; });
  beak.translate(0, 0.43, 0.45);
  list.push(paint(beak, solid(P.beak)));
  for (const s of [-1, 1]) {
    const e = paint(new THREE.SphereGeometry(0.03, 8, 6), solid(0x0b0b0b));
    e.translate(0.11 * s, 0.5, 0.4);
    list.push(e);
  }
  if (P.crest === 'cockatiel') {
    for (let i = 0; i < 4; i++) { const f = featherGeo(0.2, 0.04, -0.3); place(f, [0, 0.6, 0.36 - i * 0.02], [-0.4 - i * 0.12, 0, (i - 1.5) * 0.06]); list.push(paint(f, along(P.crestColor, P.crestTip, 0.3))); }
  }
  const T = P.tail;
  for (let i = 0; i < 3; i++) {
    const f = featherGeo(T.len * 0.4, T.w * 0.55, 0.05);
    place(f, [0, 0.33, -0.3], [-(Math.PI / 2) + 0.12, 0, (i - 1) * 0.18]);
    list.push(paint(f, along(T.color, T.tip, 0.5)));
  }
  for (const s of [-1, 1]) {
    const leg = paint(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 4), solid(P.legs));
    leg.translate(0.07 * s, 0.07, 0.02);
    list.push(leg);
  }
  const bodyGeom = merge(list);

  // Right wing spans +x; the left wing is mirrored.
  const wl = [];
  const cov = new THREE.SphereGeometry(1, 12, 8);
  cov.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(0.17, 0, -0.02), new THREE.Quaternion(), new THREE.Vector3(0.2, 0.03, 0.13)));
  wl.push(paint(cov, (p, n, v, c) => { c.copy(P.wing); if (P.wingPatch) c.lerp(P.wingPatch, sstep(0.1, 0.16, p.x) * sstep(0.26, 0.2, p.x)); return c; }));
  const perm = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0));
  for (let k = 0; k < 5; k++) {
    const f = featherGeo(0.22 + k * 0.012, 0.075, 0.0, 3);
    f.applyMatrix4(perm);
    f.rotateY(0.35 + k * 0.16);
    f.translate(0.16 + k * 0.045, 0, -0.04);
    wl.push(paint(f, along(P.flight || P.wing, (P.flight || P.wing).clone().multiplyScalar(0.75), 0.4)));
  }
  const wingR = merge(wl);
  const wingL = wingR.clone(); wingL.scale(-1, 1, 1);
  const out = { body: bodyGeom, wingR, wingL };
  smallCache.set(species, out);
  return out;
}

export function makeSmallBird(species = 'pigeon', s = 1) {
  const M = mats();
  const g = smallGeos(species);
  const root = new THREE.Group();
  const body = new THREE.Mesh(g.body, M.body); body.castShadow = true;
  root.add(body);
  const wingL = new THREE.Group(); wingL.position.set(-0.13, 0.36, 0.02);
  const wingR = new THREE.Group(); wingR.position.set(0.13, 0.36, 0.02);
  const wl = new THREE.Mesh(g.wingL, M.feather), wr = new THREE.Mesh(g.wingR, M.feather);
  wl.castShadow = wr.castShadow = true;
  wingL.add(wl); wingR.add(wr);
  root.add(wingL, wingR);
  root.scale.setScalar(s);
  const sb = { root, body, wingL, wingR, species };
  foldWings(sb);
  return sb;
}

export function flapWings(sb, phase, amp = 0.9) {
  const a = Math.sin(phase) * amp;
  sb.wingL.rotation.set(0, 0, -a);
  sb.wingR.rotation.set(0, 0, a);
}
export function foldWings(sb) {
  sb.wingL.rotation.set(0, -1.32, 0.12);
  sb.wingR.rotation.set(0, 1.32, -0.12);
}

// One merged spectator geometry for instanced crowds (tinted per instance).
export function crowdBirdGeometry() {
  const list = [];
  const body = new THREE.SphereGeometry(0.45, 12, 10);
  body.scale(1, 1.15, 0.9); body.translate(0, 0.5, 0);
  list.push(paint(body, (p, n, v, c) => c.setRGB(1, 1, 1).lerp(new THREE.Color(0xf4ead8), sstep(0.2, 0.6, n.z) * 0.6)));
  const head = new THREE.SphereGeometry(0.3, 12, 10); head.translate(0, 1.12, 0.04);
  list.push(paint(head, solid(0xffffff)));
  const beak = new THREE.ConeGeometry(0.08, 0.24, 8); beak.rotateX(Math.PI / 2); beak.translate(0, 1.08, 0.42);
  list.push(paint(beak, solid(0x5a4a30)));
  for (const s of [-1, 1]) { const e = new THREE.SphereGeometry(0.045, 6, 4); e.translate(0.17 * s, 1.18, 0.27); list.push(paint(e, solid(0x080808))); }
  return merge(list);
}
export function crowdMaterial() {
  const fb = TEX.featherBody();
  return new THREE.MeshStandardMaterial({ vertexColors: true, map: fb, roughness: 0.9 });
}
