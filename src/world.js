import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeBird, makeSmallBird, flapWings, foldWings, mat, recolorBird, crowdBirdGeometry, crowdMaterial } from './bird.js';
import { TEX, boxWorldUV } from './textures.js';

export const ARENA = { x: 0, z: -80, rin: 22, rout: 30, wall: 9, gapAngle: Math.PI / 2, gapHalf: 0.2 };
export const RING = { x: 0, z: -80, half: 4.5, y: 1.0 };
export const RING_CORNERS = {
  red: [{ x: RING.x + RING.half + 1.5, z: RING.z + RING.half + 0.4 }, { x: RING.x + RING.half + 0.4, z: RING.z + RING.half + 1.5 }],
  blue: [{ x: RING.x - RING.half - 1.5, z: RING.z - RING.half - 0.4 }, { x: RING.x - RING.half - 0.4, z: RING.z - RING.half - 1.5 }],
};
export const GYM = { x: 48, z: 40 };
export const HOME = { x: -48, z: 42 };
export const SHOP = { x: -45, z: -30 };
export const POND = { x: 58, z: -36, r: 9 };
export const TOWER = { x: -92, z: -58 };
export const WORLD_R = 132;
export const TEAM_SPOTS = [{ x: HOME.x + 5, z: HOME.z - 6.6 }, { x: HOME.x - 4.5, z: HOME.z - 6.4 }];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeSign(text, { w = 6, h = 1.4, bg = '#2b1d0e', fg = '#ffb703', font = 'Bungee', sub = '' } = {}) {
  const tex = canvasTex(1024, Math.round(1024 * h / w), (ctx, cw, ch) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = fg; ctx.lineWidth = 14; ctx.strokeRect(10, 10, cw - 20, ch - 20);
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = Math.min(ch * (sub ? 0.42 : 0.55), cw / (text.length * 0.62));
    ctx.font = `${size}px ${font}, sans-serif`;
    ctx.fillText(text, cw / 2, sub ? ch * 0.4 : ch / 2);
    if (sub) { ctx.font = `bold ${ch * 0.2}px Nunito, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(sub, cw / 2, ch * 0.76); }
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide }));
}

export function makeTextSprite(text, { color = '#fff', bg = 'rgba(20,16,30,0.85)', size = 1, border = '#ffb703' } = {}) {
  const pad = 24, fontSize = 56;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `900 ${fontSize}px Nunito, sans-serif`;
  const tw = Math.ceil(ctx.measureText(text).width);
  c.width = tw + pad * 2; c.height = fontSize + pad * 1.6;
  ctx.font = `900 ${fontSize}px Nunito, sans-serif`;
  ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.roundRect(3, 3, c.width - 6, c.height - 6, 26); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true, toneMapped: false }));
  sp.scale.set(c.width / c.height * 0.55 * size, 0.55 * size, 1);
  return sp;
}

// Plane geometry lying flat with UVs in world units.
function groundPlane(w, d, unit = 4) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / unit, uv.getY(i) * d / unit);
  return g;
}

const texMatCache = new Map();
function texMat(kind, color = 0xffffff, extra = {}) {
  const key = kind + color + JSON.stringify(extra);
  if (!texMatCache.has(key)) texMatCache.set(key, new THREE.MeshStandardMaterial({ map: TEX[kind](), color, roughness: 0.85, ...extra }));
  return texMatCache.get(key);
}

const NPC_NAMES = ['Chirpy', 'Beaky Joe', 'Sparrowina', 'Wrenford', 'Tweetsy', 'Finchley', 'Bluebell', 'Pip', 'Quill', 'Nuthatch Ned', 'Starla', 'Kiwi Kai', 'Lark', 'Magpie Max', 'Jaybird Jules', 'Cuckoo Carl', 'Mango', 'Biscuit'];
const NPC_SPECIES = ['sparrow', 'robin', 'bluejay', 'cardinal', 'goldfinch', 'pigeon', 'budgie', 'macaw', 'cockatielGrey', 'cockatielLutino', 'lovebirdPeach', 'lovebirdLutino', 'gull', 'magpie', 'cockatielPearl'];
const CHALLENGER_NAMES = ['Scrappy Sparrow', 'Brawlin\' Bluejay', 'Pigeon Pacquito', 'Mad Macaw', 'Knuckles Budgie', 'Cardinal Crusher', 'Gull Gutpunch', 'Magpie Mayhem'];
const BANTER = ['Nice gloves!', 'Tweet tweet!', 'Saw your last fight!', 'Float like a feather...', '...sting like a beak!', 'Train hard, fly high!', 'Got any millet?', 'Champ in the making!',
  'The Coop is packed tonight!', 'Coach Gizzard is tough but fair.', 'Find the golden feathers!', 'Hold Space to fly!', 'Lightning\'s crest is legendary.', 'Abbas hits so hard for his size!', 'Cookie is FAST.', 'Have you seen Lightning fly?'];

export class World {
  constructor(scene, renderer, quality = 'high') {
    this.scene = scene;
    this.renderer = renderer;
    this.quality = quality;
    this.hi = quality === 'high';
    this.colliders = [];
    this.interactables = [];
    this.npcs = [];
    this.pigeons = [];
    this.perchers = [];
    this.flocks = [];
    this.ducks = [];
    this.feathers = [];
    this.lamps = [];
    this.lampPositions = [];
    this.clouds = [];
    this.mapRects = [];
    this.stations = {};
    this.waterMats = [];
    this.time = 0;
    this.crowdHype = 0;
    this.flashRate = 0;
    this.wind = { value: 0 };

    this.buildSky();
    this.buildGround();
    this.buildPlaza();
    this.buildHome();
    this.buildGym();
    this.buildShop();
    this.buildArena();
    this.buildPark();
    this.buildTower();
    this.buildHouses();
    this.flushWindows();
    this.buildTrees();
    this.buildGrass();
    this.buildLamps();
    this.buildPowerLines();
    this.buildClouds();
    this.buildFlocks();
    this.buildPigeons();
    this.buildNPCs();
  }

  // ---------- helpers ----------
  addBox(x, z, w, d, h, color, { y0 = 0, collide = true, shadow = true, mapColor = null, material = null, unit = 2 } = {}) {
    const m = new THREE.Mesh(material ? boxWorldUV(w, h, d, unit) : new THREE.BoxGeometry(w, h, d), material || mat(color));
    m.position.set(x, y0 + h / 2, z);
    m.castShadow = shadow; m.receiveShadow = true;
    this.scene.add(m);
    if (collide) this.colliders.push({ type: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: y0, top: y0 + h });
    if (mapColor) this.mapRects.push({ x, z, w, d, color: mapColor });
    return m;
  }

  addInteract(id, x, z, label, r = 2.6, y = 0) {
    this.interactables.push({ id, pos: new THREE.Vector3(x, y, z), label, r });
  }

  // ---------- sky, sun, moon, stars, environment light ----------
  buildSky() {
    const sky = new Sky();
    sky.scale.setScalar(1500);
    const u = sky.material.uniforms;
    u.turbidity.value = 3.5; u.rayleigh.value = 1.1; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
    this.sky = sky;
    this.scene.add(sky);
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(50);
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = null; this.lastEnvSun = -99;

    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a6b3a, 0.5);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 3);
    this.sun.castShadow = true;
    const sm = this.hi ? 2048 : 1024;
    this.sun.shadow.mapSize.set(sm, sm);
    const s = this.sun.shadow.camera; s.left = -38; s.right = 38; s.top = 38; s.bottom = -38; s.near = 1; s.far = 220;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.moon = new THREE.DirectionalLight(0x9db4ff, 0);
    this.scene.add(this.moon, this.moon.target);
    this.scene.fog = new THREE.FogExp2(0xc6d8e6, 0.0042);

    const moonBall = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false, toneMapped: false }));
    this.moonBall = moonBall; this.scene.add(moonBall);
    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3(rand(-1, 1), rand(0.05, 1), rand(-1, 1)).normalize().multiplyScalar(600);
      sp.push(v.x, v.y, v.z);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false }));
    this.scene.add(this.stars);
  }

  buildGround() {
    const size = 540, seg = 135;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      let y = 0;
      if (r > WORLD_R + 6) {
        const t = r - (WORLD_R + 6);
        y = t * 0.85 + Math.sin(x * 0.07) * Math.cos(z * 0.06) * t * 0.35 + Math.sin(Math.atan2(z, x) * 7) * t * 0.22 + Math.sin(x * 0.31 + z * 0.17) * t * 0.04;
      }
      pos.setY(i, y);
      uv.setXY(i, x / 5, z / 5);
      const n = Math.sin(x * 0.11) * Math.cos(z * 0.13) * 0.5 + Math.sin(x * 0.031 + z * 0.027) * 0.5;
      if (y > 70) c.setRGB(0.95, 0.96, 1.0);
      else if (y > 22) c.setHSL(0.08, 0.06, 0.42 + n * 0.06);
      else c.setHSL(0.24, 0.12 + n * 0.08, 0.86 + n * 0.1);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.grass(), roughness: 1 }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Roads with sidewalks
    const roadMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt(), roughness: 0.92 });
    const walkMat = texMat('pavers', 0xffffff, { roughness: 0.95 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xf2e6b0, roughness: 0.7 });
    this.roads = [
      { x: 0, z: 30, w: 9, d: 160 },
      { x: 0, z: -28, w: 9, d: 46 },
      { x: 0, z: 0, w: 230, d: 9 },
      { x: 0, z: 28, w: 120, d: 7 },
      { x: -10, z: -16, w: 120, d: 7 },
    ];
    for (const r of this.roads) {
      const along = r.w > r.d ? 'x' : 'z';
      const m = new THREE.Mesh(groundPlane(r.w, r.d, 6), roadMat);
      m.position.set(r.x, 0.09, r.z); m.receiveShadow = true;
      this.scene.add(m);
      this.mapRects.push({ x: r.x, z: r.z, w: r.w, d: r.d, color: '#5d6168' });
      for (const s of [-1, 1]) {
        const sw = along === 'x' ? new THREE.Mesh(boxWorldUV(r.w, 0.14, 2.2, 3), walkMat) : new THREE.Mesh(boxWorldUV(2.2, 0.14, r.d, 3), walkMat);
        sw.position.set(r.x + (along === 'z' ? s * (r.w / 2 + 1.1) : 0), 0.0, r.z + (along === 'x' ? s * (r.d / 2 + 1.1) : 0));
        sw.receiveShadow = true;
        this.scene.add(sw);
      }
      const len = Math.max(r.w, r.d);
      for (let t = -len / 2 + 2; t < len / 2 - 2; t += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? 2.6 : 0.18, along === 'x' ? 0.18 : 2.6), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(r.x + (along === 'x' ? t : 0), 0.1, r.z + (along === 'z' ? t : 0));
        this.scene.add(dash);
      }
    }
  }

  isOnRoad(x, z, pad = 2) {
    return this.roads.some((r) => Math.abs(x - r.x) < r.w / 2 + pad && Math.abs(z - r.z) < r.d / 2 + pad);
  }

  waterMaterial(color = 0x1f5f73) {
    const n = TEX.waterNormal().clone(); n.needsUpdate = true; n.repeat.set(3, 3);
    const m = new THREE.MeshPhysicalMaterial({ color, roughness: 0.04, metalness: 0, normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), transparent: true, opacity: 0.9, clearcoat: 1, clearcoatRoughness: 0.05 });
    this.waterMats.push(m);
    return m;
  }

  buildPlaza() {
    const pg = new THREE.CircleGeometry(15, 64); pg.rotateX(-Math.PI / 2);
    const uv = pg.attributes.uv, pp = pg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / 3, pp.getZ(i) / 3);
    const plaza = new THREE.Mesh(pg, texMat('pavers', 0xe8e0d0));
    plaza.position.y = 0.14; plaza.receiveShadow = true; this.scene.add(plaza);
    this.mapRects.push({ x: 0, z: 0, r: 15, color: '#cbbfa8' });
    const stone = texMat('concrete', 0xd8d0c0);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.4, 0.9, 48, 1, true), stone);
    basin.position.y = 0.45; basin.castShadow = basin.receiveShadow = true; this.scene.add(basin);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(5.1, 0.28, 10, 64), stone);
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.9; rim.castShadow = true; this.scene.add(rim);
    const water = new THREE.Mesh(new THREE.CircleGeometry(4.95, 48), this.waterMaterial(0x2a7a94));
    water.rotation.x = -Math.PI / 2; water.position.y = 0.75; this.scene.add(water);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 2.4, 24), stone);
    ped.position.y = 1.2; ped.castShadow = true; this.scene.add(ped);
    this.colliders.push({ type: 'circle', x: 0, z: 0, r: 5.4, bottom: 0, top: 0.9 });
    this.colliders.push({ type: 'circle', x: 0, z: 0, r: 1.4, bottom: 0, top: 2.4 });
    const statue = makeBird({ species: 'cockatielGrey', glove: 0xffd700 });
    recolorBird(statue, new THREE.MeshPhysicalMaterial({ color: 0xe8b84a, metalness: 1, roughness: 0.28, clearcoat: 0.4 }));
    statue.setPose('cheer'); statue.setCrest(1); statue.snap();
    statue.root.scale.setScalar(1.5);
    statue.root.position.set(0, 2.4, 0);
    this.scene.add(statue.root);
    const sign = makeSign('FEATHERTON', { w: 5, h: 1.1, sub: 'Home of the Boxing Birdies' });
    sign.position.set(0, 1.5, 6.6); this.scene.add(sign);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3;
      this.addBench(Math.cos(a) * 11, Math.sin(a) * 11, -a + Math.PI / 2);
    }
  }

  addBench(x, z, rotY) {
    const g = new THREE.Group();
    const wood = texMat('wood', 0x9a6a3a);
    for (let i = 0; i < 3; i++) {
      const slat = new THREE.Mesh(boxWorldUV(2.4, 0.06, 0.18, 1), wood);
      slat.position.set(0, 0.55, -0.22 + i * 0.22); g.add(slat);
    }
    for (let i = 0; i < 2; i++) {
      const back = new THREE.Mesh(boxWorldUV(2.4, 0.16, 0.05, 1), wood);
      back.position.set(0, 0.8 + i * 0.22, -0.32); back.rotation.x = -0.15; g.add(back);
    }
    const iron = mat(0x2a2d33, { metalness: 0.6, roughness: 0.5 });
    for (const s of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.6), iron); leg.position.set(s * 1.05, 0.27, 0); g.add(leg);
      const legb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), iron); legb.position.set(s * 1.05, 0.8, -0.34); g.add(legb);
    }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.position.set(x, 0.12, z); g.rotation.y = rotY;
    this.scene.add(g);
    this.colliders.push({ type: 'circle', x, z, r: 0.9, bottom: 0, top: 0.6 });
  }

  buildHome() {
    const { x, z } = HOME;
    const wood = texMat('wood', 0xd9a066);
    this.addBox(x, z, 11, 10, 6, 0, { material: wood, mapColor: '#c98a4b', unit: 3 });
    this.addGableRoof(x, z, 11, 10, 6, 3.6, texMat('shingles', 0x8a3b2e), wood);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshStandardMaterial({ color: 0x0d0805, roughness: 1 }));
    hole.position.set(x, 2.4, z - 5.02); hole.rotation.y = Math.PI; this.scene.add(hole);
    const holeRim = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.12, 8, 40), texMat('wood', 0x8a5a2a));
    holeRim.position.set(x, 2.4, z - 5.03); this.scene.add(holeRim);
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 10), texMat('wood', 0x7a4a22));
    perch.rotation.x = Math.PI / 2; perch.position.set(x, 0.75, z - 5.8); perch.castShadow = true; this.scene.add(perch);
    const sign = makeSign('MY NEST', { w: 3.4, h: 0.9 });
    sign.position.set(x, 4.7, z - 5.06); sign.rotation.y = Math.PI; this.scene.add(sign);

    // A real twig nest beside the house
    const twigs = [];
    for (let i = 0; i < 220; i++) {
      const a = rand(0, Math.PI * 2), r = rand(1.6, 3.2), y = rand(0.2, 1.6) * (1 - Math.abs(r - 2.4) * 0.3);
      const t = new THREE.CylinderGeometry(0.04, 0.05, rand(1.2, 2.4), 4);
      t.rotateZ(Math.PI / 2 + rand(-0.4, 0.4)); t.rotateY(-a + Math.PI / 2 + rand(-0.6, 0.6));
      t.translate(Math.cos(a) * r, y, Math.sin(a) * r);
      twigs.push(t);
    }
    const nest = new THREE.Mesh(mergeGeometries(twigs), texMat('bark', 0xb08a60));
    nest.position.set(x + 9.5, 0, z); nest.castShadow = true; nest.receiveShadow = true; this.scene.add(nest);
    const lining = new THREE.Mesh(new THREE.SphereGeometry(2.1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), texMat('dirt', 0xc8a878, { side: THREE.DoubleSide }));
    lining.position.set(x + 9.5, 1.6, z); this.scene.add(lining);
    for (let i = 0; i < 3; i++) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xf6f0e2, roughness: 0.35, clearcoat: 0.3 }));
      egg.scale.y = 1.3; egg.position.set(x + 9.5 + rand(-0.6, 0.6), 0.9, z + rand(-0.6, 0.6)); egg.castShadow = true; this.scene.add(egg);
    }
    this.colliders.push({ type: 'circle', x: x + 9.5, z, r: 3.4, bottom: 0, top: 1.6 });

    // Yard where your team hangs out
    const yard = new THREE.Mesh(groundPlane(22, 3.4, 3), texMat('dirt', 0xd8c4a0));
    yard.position.set(x, 0.02, z - 6.7); yard.receiveShadow = true; this.scene.add(yard);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 0.25, 24), mat(0x3b82f6, { roughness: 0.3 }));
    dish.position.set(x + 2.2, 0.12, z - 7); this.scene.add(dish);
    const dw = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), this.waterMaterial(0x3a8ab0));
    dw.rotation.x = -Math.PI / 2; dw.position.set(x + 2.2, 0.23, z - 7); this.scene.add(dw);
    const seeds = [];
    for (let i = 0; i < 160; i++) { const s = new THREE.SphereGeometry(0.05, 4, 3); s.scale(1, 0.5, 1.6); s.rotateY(rand(0, 3)); s.translate(x - 2.2 + rand(-1.4, 1.4), 0.04, z - 6.8 + rand(-0.8, 0.8)); seeds.push(s); }
    this.scene.add(new THREE.Mesh(mergeGeometries(seeds), mat(0x3a3428)));
    this.addInteract('home', x, z - 7, 'Rest in your nest');
  }

  addGableRoof(x, z, w, d, h, rh, roofMat, wallMat) {
    const ov = 0.5, W = w + ov * 2, D = d + ov * 2;
    const g = new THREE.BufferGeometry();
    const hw = W / 2, hd = D / 2;
    const slope = Math.hypot(hd, rh);
    const P = [
      -hw, 0, -hd, hw, 0, -hd, hw, rh, 0, -hw, 0, -hd, hw, rh, 0, -hw, rh, 0,
      -hw, 0, hd, -hw, rh, 0, hw, rh, 0, -hw, 0, hd, hw, rh, 0, hw, 0, hd,
    ];
    const U = [0, 0, W / 3, 0, W / 3, slope / 3, 0, 0, W / 3, slope / 3, 0, slope / 3, 0, 0, 0, slope / 3, W / 3, slope / 3, 0, 0, W / 3, slope / 3, W / 3, 0];
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    g.computeVertexNormals();
    const roof = new THREE.Mesh(g, roofMat);
    roof.material.side = THREE.DoubleSide;
    roof.position.set(x, h, z); roof.castShadow = true; roof.receiveShadow = true;
    this.scene.add(roof);
    const tri = new THREE.BufferGeometry();
    const tw = w / 2, td = d / 2;
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-tw, 0, -td, -tw, 0, td, -tw, rh * (td / hd), 0, tw, 0, td, tw, 0, -td, tw, rh * (td / hd), 0], 3));
    tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, d / 3, 0, d / 6, rh / 3, 0, 0, d / 3, 0, d / 6, rh / 3], 2));
    tri.computeVertexNormals();
    const gable = new THREE.Mesh(tri, wallMat);
    gable.position.set(x, h, z); gable.castShadow = true; this.scene.add(gable);
    this.colliders.push({ type: 'box', minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, bottom: h, top: h + rh * 0.55 });
  }

  buildGym() {
    const { x, z } = GYM;
    this.addBox(x, z, 20, 15, 0.3, 0, { material: texMat('concrete', 0xb8b4ac), mapColor: '#9c8466', unit: 3 });
    const steel = mat(0x30353d, { metalness: 0.7, roughness: 0.45 });
    for (const [px, pz] of [[-9.5, -7], [9.5, -7], [-9.5, 7], [9.5, 7], [0, 7], [0, -7]]) {
      const m = this.addBox(x + px, z + pz, 0.5, 0.5, 5, 0); m.material = steel;
    }
    this.addBox(x, z + 7.2, 20, 0.4, 2.2, 0, { y0: 0.3, material: texMat('brick', 0xffffff), unit: 2.5 });
    const roof = this.addBox(x, z, 21, 16, 0.5, 0, { y0: 5, material: texMat('metal', 0x5a7fa8, { metalness: 0.6, roughness: 0.45 }), unit: 1.5 });
    roof.castShadow = true;
    const sign = makeSign('FEATHER FISTS GYM', { w: 9, h: 1.4, bg: '#0f2a44', fg: '#ffd23f' });
    sign.position.set(x, 4.3, z - 8.05); sign.rotation.y = Math.PI; this.scene.add(sign);
    const mats = new THREE.Mesh(groundPlane(18, 13, 1.5), mat(0x2b2b2e, { roughness: 0.95 }));
    mats.position.set(x, 0.31, z); mats.receiveShadow = true; this.scene.add(mats);

    const fy = 0.32;
    const leather = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    // Heavy bag
    const hb = new THREE.Group(); hb.position.set(x - 6, fy, z + 1); this.scene.add(hb);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.4, 0.22), steel); frame.position.set(0, 2.2, 1.6); hb.add(frame);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.8), steel); arm.position.set(0, 4.3, 0.8); hb.add(arm);
    const bagPivot = new THREE.Group(); bagPivot.position.set(0, 4.2, 0); hb.add(bagPivot);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8), mat(0xaaaaaa, { metalness: 1, roughness: 0.3 })); chain.position.y = -0.4; bagPivot.add(chain);
    const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1.5, 8, 20), leather(0x7a1a14)); bag.position.y = -1.95; bag.castShadow = true; bagPivot.add(bag);
    for (const yy of [-1.3, -2.6]) { const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.08, 20), leather(0x1a1a1a)); strap.position.y = yy; bagPivot.add(strap); }
    this.colliders.push({ type: 'circle', x: x - 6, z: z + 1, r: 0.55, bottom: 0, top: 4 });
    this.stations.heavy = { pos: new THREE.Vector3(x - 6, fy, z - 0.6), face: 0, pivot: bagPivot, swing: 0, swingV: 0 };
    this.addInteract('heavy', x - 6, z - 0.8, 'Train on the Heavy Bag (Power)', 2.2);

    // Speed bag
    const sbg = new THREE.Group(); sbg.position.set(x - 2, fy, z + 1.4); this.scene.add(sbg);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), steel); post.position.set(0, 1.5, 0.6); sbg.add(post);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24), texMat('wood', 0x8a5a2a)); plat.position.set(0, 2.95, 0); sbg.add(plat);
    const sbPivot = new THREE.Group(); sbPivot.position.set(0, 2.85, 0); sbg.add(sbPivot);
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), leather(0xb45309)); sb.scale.y = 1.4; sb.position.y = -0.38; sbPivot.add(sb);
    this.stations.speed = { pos: new THREE.Vector3(x - 2, fy, z - 0.1), face: 0, pivot: sbPivot, swing: 0, swingV: 0 };
    this.addInteract('speed', x - 2, z - 0.4, 'Train on the Speed Bag (Speed)', 2.2);

    // Jump rope mat
    const matM = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 3), mat(0x1d4ed8, { roughness: 0.9 })); matM.position.set(x + 2, fy + 0.03, z + 0.5); this.scene.add(matM);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 6, 40, Math.PI), mat(0xf5f5f5)); rope.visible = false;
    this.scene.add(rope);
    this.stations.rope = { pos: new THREE.Vector3(x + 2, fy, z + 0.5), face: Math.PI, rope };
    this.addInteract('rope', x + 2, z + 0.5, 'Jump Rope (Stamina)', 2.2);

    // Dodge bot
    const bot = new THREE.Group(); bot.position.set(x + 6.5, fy, z + 1.5); this.scene.add(bot);
    const chrome = mat(0x9aa4b0, { metalness: 0.9, roughness: 0.25 });
    const bp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 20), chrome); bp.position.y = 1.2; bp.castShadow = true; bot.add(bp);
    const bh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), chrome); bh.position.y = 2.6; bot.add(bh);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff3333, toneMapped: false })); eye.position.set(0, 2.65, -0.4); bot.add(eye);
    const botArm = new THREE.Group(); botArm.position.y = 2; bot.add(botArm);
    const ba = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 10), steel); ba.rotation.x = Math.PI / 2; ba.position.z = -0.8; botArm.add(ba);
    const bglove = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), leather(0xb91c1c)); bglove.position.z = -1.6; botArm.add(bglove);
    this.colliders.push({ type: 'circle', x: x + 6.5, z: z + 1.5, r: 0.55, bottom: 0, top: 3 });
    this.stations.dodge = { pos: new THREE.Vector3(x + 6.5, fy, z - 0.6), face: 0, arm: botArm, swing: 1.3 };
    this.addInteract('dodge', x + 6.5, z - 0.8, 'Dodge Drill (Defense)', 2.2);

    // Coach Gizzard the great horned owl
    const coach = makeBird({ species: 'owl', gloves: false });
    coach.root.position.set(x + 8, fy, z - 5); coach.root.rotation.y = -2.4;
    this.scene.add(coach.root);
    this.coach = coach;
    const tag = makeTextSprite('Coach Gizzard', { size: 0.9 }); tag.position.set(x + 8, fy + 3.2, z - 5); this.scene.add(tag);
    this.addInteract('coach', x + 8, z - 5, 'Talk to Coach Gizzard', 2.6);
  }

  // Windows are collected and merged into two meshes (frames + glass) to keep draw calls low.
  addWindow(group, x, y, z, rotY, w = 1.2, h = 1.3) {
    if (!this.winFrames) { this.winFrames = []; this.winGlass = []; }
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(1, 1, 1));
    const glass = new THREE.PlaneGeometry(w, h); glass.translate(0, 0, 0.03); glass.applyMatrix4(m);
    this.winGlass.push(glass);
    for (const [fw, fh, fx, fy, fz, fd] of [[w + 0.16, 0.1, 0, h / 2, 0.05, 0.08], [w + 0.16, 0.1, 0, -h / 2, 0.05, 0.08], [0.1, h, -w / 2, 0, 0.05, 0.08], [0.1, h, w / 2, 0, 0.05, 0.08], [w, 0.06, 0, 0, 0.05, 0.08], [0.06, h, 0, 0, 0.05, 0.08], [w + 0.3, 0.08, 0, -h / 2 - 0.06, 0.1, 0.22]]) {
      const f = new THREE.BoxGeometry(fw, fh, fd); f.translate(fx, fy, fz); f.applyMatrix4(m);
      this.winFrames.push(f);
    }
  }

  flushWindows() {
    if (!this.winFrames || !this.winFrames.length) return;
    const frames = new THREE.Mesh(mergeGeometries(this.winFrames), mat(0xf5f3ee, { roughness: 0.6 }));
    frames.castShadow = true;
    this.scene.add(frames, new THREE.Mesh(mergeGeometries(this.winGlass), this.glassMat));
    this.winFrames = []; this.winGlass = [];
  }

  buildShop() {
    const { x, z } = SHOP;
    if (!this.glassMat) this.makeGlass();
    this.addBox(x, z, 12, 8, 5, 0, { material: texMat('brick', 0xffffff), mapColor: '#e6b85c', unit: 2.5 });
    this.addBox(x, z, 12.6, 8.6, 0.4, 0, { y0: 5, material: texMat('concrete', 0x8a8a84) });
    const g = new THREE.Group(); this.scene.add(g);
    this.addWindow(g, x - 3.6, 2, z + 4.01, 0, 3, 2.2);
    this.addWindow(g, x + 3.6, 2, z + 4.01, 0, 3, 2.2);
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 2.2), new THREE.MeshPhysicalMaterial({ color: i % 2 ? 0xffffff : 0xc81e2e, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0xffffff) }));
      s.position.set(x - 5.25 + i * 1.5, 3.5, z + 5); s.rotation.x = 0.35; s.castShadow = true; this.scene.add(s);
    }
    const door = new THREE.Mesh(boxWorldUV(1.8, 2.8, 0.1, 1), texMat('wood', 0x6b3e1f)); door.position.set(x, 1.4, z + 4.02); this.scene.add(door);
    const sign = makeSign('SEED & FEED', { w: 6, h: 1.2, bg: '#2f5f2a', fg: '#fffbe6' });
    sign.position.set(x, 4.35, z + 4.06); this.scene.add(sign);
    const crateM = texMat('wood', 0xb07a45);
    const fruitCols = [0xe63946, 0xf4a261, 0x8ac926, 0xffd60a, 0x6a4c93];
    for (let i = 0; i < 4; i++) {
      const cx = x + 2.2 + (i % 2) * 1.3, cz = z + 5.6 + Math.floor(i / 2) * 1.1;
      const crate = new THREE.Mesh(boxWorldUV(1.1, 0.6, 0.9, 1), crateM); crate.position.set(cx, 0.3, cz); crate.castShadow = true; this.scene.add(crate);
      const fl = [];
      for (let k = 0; k < 10; k++) { const f = new THREE.SphereGeometry(0.15, 10, 8); f.translate(cx + rand(-0.4, 0.4), 0.65, cz + rand(-0.3, 0.3)); fl.push(f); }
      this.scene.add(new THREE.Mesh(mergeGeometries(fl), mat(fruitCols[i], { roughness: 0.4 })));
    }
    const keeper = makeBird({ species: 'budgie', gloves: false });
    keeper.root.position.set(x - 3, 0, z + 5.6); this.scene.add(keeper.root);
    this.keeper = keeper;
    this.addInteract('shop', x, z + 6, 'Shop at Seed & Feed', 3);
  }

  makeGlass() {
    this.glassMat = new THREE.MeshPhysicalMaterial({ color: 0x2a3a4a, roughness: 0.05, metalness: 0.2, emissive: 0xffc77a, emissiveIntensity: 0, clearcoat: 1 });
    this.lamps.push(this.glassMat);
  }

  buildArena() {
    const A = ARENA;
    this.mapRects.push({ x: A.x, z: A.z, r: A.rout, color: '#8d5a97', ring: A.rin });
    const concrete = texMat('concrete', 0xd6d0c8);
    const wallGeo = new THREE.CylinderGeometry(A.rout, A.rout, A.wall, 72, 1, true, Math.PI / 2 - A.gapAngle + A.gapHalf, Math.PI * 2 - A.gapHalf * 2);
    const wuv = wallGeo.attributes.uv; for (let i = 0; i < wuv.count; i++) wuv.setXY(i, wuv.getX(i) * 50, wuv.getY(i) * 3);
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: TEX.concrete(), color: 0x8a6a9a, roughness: 0.85, side: THREE.DoubleSide }));
    wall.position.set(A.x, A.wall / 2, A.z);
    wall.castShadow = true; wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push({ type: 'annulus', x: A.x, z: A.z, rin: A.rin, rout: A.rout, gap: A.gapAngle, gapHalf: A.gapHalf, bottom: 0, top: A.wall });

    // Concrete tiers, chairs and spectators
    const tiers = 5, segs = 64;
    const stepMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), concrete, tiers * segs);
    const chairGeo = mergeGeometries([new THREE.BoxGeometry(0.55, 0.08, 0.5).translate(0, 0.42, 0), new THREE.BoxGeometry(0.55, 0.55, 0.07).translate(0, 0.72, -0.24)]);
    const chairs = new THREE.InstancedMesh(chairGeo, new THREE.MeshStandardMaterial({ roughness: 0.45 }), tiers * segs * 2);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    let n = 0, nc = 0;
    const seats = [];
    for (let s = 0; s < segs; s++) {
      const ang = (s + 0.5) / segs * Math.PI * 2;
      if (this.inGap(ang, A.gapAngle, A.gapHalf + 0.05)) continue;
      for (let t = 0; t < tiers; t++) {
        const r = A.rin + 0.8 + t * 1.5;
        const h = 1.2 + t * 1.4;
        p.set(A.x + Math.cos(ang) * r, h / 2, A.z + Math.sin(ang) * r);
        q.setFromAxisAngle(Y, -ang);
        sc.set(1.55, h, (2 * Math.PI * r) / segs + 0.05);
        m4.compose(p, q, sc);
        stepMesh.setMatrixAt(n++, m4);
        for (const off of [-0.25, 0.25]) {
          const a2 = ang + off * (Math.PI * 2 / segs);
          const cx = A.x + Math.cos(a2) * r, cz = A.z + Math.sin(a2) * r;
          const face = Math.atan2(A.x - cx, A.z - cz);
          q.setFromAxisAngle(Y, face);
          p.set(cx, h, cz);
          m4.compose(p, q, one);
          chairs.setMatrixAt(nc, m4);
          col.set(Math.floor(s / 8) % 2 ? 0x6d28d9 : 0xd97706);
          chairs.setColorAt(nc, col);
          nc++;
          if (Math.random() < 0.82) seats.push({ x: cx, z: cz, y: h + 0.35, face });
        }
      }
    }
    stepMesh.count = n; chairs.count = nc;
    stepMesh.receiveShadow = true; stepMesh.castShadow = true; chairs.castShadow = true;
    this.scene.add(stepMesh, chairs);
    this.buildCrowd(seats);

    const archSign = makeSign('THE COOP COLISEUM', { w: 12, h: 2, bg: '#3b0f4a', fg: '#ffd23f', sub: 'Featherweight Championship Boxing' });
    const ex = A.x + Math.cos(A.gapAngle) * (A.rout + 0.3), ez = A.z + Math.sin(A.gapAngle) * (A.rout + 0.3);
    archSign.position.set(ex, A.wall + 1.4, ez); this.scene.add(archSign);
    for (const s of [-1, 1]) this.addBox(ex + s * 6.4, ez, 1.2, 1.2, A.wall + 2.6, 0, { material: concrete });

    // The ring
    const R = RING;
    const apron = this.addBox(R.x, R.z, R.half * 2 + 1, R.half * 2 + 1, R.y, 0x1f2937);
    apron.material = new THREE.MeshStandardMaterial({ map: canvasTex(1024, 128, (ctx, w, h) => {
      ctx.fillStyle = '#14141c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffd23f'; ctx.font = '70px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('THE COOP  ★  FEATHERTON', w / 2, h / 2);
    }), roughness: 0.7 });
    const canvasMat = new THREE.MeshStandardMaterial({ roughness: 0.95, map: canvasTex(1024, 1024, (ctx, w, h) => {
      ctx.fillStyle = '#d6cfbd'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`; ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      ctx.fillStyle = '#9b1222'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 190, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 10; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '110px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COOP', w / 2, h / 2);
      ctx.fillStyle = 'rgba(155,18,34,0.85)'; ctx.font = '48px Bungee, sans-serif';
      ctx.fillText('FEATHERTON', w / 2, 120); ctx.save(); ctx.translate(w / 2, h - 120); ctx.rotate(Math.PI); ctx.fillText('FEATHERTON', 0, 0); ctx.restore();
    }) });
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(R.half * 2 + 0.8, R.half * 2 + 0.8), canvasMat);
    canvas.rotation.x = -Math.PI / 2; canvas.position.set(R.x, R.y + 0.01, R.z); canvas.receiveShadow = true;
    this.scene.add(canvas);
    const postMat = mat(0xd1d5db, { metalness: 0.85, roughness: 0.3 });
    const padCols = [0xb91c1c, 0x1d4ed8, 0xf5f5f5, 0xf5f5f5];
    const corners = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
    corners.forEach(([sx, sz], i) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 12), postMat);
      post.position.set(R.x + sx * R.half, R.y + 0.95, R.z + sz * R.half); post.castShadow = true; this.scene.add(post);
      const pad = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.0, 6, 12), new THREE.MeshPhysicalMaterial({ color: padCols[i], roughness: 0.4, clearcoat: 0.6 }));
      pad.position.set(R.x + sx * (R.half - 0.18), R.y + 1.1, R.z + sz * (R.half - 0.18)); this.scene.add(pad);
    });
    const ropeMat = new THREE.MeshPhysicalMaterial({ color: 0xc81e3a, roughness: 0.35, clearcoat: 0.6 });
    const ropeGeos = [];
    for (const h of [0.55, 1.05, 1.55]) {
      const sides = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
      for (const [[ax, az], [bx, bz]] of sides) {
        const a = new THREE.Vector3(R.x + ax * R.half, R.y + h, R.z + az * R.half), b = new THREE.Vector3(R.x + bx * R.half, R.y + h, R.z + bz * R.half);
        const mid = a.clone().lerp(b, 0.5); mid.y -= 0.07;
        ropeGeos.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 16, 0.04, 6, false));
      }
    }
    const ropes = new THREE.Mesh(mergeGeometries(ropeGeos), ropeMat); ropes.castShadow = true; this.scene.add(ropes);
    this.addBox(R.x, R.z + R.half + 1.2, 2, 1.2, 0.5, 0, { material: texMat('metal', 0x666a70) });

    // Corner stools (brought in between rounds)
    this.stools = [];
    for (const s of [1, -1]) {
      const st = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), mat(s > 0 ? 0xb91c1c : 0x1d4ed8));
      seat.position.y = 0.62; st.add(seat);
      for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62), postMat); const a = k / 3 * Math.PI * 2; leg.position.set(Math.cos(a) * 0.25, 0.31, Math.sin(a) * 0.25); st.add(leg); }
      st.position.set(R.x + s * (R.half - 0.55), R.y, R.z + s * (R.half - 0.55));
      st.visible = false;
      this.scene.add(st); this.stools.push(st);
    }

    // Lighting truss and jumbotron above the ring
    const steelish = mat(0x222428, { metalness: 0.8, roughness: 0.4 });
    const truss = new THREE.Group(); truss.position.set(R.x, 12, R.z); this.scene.add(truss);
    for (const s of [-1, 1]) {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 0.3), steelish); b1.position.z = s * 5.5; truss.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 11), steelish); b2.position.x = s * 5.5; truss.add(b2);
    }
    const canMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xfff4d6, emissiveIntensity: 0.2 });
    this.lamps.push(canMat);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 12), canMat);
      can.position.set(Math.cos(a) * 5.5, -0.35, Math.sin(a) * 5.5); truss.add(can);
    }
    this.jumboTex = canvasTex(1024, 512, () => {});
    const jumbo = new THREE.Group(); jumbo.position.set(R.x, 15.5, R.z); this.scene.add(jumbo);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.jumboTex, toneMapped: false });
    for (let i = 0; i < 4; i++) {
      const sc2 = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), screenMat);
      sc2.position.set(Math.sin(i * Math.PI / 2) * 2.64, 0, Math.cos(i * Math.PI / 2) * 2.64); sc2.rotation.y = i * Math.PI / 2;
      jumbo.add(sc2);
    }
    jumbo.add(new THREE.Mesh(new THREE.BoxGeometry(5.25, 2.8, 5.25), mat(0x111111)));
    this.updateJumbotron(['THE COOP COLISEUM', 'Fight Night in Featherton']);
    this.arenaSpot = new THREE.SpotLight(0xfff6e0, 0, 0, 0.6, 0.45, 2);
    this.arenaSpot.position.set(R.x, 11.6, R.z + 1);
    this.arenaSpot.target.position.set(R.x, R.y, R.z);
    this.arenaSpot.castShadow = this.hi;
    this.arenaSpot.shadow.mapSize.set(1024, 1024);
    this.scene.add(this.arenaSpot, this.arenaSpot.target);

    // Light towers
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const tx = A.x + Math.cos(a) * (A.rout + 3), tz = A.z + Math.sin(a) * (A.rout + 3);
      this.addBox(tx, tz, 0.8, 0.8, 18, 0x4b5563);
      const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff7cc, emissiveIntensity: 0.3 }));
      head.position.set(tx, 18.5, tz); head.lookAt(A.x, 0, A.z); this.scene.add(head);
      this.lamps.push(head.material);
    }

    // Judges' table with three judges
    const jx = R.x - R.half - 3.2;
    this.addBox(jx, R.z, 1.2, 6, 1.0, 0, { material: texMat('wood', 0x3b2414) });
    this.judges = [];
    ['owl', 'pigeon', 'robin'].forEach((sp, i) => {
      const j = makeBird({ species: sp, gloves: false });
      j.root.position.set(jx - 1.3, 0, R.z - 2 + i * 2); j.root.rotation.y = Math.PI / 2;
      j.root.scale.setScalar(0.85);
      this.scene.add(j.root); this.judges.push(j);
    });

    // Referee (a magpie, naturally black and white)
    const ref = makeBird({ species: 'magpie', gloves: false });
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.06), mat(0x111111));
    bow.position.set(0, 1.62, 0.42); ref.rig.add(bow);
    ref.root.position.set(R.x + R.half + 2.5, 0, R.z - 3);
    this.scene.add(ref.root);
    this.referee = ref;
    this.refHome = ref.root.position.clone();

    // Round card bird (shown between rounds)
    const card = makeBird({ species: 'lovebirdLutino', gloves: false });
    card.root.visible = false;
    this.cardSignTex = canvasTex(256, 128, () => {});
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: this.cardSignTex, side: THREE.DoubleSide, toneMapped: false }));
    cs.position.set(0, 3.0, 0.2); card.rig.add(cs);
    this.scene.add(card.root);
    this.cardBird = card;

    // Promoter Pecksworth (a pelican in a top hat)
    const promo = makeBird({ species: 'pelican', gloves: false });
    const hatM = mat(0x111111, { roughness: 0.4 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 24), hatM); brim.position.y = 0.33; promo.head.add(brim);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.44, 24), hatM); top.position.y = 0.56; promo.head.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.08, 24), mat(0xb91c1c)); band.position.y = 0.39; promo.head.add(band);
    promo.root.position.set(R.x + 7, 0, R.z + 6); promo.root.rotation.y = -0.9;
    this.scene.add(promo.root);
    this.promoter = promo;
    const tag = makeTextSprite('Promoter Pecksworth', { size: 0.9 }); tag.position.set(R.x + 7, 3.5, R.z + 6); this.scene.add(tag);
    this.addInteract('promoter', R.x + 7, R.z + 6, 'Talk to Promoter Pecksworth', 3);

    // Rankings board
    this.rankBoardTex = canvasTex(512, 640, () => {});
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 7.5), new THREE.MeshBasicMaterial({ map: this.rankBoardTex, toneMapped: false }));
    board.position.set(A.x, 7, A.z - A.rin + 0.3);
    this.scene.add(board);
    const boardBack = new THREE.Mesh(new THREE.BoxGeometry(6.4, 7.9, 0.3), mat(0x1f1f1f));
    boardBack.position.set(A.x, 7, A.z - A.rin + 0.1); this.scene.add(boardBack);

    // Camera flashes in the crowd
    const flashTex = canvasTex(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    this.flashes = [];
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true }));
      s.scale.setScalar(1.6); s.visible = false; this.scene.add(s);
      this.flashes.push({ s, t: 0 });
    }
  }

  updateJumbotron(lines) {
    const c = this.jumboTex.image, ctx = c.getContext('2d');
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffd23f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px Bungee, sans-serif'; ctx.fillText(lines[0] || '', c.width / 2, 150);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 60px Nunito, sans-serif';
    ctx.fillText(lines[1] || '', c.width / 2, 300);
    if (lines[2]) { ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 54px Nunito, sans-serif'; ctx.fillText(lines[2], c.width / 2, 410); }
    this.jumboTex.needsUpdate = true;
  }

  setCardSign(text) {
    const c = this.cardSignTex.image, ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, c.width - 10, c.height - 10);
    ctx.fillStyle = '#111'; ctx.font = '52px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    this.cardSignTex.needsUpdate = true;
  }

  updateRankBoard(rankings, playerName) {
    const tex = this.rankBoardTex;
    const c = tex.image; const ctx = c.getContext('2d');
    ctx.fillStyle = '#140b1c'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffd23f'; ctx.font = '44px Bungee, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('RANKINGS', c.width / 2, 60);
    ctx.textAlign = 'left'; ctx.font = 'bold 30px Nunito, sans-serif';
    rankings.forEach((r, i) => {
      const y = 115 + i * 48;
      ctx.fillStyle = r.me ? '#ffb703' : (i === 0 ? '#ffd700' : '#f3e8ff');
      ctx.fillText(i === 0 ? 'C' : String(i), 30, y);
      ctx.fillText(r.me ? playerName : r.name, 90, y);
    });
    tex.needsUpdate = true;
  }

  inGap(ang, gap, half) {
    const d = Math.atan2(Math.sin(ang - gap), Math.cos(ang - gap));
    return Math.abs(d) < half;
  }

  buildCrowd(seats) {
    const count = seats.length;
    const m = new THREE.InstancedMesh(crowdBirdGeometry(), crowdMaterial(), count);
    m.castShadow = false; m.receiveShadow = true;
    const col = new THREE.Color();
    const cols = [0x878a8f, 0xfbf2d6, 0x56b937, 0xe5402a, 0x4c80d4, 0xc81e1e, 0x8b6a4a, 0xf5d41c, 0x8d93a0, 0x26262c, 0xf5f5f3, 0x6cc43c, 0xd7261e, 0xff7fa4, 0x7a4b2a];
    seats.forEach((s, i) => {
      col.set(pick(cols)).offsetHSL(0, 0, rand(-0.05, 0.05));
      m.setColorAt(i, col);
      s.phase = Math.random() * Math.PI * 2; s.spd = rand(5, 9); s.scale = rand(0.75, 0.95);
    });
    this.scene.add(m);
    this.crowd = { seats, mesh: m };
    this.updateCrowd(0);
  }

  updateCrowd(dt) {
    const c = this.crowd; if (!c) return;
    const m4 = this._m4 || (this._m4 = new THREE.Matrix4()), q = this._q || (this._q = new THREE.Quaternion());
    const p = this._p || (this._p = new THREE.Vector3()), s = this._s || (this._s = new THREE.Vector3()), Y = new THREE.Vector3(0, 1, 0);
    const hype = this.crowdHype;
    c.seats.forEach((st, i) => {
      st.phase += dt * st.spd * (0.25 + hype);
      const bob = Math.max(0, Math.sin(st.phase)) * (0.04 + hype * 0.45);
      q.setFromAxisAngle(Y, st.face + Math.sin(st.phase * 0.3) * 0.15);
      p.set(st.x, st.y + bob, st.z); s.setScalar(st.scale);
      m4.compose(p, q, s); c.mesh.setMatrixAt(i, m4);
    });
    c.mesh.instanceMatrix.needsUpdate = true;
    this.crowdHype = Math.max(0, hype - dt * 0.6);
    for (const f of this.flashes || []) {
      if (f.t > 0) { f.t -= dt; if (f.t <= 0) f.s.visible = false; }
      else if (this.flashRate > 0 && Math.random() < this.flashRate * dt * (0.5 + hype)) {
        const st = pick(c.seats);
        f.s.position.set(st.x, st.y + 1.1, st.z); f.s.visible = true; f.t = 0.07;
      }
    }
  }

  buildPark() {
    const P = POND;
    this.mapRects.push({ x: P.x, z: P.z, r: P.r, color: '#3a9bd9' });
    const bed = new THREE.Mesh(new THREE.CircleGeometry(P.r + 0.2, 48), texMat('dirt', 0x5a4a30));
    bed.rotation.x = -Math.PI / 2; bed.position.set(P.x, -0.25, P.z); this.scene.add(bed);
    const water = new THREE.Mesh(new THREE.CircleGeometry(P.r, 64), this.waterMaterial(0x1f5f73));
    water.rotation.x = -Math.PI / 2; water.position.set(P.x, 0.06, P.z); water.receiveShadow = true; this.scene.add(water);
    const shoreG = new THREE.RingGeometry(P.r - 0.1, P.r + 1.4, 64, 2);
    const suv = shoreG.attributes.uv, spp = shoreG.attributes.position;
    for (let i = 0; i < suv.count; i++) suv.setXY(i, spp.getX(i) / 2, spp.getY(i) / 2);
    const shore = new THREE.Mesh(shoreG, texMat('dirt', 0xd8c49a));
    shore.rotation.x = -Math.PI / 2; shore.position.set(P.x, 0.05, P.z); this.scene.add(shore);
    this.colliders.push({ type: 'circle', x: P.x, z: P.z, r: P.r - 0.5, bottom: -5, top: 0.6, water: true });
    for (let i = 0; i < 9; i++) {
      const a = rand(0, Math.PI * 2), r = rand(2, P.r - 1.5);
      const lp = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0.3, Math.PI * 2 - 0.3), mat(0x3f7f2f, { roughness: 0.6, side: THREE.DoubleSide }));
      lp.rotation.x = -Math.PI / 2; lp.rotation.z = rand(0, 6); lp.position.set(P.x + Math.cos(a) * r, 0.08, P.z + Math.sin(a) * r); this.scene.add(lp);
      if (i % 3 === 0) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xf9c6d8)); fl.scale.y = 0.6; fl.position.copy(lp.position).add(new THREE.Vector3(0.1, 0.08, 0)); this.scene.add(fl); }
    }
    const reeds = [];
    for (let i = 0; i < 70; i++) {
      const a = rand(0, Math.PI * 2), r = P.r + rand(-0.6, 0.6), h = rand(1, 2.2);
      const g = new THREE.CylinderGeometry(0.02, 0.03, h, 4); g.rotateZ(rand(-0.15, 0.15)); g.translate(P.x + Math.cos(a) * r, h / 2, P.z + Math.sin(a) * r); reeds.push(g);
      if (i % 4 === 0) { const ct = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 4); ct.translate(P.x + Math.cos(a) * r, h - 0.1, P.z + Math.sin(a) * r); reeds.push(ct); }
    }
    this.scene.add(new THREE.Mesh(mergeGeometries(reeds), mat(0x5a6a2a, { roughness: 0.9 })));
    for (let i = 0; i < 5; i++) {
      const d = makeSmallBird('mallard', 1.6);
      this.scene.add(d.root);
      this.ducks.push({ sb: d, a: rand(0, Math.PI * 2), r: rand(3, P.r - 2), spd: rand(0.12, 0.25) * (Math.random() < 0.5 ? 1 : -1) });
    }
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.5;
      this.addBench(P.x + Math.cos(a) * (P.r + 3), P.z + Math.sin(a) * (P.r + 3), -a - Math.PI / 2);
    }
    const sign = makeSign('PUDDLE PARK', { w: 4, h: 1, bg: '#1b4332', fg: '#d8f3dc' });
    sign.position.set(P.x - 12, 1.3, P.z + 8); sign.rotation.y = -0.6; this.scene.add(sign);
  }

  buildTower() {
    const { x, z } = TOWER;
    this.mapRects.push({ x, z, w: 6, d: 6, color: '#7a5230' });
    const steps = [[0, 6, 1.3], [5, 3, 2.6], [5, -3, 3.9], [0, -6, 5.2], [-5, -3, 6.5], [-5, 3, 7.8], [0, 0, 10]];
    const rock = texMat('rock', 0xc8bfae);
    steps.forEach(([sx, sz, h], i) => {
      const w = i === steps.length - 1 ? 6 : 3.2;
      this.addBox(x + sx, z + sz, w, w, h, 0, { material: i === steps.length - 1 ? texMat('wood', 0x9a6a3a) : rock, unit: 2.5 });
    });
    const flag = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4), mat(0x333333, { metalness: 0.8 })); flag.position.set(x + 2.5, 12, z + 2.5); this.scene.add(flag);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1, 8, 4), mat(0xffb703, { side: THREE.DoubleSide })); cloth.position.set(x + 3.4, 13.4, z + 2.5); this.scene.add(cloth);
    this.towerFlag = cloth;
    const sign = makeSign('LOOKOUT PERCH', { w: 4, h: 1 });
    sign.position.set(x, 1.6, z + 9); this.scene.add(sign);
  }

  buildHouses() {
    if (!this.glassMat) this.makeGlass();
    const spots = [
      [-25, 40], [-12, 42], [14, 42], [26, 40], [-80, 12], [-70, -10],
      [80, 12], [92, -8], [-20, -32], [22, -30], [-75, 40], [78, 38],
      [20, 62], [-22, 64], [40, 78], [-45, 80], [100, 30], [-100, -20],
    ];
    const wallCols = [0xf4e3b5, 0xe8c8a8, 0xbcd4de, 0xf2c6b8, 0xd8cde8, 0xcfe0c0, 0xf6efe4, 0xe0d0b0];
    const roofCols = [0x6b2a22, 0x2f3e46, 0x4a3b5a, 0x3a3a3a, 0x40553a];
    this.houseRoofs = [];
    spots.forEach(([x, z], i) => {
      const w = rand(7.5, 9), d = rand(6.5, 8), h = rand(4.2, 5);
      const brick = Math.random() < 0.35;
      const wallM = brick ? texMat('brick', 0xffffff) : texMat('siding', pick(wallCols));
      this.addBox(x, z, w, d, h, 0, { material: wallM, mapColor: '#d9a066', unit: brick ? 2.5 : 2.2 });
      this.addBox(x, z, w + 0.3, d + 0.3, 0.45, 0, { material: texMat('concrete', 0x9a958c), collide: false });
      const flat = i < 6;
      if (flat) {
        const roofM = texMat('concrete', 0x77736b);
        this.addBox(x, z, w + 0.3, d + 0.3, 0.3, 0, { y0: h, material: roofM });
        for (const [px, pz, pw, pd] of [[0, d / 2 + 0.1, w + 0.3, 0.2], [0, -d / 2 - 0.1, w + 0.3, 0.2], [w / 2 + 0.1, 0, 0.2, d + 0.3], [-w / 2 - 0.1, 0, 0.2, d + 0.3]]) {
          this.addBox(x + px, z + pz, pw, pd, 0.45, 0, { y0: h + 0.3, material: roofM, collide: false });
        }
        this.houseRoofs.push({ x, z, y: h + 0.3 });
      } else {
        this.addGableRoof(x, z, w, d, h, rand(2.2, 3), texMat('shingles', pick(roofCols)), wallM);
        if (Math.random() < 0.6) this.addBox(x + w * 0.25, z + d * 0.15, 0.8, 0.8, 2.6, 0, { y0: h + 0.5, material: texMat('brick', 0xffffff), collide: false });
      }
      const face = (Math.abs(z - 28) < Math.abs(z) && Math.abs(x) < 62) ? Math.sign(28 - z) : Math.sign(-z || 1);
      const g = new THREE.Group(); this.scene.add(g);
      const fz = z + face * (d / 2 + 0.01), bz = z - face * (d / 2 + 0.01);
      const rotF = face > 0 ? 0 : Math.PI;
      this.addWindow(g, x - w * 0.28, h * 0.55, fz, rotF);
      this.addWindow(g, x + w * 0.28, h * 0.55, fz, rotF);
      this.addWindow(g, x - w * 0.25, h * 0.55, bz, rotF + Math.PI);
      this.addWindow(g, x + w * 0.25, h * 0.55, bz, rotF + Math.PI);
      this.addWindow(g, x + w / 2 + 0.01, h * 0.55, z, Math.PI / 2, 1.1, 1.2);
      this.addWindow(g, x - w / 2 - 0.01, h * 0.55, z, -Math.PI / 2, 1.1, 1.2);
      const door = new THREE.Mesh(boxWorldUV(1.1, 2.2, 0.12, 1), texMat('wood', pick([0x7a3b22, 0x2f4a6a, 0x3a5a3a, 0x6a2a3a])));
      door.position.set(x, 1.15, fz); this.scene.add(door);
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.8), texMat('concrete', 0xb0aaa0));
      step.position.set(x, 0.1, fz + face * 0.4); step.receiveShadow = true; this.scene.add(step);
      if (Math.random() < 0.5) {
        const px = x + w / 2 + 1.4, pz = fz + face * 1.4;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), texMat('wood', 0x6b4423)); pole.position.set(px, 1.2, pz); this.scene.add(pole);
        const bh = new THREE.Mesh(boxWorldUV(0.6, 0.7, 0.6, 0.5), texMat('wood', pick([0xf2c6b8, 0xbcd4de, 0xf4e3b5]))); bh.position.set(px, 2.75, pz); bh.castShadow = true; this.scene.add(bh);
        const br = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 4), texMat('shingles', pick(roofCols))); br.rotation.y = Math.PI / 4; br.position.set(px, 3.3, pz); this.scene.add(br);
      }
    });
  }

  buildTrees() {
    const N = this.hi ? 190 : 120;
    const trunkParts = [new THREE.CylinderGeometry(0.22, 0.38, 3.2, 8).translate(0, 1.6, 0)];
    for (const [a, h] of [[0.6, 2.4], [2.6, 2.7], [4.4, 2.2]]) {
      const b = new THREE.CylinderGeometry(0.06, 0.12, 1.4, 5); b.translate(0, 0.7, 0); b.rotateZ(0.9); b.rotateY(a); b.translate(0, h, 0); trunkParts.push(b);
    }
    const trunkGeo = mergeGeometries(trunkParts.map((g) => (g.index ? g.toNonIndexed() : g)));
    const blobs = [];
    for (const [bx, by, bz, r] of [[0, 4.2, 0, 1.7], [1.1, 3.7, 0.3, 1.2], [-1.0, 3.8, -0.4, 1.25], [0.2, 3.6, 1.1, 1.15], [-0.3, 3.7, -1.1, 1.15], [0.3, 5.0, 0.1, 1.15]]) {
      const s = new THREE.IcosahedronGeometry(r, 2); s.translate(bx, by, bz); blobs.push(s);
    }
    const foliageGeo = mergeGeometries(blobs);
    const fp = foliageGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < fp.count; i++) {
      v.fromBufferAttribute(fp, i);
      const k = 1 + Math.sin(v.x * 3.1 + v.y * 2.3) * Math.cos(v.z * 2.7 - v.y * 1.3) * 0.12;
      fp.setXYZ(i, v.x * k, 3.6 + (v.y - 3.6) * k, v.z * k);
    }
    foliageGeo.computeVertexNormals();
    const pineParts = [];
    for (let k = 0; k < 4; k++) { const c = new THREE.ConeGeometry(1.9 - k * 0.38, 2.4, 10, 1); c.translate(0, 2.2 + k * 1.2, 0); pineParts.push(c.toNonIndexed()); }
    const pineGeo = mergeGeometries(pineParts);

    const barkM = texMat('bark', 0xffffff, { roughness: 1 });
    const leafM = new THREE.MeshStandardMaterial({ map: TEX.leaves(), roughness: 0.9 });
    const trunks = new THREE.InstancedMesh(trunkGeo, barkM, N);
    const leaves = new THREE.InstancedMesh(foliageGeo, leafM, N);
    const pines = new THREE.InstancedMesh(pineGeo, leafM, N);
    trunks.castShadow = leaves.castShadow = pines.castShadow = true;
    leaves.receiveShadow = pines.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    let n = 0, nl = 0, np = 0, tries = 0;
    this.treePositions = [];
    while (n < N && tries < 5000) {
      tries++;
      const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (WORLD_R - 4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.isOnRoad(x, z, 3.5)) continue;
      if (Math.hypot(x, z) < 18) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.rout + 5) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 3) continue;
      if (Math.hypot(x - TOWER.x, z - TOWER.z) < 11) continue;
      if (Math.abs(z - 21.8) < 2.5 && Math.abs(x) < 75) continue;
      if (this.colliders.some((c) => this.overlaps(c, x, z, 3))) continue;
      const sc = rand(0.8, 1.35);
      const pine = Math.random() < 0.3;
      q.setFromAxisAngle(Y, rand(0, 6.28));
      p.set(x, 0, z); s.set(sc, sc * rand(0.9, 1.15), sc);
      m4.compose(p, q, s);
      if (pine) {
        trunks.setMatrixAt(n, new THREE.Matrix4().compose(p, q, s.clone().multiplyScalar(0.55)));
        pines.setMatrixAt(np, m4);
        col.setHSL(rand(0.3, 0.38), rand(0.25, 0.4), rand(0.42, 0.55)); pines.setColorAt(np, col); np++;
      } else {
        trunks.setMatrixAt(n, m4);
        leaves.setMatrixAt(nl, m4);
        col.setHSL(rand(0.18, 0.32), rand(0.2, 0.45), rand(0.65, 0.85));
        if (Math.random() < 0.07) col.setHSL(rand(0.03, 0.1), 0.6, 0.75);
        leaves.setColorAt(nl, col); nl++;
      }
      this.colliders.push({ type: 'circle', x, z, r: 0.45 * sc, bottom: 0, top: 3.2 * sc });
      this.treePositions.push({ x, z, s: sc });
      n++;
    }
    trunks.count = n; leaves.count = nl; pines.count = np;
    this.scene.add(trunks, leaves, pines);
  }

  buildGrass() {
    const N = this.hi ? 9000 : 3000;
    const quads = [];
    for (let k = 0; k < 3; k++) {
      const g = new THREE.PlaneGeometry(1.1, 0.65); g.translate(0, 0.32, 0); g.rotateY(k * Math.PI / 3); quads.push(g);
    }
    const geo = mergeGeometries(quads);
    const m = new THREE.MeshStandardMaterial({ map: TEX.grassBlades(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
    const wind = this.wind;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uWind = wind;
      sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hf = clamp(position.y / 0.65, 0.0, 1.0);
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sway = sin(uWind * 1.7 + ip.x * 0.31 + ip.z * 0.23) * 0.13 + sin(uWind * 3.3 + ip.x * 1.7) * 0.04;
        transformed.x += sway * hf * hf;
        transformed.z += sway * 0.5 * hf * hf;`);
    };
    const inst = new THREE.InstancedMesh(geo, m, N);
    inst.receiveShadow = true;
    const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshStandardMaterial({ roughness: 0.6 }), Math.floor(N / 12));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    let n = 0, nf = 0, tries = 0;
    const fcols = [0xffffff, 0xfff176, 0xce93d8, 0xff8a80, 0x90caf9];
    while (n < N && tries < N * 4) {
      tries++;
      const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (WORLD_R + 4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.isOnRoad(x, z, 2.6) || Math.hypot(x, z) < 16) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.rout + 1) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.5) continue;
      if (this.colliders.some((c) => c.type === 'box' && c.bottom < 0.5 && this.overlaps(c, x, z, 0.4))) continue;
      q.setFromAxisAngle(Y, rand(0, 6.28)); p.set(x, 0, z); const k = rand(0.7, 1.4); s.set(k, k * rand(0.8, 1.3), k);
      m4.compose(p, q, s); inst.setMatrixAt(n++, m4);
      if (nf < flowers.count && Math.random() < 0.08) {
        p.set(x + rand(-0.3, 0.3), rand(0.3, 0.5), z + rand(-0.3, 0.3)); s.setScalar(1);
        m4.compose(p, q, s); flowers.setMatrixAt(nf, m4); col.set(pick(fcols)); flowers.setColorAt(nf, col); nf++;
      }
    }
    inst.count = n; flowers.count = nf;
    this.scene.add(inst, flowers);
  }

  buildLamps() {
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0 });
    this.lamps.push(bulbMat);
    const iron = mat(0x23262c, { metalness: 0.7, roughness: 0.45 });
    const pts = [];
    for (let t = -100; t <= 100; t += 20) { pts.push([t, 6.6]); pts.push([t, -6.6]); }
    for (let t = 15; t <= 100; t += 20) { pts.push([6.6, t]); pts.push([-6.6, t]); }
    const parts = [], bulbs = [];
    for (const [x, z] of pts) {
      if (Math.hypot(x, z) < 16) continue;
      const side = Math.abs(x) === 6.6 && Math.abs(z) !== 6.6;
      const dirx = side ? -Math.sign(x) : 0, dirz = side ? 0 : -Math.sign(z);
      parts.push(new THREE.CylinderGeometry(0.08, 0.13, 5, 8).translate(x, 2.5, z).toNonIndexed());
      const arm = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6); arm.rotateZ(Math.PI / 2); if (dirz) arm.rotateY(Math.PI / 2);
      arm.translate(x + dirx * 0.6, 5, z + dirz * 0.6); parts.push(arm.toNonIndexed());
      const head = new THREE.CylinderGeometry(0.22, 0.35, 0.25, 12); head.translate(x + dirx * 1.15, 4.92, z + dirz * 1.15); parts.push(head.toNonIndexed());
      bulbs.push(new THREE.SphereGeometry(0.2, 10, 8).translate(x + dirx * 1.15, 4.75, z + dirz * 1.15));
      this.colliders.push({ type: 'circle', x, z, r: 0.2, bottom: 0, top: 5 });
      this.lampPositions.push(new THREE.Vector3(x + dirx * 1.15, 4.5, z + dirz * 1.15));
    }
    const poles = new THREE.Mesh(mergeGeometries(parts), iron);
    poles.castShadow = true; this.scene.add(poles);
    this.scene.add(new THREE.Mesh(mergeGeometries(bulbs), bulbMat));
    this.lampLights = [];
    for (let i = 0; i < (this.hi ? 6 : 3); i++) {
      const l = new THREE.PointLight(0xffc98a, 0, 24, 2);
      this.scene.add(l); this.lampLights.push(l);
    }
    this.lampAssignT = 0;
  }

  buildPowerLines() {
    const z0 = 21.8, wood = texMat('bark', 0xb89a7a);
    const xs = []; for (let x = -70; x <= 70; x += 20) xs.push(x);
    const poleParts = [];
    for (const x of xs) {
      poleParts.push(new THREE.CylinderGeometry(0.12, 0.17, 8.2, 8).translate(x, 4.1, z0).toNonIndexed());
      poleParts.push(new THREE.BoxGeometry(0.16, 0.16, 2.4).translate(x, 7.7, z0).toNonIndexed());
      this.colliders.push({ type: 'circle', x, z: z0, r: 0.25, bottom: 0, top: 8.2 });
    }
    const poles = new THREE.Mesh(mergeGeometries(poleParts), wood);
    poles.castShadow = true; this.scene.add(poles);
    const wires = [];
    this.wires = [];
    for (let i = 0; i < xs.length - 1; i++) {
      for (const dz of [-1, 0, 1]) {
        const a = new THREE.Vector3(xs[i], 7.85, z0 + dz), b = new THREE.Vector3(xs[i + 1], 7.85, z0 + dz);
        const mid = a.clone().lerp(b, 0.5); mid.y -= 0.9;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        wires.push(new THREE.TubeGeometry(curve, 20, 0.022, 4, false));
        this.wires.push(curve);
      }
    }
    this.scene.add(new THREE.Mesh(mergeGeometries(wires), mat(0x1a1a1a, { roughness: 0.6 })));
    const species = ['lovebirdPeach', 'lovebirdPeach', 'cockatielGrey', 'cockatielLutino', 'pigeon', 'sparrow', 'goldfinch', 'budgie'];
    const count = this.hi ? 22 : 12;
    for (let i = 0; i < count; i++) {
      const curve = pick(this.wires);
      const pt = curve.getPoint(rand(0.12, 0.88));
      const sb = makeSmallBird(pick(species), 1.15);
      sb.root.position.copy(pt).add(new THREE.Vector3(0, -0.06, 0));
      sb.root.rotation.y = Math.random() < 0.5 ? 0 : Math.PI;
      this.scene.add(sb.root);
      this.perchers.push({ sb, home: sb.root.position.clone(), homeYaw: sb.root.rotation.y, state: 'perch', t: rand(0, 3), vel: new THREE.Vector3(), phase: rand(0, 6) });
    }
  }

  buildClouds() {
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.88, emissive: 0x8899aa, emissiveIntensity: 0.15 });
    for (let i = 0; i < 16; i++) {
      const parts = [];
      for (let k = 0; k < 7; k++) {
        const s = new THREE.IcosahedronGeometry(rand(3, 6.5), 2); s.translate(rand(-9, 9), rand(-1, 2.5), rand(-4, 4)); s.scale(1, 0.62, 1); parts.push(s);
      }
      const g = new THREE.Mesh(mergeGeometries(parts), cm);
      g.position.set(rand(-220, 220), rand(65, 95), rand(-220, 220));
      g.userData.spd = rand(1, 3);
      this.scene.add(g); this.clouds.push(g);
    }
  }

  buildFlocks() {
    const kinds = ['pigeon', 'gull', 'lovebirdPeach', 'cockatielGrey', 'sparrow', 'lovebirdPeach'];
    for (let f = 0; f < (this.hi ? 6 : 4); f++) {
      const species = kinds[f % kinds.length];
      const members = [];
      const n = 5 + Math.floor(Math.random() * (this.hi ? 6 : 3));
      for (let i = 0; i < n; i++) {
        const sb = makeSmallBird(species, species === 'gull' ? 2.2 : 1.7);
        sb.root.traverse((o) => { o.castShadow = false; });
        this.scene.add(sb.root);
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        members.push({ sb, off: new THREE.Vector3(side * row * 1.9 + rand(-0.4, 0.4), rand(-0.6, 0.6), -row * 1.9 + rand(-0.4, 0.4)), phase: rand(0, 6), cycle: rand(0, 3) });
      }
      this.flocks.push({ members, species, cx: rand(-60, 60), cz: rand(-50, 70), r: rand(40, 90), h: rand(20, 40), a: rand(0, 6), spd: rand(0.05, 0.1) * (Math.random() < 0.5 ? 1 : -1) });
    }
  }

  buildPigeons() {
    const spots = [[0, 0, 13], [POND.x, POND.z, POND.r + 4], [0, 28, 6], [-45, -20, 5], [HOME.x - 14, HOME.z - 7, 2]];
    const n = this.hi ? 30 : 18;
    for (let i = 0; i < n; i++) {
      const [cx, cz, rr] = spots[i % spots.length];
      const a = rand(0, Math.PI * 2), r = rr + rand(-1.5, 2.5);
      const sb = makeSmallBird(pick(['pigeon', 'pigeon', 'sparrow', 'pigeon']), 1.1);
      const hx = cx + Math.cos(a) * r, hz = cz + Math.sin(a) * r;
      const home = new THREE.Vector3(hx, Math.hypot(hx, hz) < 15 ? 0.14 : 0.0, hz);
      sb.root.position.copy(home); sb.root.rotation.y = rand(0, 6);
      this.scene.add(sb.root);
      this.pigeons.push({ sb, home, state: 'peck', t: rand(0, 3), vel: new THREE.Vector3(), phase: rand(0, 6) });
    }
  }

  // ---------- NPC townsfolk ----------
  buildNPCs() {
    const names = [...NPC_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < (this.hi ? 16 : 11); i++) {
      const species = NPC_SPECIES[i % NPC_SPECIES.length];
      const bird = makeBird({ species, gloves: false });
      bird.root.scale.setScalar(rand(0.78, 0.95));
      bird.root.position.copy(this.randomWalkablePoint());
      this.scene.add(bird.root);
      this.npcs.push({ bird, species, name: names[i % names.length], target: this.randomWalkablePoint(), wait: rand(0, 3), challenger: null, bubble: null, bubbleT: 0, talkCd: rand(2, 8) });
    }
  }

  refreshChallengers(avgStat, beaten = [], spread = [-6, 6]) {
    const names = [...CHALLENGER_NAMES];
    for (const n of this.npcs) {
      if (n.marker) { n.bird.root.remove(n.marker); n.marker = null; }
      n.challenger = null;
    }
    const pool = [...this.npcs].sort(() => Math.random() - 0.5).slice(0, 5);
    pool.forEach((n, i) => {
      const name = names[i % names.length];
      if (beaten.includes(name)) return;
      const lvl = Math.max(5, Math.round(avgStat + rand(spread[0], spread[1])));
      n.challenger = { name, lvl, purse: 35 + Math.round(lvl * 2.4), style: pick(['balanced', 'brawler', 'speedster', 'tank']) };
      const mk = makeTextSprite('!', { color: '#2a1600', bg: '#ffb703', border: '#fff', size: 1.4 });
      mk.position.set(0, 3.3, 0);
      n.bird.root.add(mk); n.marker = mk;
    });
  }

  randomWalkablePoint() {
    for (let i = 0; i < 60; i++) {
      const p = new THREE.Vector3(rand(-95, 95), 0, rand(-55, 95));
      if (Math.hypot(p.x - ARENA.x, p.z - ARENA.z) < ARENA.rout + 3) continue;
      if (this.colliders.some((c) => this.overlaps(c, p.x, p.z, 1.2))) continue;
      return p;
    }
    return new THREE.Vector3(rand(-10, 10), 0, rand(15, 25));
  }

  // ---------- collision ----------
  overlaps(c, x, z, pad = 0) {
    if (c.type === 'box') return x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad;
    if (c.type === 'circle') return Math.hypot(x - c.x, z - c.z) < c.r + pad;
    if (c.type === 'annulus') {
      const r = Math.hypot(x - c.x, z - c.z);
      if (r < c.rin - pad || r > c.rout + pad) return false;
      return !this.inGap(Math.atan2(z - c.z, x - c.x), c.gap, c.gapHalf);
    }
    return false;
  }

  groundAt(x, z, feetY, radius = 0.35) {
    let h = 0;
    for (const c of this.colliders) {
      if (c.water) continue;
      if (c.top > h && c.top <= feetY + 0.6 && this.overlaps(c, x, z, radius * 0.5)) h = c.top;
    }
    return h;
  }

  ceiling(pos, vel, height = 2.2) {
    for (const c of this.colliders) {
      if (c.type !== 'box' || c.bottom < 0.5) continue;
      if (pos.y < c.bottom && pos.y + height > c.bottom && this.overlaps(c, pos.x, pos.z, -0.3)) {
        pos.y = c.bottom - height;
        if (vel.y > 0) vel.y = 0;
      }
    }
  }

  resolve(pos, radius = 0.45, height = 2.2) {
    let hit = false;
    for (const c of this.colliders) {
      if (pos.y >= c.top - 0.55 || pos.y + height <= c.bottom) continue;
      if (c.type === 'box') {
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - cx, dz = pos.z - cz;
        const d = Math.hypot(dx, dz);
        if (d < radius) {
          hit = true;
          if (d > 1e-5) { pos.x = cx + dx / d * radius; pos.z = cz + dz / d * radius; }
          else {
            const pushes = [[c.minX - radius - pos.x, 0], [c.maxX + radius - pos.x, 0], [0, c.minZ - radius - pos.z], [0, c.maxZ + radius - pos.z]];
            pushes.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
            pos.x += pushes[0][0]; pos.z += pushes[0][1];
          }
        }
      } else if (c.type === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + radius;
        if (d < min) { hit = true; const k = d > 1e-5 ? min / d : 0; pos.x = c.x + (d > 1e-5 ? dx * k : min); pos.z = c.z + (d > 1e-5 ? dz * k : 0); }
      } else if (c.type === 'annulus') {
        const dx = pos.x - c.x, dz = pos.z - c.z, r = Math.hypot(dx, dz);
        const ang = Math.atan2(dz, dx);
        if (r > c.rin - radius && r < c.rout + radius) {
          if (this.inGap(ang, c.gap, c.gapHalf)) {
            const edgeA = c.gap + (Math.atan2(Math.sin(ang - c.gap), Math.cos(ang - c.gap)) > 0 ? c.gapHalf : -c.gapHalf);
            const ex = Math.cos(edgeA), ez = Math.sin(edgeA);
            const al = dx * ex + dz * ez;
            const perpX = dx - ex * al, perpZ = dz - ez * al;
            const pd = Math.hypot(perpX, perpZ);
            if (pd < radius && al > c.rin - 0.5 && al < c.rout + 0.5) {
              hit = true;
              const k = (radius - pd) / Math.max(pd, 1e-4);
              pos.x += perpX * k; pos.z += perpZ * k;
            }
            continue;
          }
          hit = true;
          const target = (r - c.rin < c.rout - r) ? c.rin - radius : c.rout + radius;
          pos.x = c.x + dx / r * target; pos.z = c.z + dz / r * target;
        }
      }
    }
    return hit;
  }

  // ---------- per-frame ----------
  update(dt, playerPos, timeMinutes, camera, scarePos = playerPos) {
    this.time += dt;
    this.wind.value = this.time;
    this.updateSky(timeMinutes, playerPos, camera, dt);
    for (const m of this.waterMats) { m.normalMap.offset.x += dt * 0.012; m.normalMap.offset.y += dt * 0.008; }

    for (const cl of this.clouds) {
      cl.position.x += cl.userData.spd * dt;
      if (cl.position.x > 240) cl.position.x = -240;
    }
    for (const f of this.flocks) {
      f.a += f.spd * dt;
      const cx = f.cx + Math.cos(f.a) * f.r, cz = f.cz + Math.sin(f.a) * f.r;
      const dirx = -Math.sin(f.a) * Math.sign(f.spd), dirz = Math.cos(f.a) * Math.sign(f.spd);
      const yaw = Math.atan2(dirx, dirz);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const fy = f.h + Math.sin(this.time * 0.3 + f.cx) * 3;
      for (const m of f.members) {
        m.cycle += dt;
        const flapping = (m.cycle % 3.2) < 1.8;
        m.phase += dt * (flapping ? 11 : 0);
        if (flapping) flapWings(m.sb, m.phase, 0.85);
        else { m.sb.wingL.rotation.set(0, 0, -0.12); m.sb.wingR.rotation.set(0, 0, 0.12); }
        m.sb.root.position.set(cx + m.off.x * cy + m.off.z * sy, fy + m.off.y + Math.sin(m.phase * 0.25) * 0.25, cz - m.off.x * sy + m.off.z * cy);
        m.sb.root.rotation.set(flapping ? -0.05 : 0.08, yaw, -Math.sign(f.spd) * 0.28);
      }
    }
    for (const d of this.ducks) {
      d.a += d.spd * dt;
      d.sb.root.position.set(POND.x + Math.cos(d.a) * d.r, -0.08 + Math.sin(this.time * 2 + d.r) * 0.025, POND.z + Math.sin(d.a) * d.r);
      d.sb.root.rotation.y = Math.atan2(-Math.sin(d.a) * Math.sign(d.spd), Math.cos(d.a) * Math.sign(d.spd));
    }
    this.updatePigeons(dt, scarePos);
    this.updatePerchers(dt, scarePos);
    if (this.towerFlag) {
      const pos = this.towerFlag.geometry.attributes.position;
      if (!this.flagBase) this.flagBase = pos.array.slice();
      for (let i = 0; i < pos.count; i++) {
        const x0 = this.flagBase[i * 3];
        pos.setZ(i, Math.sin(this.time * 5 + x0 * 3) * 0.15 * (x0 + 0.9));
      }
      pos.needsUpdate = true;
    }
    for (const b of [this.coach, this.promoter, this.keeper, ...(this.judges || [])]) if (b) { b.walk(dt, 0); b.update(dt); }
    for (const b of [this.referee, this.cardBird]) if (b && !b.driven) { b.walk(dt, 0); b.update(dt); }

    for (const k of ['heavy', 'speed']) {
      const s = this.stations[k];
      s.swingV += (-s.swing * 30 - s.swingV * (k === 'speed' ? 6 : 2.5)) * dt;
      s.swing += s.swingV * dt;
      s.pivot.rotation.x = s.swing;
    }
    const dg = this.stations.dodge;
    dg.arm.rotation.y += ((dg.swing ?? 1.3) - dg.arm.rotation.y) * Math.min(1, dt * 12);
    if (this.crowd) this.updateCrowd(dt);

    for (const f of this.feathers) {
      if (f.taken) continue;
      f.mesh.rotation.y += dt * 2;
      f.mesh.position.y = f.y + Math.sin(this.time * 2 + f.x) * 0.2;
    }
  }

  updateNPCs(dt, playerPos, frozen = false) {
    for (const n of this.npcs) {
      const b = n.bird, p = b.root.position;
      if (!b.root.visible) continue;
      const toPlayer = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (frozen || (n.challenger && toPlayer < 5)) {
        if (n.challenger && toPlayer < 8 && !frozen) {
          const yaw = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
          b.root.rotation.y = lerpAngle(b.root.rotation.y, yaw, dt * 6);
        }
        b.walk(dt, 0); b.update(dt);
        this.updateBubble(n, dt, toPlayer);
        continue;
      }
      if (n.wait > 0) {
        n.wait -= dt; b.walk(dt, 0);
      } else {
        const dx = n.target.x - p.x, dz = n.target.z - p.z, d = Math.hypot(dx, dz);
        if (d < 1) { n.wait = rand(1, 5); n.target = this.randomWalkablePoint(); }
        else {
          const sp = 2.2;
          const bx = p.x, bz = p.z;
          p.x += dx / d * sp * dt; p.z += dz / d * sp * dt;
          if (this.resolve(p, 0.5)) {
            n.stuck = (n.stuck || 0) + dt;
            if (n.stuck > 1.2) { n.stuck = 0; n.target = this.randomWalkablePoint(); }
          }
          const moved = Math.hypot(p.x - bx, p.z - bz) / Math.max(dt, 1e-4);
          b.root.rotation.y = lerpAngle(b.root.rotation.y, Math.atan2(dx, dz), dt * 6);
          b.walk(dt, moved);
        }
      }
      b.update(dt);
      this.updateBubble(n, dt, toPlayer);
    }
  }

  updateBubble(n, dt, toPlayer) {
    n.talkCd -= dt;
    if (n.bubble) {
      n.bubbleT -= dt;
      if (n.bubbleT <= 0) { n.bird.root.remove(n.bubble); n.bubble = null; }
    } else if (toPlayer < 6 && n.talkCd <= 0) {
      const text = n.challenger ? pick(['Hey! Wanna go a round?', 'Put \'em up, rookie!', 'Fight me for millet!']) : pick(BANTER);
      n.bubble = makeTextSprite(text, { size: 0.75, border: n.challenger ? '#ff4d4d' : '#ffb703' });
      n.bubble.position.set(0, n.challenger ? 4.3 : 3.2, 0);
      n.bird.root.add(n.bubble);
      n.bubbleT = 3; n.talkCd = rand(8, 14);
    }
  }

  updatePigeons(dt, playerPos) {
    for (const pg of this.pigeons) {
      const r = pg.sb.root;
      if (pg.state === 'peck') {
        pg.t -= dt;
        r.rotation.x = Math.max(0, Math.sin(this.time * 8 + pg.phase)) * 0.45;
        if (pg.t < 0) { pg.t = rand(1, 4); r.rotation.y += rand(-1.5, 1.5); }
        const d = Math.hypot(playerPos.x - r.position.x, playerPos.z - r.position.z);
        if (d < 3.5 && playerPos.y < 3) {
          pg.state = 'fly'; pg.t = rand(3, 5);
          const ax = r.position.x - playerPos.x, az = r.position.z - playerPos.z, al = Math.hypot(ax, az) || 1;
          pg.vel.set(ax / al * 6 + rand(-2, 2), rand(5, 7), az / al * 6 + rand(-2, 2));
          r.rotation.set(-0.3, Math.atan2(pg.vel.x, pg.vel.z), 0);
          this.onPigeonScatter && this.onPigeonScatter();
        }
      } else if (pg.state === 'fly') {
        pg.t -= dt; pg.phase += dt * 22;
        flapWings(pg.sb, pg.phase, 1.0);
        r.position.addScaledVector(pg.vel, dt);
        pg.vel.y = Math.max(0.5, pg.vel.y - dt * 1.5);
        if (pg.t < 0) pg.state = 'land';
      } else if (pg.state === 'land') {
        if (this.flyHome(pg, dt)) { pg.state = 'peck'; foldWings(pg.sb); }
      }
    }
  }

  // Returns true once the bird is back home.
  flyHome(b, dt) {
    const r = b.sb.root;
    b.phase += dt * 16; flapWings(b.sb, b.phase, 0.8);
    const to = new THREE.Vector3(b.home.x - r.position.x, b.home.y - r.position.y, b.home.z - r.position.z);
    const d = to.length();
    if (d < 0.25) { r.position.copy(b.home); r.rotation.set(0, b.homeYaw ?? r.rotation.y, 0); return true; }
    to.normalize().multiplyScalar(Math.min(d, 9 * dt));
    r.position.add(to);
    r.rotation.set(0, Math.atan2(b.home.x - r.position.x, b.home.z - r.position.z), 0);
    return false;
  }

  updatePerchers(dt, playerPos) {
    const head = new THREE.Vector3(playerPos.x, playerPos.y + 1.2, playerPos.z);
    for (const b of this.perchers) {
      const r = b.sb.root;
      if (b.state === 'perch') {
        b.t -= dt;
        if (b.t < 0) { b.t = rand(0.5, 3); b.look = rand(-0.4, 0.4); }
        r.rotation.z = Math.sin(this.time * 1.3 + b.phase) * 0.04;
        r.rotation.x = (b.look || 0) * 0.3;
        if (r.position.distanceTo(head) < 4.5) {
          b.state = 'fly'; b.t = rand(4, 7);
          b.vel.set(rand(-6, 6), rand(3, 5), rand(-6, 6));
          r.rotation.set(0, Math.atan2(b.vel.x, b.vel.z), 0);
        }
      } else if (b.state === 'fly') {
        b.t -= dt; b.phase += dt * 20;
        flapWings(b.sb, b.phase, 1.0);
        b.vel.x += Math.sin(this.time + b.phase) * dt * 4;
        r.position.addScaledVector(b.vel, dt);
        b.vel.y = Math.max(-0.5, b.vel.y - dt * 1.2);
        r.rotation.y = Math.atan2(b.vel.x, b.vel.z);
        if (b.t < 0) b.state = 'land';
      } else if (this.flyHome(b, dt)) { b.state = 'perch'; foldWings(b.sb); }
    }
  }

  placeFeathers(taken = []) {
    const spots = [];
    for (const h of this.houseRoofs.slice(0, 6)) spots.push([h.x, h.y + 0.9, h.z]);
    spots.push([GYM.x, 5.5 + 0.9, GYM.z]);
    spots.push([SHOP.x, 5.4 + 0.9, SHOP.z]);
    spots.push([TOWER.x, 10.9, TOWER.z]);
    spots.push([HOME.x + 9.5, 2.4, HOME.z]);
    spots.push([POND.x + POND.r + 2, 1, POND.z], [-110, 1, 0], [110, 1, 0], [0, 1, 110], [70, 1, 70], [-70, 1, 70]);
    spots.push([60, 1, -80], [-60, 1, -85], [RING.x, RING.y + 1, RING.z - 3], [-100, 1, 60]);
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.7);
    shape.quadraticCurveTo(0.32, -0.2, 0.18, 0.55);
    shape.quadraticCurveTo(0.05, 0.75, 0, 0.8);
    shape.quadraticCurveTo(-0.22, 0.4, -0.16, -0.2);
    shape.quadraticCurveTo(-0.1, -0.5, 0, -0.7);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    geo.center();
    const fm = new THREE.MeshPhysicalMaterial({ color: 0xffcf40, emissive: 0xffa500, emissiveIntensity: 0.35, metalness: 0.9, roughness: 0.25, clearcoat: 0.5 });
    const glowTex = canvasTex(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,220,120,0.9)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
    spots.slice(0, 20).forEach(([x, y, z], i) => {
      const mesh = new THREE.Mesh(geo, fm);
      mesh.position.set(x, y, z); mesh.rotation.z = 0.3;
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      glow.scale.setScalar(2.2); mesh.add(glow);
      this.scene.add(mesh);
      const f = { id: i, mesh, x, y, z, taken: taken.includes(i) };
      mesh.visible = !f.taken;
      this.feathers.push(f);
    });
  }

  updateSky(t, playerPos, camera, dt = 1 / 60) {
    const hour = (t / 60) % 24;
    const dayAng = (hour - 6) / 12 * Math.PI;
    const elev = Math.sin(dayAng);
    const sunDir = new THREE.Vector3(Math.cos(dayAng), elev, 0.35).normalize();
    this.sky.material.uniforms.sunPosition.value.copy(sunDir);
    if (camera) { this.sky.position.copy(camera.position); this.stars.position.copy(camera.position); }
    // Re-light the scene from the sky when the sun has moved noticeably.
    if (Math.abs(dayAng - this.lastEnvSun) > 0.03) {
      this.lastEnvSun = dayAng;
      this.envSky.material.uniforms.sunPosition.value.copy(sunDir);
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) this.envSky.material.uniforms[k].value = this.sky.material.uniforms[k].value;
      const rt = this.pmrem.fromScene(this.envScene, 0.02);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
    }
    const lightDir = new THREE.Vector3(Math.cos(dayAng), Math.max(0.08, elev), 0.35).normalize();
    this.sun.position.copy(playerPos).addScaledVector(lightDir, 90);
    this.sun.target.position.copy(playerPos);
    const day = THREE.MathUtils.clamp(elev * 3 + 0.25, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(elev) * 4, 0, 1);
    this.sun.intensity = elev > -0.05 ? 3.2 * THREE.MathUtils.clamp(elev * 2.5 + 0.1, 0, 1) : 0;
    this.sun.color.set(0xfff4e0).lerp(new THREE.Color(0xff9a5a), dusk * 0.7);
    const night = 1 - day;
    this.moon.intensity = night * 0.35;
    this.moon.position.copy(playerPos).add(new THREE.Vector3(-Math.cos(dayAng) * 80, 60, -30));
    this.moon.target.position.copy(playerPos);
    this.moonBall.position.copy(playerPos).addScaledVector(new THREE.Vector3(-Math.cos(dayAng), Math.max(0.15, -elev), -0.3).normalize(), 400);
    this.moonBall.visible = night > 0.3;
    this.hemi.intensity = 0.15 + day * 0.45;
    this.hemi.color.set(0xcfe3ff).lerp(new THREE.Color(0x30406a), night);
    const fog = new THREE.Color(0x0c1220).lerp(new THREE.Color(0xc4d6e4), day);
    fog.lerp(new THREE.Color(0xe0a080), dusk * 0.45);
    this.scene.fog.color.copy(fog);
    this.stars.material.opacity = THREE.MathUtils.clamp(night * 1.3 - 0.3, 0, 1);
    for (const m of this.lamps) m.emissiveIntensity = 0.05 + night * 2.2;
    this.night = night;
    this.day = day;
    // Street lights near the player at night
    this.lampAssignT -= dt;
    if (this.lampAssignT <= 0 && this.lampLights) {
      this.lampAssignT = 0.5;
      const sorted = this.lampPositions.map((p) => [p, p.distanceToSquared(playerPos)]).sort((a, b) => a[1] - b[1]);
      this.lampLights.forEach((l, i) => { if (sorted[i]) l.position.copy(sorted[i][0]); });
    }
    if (this.lampLights) for (const l of this.lampLights) l.intensity = night > 0.4 ? 45 * night : 0;
  }
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * Math.min(1, t);
}
