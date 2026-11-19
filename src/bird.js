import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
const geoCache = {};
const g = (key, fn) => geoCache[key] || (geoCache[key] = fn());
const matCache = new Map();

export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...opts }));
  }
  return matCache.get(key);
}

// Glove positions in the bird's local space (bird faces +z).
export const POSES = {
  idle:  { l: [-0.62, 1.0, 0.25], r: [0.62, 1.0, 0.25] },
  guard: { l: [-0.3, 1.62, 0.62], r: [0.34, 1.55, 0.5] },
  block: { l: [-0.16, 1.9, 0.6], r: [0.16, 1.9, 0.6] },
  glide: { l: [-1.5, 1.5, -0.1], r: [1.5, 1.5, -0.1] },
  flapUp: { l: [-1.2, 2.3, -0.2], r: [1.2, 2.3, -0.2] },
  cheer: { l: [-0.45, 2.65, 0.2], r: [0.45, 2.65, 0.2] },
  droop: { l: [-0.5, 1.15, 0.45], r: [0.5, 1.15, 0.45] },
};

export const PALETTES = [
  { name: 'Blue Jay', body: 0x3a7bd5, belly: 0xf3e5c4, crest: 0x1e40af, glove: 0xd62828, trunks: 0xfacc15 },
  { name: 'Cardinal', body: 0xd62828, belly: 0xf8b4a0, crest: 0xb91c1c, glove: 0xfacc15, trunks: 0x111111 },
  { name: 'Goldfinch', body: 0xf7c81e, belly: 0xfff1b8, crest: 0x222222, glove: 0x2563eb, trunks: 0x222222 },
  { name: 'Parrot', body: 0x22a447, belly: 0xb6f09c, crest: 0xff3b3b, glove: 0xff8c00, trunks: 0x1d4ed8 },
  { name: 'Purple Martin', body: 0x6d28d9, belly: 0xd8c8ff, crest: 0x4c1d95, glove: 0x10b981, trunks: 0xffffff },
];

export function makeBird(opts = {}) {
  const o = {
    body: 0x3a7bd5, belly: 0xf3e5c4, beak: 0xffa41b, glove: 0xd62828, trunks: 0x1d1d1d,
    crest: 0xffd23f, legs: 0xff9f1c, beakLen: 0.42, beakW: 0.13, crestStyle: 'spike', brow: true,
    gloves: true, shadow: true, ...opts,
  };
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const add = (geo, m, parent = rig, shadow = o.shadow) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  };

  const body = add(g('body', () => new THREE.SphereGeometry(0.6, 14, 10)), mat(o.body));
  body.scale.set(1, 1.12, 0.92); body.position.y = 1.08;
  const belly = add(g('belly', () => new THREE.SphereGeometry(0.5, 12, 10)), mat(o.belly), rig, false);
  belly.scale.set(0.85, 1.0, 0.6); belly.position.set(0, 1.05, 0.27);
  if (o.gloves) {
    const trunks = add(g('trunks', () => new THREE.CylinderGeometry(0.6, 0.64, 0.38, 14)), mat(o.trunks));
    trunks.position.y = 0.72;
    const belt = add(g('belt', () => new THREE.CylinderGeometry(0.615, 0.615, 0.08, 14)), mat(0xffffff), rig, false);
    belt.position.y = 0.89;
  }
  const tail = add(g('tail', () => new THREE.ConeGeometry(0.32, 0.7, 4)), mat(o.body));
  tail.position.set(0, 0.95, -0.62); tail.rotation.x = -Math.PI / 2 - 0.6; tail.scale.set(1, 1, 0.35);

  const head = new THREE.Group(); head.position.y = 1.86; rig.add(head);
  add(g('head', () => new THREE.SphereGeometry(0.4, 14, 10)), mat(o.body), head);
  for (const s of [-1, 1]) {
    const eye = add(g('eye', () => new THREE.SphereGeometry(0.105, 10, 8)), mat(0xffffff), head, false);
    eye.position.set(0.16 * s, 0.08, 0.31);
    const pupil = add(g('pupil', () => new THREE.SphereGeometry(0.055, 8, 6)), mat(0x111111), head, false);
    pupil.position.set(0.17 * s, 0.08, 0.4);
    if (o.brow) {
      const brow = add(g('brow', () => new THREE.BoxGeometry(0.17, 0.045, 0.05)), mat(0x1a1a1a), head, false);
      brow.position.set(0.15 * s, 0.21, 0.35); brow.rotation.z = -0.35 * s;
    }
  }
  const beak = add(new THREE.ConeGeometry(o.beakW, o.beakLen, 8), mat(o.beak), head);
  beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.05, 0.34 + o.beakLen / 2);
  if (o.crestStyle === 'spike') {
    for (let i = 0; i < 3; i++) {
      const c = add(g('crest', () => new THREE.ConeGeometry(0.07, 0.34, 5)), mat(o.crest), head);
      c.position.set(0, 0.42 - i * 0.05, 0.06 - i * 0.13); c.rotation.x = -0.3 - i * 0.35;
    }
  } else if (o.crestStyle === 'tufts') {
    for (const s of [-1, 1]) {
      const c = add(g('tuft', () => new THREE.ConeGeometry(0.09, 0.32, 4)), mat(o.crest), head);
      c.position.set(0.22 * s, 0.38, 0); c.rotation.z = -0.45 * s;
    }
  }
  if (o.hat) {
    const brim = add(g('brim', () => new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16)), mat(0x111111), head);
    brim.position.y = 0.33;
    const top = add(g('hattop', () => new THREE.CylinderGeometry(0.26, 0.26, 0.42, 16)), mat(0x111111), head);
    top.position.y = 0.55;
    const band = add(g('hatband', () => new THREE.CylinderGeometry(0.265, 0.265, 0.08, 16)), mat(0xd62828), head, false);
    band.position.y = 0.39;
  }
  if (o.headband) {
    const hb = add(g('headband', () => new THREE.TorusGeometry(0.39, 0.05, 6, 20)), mat(o.headband), head, false);
    hb.rotation.x = Math.PI / 2; hb.position.y = 0.16;
  }

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0.22 * s, 0.56, 0); rig.add(hip);
    const shin = add(g('shin', () => new THREE.CylinderGeometry(0.055, 0.055, 0.5, 6)), mat(o.legs), hip);
    shin.position.y = -0.27;
    const foot = new THREE.Group(); foot.position.y = -0.53; hip.add(foot);
    for (const a of [-0.45, 0, 0.45]) {
      const toe = add(g('toe', () => new THREE.BoxGeometry(0.06, 0.05, 0.26)), mat(o.legs), foot, false);
      toe.position.set(Math.sin(a) * 0.1, 0, Math.cos(a) * 0.12); toe.rotation.y = a;
    }
    legs.push(hip);
  }

  const gloveGeo = o.gloves ? g('glove', () => new THREE.SphereGeometry(0.21, 12, 10)) : g('wingtip', () => new THREE.SphereGeometry(0.12, 8, 6));
  const armGeo = g('arm', () => { const c = new THREE.CylinderGeometry(0.09, 0.16, 1, 6); c.translate(0, 0.5, 0); return c; });
  const mk = (side) => {
    const glove = add(gloveGeo, mat(o.gloves ? o.glove : o.body));
    if (o.gloves) {
      glove.scale.set(1, 1, 1.15);
      const cuff = add(g('cuff', () => new THREE.CylinderGeometry(0.15, 0.15, 0.1, 10)), mat(0xffffff), glove, false);
      cuff.position.z = -0.2; cuff.rotation.x = Math.PI / 2;
    }
    const arm = add(armGeo, mat(o.body));
    const p = POSES.idle[side < 0 ? 'l' : 'r'];
    return { glove, arm, side, shoulder: new THREE.Vector3(0.52 * side, 1.38, 0.02), cur: new THREE.Vector3(...p), target: new THREE.Vector3(...p) };
  };
  const L = mk(-1), R = mk(1);

  const bird = {
    root, rig, head, legs, L, R, opts: o,
    walkPhase: 0, armSpeed: 14, bob: 0,
    setPose(name, speed) {
      const p = typeof name === 'string' ? POSES[name] : name;
      L.target.set(...p.l); R.target.set(...p.r);
      if (speed) bird.armSpeed = speed;
    },
    setHand(hand, xyz, speed) {
      (hand === 'l' ? L : R).target.set(...xyz);
      if (speed) bird.armSpeed = speed;
    },
    snap() { L.cur.copy(L.target); R.cur.copy(R.target); bird.update(0); },
    walk(dt, amount) {
      bird.walkPhase += dt * (4 + amount * 1.6);
      const a = Math.min(1, amount / 4);
      legs[0].rotation.x = Math.sin(bird.walkPhase) * 0.75 * a;
      legs[1].rotation.x = -Math.sin(bird.walkPhase) * 0.75 * a;
      bird.bob = Math.abs(Math.sin(bird.walkPhase)) * 0.08 * a;
    },
    update(dt) {
      const k = 1 - Math.exp(-bird.armSpeed * dt);
      for (const h of [L, R]) {
        if (dt > 0) h.cur.lerp(h.target, k);
        h.glove.position.copy(h.cur);
        tmp.copy(h.cur).sub(h.shoulder);
        const len = Math.max(0.05, tmp.length() - 0.15);
        h.arm.position.copy(h.shoulder);
        h.arm.quaternion.setFromUnitVectors(UP, tmp.normalize());
        h.arm.scale.set(1, len, 1);
      }
      head.position.y = 1.86 + bird.bob * 0.5;
      body.position.y = 1.08 + bird.bob;
    },
  };
  bird.update(0);
  return bird;
}

// A tiny low-poly flying bird for flocks / pigeons (no gloves). Returns {root, wingL, wingR}.
export function makeSmallBird(color = 0x555555, bellyColor = 0xdddddd, beakColor = 0xffa41b, s = 1) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(g('sbody', () => new THREE.SphereGeometry(0.25, 8, 6)), mat(color));
  body.scale.set(1, 0.9, 1.5); body.position.y = 0.3; body.castShadow = true;
  root.add(body);
  const belly = new THREE.Mesh(g('sbelly', () => new THREE.SphereGeometry(0.2, 8, 6)), mat(bellyColor));
  belly.scale.set(1, 0.8, 1.4); belly.position.set(0, 0.24, 0.05);
  root.add(belly);
  const head = new THREE.Mesh(g('shead', () => new THREE.SphereGeometry(0.16, 8, 6)), mat(color));
  head.position.set(0, 0.52, 0.3); root.add(head);
  const beak = new THREE.Mesh(g('sbeak', () => new THREE.ConeGeometry(0.05, 0.16, 5)), mat(beakColor));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.5, 0.48); root.add(beak);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(g('seye', () => new THREE.SphereGeometry(0.035, 6, 4)), mat(0x111111));
    eye.position.set(0.09 * sx, 0.56, 0.42); root.add(eye);
  }
  const wingGeo = g('swing', () => { const w = new THREE.BoxGeometry(0.55, 0.04, 0.32); w.translate(0.27, 0, 0); return w; });
  const wingL = new THREE.Group(); wingL.position.set(-0.15, 0.36, 0);
  const wl = new THREE.Mesh(wingGeo, mat(color)); wl.rotation.y = Math.PI; wingL.add(wl);
  const wingR = new THREE.Group(); wingR.position.set(0.15, 0.36, 0);
  wingR.add(new THREE.Mesh(wingGeo, mat(color)));
  root.add(wingL, wingR);
  const tail = new THREE.Mesh(g('stail', () => new THREE.BoxGeometry(0.22, 0.03, 0.3)), mat(color));
  tail.position.set(0, 0.32, -0.42); tail.rotation.x = 0.25; root.add(tail);
  root.scale.setScalar(s);
  return { root, head, wingL, wingR };
}

export function flapWings(sb, phase, amp = 0.9) {
  const a = Math.sin(phase) * amp;
  sb.wingL.rotation.z = a;
  sb.wingR.rotation.z = -a;
}
