import * as THREE from 'three';
import { POSES } from './bird.js';
import { sfx } from './audio.js';

export const STATIONS = {
  heavy: { title: 'Heavy Bag', stat: 'power', sub: 'Hit J · K · L as each key reaches the box' },
  speed: { title: 'Speed Bag', stat: 'speed', sub: 'Rapid J / K — keep the rhythm!' },
  rope: { title: 'Jump Rope', stat: 'stamina', sub: 'Tap SPACE on every beat' },
  dodge: { title: 'Dodge Drill', stat: 'defense', sub: 'BLOCK (Shift) or DODGE (Space) the robo-punches' },
};
const LABEL = { KeyJ: 'J', KeyK: 'K', KeyL: 'L', Space: 'SPACE', ShiftLeft: 'BLOCK' };
const ALIASES = { ShiftRight: 'ShiftLeft', Mouse0: 'KeyJ', Mouse2: 'KeyK' };

function makeNotes(id) {
  const notes = [];
  let t = 1.8;
  if (id === 'heavy') {
    for (let i = 0; i < 20; i++) { notes.push({ t, key: ['KeyJ', 'KeyK', 'KeyL'][Math.floor(Math.random() * 3)] }); t += Math.random() < 0.25 ? 0.38 : 0.6 + Math.random() * 0.25; }
  } else if (id === 'speed') {
    let gap = 0.42;
    for (let i = 0; i < 32; i++) { notes.push({ t, key: i % 2 ? 'KeyK' : 'KeyJ' }); t += gap; gap = Math.max(0.24, gap - 0.007); }
  } else if (id === 'rope') {
    let gap = 0.55;
    for (let i = 0; i < 26; i++) { notes.push({ t, key: 'Space' }); t += gap; gap = Math.max(0.34, gap - 0.009); }
  } else {
    for (let i = 0; i < 18; i++) { notes.push({ t, key: Math.random() < 0.5 ? 'ShiftLeft' : 'Space' }); t += 0.65 + Math.random() * 0.35; }
  }
  return notes;
}

export class Training {
  constructor({ id, world, bird, ui, camera, onEnd }) {
    this.id = id; this.def = STATIONS[id]; this.world = world; this.bird = bird; this.ui = ui; this.camera = camera; this.onEnd = onEnd;
    this.station = world.stations[id];
    this.notes = makeNotes(id);
    this.t = 0; this.perfect = 0; this.good = 0; this.miss = 0; this.combo = 0; this.best = 0;
    this.hand = 0; this.jumpT = 0; this.bonk = 0; this.dodgeT = 0; this.done = false;
    this.end = this.notes[this.notes.length - 1].t + 1.2;

    this.el = document.getElementById('training');
    this.lane = document.getElementById('lane');
    document.getElementById('trTitle').textContent = this.def.title;
    document.getElementById('trSub').textContent = this.def.sub;
    this.judgeEl = document.getElementById('trJudge');
    this.comboEl = document.getElementById('trCombo');
    this.judgeEl.textContent = ''; this.comboEl.textContent = '';
    this.lane.querySelectorAll('.note').forEach((n) => n.remove());
    for (const n of this.notes) {
      const d = document.createElement('div');
      d.className = 'note k-' + n.key;
      d.textContent = LABEL[n.key];
      this.lane.appendChild(d);
      n.el = d;
    }
    this.el.classList.remove('hidden');

    // Place the bird at the station
    const s = this.station;
    bird.root.position.copy(s.pos);
    bird.root.rotation.y = s.face;
    bird.setPose(id === 'rope' ? 'droop' : 'guard', 12); bird.snap();
    if (id === 'rope') s.rope.visible = true;
    if (id === 'dodge') s.arm.rotation.y = 1.3;
    this.look = s.pos.clone().add(new THREE.Vector3(0, 1.5, 0));
  }

  judge(note, quality) {
    note.judged = quality;
    if (quality === 'miss') {
      this.miss++; this.combo = 0;
      note.el.classList.add('miss');
      sfx.bad();
      if (this.id === 'dodge') this.bonk = 1;
    } else {
      if (quality === 'perfect') this.perfect++; else this.good++;
      this.combo++; this.best = Math.max(this.best, this.combo);
      note.el.classList.add('hit');
      this.react(note, quality);
    }
    this.judgeEl.textContent = quality === 'perfect' ? 'PERFECT!' : quality === 'good' ? 'GOOD' : 'MISS';
    this.judgeEl.className = quality;
    this.comboEl.textContent = this.combo > 2 ? `${this.combo}x combo` : '';
  }

  react(note, q) {
    const s = this.station, b = this.bird;
    const strong = q === 'perfect' ? 1 : 0.6;
    if (this.id === 'heavy') {
      const P = { KeyJ: ['l', [-0.08, 1.7, 1.25]], KeyK: ['r', [-0.1, 1.65, 1.15]], KeyL: ['r', [0.05, 1.9, 1.05]] }[note.key];
      b.setHand(P[0], P[1], 40); this.punchT = 0.12;
      s.swingV += 3.5 * strong;
      sfx.punch(0.8 * strong);
    } else if (this.id === 'speed') {
      this.hand ^= 1;
      b.setHand(this.hand ? 'r' : 'l', [this.hand ? 0.12 : -0.12, 2.25, 0.95], 45); this.punchT = 0.08;
      s.swingV += (this.hand ? 9 : -9) * strong;
      sfx.block();
    } else if (this.id === 'rope') {
      this.jumpT = 0.28;
      sfx.whiff();
    } else if (this.id === 'dodge') {
      if (note.key === 'ShiftLeft') { b.setPose('block', 20); sfx.block(); this.dodgeT = -0.3; }
      else { this.dodgeT = 0.3; sfx.whiff(); }
    }
  }

  update(dt, input) {
    if (this.done) return;
    this.t += dt;
    const W = this.lane.clientWidth, hitX = W * 0.18, pps = W * 0.42;
    // Input
    for (const raw of ['KeyJ', 'KeyK', 'KeyL', 'Space', 'ShiftLeft', 'ShiftRight', 'Mouse0', 'Mouse2']) {
      if (!input.wasPressed(raw)) continue;
      const key = ALIASES[raw] || raw;
      let best = null, bd = 1;
      for (const n of this.notes) {
        if (n.judged || n.key !== key) continue;
        const d = Math.abs(n.t - this.t);
        if (d < bd) { bd = d; best = n; }
      }
      if (best && bd < 0.2) this.judge(best, bd < 0.08 ? 'perfect' : 'good');
      else { this.combo = 0; this.comboEl.textContent = ''; }
    }
    for (const n of this.notes) {
      if (!n.judged && this.t - n.t > 0.2) this.judge(n, 'miss');
      const x = hitX + (n.t - this.t) * pps;
      n.el.style.left = x + 'px';
      n.el.style.display = x > W + 40 || x < -60 ? 'none' : '';
    }

    // Animation
    const s = this.station, b = this.bird;
    if (this.punchT !== undefined) {
      this.punchT -= dt;
      if (this.punchT <= 0) { b.setPose('guard', 14); this.punchT = undefined; }
    }
    if (this.id === 'rope') {
      this.jumpT -= dt;
      const j = this.jumpT > 0 ? Math.sin((1 - this.jumpT / 0.28) * Math.PI) * 0.45 : 0;
      b.rig.position.y = j;
      s.rope.position.set(s.pos.x, s.pos.y + 1.25, s.pos.z);
      s.rope.rotation.set(this.t * 12, s.face, 0, 'YXZ');
      b.setPose({ l: [-0.75, 1.2, 0.2], r: [0.75, 1.2, 0.2] }, 10);
    }
    if (this.id === 'dodge') {
      // the bot swings at each note's time
      const upcoming = this.notes.find((n) => !n.judged || Math.abs(n.t - this.t) < 0.15);
      const near = upcoming && Math.abs(upcoming.t - this.t) < 0.18;
      s.swing = near ? 0 : 1.3;
      this.dodgeT += this.dodgeT > 0 ? -dt : dt;
      if (Math.abs(this.dodgeT) < 0.02) this.dodgeT = 0;
      b.rig.rotation.z = this.dodgeT > 0 ? 0.5 * Math.sin(this.dodgeT / 0.3 * Math.PI) : 0;
      if (this.dodgeT === 0 && this.bonk <= 0) b.setPose('guard', 10);
    }
    if (this.bonk > 0) {
      this.bonk -= dt * 3;
      b.rig.rotation.x = -0.4 * this.bonk;
      b.head.rotation.z = Math.sin(this.bonk * 20) * 0.3 * this.bonk;
    } else if (this.id !== 'rope') { b.rig.rotation.x = 0; }
    b.walk(dt, 0);
    b.update(dt);

    // Camera: side view of the station
    const off = new THREE.Vector3(4.4, 2.3, -1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), s.face);
    const camPos = s.pos.clone().add(off);
    this.camera.position.lerp(camPos, 1 - Math.exp(-5 * dt));
    this.camera.lookAt(this.look.clone().add(new THREE.Vector3(Math.sin(s.face) * 0.8, 0, Math.cos(s.face) * 0.8)));

    if (this.t > this.end) this.finish();
  }

  finish() {
    this.done = true;
    this.el.classList.add('hidden');
    const s = this.station, b = this.bird;
    if (this.id === 'rope') s.rope.visible = false;
    if (this.id === 'dodge') s.swing = 1.3;
    b.rig.rotation.set(0, 0, 0); b.rig.position.set(0, 0, 0); b.head.rotation.set(0, 0, 0);
    b.setPose('idle', 10);
    const total = this.notes.length;
    const acc = (this.perfect + this.good * 0.6) / total;
    this.onEnd({ stat: this.def.stat, acc, perfect: this.perfect, good: this.good, miss: this.miss, best: this.best, total });
  }
}
