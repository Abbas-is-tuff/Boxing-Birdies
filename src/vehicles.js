import * as THREE from 'three';
import { makeBird } from './bird.js';

// ---------------------------------------------------------------------------
// Car models. Bodies are side profiles extruded across the car's width.
// Cars face +z; the driver sits on the left (+x).
// ---------------------------------------------------------------------------
const paintCache = new Map();
function paint(color) {
  if (!paintCache.has(color)) paintCache.set(color, new THREE.MeshPhysicalMaterial({ color, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }));
  return paintCache.get(color);
}
let SH = null;
function shared(world) {
  if (SH) return SH;
  SH = {
    glass: new THREE.MeshPhysicalMaterial({ color: 0x15202b, metalness: 0.3, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.78 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.25 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 }),
    interior: new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.9 }),
    head: new THREE.MeshStandardMaterial({ color: 0xfffbe8, emissive: 0xfff2c0, emissiveIntensity: 0.1 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x7a0a0a, emissive: 0xff1a1a, emissiveIntensity: 0.6 }),
  };
  world.lamps.push(SH.head);
  return SH;
}

function extrude(points, width, bevel = 0.05) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, -width / 2);
  g.rotateY(-Math.PI / 2); // profile x (length) -> +z (forward)
  return g;
}

const TYPES = {
  sedan: { L: 4.4, W: 1.85, r: 0.36, wz: 1.35, seat: -0.25,
    lower: [[-2.2, 0.32], [2.2, 0.32], [2.28, 0.62], [2.15, 0.92], [1.15, 1.02], [-1.65, 1.02], [-2.2, 0.98], [-2.28, 0.6]],
    cabin: [[1.15, 1.0], [0.35, 1.52], [-0.95, 1.52], [-1.7, 1.0]], roof: [-0.95, 0.35, 1.52] },
  hatch: { L: 3.8, W: 1.8, r: 0.34, wz: 1.2, seat: -0.1,
    lower: [[-1.9, 0.32], [1.9, 0.32], [1.98, 0.62], [1.85, 0.92], [1.0, 1.02], [-1.85, 1.02], [-1.95, 0.6]],
    cabin: [[1.0, 1.0], [0.25, 1.56], [-1.55, 1.56], [-1.85, 1.0]], roof: [-1.55, 0.25, 1.56] },
  sports: { L: 4.3, W: 1.95, r: 0.36, wz: 1.35, seat: -0.35, low: true,
    lower: [[-2.15, 0.28], [2.15, 0.28], [2.25, 0.5], [2.1, 0.72], [0.9, 0.85], [-1.6, 0.88], [-2.15, 0.85], [-2.25, 0.5]],
    cabin: [[0.9, 0.84], [0.0, 1.27], [-0.8, 1.27], [-1.55, 0.87]], roof: [-0.8, 0.0, 1.27] },
  pickup: { L: 5.0, W: 1.95, r: 0.42, wz: 1.6, seat: 0.25,
    lower: [[-2.5, 0.42], [2.5, 0.42], [2.55, 0.78], [2.4, 1.1], [1.3, 1.18], [-2.5, 1.18]],
    cabin: [[1.3, 1.16], [0.75, 1.78], [-0.45, 1.78], [-0.55, 1.16]], roof: [-0.45, 0.75, 1.78], bed: true },
  taxi: { base: 'sedan', taxi: true },
  bus: { L: 9, W: 2.5, r: 0.5, wz: 3.0, seat: 3.2, bus: true },
};

export const CAR_COLORS = [0xb91c1c, 0x1d4ed8, 0xf5f5f5, 0x18181b, 0x9ca3af, 0x047857, 0xea580c, 0x7c3aed, 0x0ea5e9, 0x854d0e];

export function makeCar(world, typeName = 'sedan', color = 0xb91c1c, driverSpecies = null) {
  const S = shared(world);
  let T = TYPES[typeName];
  const taxi = !!T.taxi;
  if (T.base) { T = TYPES[T.base]; color = 0xf5c518; }
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);
  const add = (geo, m, parent = body) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };
  const wheels = [];
  const L = T.L, W = T.W;

  if (T.bus) {
    const shell = add(extrude([[-4.5, 0.45], [4.5, 0.45], [4.6, 2.85], [4.35, 3.15], [-4.5, 3.15]], W, 0.08), paint(color));
    shell.castShadow = true;
    // window band, windshield, destination sign
    for (const s of [-1, 1]) {
      const band = add(new THREE.PlaneGeometry(7.6, 0.95), S.glass); band.position.set(s * (W / 2 + 0.09), 2.2, -0.2); band.rotation.y = s * Math.PI / 2;
      const stripe = add(new THREE.PlaneGeometry(8.8, 0.18), paint(0x1e3a8a)); stripe.position.set(s * (W / 2 + 0.09), 1.35, 0); stripe.rotation.y = s * Math.PI / 2;
    }
    const ws = add(new THREE.PlaneGeometry(W - 0.2, 1.2), S.glass); ws.position.set(0, 2.25, 4.62); ws.rotation.x = -0.1;
    const signTex = signTexture('FEATHERTON TRANSIT');
    const sign = add(new THREE.PlaneGeometry(1.9, 0.3), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 2.98, 4.6);
    for (const s of [-1, 1]) {
      const hl = add(new THREE.BoxGeometry(0.35, 0.18, 0.06), S.head); hl.position.set(s * 0.9, 0.85, 4.6);
      const tl = add(new THREE.BoxGeometry(0.3, 0.3, 0.06), S.tail); tl.position.set(s * 1.0, 1.0, -4.58);
    }
  } else {
    add(extrude(T.lower, W), paint(color));
    add(extrude(T.cabin, W * 0.9, 0.03), S.glass);
    const [r0, r1, ry] = T.roof;
    const roof = add(new THREE.BoxGeometry(W * 0.92, 0.07, r1 - r0 + 0.12), paint(color)); roof.position.set(0, ry + 0.02, (r0 + r1) / 2);
    const pillar = add(new THREE.BoxGeometry(W * 0.92, ry - 1.0, 0.12), paint(color)); pillar.position.set(0, (ry + 1.0) / 2, (r0 + r1) / 2 - 0.1);
    if (T.bed) {
      const bed = add(new THREE.PlaneGeometry(W - 0.2, 1.75), S.interior); bed.rotation.x = -Math.PI / 2; bed.position.set(0, 1.235, -1.6);
    }
    const front = T.lower.reduce((m, p) => Math.max(m, p[0]), -9), back = T.lower.reduce((m, p) => Math.min(m, p[0]), 9);
    for (const s of [-1, 1]) {
      const hl = add(new THREE.BoxGeometry(0.42, 0.12, 0.08), S.head); hl.position.set(s * (W / 2 - 0.35), T.low ? 0.6 : 0.78, front + 0.02);
      const tl = add(new THREE.BoxGeometry(0.42, 0.12, 0.08), S.tail); tl.position.set(s * (W / 2 - 0.35), T.low ? 0.66 : 0.86, back - 0.03);
      const mirror = add(new THREE.BoxGeometry(0.16, 0.1, 0.1), paint(color)); mirror.position.set(s * (W / 2 + 0.08), 1.08, T.cabin[0][0] - 0.25);
    }
    const bumperF = add(new THREE.BoxGeometry(W * 0.95, 0.16, 0.12), S.trim); bumperF.position.set(0, 0.42, front + 0.06);
    const bumperB = add(new THREE.BoxGeometry(W * 0.95, 0.16, 0.12), S.trim); bumperB.position.set(0, 0.42, back - 0.06);
    if (taxi) {
      const sign = add(new THREE.BoxGeometry(0.7, 0.22, 0.3), new THREE.MeshBasicMaterial({ map: signTexture('TAXI', '#111', '#f5c518'), toneMapped: false }));
      sign.position.set(0, ry + 0.17, (r0 + r1) / 2);
    }
    if (typeName === 'sports') {
      const sp = add(new THREE.BoxGeometry(W * 0.9, 0.05, 0.3), S.trim); sp.position.set(0, 1.12, back + 0.25);
      for (const s of [-1, 1]) { const leg = add(new THREE.BoxGeometry(0.06, 0.22, 0.06), S.trim); leg.position.set(s * 0.6, 0.98, back + 0.25); }
    }
    // steering wheel
    const sw = add(new THREE.TorusGeometry(0.17, 0.025, 6, 18), S.trim); sw.position.set(0.42, 0.98, T.seat + 0.62); sw.rotation.x = -0.5;
  }
  for (const zs of [1, -1]) for (const xs of [1, -1]) {
    const g = new THREE.Group();
    const steer = new THREE.Group(); steer.add(g);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(T.r, T.r, 0.28, 20), S.tire); tire.rotation.z = Math.PI / 2; tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(T.r * 0.62, T.r * 0.62, 0.3, 12), S.rim); rim.rotation.z = Math.PI / 2; g.add(rim);
    steer.position.set(xs * (W / 2 - 0.12), T.r, zs * T.wz);
    group.add(steer);
    wheels.push({ g, steer, front: zs > 0 });
  }
  let driver = null;
  if (driverSpecies) {
    driver = makeBird({ species: driverSpecies, gloves: false });
    seatBird(driver, T);
    group.add(driver.root);
  }
  return { group, wheels, type: typeName, T, L, W, driver, speed: 0, yaw: 0, steer: 0 };
}

export function seatBird(bird, T) {
  const s = T.bus ? 0.55 : 0.48;
  bird.root.scale.setScalar(s);
  bird.root.position.set(T.bus ? 0.7 : 0.42, T.bus ? 0.7 : (T.low ? 0.18 : 0.3), T.seat);
  bird.root.rotation.set(0, 0, 0);
  bird.setPose({ l: [-0.28, 1.45, 1.25], r: [0.28, 1.45, 1.25] }, 10);
  bird.legs[0].rotation.x = bird.legs[1].rotation.x = -1.2;
  bird.idleLook = true;
  bird.snap();
}

function signTexture(text, fg = '#ffd23f', bg = '#111827') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = fg; ctx.font = '56px Bungee, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Traffic routes: closed loops of points along the right-hand lanes.
// Angles use atan2(z, x).
// ---------------------------------------------------------------------------
function buildLoop(segs) {
  const pts = [];
  for (const sg of segs) {
    if (sg.line) {
      const [a, b] = sg.line;
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let i = 0; i < n; i++) pts.push({ x: a[0] + (b[0] - a[0]) * i / n, z: a[1] + (b[1] - a[1]) * i / n, limit: 13 });
    } else {
      const { c, r, a0, a1 } = sg;
      const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * r));
      for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: c[0] + Math.cos(a) * r, z: c[1] + Math.sin(a) * r, limit: r < 5 ? 4 : 7 }); }
    }
  }
  let d = 0;
  pts.forEach((p, i) => { if (i) d += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z); p.d = d; });
  const last = pts[pts.length - 1];
  return { pts, length: d + Math.hypot(pts[0].x - last.x, pts[0].z - last.z) };
}

const R = 13; // roundabout radius around the plaza fountain
const ex = (lane) => Math.sqrt(R * R - lane * lane);
const LOOPS = [
  // Main street (east-west) through the plaza roundabout, U-turns at both ends
  [{ line: [[-112, 2.2], [-ex(2.2), 2.2]] }, { c: [0, 0], r: R, a0: Math.atan2(2.2, -ex(2.2)), a1: Math.atan2(2.2, ex(2.2)) },
    { line: [[ex(2.2), 2.2], [112, 2.2]] }, { c: [112, 0], r: 2.2, a0: Math.PI / 2, a1: -Math.PI / 2 },
    { line: [[112, -2.2], [ex(2.2), -2.2]] }, { c: [0, 0], r: R, a0: Math.atan2(-2.2, ex(2.2)), a1: Math.atan2(-2.2, -ex(2.2)) },
    { line: [[-ex(2.2), -2.2], [-112, -2.2]] }, { c: [-112, 0], r: 2.2, a0: -Math.PI / 2, a1: -3 * Math.PI / 2 }],
  // North-south avenue from the north edge to the Coliseum gate
  [{ line: [[2.2, 108], [2.2, ex(2.2)]] }, { c: [0, 0], r: R, a0: Math.atan2(ex(2.2), 2.2), a1: Math.atan2(-ex(2.2), 2.2) },
    { line: [[2.2, -ex(2.2)], [2.2, -46]] }, { c: [0, -46], r: 2.2, a0: 0, a1: -Math.PI },
    { line: [[-2.2, -46], [-2.2, -ex(2.2)]] }, { c: [0, 0], r: R, a0: Math.atan2(-ex(2.2), -2.2), a1: Math.atan2(ex(2.2), -2.2) - Math.PI * 2 },
    { line: [[-2.2, ex(2.2)], [-2.2, 108]] }, { c: [0, 108], r: 2.2, a0: Math.PI, a1: 0 }],
  // Talon Street
  [{ line: [[-57, 29.6], [57, 29.6]] }, { c: [57, 28], r: 1.6, a0: Math.PI / 2, a1: -Math.PI / 2 },
    { line: [[57, 26.4], [-57, 26.4]] }, { c: [-57, 28], r: 1.6, a0: -Math.PI / 2, a1: -3 * Math.PI / 2 }],
  // Seed Lane
  [{ line: [[-67, -14.4], [47, -14.4]] }, { c: [47, -16], r: 1.6, a0: Math.PI / 2, a1: -Math.PI / 2 },
    { line: [[47, -17.6], [-67, -17.6]] }, { c: [-67, -16], r: 1.6, a0: -Math.PI / 2, a1: -3 * Math.PI / 2 }],
].map(buildLoop);

const DRIVER_SPECIES = ['pigeon', 'sparrow', 'robin', 'bluejay', 'cardinal', 'goldfinch', 'budgie', 'canary', 'gull', 'goose', 'penguin', 'kingfisher', 'woodpecker', 'macaw', 'blueMacaw', 'magpie'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Vehicles {
  constructor(scene, world, quality = 'high') {
    this.scene = scene; this.world = world;
    this.traffic = []; this.parked = []; this.all = [];
    const hi = quality === 'high';
    const plan = hi ? [['bus', 'sedan', 'taxi', 'hatch'], ['sedan', 'pickup'], ['hatch', 'taxi'], ['sedan', 'pickup']] : [['bus', 'sedan'], ['taxi'], ['hatch'], ['sedan']];
    plan.forEach((types, li) => {
      const loop = LOOPS[li];
      types.forEach((t, k) => {
        const car = makeCar(world, t, t === 'bus' ? 0xf2c230 : pick(CAR_COLORS), pick(DRIVER_SPECIES));
        car.loop = loop; car.s = loop.length * k / types.length + Math.random() * 5; car.idx = 0; car.cruise = t === 'bus' ? 8 : 10 + Math.random() * 3;
        car.waitT = 0; car.ghostT = 0; car.honkT = 0;
        this.place(car);
        scene.add(car.group);
        this.addColliders(car);
        this.traffic.push(car); this.all.push(car);
      });
    });
    // Parked cars anyone can drive. The first one is yours.
    world.parkingSpots.forEach((sp, i) => {
      const type = i === 0 ? 'sports' : pick(['sedan', 'hatch', 'pickup', 'sedan', 'sports', 'taxi']);
      const car = makeCar(world, type, i === 0 ? 0xc81e1e : pick(CAR_COLORS));
      car.group.position.set(sp.x, 0.05, sp.z); car.yaw = sp.yaw; car.group.rotation.y = sp.yaw;
      car.mine = i === 0; car.parked = true;
      scene.add(car.group);
      this.addColliders(car);
      this.parked.push(car); this.all.push(car);
    });
  }

  addColliders(car) {
    const n = car.T.bus ? 5 : 3;
    const span = car.L / 2 - car.W / 2;
    car.cols = [];
    for (let i = 0; i < n; i++) {
      const c = { type: 'circle', x: 0, z: 0, r: car.W / 2 + 0.05, bottom: 0, top: car.T.bus ? 3.1 : 1.5, owner: car, off: -span + (2 * span) * i / (n - 1) };
      car.cols.push(c); this.world.colliders.push(c);
    }
    this.syncColliders(car);
  }

  syncColliders(car) {
    const p = car.group.position, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (const c of car.cols) { c.x = p.x + fx * c.off; c.z = p.z + fz * c.off; }
  }

  place(car) {
    const { pts, length } = car.loop;
    car.s = ((car.s % length) + length) % length;
    if (pts[car.idx].d > car.s) car.idx = 0;
    while (car.idx < pts.length - 1 && pts[car.idx + 1].d <= car.s) car.idx++;
    const a = pts[car.idx], b = pts[(car.idx + 1) % pts.length];
    const segLen = (car.idx + 1 < pts.length ? b.d : length) - a.d;
    const t = segLen > 0 ? (car.s - a.d) / segLen : 0;
    car.group.position.set(a.x + (b.x - a.x) * t, 0.1, a.z + (b.z - a.z) * t);
    const ahead = pts[(car.idx + 3) % pts.length];
    const yaw = Math.atan2(ahead.x - car.group.position.x, ahead.z - car.group.position.z);
    let d = Math.atan2(Math.sin(yaw - car.yaw), Math.cos(yaw - car.yaw));
    car.yaw += d * 0.25;
    car.group.rotation.y = car.yaw;
    car.limit = Math.min(a.limit, ahead.limit);
  }

  // obstacles: [{x, z}] (player, birds on foot)
  update(dt, obstacles, playerPos) {
    for (const car of this.traffic) {
      const p = car.group.position;
      const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
      let block = Infinity, byPlayer = false;
      if (car.ghostT <= 0) {
        const check = (ox, oz, isPlayer) => {
          const dx = ox - p.x, dz = oz - p.z, d = Math.hypot(dx, dz);
          if (d < 10 && d > 0.01 && (dx * fx + dz * fz) / d > 0.86) { if (d < block) { block = d; byPlayer = isPlayer; } }
        };
        for (const o of this.all) if (o !== car) check(o.group.position.x, o.group.position.z, false);
        for (const o of obstacles) check(o.x, o.z, !!o.player);
      } else car.ghostT -= dt;
      const gap = car.L / 2 + 2.5;
      let target = Math.min(car.cruise, car.limit);
      if (block < 10) target = block < gap ? 0 : target * Math.min(1, (block - gap) / 5);
      car.speed += (target - car.speed) * Math.min(1, dt * (target < car.speed ? 5 : 1.5));
      if (target < 0.3) {
        car.waitT += dt;
        if (byPlayer && car.waitT > 1.2 && car.honkT <= 0 && playerPos.distanceTo(p) < 25) { car.honkT = 4; this.onHonk && this.onHonk(); }
        if (car.waitT > 5) { car.ghostT = 2.5; car.waitT = 0; }
      } else car.waitT = 0;
      car.honkT -= dt;
      car.s += car.speed * dt;
      this.place(car);
      for (const w of car.wheels) w.g.rotation.x += car.speed * dt / car.T.r;
      if (car.driver) car.driver.update(dt);
      this.syncColliders(car);
    }
  }
}
