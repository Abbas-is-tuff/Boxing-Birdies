import * as THREE from 'three';
import { makeBird, makeSmallBird, flapWings, mat, PALETTES } from './bird.js';

export const ARENA = { x: 0, z: -80, rin: 22, rout: 30, wall: 9, gapAngle: Math.PI / 2, gapHalf: 0.2 };
export const RING = { x: 0, z: -80, half: 4.5, y: 1.0 };
export const GYM = { x: 48, z: 40 };
export const HOME = { x: -48, z: 42 };
export const SHOP = { x: -45, z: -30 };
export const POND = { x: 58, z: -36, r: 9 };
export const TOWER = { x: -92, z: -58 };
export const WORLD_R = 132;

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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  return m;
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
  const r = 26;
  ctx.beginPath(); ctx.roundRect(3, 3, c.width - 6, c.height - 6, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 3);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: true }));
  sp.scale.set(c.width / c.height * 0.55 * size, 0.55 * size, 1);
  return sp;
}

const NPC_NAMES = ['Chirpy', 'Beaky Joe', 'Sparrowina', 'Wrenford', 'Tweetsy', 'Finchley', 'Bluebell', 'Pip', 'Quill', 'Nuthatch Ned', 'Starla', 'Dodo Doug', 'Kiwi Kai', 'Lark', 'Puffin Polly', 'Magpie Max', 'Jaybird Jules', 'Cuckoo Carl'];
const CHALLENGER_NAMES = ['Scrappy Sparrow', 'Brawlin\' Bluejay', 'Pigeon Pacquito', 'Mad Mockingbird', 'Knuckles Kingfisher', 'Woody Woodpunch', 'Starling Sting', 'Grackle Smackle'];
const BANTER = ['Nice gloves!', 'Tweet tweet!', 'Saw your last fight!', 'Float like a feather...', '...sting like a beak!', 'Train hard, fly high!', 'Got any seeds?', 'Champ in the making!', 'The Coop is packed tonight!', 'Coach Gizzard is tough but fair.', 'Find the golden feathers!', 'Try flapping in mid-air!'];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.interactables = [];
    this.npcs = [];
    this.pigeons = [];
    this.flocks = [];
    this.ducks = [];
    this.feathers = [];
    this.lamps = [];
    this.clouds = [];
    this.mapRects = [];
    this.stations = {};
    this.time = 0;
    this.crowdHype = 0;

    this.buildLights();
    this.buildGround();
    this.buildPlaza();
    this.buildHome();
    this.buildGym();
    this.buildShop();
    this.buildArena();
    this.buildPark();
    this.buildTower();
    this.buildHouses();
    this.buildTrees();
    this.buildLamps();
    this.buildClouds();
    this.buildFlocks();
    this.buildPigeons();
    this.buildNPCs();
  }

  // ---------- helpers ----------
  addBox(x, z, w, d, h, color, { y0 = 0, collide = true, shadow = true, mapColor = null } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
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

  // ---------- lighting / sky ----------
  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4d6b3a, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera; s.left = -45; s.right = 45; s.top = 45; s.bottom = -45; s.near = 1; s.far = 200;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);
    this.scene.fog = new THREE.Fog(0x9fd8ff, 90, 260);
    this.scene.background = new THREE.Color(0x9fd8ff);
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }));
    this.sunBall = sunBall; this.scene.add(sunBall);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe8f0ff, fog: false }));
    this.moonBall = moon; this.scene.add(moon);
  }

  buildGround() {
    const size = 420, seg = 105;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z);
      let y = 0;
      if (r > WORLD_R + 6) {
        const t = r - (WORLD_R + 6);
        y = t * 0.9 + Math.sin(x * 0.07) * Math.cos(z * 0.06) * t * 0.35 + Math.sin(Math.atan2(z, x) * 7) * t * 0.25;
      }
      pos.setY(i, y);
      const n = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 + Math.random() * 0.25;
      if (y > 25) c.setHSL(0.3, 0.12, 0.55 + n * 0.1);
      else c.setHSL(0.27 + n * 0.04, 0.45, 0.38 + n * 0.08);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Roads
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x4d5258, roughness: 0.95 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5e6a8 });
    this.roads = [
      { x: 0, z: 30, w: 9, d: 160 },   // N-S main (north half)
      { x: 0, z: -28, w: 9, d: 46 },   // N-S south to arena gap
      { x: 0, z: 0, w: 230, d: 9 },    // E-W main
      { x: 0, z: 28, w: 120, d: 7 },   // Talon Street
      { x: -10, z: -16, w: 120, d: 7 }, // Seed Lane
    ];
    for (const r of this.roads) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.set(r.x, 0.03, r.z); m.receiveShadow = true;
      this.scene.add(m);
      this.mapRects.push({ x: r.x, z: r.z, w: r.w, d: r.d, color: '#6b7078' });
      const along = r.w > r.d ? 'x' : 'z';
      const len = Math.max(r.w, r.d);
      for (let t = -len / 2 + 2; t < len / 2 - 2; t += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? 2.5 : 0.25, along === 'x' ? 0.25 : 2.5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(r.x + (along === 'x' ? t : 0), 0.04, r.z + (along === 'z' ? t : 0));
        this.scene.add(dash);
      }
    }
  }

  isOnRoad(x, z, pad = 2) {
    return this.roads.some((r) => Math.abs(x - r.x) < r.w / 2 + pad && Math.abs(z - r.z) < r.d / 2 + pad);
  }

  buildPlaza() {
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 0.12, 40), mat(0xcbbfa8, { flatShading: false }));
    plaza.position.y = 0.06; plaza.receiveShadow = true; this.scene.add(plaza);
    this.mapRects.push({ x: 0, z: 0, r: 15, color: '#cbbfa8' });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.4, 0.9, 28), mat(0x9a8f7c));
    basin.position.y = 0.45; basin.castShadow = basin.receiveShadow = true; this.scene.add(basin);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.1, 28), new THREE.MeshStandardMaterial({ color: 0x4fb3e8, roughness: 0.15, metalness: 0.1 }));
    water.position.y = 0.85; this.scene.add(water);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 2.4, 10), mat(0xb8ad98));
    ped.position.y = 1.2; ped.castShadow = true; this.scene.add(ped);
    this.colliders.push({ type: 'circle', x: 0, z: 0, r: 5.4, bottom: 0, top: 0.9 });
    this.colliders.push({ type: 'circle', x: 0, z: 0, r: 1.4, bottom: 0, top: 2.4 });
    const gold = { body: 0xffc94a, belly: 0xffe08a, beak: 0xffb000, glove: 0xffd700, trunks: 0xe0a800, crest: 0xffd700, legs: 0xffc94a };
    const statue = makeBird({ ...gold });
    for (const m of [statue.L.glove, statue.R.glove]) m.material = mat(0xffd700, { metalness: 0.8, roughness: 0.3 });
    statue.setPose('cheer'); statue.snap();
    statue.root.scale.setScalar(1.5);
    statue.root.position.set(0, 2.4, 0);
    this.scene.add(statue.root);
    const sign = makeSign('FEATHERTON', { w: 5, h: 1.1, sub: 'Home of the Boxing Birdies' });
    sign.position.set(0, 1.5, 6.5); this.scene.add(sign);
    // benches
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3;
      const b = this.addBox(Math.cos(a) * 11, Math.sin(a) * 11, 2.4, 0.7, 0.6, 0x8b5a2b);
      b.rotation.y = -a + Math.PI / 2;
    }
  }

  buildHome() {
    const { x, z } = HOME;
    this.addBox(x, z, 11, 10, 6, 0xc98a4b, { mapColor: '#c98a4b' });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(8.6, 4.5, 4), mat(0xb33a3a));
    roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.9); roof.position.set(x, 6 + 2.25, z);
    roof.castShadow = true; this.scene.add(roof);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24), mat(0x1c120a));
    hole.position.set(x, 2.2, z - 5.02); hole.rotation.y = Math.PI; this.scene.add(hole);
    const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6, 8), mat(0x6b4423));
    perch.rotation.x = Math.PI / 2; perch.position.set(x, 0.6, z - 5.6); this.scene.add(perch);
    const sign = makeSign('MY NEST', { w: 3.4, h: 0.9 });
    sign.position.set(x, 4.4, z - 5.06); sign.rotation.y = Math.PI; this.scene.add(sign);
    // giant decorative nest next to the house
    const nest = new THREE.Mesh(new THREE.TorusGeometry(2.4, 1, 8, 20), mat(0x7a5230));
    nest.rotation.x = Math.PI / 2; nest.position.set(x + 9, 1, z); nest.castShadow = true; this.scene.add(nest);
    for (let i = 0; i < 3; i++) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mat(0xbfe3ff));
      egg.scale.y = 1.3; egg.position.set(x + 9 + rand(-0.8, 0.8), 1.1, z + rand(-0.8, 0.8)); this.scene.add(egg);
    }
    this.colliders.push({ type: 'circle', x: x + 9, z, r: 3.4, bottom: 0, top: 1.6 });
    this.addInteract('home', x, z - 7, 'Rest in your nest');
  }

  buildGym() {
    const { x, z } = GYM;
    this.addBox(x, z, 20, 15, 0.3, 0x9c8466, { mapColor: '#9c8466' });
    for (const [px, pz] of [[-9.5, -7], [9.5, -7], [-9.5, 7], [9.5, 7]]) this.addBox(x + px, z + pz, 0.7, 0.7, 5, 0x5b3a21);
    this.addBox(x, z + 7.2, 20, 0.4, 2.2, 0x7a5b3c, { y0: 0.3 }); // back half-wall
    this.addBox(x, z, 21, 16, 0.5, 0x2e5e8c, { y0: 5 }); // roof
    const sign = makeSign('FEATHER FISTS GYM', { w: 9, h: 1.4, bg: '#0f2a44', fg: '#ffd23f' });
    sign.position.set(x, 4.3, z - 8.05); sign.rotation.y = Math.PI; this.scene.add(sign);

    const fy = 0.3;
    // Heavy bag
    const hb = new THREE.Group(); hb.position.set(x - 6, fy, z + 1); this.scene.add(hb);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.4, 0.25), mat(0x333333)); frame.position.set(0, 2.2, 1.6); hb.add(frame);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.8), mat(0x333333)); arm.position.set(0, 4.3, 0.8); hb.add(arm);
    const bagPivot = new THREE.Group(); bagPivot.position.set(0, 4.2, 0); hb.add(bagPivot);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8), mat(0x999999)); chain.position.y = -0.4; bagPivot.add(chain);
    const bag = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14), mat(0xa61e1e)); bag.position.y = -1.9; bag.castShadow = true; bagPivot.add(bag);
    this.colliders.push({ type: 'circle', x: x - 6, z: z + 1, r: 0.55, bottom: 0, top: 4 });
    this.stations.heavy = { pos: new THREE.Vector3(x - 6, fy, z - 0.6), face: 0, pivot: bagPivot, swing: 0, swingV: 0 };
    this.addInteract('heavy', x - 6, z - 0.8, 'Train on the Heavy Bag (Power)', 2.2);

    // Speed bag
    const sbg = new THREE.Group(); sbg.position.set(x - 2, fy, z + 1.4); this.scene.add(sbg);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3, 0.25), mat(0x333333)); post.position.set(0, 1.5, 0.6); sbg.add(post);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 16), mat(0x6b4423)); plat.position.set(0, 2.95, 0); sbg.add(plat);
    const sbPivot = new THREE.Group(); sbPivot.position.set(0, 2.85, 0); sbg.add(sbPivot);
    const sb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(0xf59e0b)); sb.scale.y = 1.4; sb.position.y = -0.38; sbPivot.add(sb);
    this.stations.speed = { pos: new THREE.Vector3(x - 2, fy, z - 0.1), face: 0, pivot: sbPivot, swing: 0, swingV: 0 };
    this.addInteract('speed', x - 2, z - 0.4, 'Train on the Speed Bag (Speed)', 2.2);

    // Jump rope mat
    const matM = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 3), mat(0x2563eb)); matM.position.set(x + 2, fy + 0.03, z + 0.5); this.scene.add(matM);
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 4, 32, Math.PI), mat(0xffffff)); rope.visible = false;
    this.scene.add(rope);
    this.stations.rope = { pos: new THREE.Vector3(x + 2, fy, z + 0.5), face: Math.PI, rope };
    this.addInteract('rope', x + 2, z + 0.5, 'Jump Rope (Stamina)', 2.2);

    // Dodge bot
    const bot = new THREE.Group(); bot.position.set(x + 6.5, fy, z + 1.5); this.scene.add(bot);
    const bp = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 10), mat(0x64748b)); bp.position.y = 1.2; bot.add(bp);
    const bh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mat(0x94a3b8)); bh.position.y = 2.6; bot.add(bh);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0xff3333 })); eye.position.set(0, 2.65, -0.4); bot.add(eye);
    const botArm = new THREE.Group(); botArm.position.y = 2; bot.add(botArm);
    const ba = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.6), mat(0x475569)); ba.position.z = -0.8; botArm.add(ba);
    const bglove = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), mat(0xd62828)); bglove.position.z = -1.6; botArm.add(bglove);
    this.colliders.push({ type: 'circle', x: x + 6.5, z: z + 1.5, r: 0.55, bottom: 0, top: 3 });
    this.stations.dodge = { pos: new THREE.Vector3(x + 6.5, fy, z - 0.6), face: 0, arm: botArm, swing: 0 };
    this.addInteract('dodge', x + 6.5, z - 0.8, 'Dodge Drill (Defense)', 2.2);

    // Coach Gizzard the owl
    const coach = makeBird({ body: 0x7c6a58, belly: 0xe9dcc4, beak: 0xc9a227, glove: 0x444444, trunks: 0x0f2a44, crest: 0x7c6a58, crestStyle: 'tufts', beakLen: 0.2, headband: 0xffffff });
    coach.root.position.set(x + 8, fy, z - 5); coach.root.rotation.y = -2.4;
    coach.setPose('droop'); coach.snap();
    this.scene.add(coach.root);
    this.coach = coach;
    const tag = makeTextSprite('Coach Gizzard', { size: 0.9 }); tag.position.set(x + 8, fy + 3.1, z - 5); this.scene.add(tag);
    this.addInteract('coach', x + 8, z - 5, 'Talk to Coach Gizzard', 2.6);
  }

  buildShop() {
    const { x, z } = SHOP;
    this.addBox(x, z, 12, 8, 5, 0xf1e3c8, { mapColor: '#e6b85c' });
    this.addBox(x, z, 12.6, 8.6, 0.4, 0x5a8f3e, { y0: 5 });
    // striped awning
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 2.2), mat(i % 2 ? 0xffffff : 0xe63946));
      s.position.set(x - 5.25 + i * 1.5, 3.4, z + 5); s.rotation.x = 0.35; s.castShadow = true; this.scene.add(s);
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), mat(0x5b3a21)); door.position.set(x, 1.5, z + 4.02); this.scene.add(door);
    const sign = makeSign('SEED & FEED', { w: 6, h: 1.2, bg: '#5a8f3e', fg: '#fffbe6' });
    sign.position.set(x, 4.3, z + 4.05); this.scene.add(sign);
    for (let i = 0; i < 3; i++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), mat(0xd9b77e)); sack.scale.y = 1.2;
      sack.position.set(x + 3 + i * 1.1, 0.6, z + 5.2); sack.castShadow = true; this.scene.add(sack);
    }
    // shopkeeper
    const keeper = makeBird({ body: 0x2f9e44, belly: 0xfff3bf, beak: 0xff922b, gloves: false, crest: 0xffd43b, crestStyle: 'spike', hat: true });
    keeper.root.position.set(x - 3, 0, z + 5.6); keeper.setPose('droop'); keeper.snap(); this.scene.add(keeper.root);
    this.keeper = keeper;
    this.addInteract('shop', x, z + 6, 'Shop at Seed & Feed', 3);
  }

  buildArena() {
    const A = ARENA;
    this.mapRects.push({ x: A.x, z: A.z, r: A.rout, color: '#8d5a97', ring: A.rin });
    // Outer wall
    // Cylinder theta is measured from +z towards +x; our gap angle uses atan2(z, x), so theta = PI/2 - angle.
    const wallGeo = new THREE.CylinderGeometry(A.rout, A.rout, A.wall, 48, 1, true, Math.PI / 2 - A.gapAngle + A.gapHalf, Math.PI * 2 - A.gapHalf * 2);
    const wall = new THREE.Mesh(wallGeo, mat(0x6d3a7a, { side: THREE.DoubleSide }));
    wall.position.set(A.x, A.wall / 2, A.z);
    wall.castShadow = true; wall.receiveShadow = true;
    this.scene.add(wall);
    this.colliders.push({ type: 'annulus', x: A.x, z: A.z, rin: A.rin, rout: A.rout, gap: A.gapAngle, gapHalf: A.gapHalf, bottom: 0, top: A.wall });

    // Tiered seating (instanced)
    const tiers = 5, segs = 56;
    const seatGeo = new THREE.BoxGeometry(1, 1, 1);
    const seatMesh = new THREE.InstancedMesh(seatGeo, mat(0xa77bb5), tiers * segs);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    let n = 0;
    const seats = [];
    for (let s = 0; s < segs; s++) {
      const ang = (s + 0.5) / segs * Math.PI * 2;
      if (this.inGap(ang, A.gapAngle, A.gapHalf + 0.05)) continue;
      for (let t = 0; t < tiers; t++) {
        const r = A.rin + 0.8 + t * 1.5;
        const h = 1.2 + t * 1.4;
        p.set(A.x + Math.cos(ang) * r, h / 2, A.z + Math.sin(ang) * r);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang);
        sc.set(1.6, h, (2 * Math.PI * r) / segs + 0.05);
        m4.compose(p, q, sc);
        seatMesh.setMatrixAt(n++, m4);
        if (Math.random() < 0.8) seats.push({ x: A.x + Math.cos(ang) * r, z: A.z + Math.sin(ang) * r, y: h, ang });
      }
    }
    seatMesh.count = n;
    seatMesh.receiveShadow = true; seatMesh.castShadow = true;
    this.scene.add(seatMesh);
    this.buildCrowd(seats);

    // Entrance arch
    const archSign = makeSign('THE COOP COLISEUM', { w: 12, h: 2, bg: '#3b0f4a', fg: '#ffd23f', sub: 'Featherweight Championship Boxing' });
    const ex = A.x + Math.cos(A.gapAngle) * (A.rout + 0.3), ez = A.z + Math.sin(A.gapAngle) * (A.rout + 0.3);
    archSign.position.set(ex, A.wall + 1.4, ez); this.scene.add(archSign);
    for (const s of [-1, 1]) {
      const px = ex + s * 6.4;
      this.addBox(px, ez, 1.2, 1.2, A.wall + 2.6, 0x3b0f4a);
    }

    // The ring
    const R = RING;
    this.addBox(R.x, R.z, R.half * 2 + 1, R.half * 2 + 1, R.y, 0x1f2937);
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(R.half * 2 + 0.8, R.half * 2 + 0.8), new THREE.MeshStandardMaterial({ map: canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#e9e2d0'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 90, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '64px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COOP', w / 2, h / 2);
    }), roughness: 0.9 }));
    canvas.rotation.x = -Math.PI / 2; canvas.position.set(R.x, R.y + 0.01, R.z); canvas.receiveShadow = true;
    this.scene.add(canvas);
    const postMat = mat(0xd1d5db, { metalness: 0.5, roughness: 0.4 });
    const cornerColors = [0xc1121f, 0x1d4ed8, 0xffffff, 0xffffff];
    const corners = [[-1, -1], [1, 1], [1, -1], [-1, 1]];
    corners.forEach(([sx, sz], i) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 8), postMat);
      post.position.set(R.x + sx * R.half, R.y + 0.9, R.z + sz * R.half); post.castShadow = true; this.scene.add(post);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 0.4), mat(cornerColors[i]));
      pad.position.set(R.x + sx * (R.half - 0.15), R.y + 1.0, R.z + sz * (R.half - 0.15)); this.scene.add(pad);
    });
    const ropeMat = mat(0xe11d48);
    for (const h of [0.6, 1.1, 1.6]) {
      for (const [ax, az, len, rotY] of [[0, -1, R.half * 2, 0], [0, 1, R.half * 2, 0], [-1, 0, R.half * 2, Math.PI / 2], [1, 0, R.half * 2, Math.PI / 2]]) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 6), ropeMat);
        rope.rotation.z = Math.PI / 2; rope.rotation.y = rotY;
        rope.position.set(R.x + ax * R.half, R.y + h, R.z + az * R.half);
        this.scene.add(rope);
      }
    }
    // Steps up to the ring
    this.addBox(R.x, R.z + R.half + 1.2, 2, 1.2, 0.5, 0x374151);

    // Light towers
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const tx = A.x + Math.cos(a) * (A.rout + 3), tz = A.z + Math.sin(a) * (A.rout + 3);
      this.addBox(tx, tz, 0.8, 0.8, 18, 0x4b5563);
      const head = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff7cc, emissiveIntensity: 0.3 }));
      head.position.set(tx, 18.5, tz); head.lookAt(A.x, 0, A.z); this.scene.add(head);
      this.lamps.push(head.material);
    }
    this.arenaSpot = new THREE.SpotLight(0xffffff, 0, 60, 0.5, 0.5, 1);
    this.arenaSpot.position.set(R.x, 26, R.z + 4);
    this.arenaSpot.target.position.set(R.x, 0, R.z);
    this.scene.add(this.arenaSpot, this.arenaSpot.target);

    // Promoter Pecksworth (pelican in a top hat)
    const promo = makeBird({ body: 0xe7e1d3, belly: 0xffffff, beak: 0xf4a259, gloves: false, crest: 0xe7e1d3, crestStyle: 'none', beakLen: 0.95, beakW: 0.17, hat: true });
    promo.root.position.set(R.x + 7, 0, R.z + 6); promo.root.rotation.y = -0.9;
    promo.setPose('droop'); promo.snap();
    this.scene.add(promo.root);
    this.promoter = promo;
    const tag = makeTextSprite('Promoter Pecksworth', { size: 0.9 }); tag.position.set(R.x + 7, 3.4, R.z + 6); this.scene.add(tag);
    this.addInteract('promoter', R.x + 7, R.z + 6, 'Talk to Promoter Pecksworth', 3);

    // Rankings board
    this.rankBoardTex = canvasTex(512, 640, () => {});
    const board = new THREE.Mesh(new THREE.PlaneGeometry(6, 7.5), new THREE.MeshBasicMaterial({ map: this.rankBoardTex }));
    board.position.set(A.x, 7, A.z - A.rin + 0.3);
    this.scene.add(board);
    const boardBack = new THREE.Mesh(new THREE.BoxGeometry(6.4, 7.9, 0.3), mat(0x1f1f1f));
    boardBack.position.set(A.x, 7, A.z - A.rin + 0.1); this.scene.add(boardBack);
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
    let d = Math.atan2(Math.sin(ang - gap), Math.cos(ang - gap));
    return Math.abs(d) < half;
  }

  buildCrowd(seats) {
    const count = seats.length;
    const bodyGeo = new THREE.SphereGeometry(0.45, 8, 6);
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const beakGeo = new THREE.ConeGeometry(0.09, 0.3, 5); beakGeo.rotateX(Math.PI / 2);
    const mk = (geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), count); this.scene.add(m); return m; };
    const bodies = mk(bodyGeo), heads = mk(headGeo), beaks = mk(beakGeo);
    const col = new THREE.Color();
    const cols = [0xe63946, 0x457b9d, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8338ec, 0xff006e, 0x3a86ff, 0xffffff, 0x222222, 0x8d6e63];
    seats.forEach((s, i) => {
      col.set(pick(cols)); bodies.setColorAt(i, col); heads.setColorAt(i, col);
      col.set(pick([0xffa41b, 0xffd000, 0x333333])); beaks.setColorAt(i, col);
      s.phase = Math.random() * Math.PI * 2; s.spd = rand(5, 9);
    });
    this.crowd = { seats, bodies, heads, beaks };
    this.updateCrowd(0);
  }

  updateCrowd(dt) {
    const c = this.crowd; if (!c) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    const hype = this.crowdHype;
    c.seats.forEach((s, i) => {
      s.phase += dt * s.spd * (0.3 + hype);
      const bob = Math.max(0, Math.sin(s.phase)) * (0.08 + hype * 0.5);
      const faceAng = Math.atan2(ARENA.x - s.x, ARENA.z - s.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), faceAng);
      p.set(s.x, s.y + 0.45 + bob, s.z); m4.compose(p, q, one); c.bodies.setMatrixAt(i, m4);
      p.set(s.x, s.y + 1.05 + bob, s.z); m4.compose(p, q, one); c.heads.setMatrixAt(i, m4);
      p.set(s.x + Math.sin(faceAng) * 0.35, s.y + 1.0 + bob, s.z + Math.cos(faceAng) * 0.35); m4.compose(p, q, one); c.beaks.setMatrixAt(i, m4);
    });
    c.bodies.instanceMatrix.needsUpdate = c.heads.instanceMatrix.needsUpdate = c.beaks.instanceMatrix.needsUpdate = true;
    this.crowdHype = Math.max(0, hype - dt * 0.6);
  }

  buildPark() {
    const P = POND;
    this.mapRects.push({ x: P.x, z: P.z, r: P.r, color: '#3a9bd9' });
    const water = new THREE.Mesh(new THREE.CircleGeometry(P.r, 36), new THREE.MeshStandardMaterial({ color: 0x3a9bd9, roughness: 0.1, metalness: 0.2 }));
    water.rotation.x = -Math.PI / 2; water.position.set(P.x, 0.08, P.z); this.scene.add(water);
    const shore = new THREE.Mesh(new THREE.RingGeometry(P.r, P.r + 1.2, 36), mat(0xd9c89e));
    shore.rotation.x = -Math.PI / 2; shore.position.set(P.x, 0.06, P.z); this.scene.add(shore);
    this.colliders.push({ type: 'circle', x: P.x, z: P.z, r: P.r - 0.5, bottom: -5, top: 0.6, water: true });
    // lily pads
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2), r = rand(2, P.r - 1.5);
      const lp = new THREE.Mesh(new THREE.CircleGeometry(0.6, 10), mat(0x3f8f3f));
      lp.rotation.x = -Math.PI / 2; lp.position.set(P.x + Math.cos(a) * r, 0.1, P.z + Math.sin(a) * r); this.scene.add(lp);
    }
    // ducks swimming
    for (let i = 0; i < 5; i++) {
      const d = makeSmallBird(i === 0 ? 0x2d6a4f : 0x8d6e63, 0xf1e6d2, 0xffb703, 1.3);
      d.wingL.rotation.z = 0.2; d.wingR.rotation.z = -0.2;
      this.scene.add(d.root);
      this.ducks.push({ sb: d, a: rand(0, Math.PI * 2), r: rand(3, P.r - 2), spd: rand(0.15, 0.3) * (Math.random() < 0.5 ? 1 : -1) });
    }
    // benches
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.5;
      const b = this.addBox(P.x + Math.cos(a) * (P.r + 3), P.z + Math.sin(a) * (P.r + 3), 2.4, 0.7, 0.6, 0x8b5a2b);
      b.rotation.y = -a + Math.PI / 2;
    }
    const sign = makeSign('PUDDLE PARK', { w: 4, h: 1, bg: '#1b4332', fg: '#d8f3dc' });
    sign.position.set(P.x - 12, 1.3, P.z + 8); sign.rotation.y = -0.6; this.scene.add(sign);
  }

  buildTower() {
    // "Lookout Perch": a platforming tower with a golden feather on top.
    const { x, z } = TOWER;
    this.mapRects.push({ x, z, w: 6, d: 6, color: '#7a5230' });
    const steps = [[0, 6, 1.3], [5, 3, 2.6], [5, -3, 3.9], [0, -6, 5.2], [-5, -3, 6.5], [-5, 3, 7.8], [0, 0, 10]];
    steps.forEach(([sx, sz, h], i) => {
      const w = i === steps.length - 1 ? 6 : 3.2;
      this.addBox(x + sx, z + sz, w, w, h, i === steps.length - 1 ? 0x7a5230 : 0x9c6b3e);
    });
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 4, 0.15), mat(0x333333)); flag.position.set(x + 2.5, 12, z + 2.5); this.scene.add(flag);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), mat(0xffb703, { side: THREE.DoubleSide })); cloth.position.set(x + 3.4, 13.4, z + 2.5); this.scene.add(cloth);
    this.towerFlag = cloth;
    const sign = makeSign('LOOKOUT PERCH', { w: 4, h: 1 });
    sign.position.set(x, 1.6, z + 9); this.scene.add(sign);
  }

  buildHouses() {
    const spots = [
      [-25, 40, 0], [-12, 42, 0], [14, 42, 0], [26, 40, 0], [-80, 12, 1], [-70, -10, 2],
      [80, 12, 1], [92, -8, 2], [-20, -32, 3], [22, -30, 3], [-75, 40, 0], [78, 38, 0],
      [20, 62, 0], [-22, 64, 0], [40, 78, 0], [-45, 80, 0], [100, 30, 1], [-100, -20, 2],
    ];
    const wallCols = [0xf4d35e, 0xee964b, 0xa8dadc, 0xf28482, 0xcdb4db, 0xb5e48c, 0xffcad4, 0xffd6a5];
    const roofCols = [0x9d0208, 0x335c67, 0x6a4c93, 0x2b2d42, 0x386641];
    this.houseRoofs = [];
    for (const [x, z] of spots) {
      const w = rand(7, 9), d = rand(6, 8), h = rand(4, 5);
      this.addBox(x, z, w, d, h, pick(wallCols), { mapColor: '#d9a066' });
      this.addBox(x, z, w + 0.6, d + 0.6, 0.35, pick(roofCols), { y0: h });
      // windows
      const winMat = new THREE.MeshStandardMaterial({ color: 0x2b3a55, emissive: 0xffd27a, emissiveIntensity: 0 });
      this.lamps.push(winMat);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), winMat);
        win.position.set(x + sx * w * 0.25, h * 0.55, z + sz * (d / 2 + 0.02));
        if (sz < 0) win.rotation.y = Math.PI;
        this.scene.add(win);
      }
      // little birdhouse on a pole in front
      if (Math.random() < 0.5) {
        const px = x + w / 2 + 1.2, pz = z + d / 2 + 1;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4), mat(0x6b4423)); pole.position.set(px, 1.2, pz); this.scene.add(pole);
        const bh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), mat(pick(wallCols))); bh.position.set(px, 2.75, pz); bh.castShadow = true; this.scene.add(bh);
        const br = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.4, 4), mat(pick(roofCols))); br.rotation.y = Math.PI / 4; br.position.set(px, 3.3, pz); this.scene.add(br);
      }
      this.houseRoofs.push({ x, z, y: h + 0.35 });
    }
  }

  buildTrees() {
    const N = 170;
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 3, 6);
    const leafGeo = new THREE.IcosahedronGeometry(1.8, 0);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat(0x6b4423), N);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), N * 2);
    trunks.castShadow = leaves.castShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const col = new THREE.Color();
    let n = 0, tries = 0;
    this.treePositions = [];
    while (n < N && tries < 4000) {
      tries++;
      const a = rand(0, Math.PI * 2), r = Math.sqrt(Math.random()) * (WORLD_R - 4);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.isOnRoad(x, z, 3)) continue;
      if (Math.hypot(x, z) < 18) continue;
      if (Math.hypot(x - ARENA.x, z - ARENA.z) < ARENA.rout + 5) continue;
      if (Math.hypot(x - POND.x, z - POND.z) < POND.r + 3) continue;
      if (Math.hypot(x - TOWER.x, z - TOWER.z) < 11) continue;
      if (this.colliders.some((c) => this.overlaps(c, x, z, 3))) continue;
      const sc = rand(0.8, 1.4);
      p.set(x, 1.5 * sc, z); s.set(sc, sc, sc); q.identity();
      m4.compose(p, q, s); trunks.setMatrixAt(n, m4);
      for (let k = 0; k < 2; k++) {
        p.set(x + rand(-0.4, 0.4), (3.4 + k * 1.3) * sc, z + rand(-0.4, 0.4));
        const ls = sc * (1.2 - k * 0.35);
        s.set(ls, ls, ls); q.setFromEuler(new THREE.Euler(rand(0, 3), rand(0, 3), 0));
        m4.compose(p, q, s); leaves.setMatrixAt(n * 2 + k, m4);
        col.setHSL(rand(0.24, 0.36), rand(0.45, 0.65), rand(0.28, 0.42));
        if (Math.random() < 0.08) col.setHSL(rand(0.02, 0.1), 0.7, 0.5);
        leaves.setColorAt(n * 2 + k, col);
      }
      this.colliders.push({ type: 'circle', x, z, r: 0.5 * sc, bottom: 0, top: 3.2 * sc });
      this.treePositions.push({ x, z, s: sc });
      n++;
    }
    trunks.count = n; leaves.count = n * 2;
    this.scene.add(trunks, leaves);
  }

  buildLamps() {
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0 });
    this.lamps.push(bulbMat);
    const pts = [];
    for (let t = -100; t <= 100; t += 20) { pts.push([t, 6]); pts.push([t, -6]); }
    for (let t = 15; t <= 100; t += 20) { pts.push([6, t]); pts.push([-6, t]); }
    for (const [x, z] of pts) {
      if (Math.hypot(x, z) < 16) continue;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.5, 6), mat(0x2b2d42)); pole.position.set(x, 2.25, z); pole.castShadow = true; this.scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat); bulb.position.set(x, 4.6, z); this.scene.add(bulb);
      this.colliders.push({ type: 'circle', x, z, r: 0.2, bottom: 0, top: 4.5 });
    }
  }

  buildClouds() {
    const cm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(3, 6), 0), cm);
        puff.position.set(rand(-7, 7), rand(-1, 2), rand(-3, 3)); g.add(puff);
      }
      g.position.set(rand(-200, 200), rand(55, 80), rand(-200, 200));
      g.userData.spd = rand(1, 3);
      this.scene.add(g); this.clouds.push(g);
    }
  }

  buildFlocks() {
    const cols = [[0x333333, 0x777777], [0xffffff, 0xeeeeee], [0x3a5a80, 0xc0d0e0], [0x8b4513, 0xd2b48c]];
    for (let f = 0; f < 5; f++) {
      const [c1, c2] = pick(cols);
      const members = [];
      const n = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const sb = makeSmallBird(c1, c2, 0xffa41b, 1.6);
        sb.root.traverse((o) => { o.castShadow = false; });
        this.scene.add(sb.root);
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        members.push({ sb, off: new THREE.Vector3(side * row * 1.8, rand(-0.5, 0.5), -row * 1.8), phase: rand(0, 6) });
      }
      this.flocks.push({ members, cx: rand(-60, 60), cz: rand(-60, 60), r: rand(40, 90), h: rand(22, 40), a: rand(0, 6), spd: rand(0.06, 0.12) * (Math.random() < 0.5 ? 1 : -1) });
    }
  }

  buildPigeons() {
    const spots = [[0, 0, 13], [POND.x, POND.z, POND.r + 4], [0, 28, 6], [-45, -20, 5]];
    for (let i = 0; i < 34; i++) {
      const [cx, cz, rr] = spots[i % spots.length];
      const a = rand(0, Math.PI * 2), r = rr + rand(-1.5, 2.5);
      const sb = makeSmallBird(pick([0x8e9aaf, 0x6c757d, 0xadb5bd, 0x495057]), 0xced4da, 0x343a40, 1.1);
      sb.wingL.rotation.z = 0.1; sb.wingR.rotation.z = -0.1;
      const home = new THREE.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
      sb.root.position.copy(home); sb.root.rotation.y = rand(0, 6);
      this.scene.add(sb.root);
      this.pigeons.push({ sb, home, state: 'peck', t: rand(0, 3), vel: new THREE.Vector3(), phase: rand(0, 6) });
    }
  }

  // ---------- NPC townsfolk ----------
  buildNPCs() {
    const names = [...NPC_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 16; i++) {
      const pal = pick(PALETTES);
      const bird = makeBird({
        body: new THREE.Color().setHSL(Math.random(), rand(0.4, 0.8), rand(0.35, 0.6)).getHex(),
        belly: 0xf3e5c4, crest: pal.crest, glove: pal.glove, trunks: pal.trunks,
        crestStyle: pick(['spike', 'tufts', 'none']), beakLen: rand(0.25, 0.55), gloves: false, brow: false,
      });
      bird.root.scale.setScalar(rand(0.8, 1.0));
      bird.setPose('droop'); bird.snap();
      const p = this.randomWalkablePoint();
      bird.root.position.copy(p);
      this.scene.add(bird.root);
      this.npcs.push({ bird, name: names[i % names.length], target: this.randomWalkablePoint(), wait: rand(0, 3), challenger: null, bubble: null, bubbleT: 0, talkCd: rand(2, 8) });
    }
  }

  // Turn some townsfolk into street challengers (called each new day).
  refreshChallengers(avgStat, beaten = []) {
    const names = [...CHALLENGER_NAMES];
    for (const n of this.npcs) {
      if (n.marker) { n.bird.root.remove(n.marker); n.marker = null; }
      n.challenger = null;
    }
    const pool = this.npcs.filter(() => true).sort(() => Math.random() - 0.5).slice(0, 5);
    pool.forEach((n, i) => {
      const name = names[i % names.length];
      if (beaten.includes(name)) return;
      const lvl = Math.max(5, Math.round(avgStat + rand(-6, 6)));
      n.challenger = { name, lvl, purse: 30 + Math.round(lvl * 2.2), style: pick(['balanced', 'brawler', 'speedster', 'tank']) };
      const mk = makeTextSprite('!', { color: '#2a1600', bg: '#ffb703', border: '#fff', size: 1.4 });
      mk.position.set(0, 3.2, 0);
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

  // Stop upward movement into the underside of raised boxes (roofs).
  ceiling(pos, vel, height = 2.2) {
    for (const c of this.colliders) {
      if (c.type !== 'box' || c.bottom < 0.5) continue;
      if (pos.y < c.bottom && pos.y + height > c.bottom && this.overlaps(c, pos.x, pos.z, -0.3)) {
        pos.y = c.bottom - height;
        if (vel.y > 0) vel.y = 0;
      }
    }
  }

  // Push a position (Vector3, y = feet) out of solid colliders horizontally.
  resolve(pos, radius = 0.45, height = 2.2) {
    let hit = false;
    for (const c of this.colliders) {
      if (pos.y >= c.top - 0.55 || pos.y + height <= c.bottom) continue;
      if (c.type === 'box') {
        const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        let dx = pos.x - cx, dz = pos.z - cz;
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
            // inside the entrance: keep away from the gap's side edges
            const edgeA = c.gap + (Math.atan2(Math.sin(ang - c.gap), Math.cos(ang - c.gap)) > 0 ? c.gapHalf : -c.gapHalf);
            const ex = Math.cos(edgeA), ez = Math.sin(edgeA);
            const along = dx * ex + dz * ez;
            const perpX = dx - ex * along, perpZ = dz - ez * along;
            const pd = Math.hypot(perpX, perpZ);
            if (pd < radius && along > c.rin - 0.5 && along < c.rout + 0.5) {
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
  update(dt, playerPos, timeMinutes) {
    this.time += dt;
    this.updateSky(timeMinutes, playerPos);

    for (const cl of this.clouds) {
      cl.position.x += cl.userData.spd * dt;
      if (cl.position.x > 220) cl.position.x = -220;
    }
    for (const f of this.flocks) {
      f.a += f.spd * dt;
      const cx = f.cx + Math.cos(f.a) * f.r, cz = f.cz + Math.sin(f.a) * f.r;
      const dirx = -Math.sin(f.a) * Math.sign(f.spd), dirz = Math.cos(f.a) * Math.sign(f.spd);
      const yaw = Math.atan2(dirx, dirz);
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      for (const m of f.members) {
        m.phase += dt * 9;
        flapWings(m.sb, m.phase, 0.8);
        m.sb.root.position.set(cx + m.off.x * cy + m.off.z * sy, f.h + m.off.y + Math.sin(m.phase * 0.2) * 0.3, cz - m.off.x * sy + m.off.z * cy);
        m.sb.root.rotation.set(0, yaw, Math.sin(this.time) * 0.1);
      }
    }
    for (const d of this.ducks) {
      d.a += d.spd * dt;
      d.sb.root.position.set(POND.x + Math.cos(d.a) * d.r, 0.0 + Math.sin(this.time * 2 + d.r) * 0.03, POND.z + Math.sin(d.a) * d.r);
      d.sb.root.rotation.y = Math.atan2(-Math.sin(d.a) * Math.sign(d.spd), Math.cos(d.a) * Math.sign(d.spd));
    }
    this.updatePigeons(dt, playerPos);
    if (this.towerFlag) this.towerFlag.rotation.y = Math.sin(this.time * 3) * 0.3;
    if (this.coach) { this.coach.head.rotation.y = Math.sin(this.time * 0.7) * 0.5; this.coach.update(dt); }
    if (this.promoter) { this.promoter.head.rotation.x = Math.sin(this.time * 2) * 0.08; }

    // stations idle physics
    for (const k of ['heavy', 'speed']) {
      const s = this.stations[k];
      s.swingV += (-s.swing * 30 - s.swingV * (k === 'speed' ? 6 : 2.5)) * dt;
      s.swing += s.swingV * dt;
      s.pivot.rotation.x = s.swing;
    }
    const dg = this.stations.dodge;
    dg.arm.rotation.y += ((dg.swing || 0) - dg.arm.rotation.y) * Math.min(1, dt * 12);
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
      const toPlayer = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (frozen || (n.challenger && toPlayer < 5)) {
        if (n.challenger && toPlayer < 8 && !frozen) {
          const yaw = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
          b.root.rotation.y = lerpAngle(b.root.rotation.y, yaw, dt * 6);
          b.setPose('guard', 10);
        }
        b.walk(dt, 0); b.update(dt);
        this.updateBubble(n, dt, toPlayer);
        continue;
      }
      if (n.wait > 0) {
        n.wait -= dt; b.walk(dt, 0);
        b.setPose(n.challenger ? 'guard' : 'droop', 8);
      } else {
        const dx = n.target.x - p.x, dz = n.target.z - p.z, d = Math.hypot(dx, dz);
        if (d < 1) { n.wait = rand(1, 5); n.target = this.randomWalkablePoint(); }
        else {
          const sp = 2.4;
          const before = p.clone();
          p.x += dx / d * sp * dt; p.z += dz / d * sp * dt;
          if (this.resolve(p, 0.5)) {
            n.stuck = (n.stuck || 0) + dt;
            if (n.stuck > 1.2) { n.stuck = 0; n.target = this.randomWalkablePoint(); }
          }
          const moved = Math.hypot(p.x - before.x, p.z - before.z) / Math.max(dt, 1e-4);
          b.root.rotation.y = lerpAngle(b.root.rotation.y, Math.atan2(dx, dz), dt * 6);
          b.walk(dt, moved);
          b.setPose(n.challenger ? 'guard' : 'idle', 8);
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
      const text = n.challenger ? pick(['Hey! Wanna go a round?', 'Put \'em up, rookie!', 'Fight me for seeds!']) : pick(BANTER);
      n.bubble = makeTextSprite(text, { size: 0.75, border: n.challenger ? '#ff4d4d' : '#ffb703' });
      n.bubble.position.set(0, n.challenger ? 4.2 : 3.2, 0);
      n.bird.root.add(n.bubble);
      n.bubbleT = 3; n.talkCd = rand(8, 14);
    }
  }

  updatePigeons(dt, playerPos) {
    for (const pg of this.pigeons) {
      const r = pg.sb.root;
      if (pg.state === 'peck') {
        pg.t -= dt;
        pg.sb.head.position.y = 0.52 - Math.max(0, Math.sin(this.time * 9 + pg.phase)) * 0.18;
        if (pg.t < 0) { pg.t = rand(1, 4); r.rotation.y += rand(-1.5, 1.5); }
        const d = Math.hypot(playerPos.x - r.position.x, playerPos.z - r.position.z);
        if (d < 3.5 && playerPos.y < 3) {
          pg.state = 'fly'; pg.t = rand(3, 5);
          const ax = r.position.x - playerPos.x, az = r.position.z - playerPos.z, al = Math.hypot(ax, az) || 1;
          pg.vel.set(ax / al * 6 + rand(-2, 2), rand(5, 7), az / al * 6 + rand(-2, 2));
          r.rotation.y = Math.atan2(pg.vel.x, pg.vel.z);
          this.onPigeonScatter && this.onPigeonScatter();
        }
      } else if (pg.state === 'fly') {
        pg.t -= dt; pg.phase += dt * 22;
        flapWings(pg.sb, pg.phase, 1.0);
        r.position.addScaledVector(pg.vel, dt);
        pg.vel.y = Math.max(0.5, pg.vel.y - dt * 1.5);
        if (pg.t < 0) { pg.state = 'land'; }
      } else if (pg.state === 'land') {
        pg.phase += dt * 16; flapWings(pg.sb, pg.phase, 0.8);
        const to = new THREE.Vector3(pg.home.x - r.position.x, -r.position.y, pg.home.z - r.position.z);
        const d = to.length();
        if (d < 0.3) { r.position.copy(pg.home); pg.state = 'peck'; pg.sb.wingL.rotation.z = 0.1; pg.sb.wingR.rotation.z = -0.1; continue; }
        to.normalize().multiplyScalar(Math.min(d, 9 * dt));
        r.position.add(to);
        r.rotation.y = Math.atan2(pg.home.x - r.position.x, pg.home.z - r.position.z);
      }
    }
  }

  // Golden feathers to collect.
  placeFeathers(taken = []) {
    const spots = [];
    // roofs
    for (const h of this.houseRoofs.slice(0, 6)) spots.push([h.x, h.y + 0.9, h.z]);
    spots.push([GYM.x, 5.5 + 0.9, GYM.z]);
    spots.push([SHOP.x, 5.4 + 0.9, SHOP.z]);
    spots.push([TOWER.x, 10.9, TOWER.z]);
    spots.push([HOME.x + 9, 2.4, HOME.z]);
    // ground scattered
    spots.push([POND.x + POND.r + 2, 1, POND.z], [-110, 1, 0], [110, 1, 0], [0, 1, 110], [70, 1, 70], [-70, 1, 70]);
    spots.push([60, 1, -80], [-60, 1, -85], [RING.x, RING.y + 1, RING.z - 3], [-100, 1, 60]);
    const geo = new THREE.ConeGeometry(0.28, 1.3, 4);
    geo.scale(1, 1, 0.3);
    const fm = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffa500, emissiveIntensity: 0.6, metalness: 0.6, roughness: 0.3 });
    spots.slice(0, 20).forEach(([x, y, z], i) => {
      const mesh = new THREE.Mesh(geo, fm);
      mesh.position.set(x, y, z); mesh.rotation.z = 0.4;
      this.scene.add(mesh);
      const f = { id: i, mesh, x, y, z, taken: taken.includes(i) };
      mesh.visible = !f.taken;
      this.feathers.push(f);
    });
  }

  updateSky(t, playerPos) {
    const hour = (t / 60) % 24;
    const dayAng = (hour - 6) / 12 * Math.PI; // 0 at 6am, PI at 6pm
    const elev = Math.sin(dayAng);
    const sunDir = new THREE.Vector3(Math.cos(dayAng), Math.max(0.05, elev), 0.35).normalize();
    this.sun.position.copy(playerPos).addScaledVector(sunDir, 80);
    this.sun.target.position.copy(playerPos);
    this.sunBall.position.copy(playerPos).addScaledVector(new THREE.Vector3(Math.cos(dayAng), elev, 0.35).normalize(), 240);
    this.moonBall.position.copy(playerPos).addScaledVector(new THREE.Vector3(-Math.cos(dayAng), -elev, -0.3).normalize(), 240);
    const day = THREE.MathUtils.clamp(elev * 3 + 0.3, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(elev) * 4, 0, 1);
    const sky = new THREE.Color(0x0b1330).lerp(new THREE.Color(0x8fd3ff), day);
    sky.lerp(new THREE.Color(0xff9a62), dusk * 0.55);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.sun.intensity = 0.15 + day * 2.1;
    this.sun.color.set(0xfff1d6).lerp(new THREE.Color(0xff8a4c), dusk * 0.6);
    this.hemi.intensity = 0.35 + day * 0.6;
    const night = 1 - day;
    for (const m of this.lamps) m.emissiveIntensity = 0.2 + night * 1.6;
    this.night = night;
    this.sunBall.visible = elev > -0.1;
    this.moonBall.visible = elev < 0.1;
  }
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * Math.min(1, t);
}
