import * as THREE from 'three';
import { POSES } from './bird.js';
import { sfx } from './audio.js';

export const PUNCHES = {
  jab:   { name: 'jab',   wind: 0.13, active: 0.08, rec: 0.17, cost: 6,  dmg: 6,  reach: 2.15, hand: 'l', windPos: [-0.32, 1.6, 0.35], hitPos: [-0.08, 1.72, 1.45], twist: 0.15 },
  hook:  { name: 'hook',  wind: 0.26, active: 0.1,  rec: 0.28, cost: 11, dmg: 11, reach: 1.9,  hand: 'r', windPos: [1.0, 1.6, 0.05],   hitPos: [-0.1, 1.7, 1.25],  twist: -0.45 },
  upper: { name: 'upper', wind: 0.32, active: 0.1,  rec: 0.34, cost: 15, dmg: 15, reach: 1.7,  hand: 'r', windPos: [0.4, 0.85, 0.55],  hitPos: [0.05, 2.15, 1.05], twist: -0.2 },
};
const JUDGES = ['Judge Hoot', 'Judge Coo', 'Judge Pip'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V2 = (x = 0, y = 0) => new THREE.Vector2(x, y);

class Fighter {
  constructor(bird, stats, name, isPlayer, eff = 1) {
    this.bird = bird; this.s = stats; this.name = name; this.isPlayer = isPlayer; this.eff = eff;
    this.maxHp = 100 + stats.stamina * 0.25; this.hp = this.maxHp;
    this.maxSt = 60 + stats.stamina * 0.8; this.st = this.maxSt;
    this.pos = V2(); this.yaw = 0; this.moveAmt = 0;
    this.action = null; this.buffer = null;
    this.stun = 0; this.blocking = false; this.dodgeT = 0; this.dodgeDir = V2(); this.invuln = 0;
    this.kd = 0; this.down = false; this.recoil = 0; this.knock = V2();
    this.points = 0; this.landed = 0; this.thrown = 0; this.taken = 0;
    this.rp = 0; this.rkd = 0; this.rLanded = 0;
    this.byType = { jab: [0, 0], hook: [0, 0], upper: [0, 0] };
    this.windMul = 1;
    this.blockHold = 0; this.think = 0.6; this.strafe = Math.random() < 0.5 ? 1 : -1; this.combo = 0; this.react = null; this.seen = null;
  }
  get tMul() { return 1.18 - this.s.speed / 200; }
  get moveSpeed() { return 2.3 + this.s.speed / 40; }
  canAct() { return !this.action && this.stun <= 0 && !this.down && this.dodgeT <= 0; }
  startPunch(type) {
    if (!this.canAct()) {
      if (this.action && this.action.phase !== 'wind') this.buffer = { type, t: 0.35 };
      return false;
    }
    const P = PUNCHES[type];
    if (this.st < P.cost * 0.4) return false;
    this.st = Math.max(0, this.st - P.cost);
    this.action = { type, P, phase: 'wind', t: 0, dur: P.wind * this.tMul * this.windMul };
    this.blocking = false;
    this.thrown++; this.byType[type][0]++;
    return true;
  }
}

export class Fight {
  constructor(opts) {
    Object.assign(this, opts); // scene, world, ui, particles, camera, center, bounds, rounds, roundTime, kind, onEnd, playerBird, oppBird, D, team
    this.D = this.D || { dealt: 1, taken: 1, mash: 1, aggr: 1, tempo: 1, telegraph: false };
    this.team = this.team || [];
    this.p = new Fighter(opts.playerBird, opts.playerStats, opts.playerName, true, opts.playerEff);
    this.o = new Fighter(opts.oppBird, opts.opp.stats, opts.opp.name, false, 1);
    this.o.skill = opts.opp.skill; this.o.style = opts.opp.style || 'balanced'; this.o.lvl = opts.opp.lvl;
    this.o.windMul = this.D.tempo;
    this.arena = this.kind === 'arena';
    this.ref = this.arena ? this.world.referee : null;
    if (this.ref) { this.ref.driven = true; this.ref.root.position.set(this.center.x - 2.3, this.center.y, this.center.z); }
    this.cards = JUDGES.map((name) => ({ name, p: 0, o: 0 }));
    this.round = 1;
    this.timeLeft = this.roundTime;
    this.state = 'intro'; this.stateT = 0;
    this.hitstop = 0; this.shake = 0; this.jumboT = 0;
    this.camMode = opts.camMode || 'shoulder';
    this.look = this.center.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.resetPositions();
    this.ui.showFight(this.p.name, this.o.name);
    this.ui.announce(this.introText || 'ROUND 1', 1.8);
    if (this.arena) this.world.flashRate = 2.5;
    sfx.bell();
    for (const t of this.team) t.react = 0;
  }

  resetPositions() {
    this.p.pos.set(0, 2.2); this.o.pos.set(0, -2.2);
    this.p.knock.set(0, 0); this.o.knock.set(0, 0);
    for (const f of [this.p, this.o]) {
      f.action = null; f.stun = 0; f.dodgeT = 0; f.blocking = false; f.buffer = null; f.sitting = false;
      f.bird.rig.rotation.set(0, 0, 0); f.bird.rig.position.set(0, 0, 0);
      f.rp = 0; f.rkd = 0; f.rLanded = 0;
    }
    this.place(this.p); this.place(this.o);
    this.p.yaw = Math.PI; this.o.yaw = 0;
  }

  place(f) {
    f.bird.root.position.set(this.center.x + f.pos.x, this.center.y, this.center.z + f.pos.y);
  }

  clampBounds(f) {
    const b = this.bounds;
    if (b.type === 'square') {
      f.pos.x = clamp(f.pos.x, -b.half, b.half);
      f.pos.y = clamp(f.pos.y, -b.half, b.half);
    } else {
      const l = f.pos.length();
      if (l > b.r) f.pos.multiplyScalar(b.r / l);
    }
  }

  update(dt, input) {
    if (input.wasPressed('KeyV')) {
      this.camMode = this.camMode === 'tv' ? 'shoulder' : 'tv';
      this.ui.toast(this.camMode === 'tv' ? 'Camera: TV broadcast' : 'Camera: over the shoulder');
      this.onCamMode && this.onCamMode(this.camMode);
    }
    if (this.hitstop > 0) { this.hitstop -= dt; dt *= 0.06; }
    this.stateT += dt;
    const { p, o } = this;

    if (this.state === 'intro') {
      if (this.stateT > 1.7) { this.state = 'fight'; this.stateT = 0; this.ui.announce('FIGHT!', 0.9); }
      this.stepFighter(p, o, dt, V2());
      this.stepFighter(o, p, dt, V2());
    } else if (this.state === 'fight') {
      this.timeLeft -= dt;
      const pm = this.playerControl(p, o, dt, input);
      const om = this.aiControl(o, p, dt);
      this.stepFighter(p, o, dt, pm);
      this.stepFighter(o, p, dt, om);
      this.separate();
      if (this.timeLeft <= 0 && this.state === 'fight') this.endRound();
    } else if (this.state === 'kd') {
      this.updateKnockdown(dt, input);
    } else if (this.state === 'break') {
      this.updateBreak(dt);
    } else if (this.state === 'over') {
      this.stepFighter(p, o, dt, V2()); this.stepFighter(o, p, dt, V2());
      if (this.stateT > 4 && !this.ended) { this.ended = true; this.cleanup(); this.onEnd(this.result); }
    }

    this.animate(p, o, dt);
    this.animate(o, p, dt);
    this.updateReferee(dt);
    this.updateTeam(dt);
    this.o.bird.setGlow(this.D.telegraph && o.action && o.action.phase === 'wind' ? 1.6 : 0);
    if (this.arena) {
      this.jumboT -= dt;
      if (this.jumboT <= 0) {
        this.jumboT = 0.5;
        const t = Math.max(0, Math.ceil(this.timeLeft));
        this.world.updateJumbotron([`${p.name.toUpperCase()} vs ${o.name.toUpperCase()}`, `ROUND ${this.round} · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, `Punches landed  ${p.landed} – ${o.landed}`]);
      }
    }
    this.ui.updateFight(this);
  }

  cleanup() {
    if (this.ref) { this.ref.driven = false; this.ref.root.position.copy(this.world.refHome); this.ref.setPose('folded', 8); this.ref.rig.rotation.set(0, 0, 0); }
    if (this.arena) {
      this.world.flashRate = 0;
      for (const s of this.world.stools) s.visible = false;
      this.world.cardBird.root.visible = false;
      this.world.updateJumbotron(['THE COOP COLISEUM', 'Fight Night in Featherton']);
    }
    for (const f of [this.p, this.o]) { f.bird.setGlow(0); f.bird.setCrest(0.6); }
  }

  playerControl(p, o, dt, input) {
    const f = o.pos.clone().sub(p.pos); const d = f.length() || 1; f.divideScalar(d);
    const right = V2(-f.y, f.x);
    const ax = input.axis();
    let move;
    if (this.camMode === 'tv') {
      // Screen-relative movement for the side-on camera (it looks along -x)
      move = V2(-ax.y, -ax.x);
    } else move = f.clone().multiplyScalar(ax.y).add(right.clone().multiplyScalar(ax.x));
    if (move.lengthSq() > 1) move.normalize();
    p.blocking = input.isDown('ShiftLeft', 'ShiftRight') && !p.action && p.stun <= 0 && !p.down;
    if (input.wasPressed('KeyJ', 'Mouse0', 'KeyU')) p.startPunch('jab');
    else if (input.wasPressed('KeyK', 'Mouse2', 'KeyI')) p.startPunch('hook');
    else if (input.wasPressed('KeyL', 'Mouse1', 'KeyO')) p.startPunch('upper');
    if (input.wasPressed('Space') && p.canAct() && p.st >= 8) {
      p.st -= 8; p.dodgeT = 0.22; p.invuln = 0.26;
      if (move.lengthSq() > 0.05) p.dodgeDir.copy(move).normalize();
      else p.dodgeDir.copy(f).multiplyScalar(-1);
      sfx.whiff();
    }
    return move.multiplyScalar(p.moveSpeed);
  }

  aiControl(ai, pl, dt) {
    const sk = ai.skill;
    const f = pl.pos.clone().sub(ai.pos); const d = f.length() || 1; f.divideScalar(d);
    const right = V2(-f.y, f.x);
    if (pl.action && pl.action !== ai.seen) {
      ai.seen = pl.action;
      if (Math.random() < sk * 0.8 && d < pl.action.P.reach + 0.7 && !ai.action) {
        ai.react = { t: Math.max(0.05, 0.22 - sk * 0.14 + Math.random() * 0.1), kind: (Math.random() < 0.65 || ai.st < 15) ? 'block' : 'dodge' };
      }
    }
    if (ai.react) {
      ai.react.t -= dt;
      if (ai.react.t <= 0) {
        if (ai.react.kind === 'block') ai.blockHold = 0.35 + Math.random() * 0.3;
        else if (ai.canAct() && ai.st > 12) {
          ai.st -= 10; ai.dodgeT = 0.22; ai.invuln = 0.24;
          ai.dodgeDir.copy(right).multiplyScalar(Math.random() < 0.5 ? 1 : -1).addScaledVector(f, -0.4).normalize();
        }
        ai.react = null;
      }
    }
    ai.blockHold -= dt;
    ai.blocking = ai.blockHold > 0 && !ai.action && ai.stun <= 0;

    const tired = ai.st < ai.maxSt * 0.22;
    const want = tired ? 3.0 : (ai.style === 'speedster' ? 1.85 : 1.55);
    const move = f.clone().multiplyScalar(clamp((d - want) * 1.6, -1, 1)).addScaledVector(right, ai.strafe * 0.45);

    ai.think -= dt;
    if (ai.think <= 0) {
      ai.think = (0.25 + Math.random() * 0.55 * (1.25 - sk)) / this.D.aggr;
      if (Math.random() < 0.25) ai.strafe *= -1;
      if (tired && Math.random() < 0.5) ai.blockHold = 0.6;
      const aggr = (0.3 + sk * 0.45 + (ai.style === 'brawler' ? 0.15 : 0) - (tired ? 0.3 : 0)) * this.D.aggr;
      const punish = pl.action && pl.action.phase === 'rec';
      if (d < 2.25 && ai.canAct() && ai.blockHold <= 0 && (Math.random() < aggr || (punish && Math.random() < sk))) {
        let type;
        if (d > 1.88) type = 'jab';
        else { const r = Math.random(); type = r < 0.45 ? 'jab' : r < 0.8 ? 'hook' : 'upper'; }
        if (d > PUNCHES[type].reach) type = 'jab';
        if (ai.startPunch(type)) ai.combo = Math.random() < sk * 0.6 ? (Math.random() < sk * 0.5 ? 2 : 1) : 0;
      }
    }
    if (!ai.action && ai.combo > 0 && ai.canAct() && d < 2.1) {
      ai.combo--;
      ai.startPunch(Math.random() < 0.5 ? 'jab' : (d < 1.7 && Math.random() < 0.4 ? 'upper' : 'hook'));
    }
    if (move.lengthSq() > 1) move.normalize();
    return move.multiplyScalar(ai.moveSpeed * (0.75 + sk * 0.25));
  }

  stepFighter(f, other, dt, move) {
    f.stun -= dt; f.invuln -= dt;
    f.recoil = Math.max(0, f.recoil - dt * 4);
    if (f.buffer) { f.buffer.t -= dt; if (f.buffer.t <= 0) f.buffer = null; }
    if (f.down) return;
    const before = f.pos.clone();
    if (f.dodgeT > 0) {
      f.dodgeT -= dt;
      f.pos.addScaledVector(f.dodgeDir, 9 * dt);
    } else if (f.stun <= 0) {
      let k = 1;
      if (f.blocking) k = 0.5;
      if (f.action) k = 0.3;
      f.pos.addScaledVector(move, k * dt);
    }
    f.pos.addScaledVector(f.knock, dt);
    f.knock.multiplyScalar(Math.exp(-8 * dt));
    this.clampBounds(f);
    f.moveAmt = before.distanceTo(f.pos) / Math.max(dt, 1e-4);

    if (!f.action && f.dodgeT <= 0) {
      const regen = (14 + f.s.stamina * 0.14) * (f.blocking ? 0.25 : 1) * (f.isPlayer ? 1 + (this.D.dealt - 1) * 0.6 : 1);
      f.st = Math.min(f.maxSt, f.st + regen * dt);
    }

    const a = f.action;
    if (a) {
      a.t += dt;
      if (a.t >= a.dur) {
        a.t = 0;
        if (a.phase === 'wind') {
          a.phase = 'active'; a.dur = a.P.active;
          this.resolveHit(f, other);
        } else if (a.phase === 'active') {
          a.phase = 'rec'; a.dur = a.P.rec * f.tMul;
        } else {
          f.action = null;
          if (f.buffer) { const t = f.buffer.type; f.buffer = null; f.startPunch(t); }
        }
      }
    }
  }

  separate() {
    const { p, o } = this;
    const d = p.pos.distanceTo(o.pos);
    const min = 1.15;
    if (d < min) {
      const n = d > 1e-4 ? p.pos.clone().sub(o.pos).divideScalar(d) : V2(1, 0);
      const push = (min - d) / 2;
      p.pos.addScaledVector(n, push); o.pos.addScaledVector(n, -push);
      this.clampBounds(p); this.clampBounds(o);
    }
  }

  resolveHit(att, def) {
    const P = att.action.P;
    const d = att.pos.distanceTo(def.pos);
    if (def.down || d > P.reach) { sfx.whiff(); return; }
    if (def.invuln > 0) {
      sfx.whiff();
      this.ui.callout(def.isPlayer ? 'Slipped it!' : 'Dodged!', '#93c5fd');
      return;
    }
    const dir = def.pos.clone().sub(att.pos).normalize();
    const stamF = 0.5 + 0.5 * clamp((att.st / att.maxSt) * 1.6, 0, 1);
    let dmg = P.dmg * (0.55 + att.s.power / 75) * (1 - def.s.defense / 220) * stamF * att.eff;
    dmg *= att.isPlayer ? this.D.dealt : this.D.taken;
    const hitPos = def.bird.root.position.clone().add(new THREE.Vector3(0, 1.8, 0));

    if (def.blocking) {
      const through = P.name === 'upper' ? 0.32 : 0.12;
      def.st -= dmg * (def.isPlayer ? 1.2 : 1.5);
      def.hp -= dmg * through;
      att.points += dmg * 0.3; att.rp += dmg * 0.3;
      def.knock.copy(dir).multiplyScalar(2.2);
      sfx.block();
      this.particles.burst(hitPos, 0xffffff, 3, 2);
      if (def.st <= 0) {
        def.st = 0; def.blocking = false; def.blockHold = 0; def.stun = 0.75;
        this.ui.callout('GUARD BROKEN!', '#fb923c');
      }
      if (def.hp <= 0) def.hp = 1;
      return;
    }
    const counter = def.action && def.action.phase === 'wind';
    if (counter) dmg *= 1.4;
    def.hp -= dmg; def.taken += dmg;
    att.points += dmg + (counter ? 3 : 0); att.rp += dmg + (counter ? 3 : 0);
    att.landed++; att.rLanded++; att.byType[P.name][1]++;
    def.action = null; def.buffer = null;
    def.stun = 0.22 + (P.name === 'upper' ? 0.18 : 0) + (counter ? 0.1 : 0);
    def.recoil = 1;
    def.knock.copy(dir).multiplyScalar(1.5 + dmg * 0.25);
    def.bird.setDamage(clamp(def.taken / (def.maxHp * 2.2), 0, 1));
    att.bird.setCrest(1);
    this.particles.burst(hitPos, def.bird.opts.body, 5 + Math.round(dmg * 0.6), 4 + dmg * 0.2);
    if (Math.random() < 0.4) this.particles.burst(hitPos, 0xcfe8ff, 3, 2.5);
    sfx.punch(dmg / 10);
    if (dmg > 12) sfx.ooh();
    this.shake = Math.min(0.5, 0.08 + dmg * 0.018);
    this.hitstop = 0.04 + dmg * 0.004;
    this.world.crowdHype = Math.min(2, this.world.crowdHype + dmg * 0.04);
    for (const t of this.team) t.react = att.isPlayer ? 0.7 : -0.6;
    if (counter) this.ui.callout('COUNTER!', '#fde047');
    else if (P.name === 'upper' && dmg > 14) this.ui.callout('BIG UPPERCUT!', '#fca5a5');
    if (def.hp <= 0) this.knockdown(def, att);
  }

  knockdown(def, att) {
    def.hp = 0; def.down = true; def.kd++; def.rkd++; def.action = null; def.blocking = false; def.dodgeT = 0;
    this.state = 'kd'; this.stateT = 0; this.count = 0; this.countT = 0; this.kdVictim = def; this.kdAtt = att;
    def.bird.setCrest(0.05);
    this.ui.announce('KNOCKDOWN!', 1.3, def.isPlayer);
    sfx.cheer(0.6);
    this.world.crowdHype = 2;
    this.hitstop = 0.25;
    this.shake = 0.6;
    if (def.isPlayer) { this.mash = 0; }
    else {
      const chance = clamp(1.0 - def.kd * 0.3 + def.lvl / 300 - (this.p.s.power - def.s.defense) / 300 - (this.D.dealt - 1) * 0.35, 0.05, 0.95);
      def.getUpAt = Math.random() < chance ? 3 + Math.floor(Math.random() * 5) : 99;
    }
  }

  updateKnockdown(dt, input) {
    const v = this.kdVictim, a = this.kdAtt;
    const away = a.pos.clone().sub(v.pos);
    const dist = away.length() || 1;
    const mv = dist < 3.5 ? away.normalize().multiplyScalar(a.moveSpeed * 0.8) : V2();
    this.stepFighter(a, v, dt, mv);
    v.stun = 0;
    if (v.kd >= 3 && this.stateT > 1.8) { this.finish(a, 'TKO'); return; }
    if (this.stateT < 1.0) return;
    this.countT += dt;
    if (this.countT >= 0.85) {
      this.countT = 0; this.count++;
      this.ui.announce(String(this.count), 0.6, v.isPlayer);
      this.refCount = 0.35;
      if (this.count >= 10) { this.finish(a, 'KO'); return; }
    }
    if (v.isPlayer) {
      this.ui.showGetUp(true, this.mash / 100);
      if (input.wasPressed('KeyJ', 'KeyK', 'KeyL', 'Space', 'Mouse0', 'Mouse2')) this.mash += Math.max(4, 10 - v.kd * 2) * this.D.mash;
      this.mash = Math.max(0, this.mash - dt * 12);
      if (this.mash >= 100 && this.count >= 2) this.getUp(v);
    } else if (this.count >= v.getUpAt) {
      this.getUp(v);
    }
  }

  getUp(f) {
    f.down = false;
    f.hp = f.maxHp * Math.max(0.2, 0.55 - 0.12 * f.kd + (f.isPlayer ? (this.D.mash - 1) * 0.1 : 0));
    f.st = Math.max(f.st, f.maxSt * 0.5);
    f.stun = 0.4;
    f.bird.setCrest(0.5);
    this.ui.showGetUp(false);
    this.state = 'fight'; this.stateT = 0;
    this.ui.announce(f.isPlayer ? 'BACK UP!' : 'BACK UP!', 0.9);
  }

  // 10-point must system for each judge.
  scoreRound() {
    const { p, o } = this;
    for (const c of this.cards) {
      const ps = p.rp * (0.85 + Math.random() * 0.3), os = o.rp * (0.85 + Math.random() * 0.3);
      let sp = 10, so = 10;
      if (p.rkd !== o.rkd) {
        // A knockdown round goes 10-8 (or wider) to the fighter who scored it.
        if (p.rkd > o.rkd) sp = 9 - (p.rkd - o.rkd); else so = 9 - (o.rkd - p.rkd);
      } else if (Math.abs(ps - os) > 2.5 || Math.random() < 0.6) {
        if (ps >= os) so = 9; else sp = 9;
      }
      c.p += Math.max(6, sp); c.o += Math.max(6, so);
    }
  }

  endRound() {
    sfx.bell();
    this.scoreRound();
    if (this.round >= this.rounds) {
      const { p, o } = this;
      let pw = 0, ow = 0;
      for (const c of this.cards) { if (c.p > c.o) pw++; else if (c.o > c.p) ow++; }
      const cardsText = this.cards.map((c) => `${c.name} ${Math.max(c.p, c.o)}–${Math.min(c.p, c.o)} ${c.p > c.o ? p.name : c.o > c.p ? o.name : '(even)'}`);
      let method, winner;
      if (pw === ow) { method = 'Draw'; winner = null; }
      else {
        winner = pw > ow ? p : o;
        const wv = Math.max(pw, ow), lv = Math.min(pw, ow), draws = 3 - pw - ow;
        method = wv === 3 ? 'Unanimous Decision' : (lv === 1 ? 'Split Decision' : (draws ? 'Majority Decision' : 'Decision'));
      }
      this.cardsText = cardsText;
      this.finish(winner, method);
      return;
    }
    this.state = 'break'; this.stateT = 0;
    this.ui.announce(`END OF ROUND ${this.round}`, 1.8);
    for (const f of [this.p, this.o]) {
      f.hp = Math.min(f.maxHp, f.hp + f.maxHp * (f.isPlayer ? 0.12 + (this.D.dealt - 1) * 0.3 : 0.12));
      f.st = f.maxSt;
    }
    this.cornerAdvice();
    if (this.arena) {
      for (const s of this.world.stools) s.visible = true;
      const cb = this.world.cardBird;
      cb.root.visible = true; cb.driven = true;
      this.world.setCardSign(`ROUND ${this.round + 1}`);
    }
  }

  cornerAdvice() {
    const { p, o } = this;
    const who = this.team[0] ? this.team[0].name : 'Coach';
    let tip;
    if (o.rLanded > p.rLanded + 3) tip = 'You\'re getting tagged! Hold Shift when they wind up, then counter while they recover.';
    else if (p.st < p.maxSt * 0.35) tip = 'Breathe! You\'re swinging wild. Jab, jab, then the hook.';
    else if (o.st < o.maxSt * 0.35) tip = `${o.name} is gassed. Push forward and let your hands go!`;
    else if (o.hp < o.maxHp * 0.4) tip = 'They\'re hurt! Uppercuts up close — finish it!';
    else if (p.hp < p.maxHp * 0.4) tip = 'Stay off the ropes. Use Space to slip their big shots.';
    else tip = 'Looking sharp! Keep the jab in their face and look for the counter.';
    this.ui.speech(who, tip, 3.2);
    sfx.chirp();
  }

  updateBreak(dt) {
    const { p, o } = this;
    if (this.arena) {
      const h = this.bounds.half - 0.15;
      for (const [f, s] of [[p, 1], [o, -1]]) {
        const target = V2(s * h, s * h);
        const to = target.clone().sub(f.pos);
        if (to.length() > 0.15) { f.pos.addScaledVector(to.normalize(), Math.min(to.length(), 3 * dt)); f.sitting = false; }
        else f.sitting = true;
        f.moveAmt = f.sitting ? 0 : 3;
      }
      const cb = this.world.cardBird;
      const t = clamp(this.stateT / 3.2, 0, 1) * 4;
      const side = Math.floor(t) % 4, u = t - Math.floor(t);
      const pts = [[-2.6, 2.6], [2.6, 2.6], [2.6, -2.6], [-2.6, -2.6], [-2.6, 2.6]];
      const a = pts[side], b = pts[side + 1];
      cb.root.position.set(this.center.x + a[0] + (b[0] - a[0]) * u, this.center.y, this.center.z + a[1] + (b[1] - a[1]) * u);
      cb.root.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
      cb.setPose({ l: [-0.4, 2.7, 0.2], r: [0.4, 2.7, 0.2] }, 10);
      cb.walk(dt, 3); cb.update(dt);
    } else {
      p.sitting = false; o.sitting = false;
    }
    if (this.stateT > 3.4) {
      this.round++; this.timeLeft = this.roundTime;
      if (this.arena) {
        for (const s of this.world.stools) s.visible = false;
        this.world.cardBird.root.visible = false; this.world.cardBird.driven = false;
      }
      this.resetPositions();
      this.state = 'intro'; this.stateT = 0;
      this.ui.announce(this.round === this.rounds ? 'FINAL ROUND' : `ROUND ${this.round}`, 1.6);
      sfx.bell();
    }
  }

  finish(winner, method) {
    if (this.state === 'over') return;
    this.state = 'over'; this.stateT = 0;
    this.ui.showGetUp(false);
    const win = winner === this.p;
    this.ui.announce(win ? 'YOU WIN!' : winner ? 'YOU LOSE' : 'DRAW', 2.5, !win && !!winner);
    sfx.bell(); sfx.cheer(0.7);
    this.world.crowdHype = 2;
    this.winner = winner;
    if (winner) winner.bird.setCrest(1);
    for (const t of this.team) t.react = win ? 3 : -2;
    this.result = {
      win, draw: !winner, method, round: this.round, cards: this.cardsText || null,
      landed: this.p.landed, thrown: this.p.thrown, oLanded: this.o.landed, oThrown: this.o.thrown, kdGiven: this.o.kd, kdTaken: this.p.kd,
      byType: this.p.byType,
    };
  }

  updateReferee(dt) {
    const ref = this.ref;
    if (!ref) return;
    const { p, o } = this;
    let target;
    const mid = p.pos.clone().add(o.pos).multiplyScalar(0.5);
    const f = o.pos.clone().sub(p.pos); if (f.lengthSq() < 1e-4) f.set(0, -1); f.normalize();
    const right = V2(-f.y, f.x);
    let faceAt = mid;
    if (this.state === 'kd') {
      const v = this.kdVictim.pos;
      target = v.clone().add(V2(1.3, 0.6));
      faceAt = v;
      this.refCount = (this.refCount || 0) - dt;
      ref.setPose(this.refCount > 0 ? { l: [-0.5, 1.1, 0.4], r: [0.3, 2.6, 0.5] } : 'droop', 14);
    } else if (this.state === 'over' && this.winner) {
      target = this.winner.pos.clone().add(V2(0.9, 0.9));
      faceAt = V2(0, 8);
      ref.setPose(this.stateT > 0.8 ? { l: [-0.9, 2.4, 0.1], r: [0.5, 1.1, 0.3] } : 'droop', 8);
    } else if (this.state === 'break') {
      target = V2(-this.bounds.half, this.bounds.half);
      ref.setPose('folded', 6);
    } else {
      target = mid.clone().addScaledVector(right, -2.3);
      ref.setPose('folded', 6);
    }
    const h = this.bounds.half + 0.3;
    target.x = clamp(target.x, -h, h); target.y = clamp(target.y, -h, h);
    const cur = V2(ref.root.position.x - this.center.x, ref.root.position.z - this.center.z);
    const to = target.clone().sub(cur);
    const step = Math.min(to.length(), 3.2 * dt);
    if (to.length() > 0.05) cur.addScaledVector(to.normalize(), step);
    ref.root.position.set(this.center.x + cur.x, this.center.y, this.center.z + cur.y);
    ref.root.rotation.y = Math.atan2(faceAt.x - cur.x, faceAt.y - cur.y);
    ref.walk(dt, step / Math.max(dt, 1e-4)); ref.update(dt);
  }

  updateTeam(dt) {
    for (const t of this.team) {
      const b = t.bird;
      t.react = (t.react || 0);
      if (t.react > 0) { t.react = Math.max(0, t.react - dt); b.setPose('cheer', 12); b.root.position.y = t.base.y + Math.abs(Math.sin(t.react * 12)) * 0.35; b.setCrest(1); }
      else if (t.react < 0) { t.react = Math.min(0, t.react + dt); b.setPose({ l: [-0.25, 2.0, 0.55], r: [0.25, 2.0, 0.55] }, 10); b.root.position.y = t.base.y; b.setCrest(0.2); }
      else { b.setPose('folded', 6); b.root.position.y = t.base.y; b.setCrest(0.6); }
      const pp = this.p.bird.root.position;
      b.root.rotation.y = Math.atan2(pp.x - b.root.position.x, pp.z - b.root.position.z);
      b.walk(dt, 0); b.update(dt);
    }
  }

  animate(f, other, dt) {
    const b = f.bird;
    this.place(f);
    const dx = other.pos.x - f.pos.x, dz = other.pos.y - f.pos.y;
    let targetYaw = Math.atan2(dx, dz);
    if (f.sitting) targetYaw = Math.atan2(-f.pos.x, -f.pos.y);
    const dy = Math.atan2(Math.sin(targetYaw - f.yaw), Math.cos(targetYaw - f.yaw));
    f.yaw += dy * Math.min(1, dt * 14);
    b.root.rotation.y = f.yaw;

    let leanX = 0, twist = 0, roll = 0, rigY = 0;
    if (f.down) {
      b.setPose('droop', 6);
      b.rig.rotation.x += (-1.45 - b.rig.rotation.x) * Math.min(1, dt * 6);
      b.rig.position.y += (0.45 - b.rig.position.y) * Math.min(1, dt * 6);
      b.walk(dt, 0); b.update(dt);
      return;
    }
    if (f.sitting) {
      b.setPose({ l: [-0.5, 0.95, 0.55], r: [0.5, 0.95, 0.55] }, 6);
      b.rig.position.y += (-0.32 - b.rig.position.y) * Math.min(1, dt * 6);
      b.legs[0].rotation.x = b.legs[1].rotation.x = -1.1;
      b.rig.rotation.set(0, 0, 0);
      b.update(dt);
      return;
    }
    if (this.state === 'over') {
      if (f === this.winner) { b.setPose('cheer', 10); rigY = Math.abs(Math.sin(this.stateT * 6)) * 0.3; }
      else b.setPose('droop', 6);
    } else if (f.action) {
      const P = f.action.P, a = f.action;
      const off = P.hand === 'l' ? 'r' : 'l';
      b.setHand(off, POSES.guard[off]);
      if (a.phase === 'wind') { b.setHand(P.hand, P.windPos, 18); twist = P.name === 'hook' ? 0.35 : 0.05; }
      else if (a.phase === 'active') { b.setHand(P.hand, P.hitPos, 40); leanX = 0.18; twist = P.twist; }
      else { b.setHand(P.hand, POSES.guard[P.hand], 12); leanX = 0.06; }
    } else if (f.stun > 0) {
      b.setPose('droop', 10);
    } else if (f.blocking) {
      b.setPose('block', 18); leanX = 0.08;
    } else {
      b.setPose('guard', 12);
    }
    if (f.dodgeT > 0) {
      const local = f.dodgeDir.x * Math.cos(f.yaw) - f.dodgeDir.y * Math.sin(f.yaw);
      roll = -local * 0.45; rigY = -0.18; leanX += 0.15;
    }
    leanX -= f.recoil * 0.4;
    // Hurt fighters wobble on their legs
    const hurt = f.hp < f.maxHp * 0.25 && this.state === 'fight';
    if (hurt) roll += Math.sin(this.stateT * 4.5 + (f.isPlayer ? 0 : 2)) * 0.12;
    const k = Math.min(1, dt * 14);
    b.rig.rotation.x += (leanX - b.rig.rotation.x) * k;
    b.rig.rotation.y += (twist - b.rig.rotation.y) * k;
    b.rig.rotation.z += (roll - b.rig.rotation.z) * k;
    b.rig.position.y += (rigY - b.rig.position.y) * k;
    b.head.rotation.z = Math.sin(f.recoil * 12) * f.recoil * 0.4;
    if (this.state === 'fight' && f.stun <= 0 && !f.action) b.setCrest(0.85);
    if (f.stun > 0) b.setCrest(0.3);
    const bounce = this.state === 'fight' ? Math.abs(Math.sin(performance.now() / 180 + (f.isPlayer ? 0 : 1))) * 0.05 : 0;
    b.root.position.y += bounce;
    b.walk(dt, f.moveAmt);
    b.update(dt);
  }

  updateCamera(cam, dt) {
    const P = this.p.bird.root.position, O = this.o.bird.root.position;
    if (this.camMode === 'tv') {
      const mid = P.clone().lerp(O, 0.5);
      const desired = new THREE.Vector3(this.center.x + 9.5, this.center.y + 3.8, this.center.z + (mid.z - this.center.z) * 0.5);
      cam.position.lerp(desired, 1 - Math.exp(-4 * dt));
      this.look.lerp(mid.add(new THREE.Vector3(0, 1.3, 0)), 1 - Math.exp(-6 * dt));
    } else {
      const f = new THREE.Vector3(O.x - P.x, 0, O.z - P.z);
      if (f.lengthSq() < 1e-4) f.set(0, 0, -1);
      f.normalize();
      const right = new THREE.Vector3(-f.z, 0, f.x);
      const wide = this.state === 'kd' || this.state === 'over' || this.state === 'break';
      const dist = wide ? 6.5 : 4.3, side = wide ? 3 : 1.5, h = wide ? 3.6 : 2.7;
      const desired = P.clone().addScaledVector(f, -dist).addScaledVector(right, side).add(new THREE.Vector3(0, h, 0));
      cam.position.lerp(desired, 1 - Math.exp(-5 * dt));
      const lookT = P.clone().lerp(O, 0.6).add(new THREE.Vector3(0, 1.4, 0));
      this.look.lerp(lookT, 1 - Math.exp(-8 * dt));
    }
    if (this.shake > 0.001) {
      cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake));
      this.shake *= Math.exp(-10 * dt);
    }
    cam.lookAt(this.look);
  }
}
