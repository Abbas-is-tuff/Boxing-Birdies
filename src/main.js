import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeBird, SPECIES } from './bird.js';
import { World, lerpAngle, RING, RING_CORNERS, HOME, GYM, SHOP, ARENA, TOWER, WORLD_R, TEAM_SPOTS } from './world.js';
import { Career, SHOP_ITEMS, statsFor, MY_BIRDS, DIFFICULTY } from './career.js';
import { Fight } from './fight.js';
import { Training, STATIONS } from './training.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { sfx } from './audio.js';
import { Particles } from './particles.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const TIME_SCALE = 1; // game minutes per real second

// ---------- settings ----------
const SETTINGS_KEY = 'boxing-birdies-settings';
const settings = (() => {
  const base = { quality: (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'low' : 'high', cam: 'shoulder' };
  try { Object.assign(base, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignore */ }
  const q = new URLSearchParams(location.search).get('q');
  if (q === 'low' || q === 'high') base.quality = q;
  return base;
})();
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.65;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 700);
camera.position.set(0, 3, 26);

let composer = null;
function applyQuality() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality === 'high' ? 2 : 1.25));
  if (settings.quality === 'high') {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.5, 1.0));
    composer.addPass(new OutputPass());
  } else composer = null;
}
applyQuality();
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (composer) composer.setSize(innerWidth, innerHeight);
});

const ui = new UI();
const input = new Input(renderer.domElement);
input.onTouchEnabled = () => { if (G.mode !== 'title') ui.el.touch.classList.remove('hidden'); };
const world = new World(scene, renderer, settings.quality);
const particles = new Particles(scene);
world.onPigeonScatter = () => { if (Math.random() < 0.3) sfx.flap(); };

const G = {
  mode: 'title', career: null, player: null, team: [],
  cam: { yaw: 0, pitch: 0.36, dist: 8.5 },
  fight: null, training: null, hudT: 0, mapT: 0, saveT: 0, titleT: 0, audioT: 0,
};

const speciesOf = (b) => SPECIES[b.species];
const callOf = (species) => { if (species.startsWith('cockatiel')) sfx.whistle(); else if (species.startsWith('lovebird')) sfx.lovebird(); else sfx.chirp(); };

// ---------- title screen: your three birds ----------
const preview = { birds: [], sel: 0, diff: 'rookie' };
function buildPreview() {
  MY_BIRDS.forEach((b, i) => {
    const bird = makeBird({ species: b.species, glove: b.glove, trunks: b.trunks, trim: b.trim });
    bird.root.position.set((i - 1) * 2.3, 0.09, 18 + (i === 1 ? 0.4 : 0));
    bird.root.rotation.y = (1 - i) * 0.25;
    bird.setPose('guard'); bird.snap();
    scene.add(bird.root);
    preview.birds.push(bird);
  });
}

function buildTitle() {
  const menu = document.getElementById('titleMenu');
  const saved = Career.load();
  if (saved) { preview.sel = Math.max(0, MY_BIRDS.findIndex((b) => b.id === saved.birdId)); preview.diff = saved.difficulty; }
  const render = () => {
    const b = MY_BIRDS[preview.sel];
    menu.innerHTML = `
      <div class="bird-cards">${MY_BIRDS.map((x, i) => `<button class="bird-card${i === preview.sel ? ' sel' : ''}" data-i="${i}"><span class="nm">${x.name}</span><span class="sp">${speciesOf(x).label}</span></button>`).join('')}</div>
      <p class="bird-bio">${b.bio} <span class="muted">(${speciesOf(b).weight})</span></p>
      <div class="diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-d="${k}" class="${k === preview.diff ? 'sel' : ''}">${d.label}</button>`).join('')}</div>
      <p class="diff-desc">${DIFFICULTY[preview.diff].desc}</p>
      <div class="buttons">
        ${saved ? `<button id="contBtn">Continue · ${saved.name}, Day ${saved.day} (${saved.rankLabel})</button>` : ''}
        <button id="newBtn" class="${saved ? 'secondary' : ''}">New career as ${b.name}</button>
      </div>
      <p class="muted" style="font-size:12px;margin:8px 0 0">The other two birds work your corner and spar with you.</p>`;
    menu.querySelectorAll('.bird-card').forEach((el) => el.onclick = () => { preview.sel = +el.dataset.i; sfx.unlock(); callOf(MY_BIRDS[preview.sel].species); render(); });
    menu.querySelectorAll('.diff button').forEach((el) => el.onclick = () => { preview.diff = el.dataset.d; render(); });
    document.getElementById('newBtn').onclick = () => {
      sfx.unlock();
      const go = () => { Career.wipe(); startGame(Career.create(MY_BIRDS[preview.sel].id, preview.diff), true); };
      if (saved) ui.modal('Start over?', `<p>This replaces ${saved.name}'s saved career.</p>`, [{ label: 'Cancel', secondary: true }, { label: 'Start new career', onClick: go }]);
      else go();
    };
    if (saved) document.getElementById('contBtn').onclick = () => { sfx.unlock(); startGame(saved, false); };
  };
  render();
  buildPreview();
}

// ---------- start / player / team ----------
function startGame(career, isNew) {
  G.career = career;
  for (const b of preview.birds) scene.remove(b.root);
  preview.birds = [];
  document.getElementById('title').classList.add('hidden');
  const me = career.bird;
  const bird = makeBird({ species: me.species, glove: me.glove, trunks: me.trunks, trim: me.trim });
  scene.add(bird.root);
  G.player = { bird, pos: new THREE.Vector3(HOME.x, 0, HOME.z - 11), vel: new THREE.Vector3(), yaw: Math.PI, onGround: true, flight: 100, flapT: 0, gliding: false };
  G.cam.yaw = 0;
  G.team = career.team.map((def, i) => {
    const tb = makeBird({ species: def.species, gloves: false });
    const base = new THREE.Vector3(TEAM_SPOTS[i].x, 0.02, TEAM_SPOTS[i].z);
    tb.root.position.copy(base);
    tb.root.rotation.y = Math.PI;
    scene.add(tb.root);
    return { def, name: def.name, bird: tb, base: base.clone(), home: base.clone(), hopT: rand(1, 4), greeted: false, react: 0 };
  });
  world.placeFeathers(career.feathers);
  refreshChallengers();
  world.updateRankBoard(career.rankings(), career.name);
  ui.showHUD(true);
  if (input.touch) ui.el.touch.classList.remove('hidden');
  G.mode = 'world';
  const [t1, t2] = career.team;
  if (isNew) {
    ui.modal(`${career.name} goes pro!`, `
      <p><b>${career.name}</b> the ${speciesOf(me).label.toLowerCase()} is an unranked fighter with big dreams: become the <b>Undisputed Featherweight Champion</b> of Featherton.</p>
      <p><b>${t1.name}</b> and <b>${t2.name}</b> are in your corner. They're in the yard by your nest: talk to them to spar, and they'll cheer you on at every fight.</p>
      <p>🏋️ <b>Feather Fists Gym</b> (east): train Power, Speed, Stamina and Defense.<br>
      🥊 <b>The Coop Coliseum</b> (south): Promoter Pecksworth books ranked fights.<br>
      🌻 <b>Seed & Feed</b> (west): food for energy, plus gear.<br>
      ❗ Birds with a <b>!</b> want a street fight. 🪶 20 golden feathers are hidden around town.</p>
      <p class="muted">You can fly: tap Space in the air to flap, hold it to glide. Watch the wing meter. Difficulty: ${career.D.label}.</p>`,
      [{ label: 'Let\'s fly!', onClick: () => callOf(me.species) }]);
  } else ui.toast(`Welcome back, ${career.name}! Day ${career.day}.`);
}

function refreshChallengers() {
  const c = G.career;
  const spread = c.difficulty === 'rookie' ? [-6, 1] : c.difficulty === 'pro' ? [-5, 4] : [-6, 6];
  world.refreshChallengers(c.avg, c.streetBeaten, spread);
}

function updateTeam(dt) {
  const pp = G.player.pos;
  for (const t of G.team) {
    const b = t.bird, r = b.root;
    const d = Math.hypot(pp.x - r.position.x, pp.z - r.position.z);
    if (d < 7 && !t.greeted) { t.greeted = true; callOf(t.def.species); }
    if (d > 14) t.greeted = false;
    t.hopT -= dt;
    if (t.hopT <= 0 && !t.hop) {
      t.hopT = rand(1.5, 4.5);
      const target = t.home.clone().add(new THREE.Vector3(rand(-1.6, 1.6), 0, rand(-0.6, 0.6)));
      t.hop = { from: r.position.clone(), to: target, t: 0 };
    }
    if (t.hop) {
      t.hop.t += dt * 2.2;
      const k = Math.min(1, t.hop.t);
      r.position.lerpVectors(t.hop.from, t.hop.to, k);
      r.position.y = t.home.y + Math.sin(k * Math.PI) * 0.35;
      r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(t.hop.to.x - t.hop.from.x, t.hop.to.z - t.hop.from.z), dt * 10);
      if (k >= 1) { t.hop = null; r.position.y = t.home.y; }
    } else if (d < 9) {
      r.rotation.y = lerpAngle(r.rotation.y, Math.atan2(pp.x - r.position.x, pp.z - r.position.z), dt * 5);
    }
    b.setPose('folded', 6);
    b.setCrest(d < 6 ? 1 : 0.6);
    b.idleLook = d >= 6;
    b.walk(dt, 0); b.update(dt);
  }
}

function placeTeam(spots, faceTo) {
  G.team.forEach((t, i) => {
    const s = spots[i] || spots[0];
    t.bird.root.position.set(s.x, s.y ?? 0.02, s.z);
    t.base = t.bird.root.position.clone();
    t.hop = null;
    if (faceTo) t.bird.root.rotation.y = Math.atan2(faceTo.x - s.x, faceTo.z - s.z);
  });
}
function sendTeamHome() {
  G.team.forEach((t) => { t.bird.root.visible = true; t.bird.root.position.copy(t.home); t.base = t.home.clone(); t.react = 0; t.bird.root.position.y = t.home.y; });
}

// ---------- world update ----------
const tmpV = new THREE.Vector3();
function updatePlayer(dt) {
  const c = G.career, pl = G.player, b = pl.bird, D = c.D;
  G.cam.yaw -= input.mouseDX * 0.005;
  G.cam.pitch = clamp(G.cam.pitch + input.mouseDY * 0.004, -0.15, 1.25);
  G.cam.dist = clamp(G.cam.dist + input.wheel * 0.8, 4, 18);
  if (input.isDown('KeyQ')) G.cam.yaw += dt * 2.2;
  if (input.isDown('KeyR')) G.cam.yaw -= dt * 2.2;

  const ax = input.axis();
  const fwd = new THREE.Vector3(-Math.sin(G.cam.yaw), 0, -Math.cos(G.cam.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const dir = fwd.multiplyScalar(ax.y).add(right.multiplyScalar(ax.x));
  const running = input.isDown('ShiftLeft', 'ShiftRight');
  let speed = (running ? 11 : 6.5) * (0.9 + c.stats.speed / 350);
  if (!pl.onGround) speed = pl.gliding ? 10.5 : 8.5;
  const accel = pl.onGround ? 12 : 4;
  pl.vel.x += (dir.x * speed - pl.vel.x) * Math.min(1, accel * dt);
  pl.vel.z += (dir.z * speed - pl.vel.z) * Math.min(1, accel * dt);
  if (dir.lengthSq() > 0.01) pl.yaw = lerpAngle(pl.yaw, Math.atan2(dir.x, dir.z), dt * (pl.onGround ? 12 : 5));

  // Flight: jump, flap (costs wing stamina) and glide.
  if (input.wasPressed('Space')) {
    if (pl.onGround) { pl.vel.y = 9; pl.onGround = false; sfx.flap(); }
    else if (pl.flight >= D.flapCost) {
      pl.vel.y = Math.max(pl.vel.y, 0) + 7.5; pl.vel.y = Math.min(pl.vel.y, 10);
      pl.flight -= D.flapCost; pl.flapT = 0.35; sfx.flap();
      if (Math.random() < 0.25) callOf(c.bird.species);
      particles.burst(pl.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), b.opts.body, 2, 2);
    }
  }
  pl.gliding = !pl.onGround && input.isDown('Space') && pl.vel.y < 0 && pl.flight > 0;
  pl.vel.y -= 24 * dt;
  if (pl.gliding) { pl.vel.y = Math.max(pl.vel.y, -2.0); pl.flight = Math.max(0, pl.flight - dt * 4); }
  if (pl.onGround) pl.flight = Math.min(100, pl.flight + dt * 45);

  pl.pos.addScaledVector(pl.vel, dt);
  world.ceiling(pl.pos, pl.vel, 2.2);
  world.resolve(pl.pos, 0.5);
  const r = Math.hypot(pl.pos.x, pl.pos.z);
  if (r > WORLD_R) { pl.pos.x *= WORLD_R / r; pl.pos.z *= WORLD_R / r; }
  if (pl.pos.y > 40) { pl.pos.y = 40; pl.vel.y = Math.min(0, pl.vel.y); }
  const gh = world.groundAt(pl.pos.x, pl.pos.z, pl.pos.y);
  if (pl.pos.y <= gh || (pl.onGround && pl.pos.y - gh < 0.6 && pl.vel.y <= 0)) {
    if (!pl.onGround && pl.vel.y < -12) particles.burst(pl.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xd9c89e, 6, 3);
    pl.pos.y = gh; pl.vel.y = Math.max(0, pl.vel.y); pl.onGround = true;
  } else pl.onGround = false;

  // animation
  const hs = Math.hypot(pl.vel.x, pl.vel.z);
  b.walk(dt, pl.onGround ? hs : 0);
  pl.flapT -= dt;
  if (!pl.onGround) {
    if (pl.flapT > 0) b.setPose(Math.floor(pl.flapT * 22) % 2 ? 'flapUp' : 'glide', 30);
    else b.setPose('glide', 10);
  } else if (hs > 0.6) {
    const s = Math.sin(b.walkPhase);
    b.setHand('l', [-0.6, 1.05, 0.25 + s * 0.3], 12);
    b.setHand('r', [0.6, 1.05, 0.25 - s * 0.3], 12);
  } else b.setPose('idle', 8);
  b.setCrest(!pl.onGround ? 0.2 : running ? 0.4 : 0.75);
  b.root.position.copy(pl.pos);
  b.root.rotation.y = pl.yaw;
  b.rig.rotation.x = !pl.onGround ? (pl.gliding ? 0.55 : 0.3) : (running && hs > 2 ? 0.15 : 0);
  b.rig.rotation.z = !pl.onGround ? clamp(-input.axis().x * 0.35, -0.35, 0.35) : 0;
  b.update(dt);
  ui.updateWing(pl.flight, !pl.onGround || pl.flight < 99);

  // camera, pulled in so it never sits inside a building
  const target = pl.pos.clone().add(new THREE.Vector3(0, 1.7, 0));
  const off = new THREE.Vector3(Math.sin(G.cam.yaw) * Math.cos(G.cam.pitch), Math.sin(G.cam.pitch), Math.cos(G.cam.yaw) * Math.cos(G.cam.pitch)).multiplyScalar(G.cam.dist);
  const nearCols = world.colliders.filter((cl) => cl.top > 1 && world.overlaps(cl, target.x, target.z, G.cam.dist + 2));
  let dist = G.cam.dist;
  const dirN = off.clone().normalize();
  for (let t = 0.6; t <= G.cam.dist; t += 0.4) {
    const px = target.x + dirN.x * t, py = target.y + dirN.y * t, pz = target.z + dirN.z * t;
    if (nearCols.some((cl) => py < cl.top + 0.3 && py > cl.bottom - 0.3 && world.overlaps(cl, px, pz, 0.3))) { dist = Math.max(1.2, t - 0.4); break; }
  }
  tmpV.copy(target).addScaledVector(dirN, dist);
  tmpV.y = Math.max(tmpV.y, 0.6);
  camera.position.lerp(tmpV, 1 - Math.exp(-10 * dt));
  camera.lookAt(target);
}

function nearestInteraction() {
  const pos = G.player.pos;
  let best = null, bd = Infinity;
  for (const it of world.interactables) {
    const d = Math.hypot(it.pos.x - pos.x, it.pos.z - pos.z);
    if (d < it.r && d < bd && Math.abs(pos.y - it.pos.y) < 2.5) { best = { kind: 'place', it }; bd = d; }
  }
  for (const t of G.team) {
    const p = t.bird.root.position;
    const d = Math.hypot(p.x - pos.x, p.z - pos.z);
    if (d < 2.6 && d < bd && pos.y < 2) { best = { kind: 'team', team: t }; bd = d; }
  }
  for (const n of world.npcs) {
    if (!n.challenger) continue;
    const p = n.bird.root.position;
    const d = Math.hypot(p.x - pos.x, p.z - pos.z);
    if (d < 3.2 && d < bd) { best = { kind: 'npc', npc: n }; bd = d; }
  }
  return best;
}

function updateWorldMode(dt) {
  const c = G.career;
  if (!ui.modalOpen) {
    updatePlayer(dt);
    c.time += dt * TIME_SCALE;
    if (c.time >= 24 * 60) passOut();

    const near = nearestInteraction();
    if (near) {
      ui.prompt(near.kind === 'npc' ? `<b>E</b> — Accept street fight from ${near.npc.challenger.name}`
        : near.kind === 'team' ? `<b>E</b> — Talk to ${near.team.name}` : `<b>E</b> — ${near.it.label}`);
    } else ui.prompt(null);
    if (near && input.wasPressed('KeyE')) {
      ui.prompt(null);
      if (near.kind === 'npc') challengeDialog(near.npc);
      else if (near.kind === 'team') teamDialog(near.team);
      else interact(near.it.id);
    }
    if (input.wasPressed('KeyC', 'Tab')) careerPanel();
    if (input.wasPressed('KeyH', 'Escape')) helpPanel();

    for (const f of world.feathers) {
      if (f.taken) continue;
      if (G.player.pos.distanceTo(f.mesh.position) < 1.7 || (Math.hypot(G.player.pos.x - f.x, G.player.pos.z - f.z) < 1.2 && Math.abs(G.player.pos.y + 1 - f.y) < 1.6)) collectFeather(f);
    }
  } else {
    G.player.bird.walk(dt, 0); G.player.bird.update(dt);
  }
  updateTeam(dt);
  world.updateNPCs(dt, G.player.pos, ui.modalOpen);

  G.hudT -= dt;
  if (G.hudT <= 0) { G.hudT = 0.25; ui.updateHUD(c, world.feathers.length); }
  G.mapT -= dt;
  if (G.mapT <= 0) { G.mapT = 0.1; drawMap(); }
  G.saveT += dt;
  if (G.saveT > 30) { G.saveT = 0; c.save(); }
}

function drawMap() {
  const markers = [
    { x: HOME.x, z: HOME.z, label: '⌂', bg: '#b33a3a' },
    { x: GYM.x, z: GYM.z, label: 'G', bg: '#2e5e8c' },
    { x: SHOP.x, z: SHOP.z, label: '$', bg: '#5a8f3e' },
    { x: ARENA.x, z: ARENA.z, label: '🥊', bg: '#6d3a7a' },
    { x: TOWER.x, z: TOWER.z, label: '▲', bg: '#7a5230' },
  ];
  const dots = [];
  for (const n of world.npcs) dots.push({ x: n.bird.root.position.x, z: n.bird.root.position.z, color: n.challenger ? '#ff4d4d' : '#e5e7eb', r: n.challenger ? 4 : 2.5 });
  for (const t of G.team) dots.push({ x: t.bird.root.position.x, z: t.bird.root.position.z, color: '#4ade80', r: 3.5 });
  for (const f of world.feathers) if (!f.taken && G.player.pos.distanceTo(f.mesh.position) < 35) dots.push({ x: f.x, z: f.z, color: '#ffd700', r: 3 });
  ui.drawMinimap(world, G.player.pos, G.player.yaw, { markers, dots });
}

function collectFeather(f) {
  const c = G.career;
  f.taken = true; f.mesh.visible = false;
  c.feathers.push(f.id);
  c.money += 30; c.fame += 2;
  const k = ['power', 'speed', 'stamina', 'defense'][Math.floor(Math.random() * 4)];
  c.addStat(k, 1);
  sfx.coin();
  particles.burst(f.mesh.position.clone(), 0xffd700, 14, 4);
  ui.toast(`🪶 Golden feather! +$30, +1 ${k} (${c.feathers.length}/${world.feathers.length})`, '#ffd700');
  if (c.feathers.length === world.feathers.length) {
    c.money += 500; c.fame += 30;
    ui.toast('All golden feathers found! +$500 bonus!', '#ffd700', 6000);
    sfx.levelUp();
  }
}

function passOut() {
  const c = G.career;
  const lost = Math.min(c.difficulty === 'rookie' ? 10 : 30, Math.floor(c.money));
  c.money -= lost;
  newDay(8 * 60, 70);
  G.player.pos.set(HOME.x, 0, HOME.z - 11); G.player.vel.set(0, 0, 0);
  ui.modal('You passed out!', `<p>You stayed out past midnight and dozed off on a lamppost. ${G.team[0].name} and ${G.team[1].name} flew out and walked you home${lost ? `, but you lost <b>$${lost}</b> somewhere on the way` : ''}.</p><p class="muted">Sleep in your nest before midnight to wake up with full energy.</p>`, [{ label: 'Ugh, okay' }]);
}

function newDay(startTime, energy) {
  const c = G.career;
  c.day++; c.time = startTime; c.energy = energy;
  c.streetBeaten = []; c.foughtArenaToday = false; c.sparredToday = [];
  const sponsor = Math.round(c.fame * 1.4);
  if (sponsor > 0) { c.money += sponsor; setTimeout(() => ui.toast(`Sponsor money: +$${sponsor}`, '#4ade80'), 400); }
  refreshChallengers();
  c.save();
}

// ---------- interactions ----------
function interact(id) {
  const c = G.career;
  if (id === 'home') {
    ui.modal('Your Nest', `<p>Cozy, twiggy, home. Sleeping restores all energy, starts Day ${c.day + 1} and saves your career.</p>
      <p class="muted">It's ${c.timeLabel}. Energy ${Math.round(c.energy)}%.</p>`, [
      { label: 'Not yet', secondary: true },
      { label: 'Save game', secondary: true, onClick: () => { c.save(); ui.toast('Game saved.'); } },
      { label: '💤 Sleep', onClick: () => {
        newDay(7 * 60, 100);
        ui.modal(`Day ${c.day}`, `<p>☀️ Good morning, ${c.name}! ${G.team[0].name} is already whistling and ${G.team[1].name} is raiding the millet.</p><p class="muted">Game saved.</p>`, [{ label: 'Rise and shine' }]);
        callOf(G.team[0].def.species); setTimeout(() => callOf(G.team[1].def.species), 500);
      } },
    ]);
  } else if (STATIONS[id]) {
    if (c.energy < 10) { ui.toast('Too tired to train! Eat something or sleep.', '#ef4444'); sfx.bad(); return; }
    startTraining(id);
  } else if (id === 'coach') coachDialog();
  else if (id === 'shop') shopDialog();
  else if (id === 'promoter') promoterDialog();
}

const TEAM_LINES = {
  pepper: ['Crest up, chin down!', 'I whistled at a hawk once. It left.', 'Jab, jab, hook. Trust me.'],
  sunny: ['Speed beats size. Every time!', 'Did somebody say millet?', 'Your footwork is getting sharp!'],
  rosie: ['Hit them like you mean it!', 'Lovebirds don\'t back down.', 'Small bird, big punch. That\'s us!'],
};

function teamDialog(t) {
  const c = G.career;
  const done = c.sparredToday.includes(t.def.id);
  const cost = Math.round(10 * c.D.energy);
  const line = TEAM_LINES[t.def.id][Math.floor(Math.random() * 3)];
  callOf(t.def.species);
  ui.modal(`${t.name} "${t.def.nick}"`, `
    <p>"${line}"</p>
    <p class="muted">${speciesOf(t.def).label} · ${speciesOf(t.def).weight}. ${t.def.bio}</p>
    <p>Spar with ${t.name}: a friendly 2-round practice fight. Win for +2 to a stat (+1 even if you lose). Costs ${cost} energy, once per day.</p>
    ${done ? `<p style="color:#fca5a5"><b>You already sparred with ${t.name} today.</b></p>` : ''}`,
    [{ label: 'Later', secondary: true }, { label: `🥊 Spar with ${t.name}`, disabled: done || c.energy < cost, onClick: () => startSpar(t) }]);
}

function coachDialog() {
  const c = G.career, s = c.stats;
  const weakest = Object.keys(s).sort((a, b) => s[a] - s[b])[0];
  const where = { power: 'Heavy Bag', speed: 'Speed Bag', stamina: 'Jump Rope', defense: 'Dodge Drill' }[weakest];
  const opp = c.nextOpponent();
  const gap = opp.lvl - c.avg;
  const advice = gap > 12 ? `${opp.name} would pluck you bald right now. Train more first, or spar with ${G.team[0].name}.`
    : gap > 4 ? `${opp.name} is tougher than you, but with good defense you can steal it.`
    : `You're ready for ${opp.name}. Go get 'em!`;
  ui.modal('Coach Gizzard', `
    <p>"Hoo-hoo. Listen up, ${c.name}."</p>
    <p>"Your weakest area is <b>${weakest}</b>. Spend time on the <b>${where}</b>."</p>
    <p>"${advice}"</p>
    <p class="muted">Tips: Jabs are fast but light. Hooks and uppercuts hit hard but are slow. Hit your rival while they wind up for a <b>COUNTER</b> (+40% damage).${c.D.telegraph ? ' Their gloves glow red when a punch is coming.' : ''} Holding block drains stamina. Dodge (Space) makes you briefly untouchable. Press V in a fight for the TV camera.</p>`,
    [{ label: 'Thanks, Coach' }]);
}

function shopDialog() {
  const c = G.career;
  const render = () => {
    const body = ui.modal('Seed & Feed', `<p class="muted">You have <b>$${Math.floor(c.money)}</b> · Energy ${Math.round(c.energy)}%</p>` +
      SHOP_ITEMS.map((it) => {
        const owned = it.gear && c.gear.includes(it.id);
        return `<div class="shop-item"><div><b>${it.name}</b><small>${it.desc}</small></div>
          <button data-id="${it.id}" ${owned || c.money < it.price || (!it.gear && c.energy >= 100) ? 'disabled' : ''}>${owned ? 'Owned' : '$' + it.price}</button></div>`;
      }).join(''), [{ label: 'Leave' }]);
    body.querySelectorAll('button[data-id]').forEach((btn) => btn.onclick = () => {
      const it = SHOP_ITEMS.find((x) => x.id === btn.dataset.id);
      if (c.money < it.price) return;
      c.money -= it.price;
      if (it.gear) { c.gear.push(it.id); c.addStat(it.stat, it.amount); ui.toast(`${it.name}! +${it.amount} ${it.stat}`, '#4ade80'); sfx.levelUp(); }
      else { c.energy = Math.min(100, c.energy + it.energy); ui.toast(`Yum! ${it.name}`, '#38bdf8'); sfx.coin(); }
      render();
    });
  };
  render();
}

function rankingsHTML(c) {
  const list = c.rankings();
  return `<ul class="rank-list">${list.map((r, i) => `<li class="${r.me ? 'me' : ''} ${(!r.me && i === c.playerRank - 1) ? 'next' : ''}"><span>${i === 0 ? '👑' : '#' + i} ${r.name}</span><span class="muted">${r.me ? 'YOU' : SPECIES[r.species] ? SPECIES[r.species].label : r.nick}</span></li>`).join('')}
    ${c.playerRank >= 11 ? `<li class="me"><span>– ${c.name}</span><span>Unranked</span></li>` : ''}</ul>`;
}

function statLine(label, v, ov) {
  return `<span>${label}</span><div class="bar"><div class="fill ${ov !== undefined && ov > v ? 'hp' : 'st'}" style="width:${v}%"></div></div><span><b>${Math.round(v)}</b>${ov !== undefined ? ` <span class="muted">vs ${ov}</span>` : ''}</span>`;
}

function promoterDialog() {
  const c = G.career;
  const opp = c.nextOpponent();
  const title = c.playerRank <= 1;
  const late = c.time > 22 * 60;
  const cost = Math.round(30 * c.D.energy);
  const tired = c.energy < cost;
  const limited = c.D.dailyLimit && c.foughtArenaToday;
  const blocked = late || tired || limited;
  const why = limited ? 'One Coliseum fight per day on Legend. Come back tomorrow.' : late ? 'Fight night is over (fights until 22:00).' : tired ? `You need at least ${cost}% energy to fight.` : '';
  ui.modal('Promoter Pecksworth', `
    <p>"${c.playerRank === 0 ? `The champ! Ready to defend your belt? Defense #${c.titleDefenses + 1} pays big.` : title ? 'This is it. A shot at the TITLE!' : `Ah, ${c.name}! You're ${c.rankLabel}. Beat the bird above you and you take their spot.`}"</p>
    <div class="vs"><div><b>${c.name}</b><div class="muted">${c.rankLabel}</div></div><div class="big">VS</div><div><b>${opp.name}</b><div class="muted">"${opp.nick}" · ${SPECIES[opp.species].label}</div></div></div>
    <div class="statgrid">
      ${statLine('Power', c.stats.power, opp.stats.power)}${statLine('Speed', c.stats.speed, opp.stats.speed)}
      ${statLine('Stamina', c.stats.stamina, opp.stats.stamina)}${statLine('Defense', c.stats.defense, opp.stats.defense)}
    </div>
    <p>Purse: <b>$${c.purse()}</b> · ${title ? 4 : 3} rounds · costs ${cost} energy</p>
    ${why ? `<p style="color:#fca5a5"><b>${why}</b></p>` : ''}
    <details><summary class="muted">Rankings</summary>${rankingsHTML(c)}</details>`,
    [{ label: 'Not now', secondary: true }, { label: title ? '🏆 Fight for the title!' : '🥊 Book the fight!', disabled: blocked, onClick: startArenaFight }]);
}

function challengeDialog(npc) {
  const c = G.career, ch = npc.challenger;
  const cost = Math.round(15 * c.D.energy);
  const tired = c.energy < cost;
  ui.modal(ch.name, `<p>"${['Think you can take me? Let\'s go, right here!', 'This is my block. Put up or shut up!', 'Winner takes the millet. Deal?'][Math.floor(Math.random() * 3)]}"</p>
    <p>${SPECIES[npc.species].label} · level ~${ch.lvl} ${ch.style} · Prize: <b>$${ch.purse}</b> · 2 short rounds · costs ${cost} energy</p>
    ${tired ? '<p style="color:#fca5a5"><b>You\'re too tired to fight.</b></p>' : ''}`,
    [{ label: 'Walk away', secondary: true }, { label: 'Put \'em up!', disabled: tired, onClick: () => startStreetFight(npc) }]);
}

function careerPanel() {
  const c = G.career, s = c.stats;
  ui.modal(`${c.name} — ${c.rankLabel}`, `
    <div class="statgrid">${statLine('Power', s.power)}${statLine('Speed', s.speed)}${statLine('Stamina', s.stamina)}${statLine('Defense', s.defense)}</div>
    <p>Record <b>${c.record.w}-${c.record.l}${c.record.d ? `-${c.record.d}` : ''}</b> (${c.record.ko} KOs) · Fame <b>${Math.floor(c.fame)}</b> · Money <b>$${Math.floor(c.money)}</b></p>
    <p>Day ${c.day}, ${c.timeLabel} · Golden feathers ${c.feathers.length}/${world.feathers.length}${c.champion ? ` · 🏆 Title defenses: ${c.titleDefenses}` : ''} · Difficulty: ${c.D.label}</p>
    <p class="muted">Corner team: ${G.team.map((t) => t.name).join(' & ')} · Gear: ${c.gear.length ? c.gear.map((g) => SHOP_ITEMS.find((i) => i.id === g).name).join(', ') : 'none yet'}</p>
    <b>Rankings</b>${rankingsHTML(c)}`,
    [{ label: 'Settings', secondary: true, onClick: settingsPanel }, { label: 'Controls', secondary: true, onClick: helpPanel }, { label: 'Save', secondary: true, onClick: () => { c.save(); ui.toast('Game saved.'); } }, { label: 'Close' }]);
}

function settingsPanel() {
  const c = G.career;
  const body = ui.modal('Settings', `
    <p><b>Difficulty</b></p>
    <div class="diff">${Object.entries(DIFFICULTY).map(([k, d]) => `<button data-d="${k}" class="${c && k === c.difficulty ? 'sel' : ''}">${d.label}</button>`).join('')}</div>
    <p class="diff-desc" id="sdesc">${c ? c.D.desc : ''}</p>
    <p><b>Graphics</b></p>
    <div class="diff" id="gfx"><button data-q="high" class="${settings.quality === 'high' ? 'sel' : ''}">High</button><button data-q="low" class="${settings.quality === 'low' ? 'sel' : ''}">Low (faster)</button></div>
    <p class="diff-desc">Low turns off glow effects and lowers resolution now. Grass, trees and bird counts change the next time the game loads.</p>
    <p><b>Fight camera</b></p>
    <div class="diff" id="camsel"><button data-c="shoulder" class="${settings.cam === 'shoulder' ? 'sel' : ''}">Over the shoulder</button><button data-c="tv" class="${settings.cam === 'tv' ? 'sel' : ''}">TV broadcast</button></div>`,
    [{ label: 'Done' }]);
  body.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => {
    c.difficulty = b.dataset.d; c.save();
    body.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('sel', x === b));
    body.querySelector('#sdesc').textContent = c.D.desc;
    ui.toast(`Difficulty: ${c.D.label}`);
  });
  body.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => {
    settings.quality = b.dataset.q; saveSettings(); applyQuality();
    body.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('sel', x === b));
  });
  body.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
    settings.cam = b.dataset.c; saveSettings();
    body.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('sel', x === b));
  });
}

function helpPanel() {
  ui.modal('Controls', `
    <p><b>Exploring</b><br><kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump; tap again in the air to flap, hold to glide (uses the wing meter) · drag mouse / <kbd>Q</kbd> <kbd>R</kbd> to turn camera · wheel zoom · <kbd>E</kbd> interact · <kbd>C</kbd> career & settings</p>
    <p><b>Fighting</b><br><kbd>W A S D</kbd> move & circle · <kbd>J</kbd> / left-click jab · <kbd>K</kbd> / right-click hook · <kbd>L</kbd> uppercut · hold <kbd>Shift</kbd> block · <kbd>Space</kbd> dodge (+ direction) · <kbd>V</kbd> switch camera. Knocked down? Mash <kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> to get up!</p>
    <p><b>Career</b><br>Train at the gym, spar with your corner team, eat at Seed & Feed and sleep at your nest. Climb the Coliseum rankings, win street fights for cash, and become champion.</p>`,
    [{ label: 'Got it' }]);
}

// ---------- training ----------
function startTraining(id) {
  G.mode = 'training';
  ui.showHUD(false); ui.prompt(null); ui.updateWing(0, false);
  const c = G.career;
  G.training = new Training({
    id, world, bird: G.player.bird, ui, camera, D: c.D,
    onEnd: (r) => {
      const cost = Math.round(18 * c.D.energy);
      c.energy = Math.max(0, c.energy - cost);
      c.time += 45;
      const stat = r.stat;
      let gain = 0;
      if (r.acc >= 0.25) gain = Math.max(1, Math.round((1.5 + r.acc * 5.5) * Math.max(0.3, 1 - c.stats[stat] / 120) * c.D.train));
      c.addStat(stat, gain);
      const grade = r.acc > 0.9 ? 'S' : r.acc > 0.75 ? 'A' : r.acc > 0.55 ? 'B' : r.acc > 0.25 ? 'C' : 'F';
      if (gain) sfx.levelUp(); else sfx.bad();
      G.training = null;
      G.mode = 'world';
      ui.showHUD(true);
      const st = world.stations[id];
      G.player.pos.copy(st.pos).add(new THREE.Vector3(0, 0, id === 'rope' ? -2.2 : -1.2));
      ui.modal(`Training: ${STATIONS[id].title}`, `
        <p><span style="font-family:Bungee,sans-serif;font-size:34px;color:var(--accent2);margin-right:12px">${grade}</span><b>${Math.round(r.acc * 100)}%</b> accuracy</p>
        <p class="muted">${r.perfect} perfect · ${r.good} good · ${r.miss} miss · best combo ${r.best}</p>
        <p>${gain ? `<b>${stat.toUpperCase()} +${gain}</b> → ${c.stats[stat]}` : 'Sloppy session... no gains this time.'}</p>
        <p class="muted">-${cost} energy · 45 minutes passed</p>`,
        [{ label: 'Done' }, { label: 'Again', secondary: true, disabled: c.energy < 10, onClick: () => startTraining(id) }]);
      c.save();
    },
  });
}

// ---------- fights ----------
let chalk = null;
function beginFight({ opp, oppBird, center, bounds, rounds, roundTime, kind, npc, sparWith }) {
  const c = G.career;
  G.mode = 'fight';
  ui.prompt(null); ui.updateWing(0, false);
  const eff = 0.8 + 0.2 * clamp(c.energy, 0, 100) / 100;
  G.player.vel.set(0, 0, 0);
  const team = G.team.filter((t) => t !== sparWith);
  G.fight = new Fight({
    scene, world, ui, particles, camera, center, bounds, rounds, roundTime, kind, D: c.D, team, camMode: settings.cam,
    playerBird: G.player.bird, playerStats: { ...c.stats }, playerName: c.name, playerEff: eff,
    oppBird, opp, introText: kind === 'arena' ? 'ROUND 1' : kind === 'spar' ? 'SPARRING!' : 'STREET FIGHT!',
    onEnd: (res) => endFight(res, { opp, oppBird, kind, npc, sparWith }),
  });
  G.fight.onCamMode = (m) => { settings.cam = m; saveSettings(); };
  if (kind === 'arena') { world.arenaSpot.intensity = 220; sfx.cheer(0.5); }
}

function taleOfTape(opp) {
  const c = G.career;
  const me = SPECIES[c.bird.species], them = SPECIES[opp.species];
  const oRec = `${10 + Math.round(opp.lvl / 4)}-${2 + (opp.idx || 0) % 4}`;
  const row = (a, l, b) => `<div>${a}</div><div class="lbl">${l}</div><div>${b}</div>`;
  ui.modal('Tale of the Tape', `
    <div class="tape">
      <div class="nm">${c.name}</div><div></div><div class="nm">${opp.name}</div>
      ${row(me.label, 'Species', them.label)}
      ${row(me.weight, 'Weight', them.weight)}
      ${row(`${c.record.w}-${c.record.l}`, 'Record', oRec)}
      ${row(c.rankLabel, 'Rank', opp.title && c.playerRank !== 0 ? 'Champion' : `#${c.playerRank === 0 ? '1–3' : c.playerRank - 1}`)}
      ${row(`${c.stats.power} / ${c.stats.speed}`, 'Power / Speed', `${opp.stats.power} / ${opp.stats.speed}`)}
      ${row(`${c.stats.stamina} / ${c.stats.defense}`, 'Stamina / Defense', `${opp.stats.stamina} / ${opp.stats.defense}`)}
    </div>
    <p class="muted" style="text-align:center">In the red corner, with ${G.team.map((t) => t.name).join(' and ')} working the corner…</p>`,
    [{ label: '🥊 Touch gloves' }]);
}

function startArenaFight() {
  const c = G.career;
  const opp = c.nextOpponent();
  const oppBird = makeBird({ species: opp.species, glove: opp.glove, trunks: opp.trunks, trim: opp.trim });
  oppBird.root.scale.setScalar(opp.scale);
  scene.add(oppBird.root);
  c.energy -= Math.round(30 * c.D.energy);
  c.foughtArenaToday = true;
  const ringC = new THREE.Vector3(RING.x, RING.y, RING.z);
  placeTeam(RING_CORNERS.red.map((p) => ({ x: p.x, y: 0.02, z: p.z })), ringC);
  beginFight({ opp, oppBird, kind: 'arena', center: ringC, bounds: { type: 'square', half: RING.half - 0.8 }, rounds: opp.title ? 4 : 3, roundTime: 60 });
  taleOfTape(opp);
}

function findClearSpot(mid) {
  for (let r = 0; r < 30; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x = mid.x + Math.cos(a) * r, z = mid.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > WORLD_R - 6) continue;
      if (!world.colliders.some((cl) => world.overlaps(cl, x, z, 5.4))) return new THREE.Vector3(x, 0.1, z);
      if (r === 0) break;
    }
  }
  return new THREE.Vector3(0, 0.1, 24);
}

function streetSetup(center) {
  chalk = new THREE.Mesh(new THREE.RingGeometry(5, 5.25, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  chalk.rotation.x = -Math.PI / 2; chalk.position.copy(center).add(new THREE.Vector3(0, 0.05, 0));
  scene.add(chalk);
  placeTeam([{ x: center.x + 6, y: 0.02, z: center.z + 2 }, { x: center.x + 6.2, y: 0.02, z: center.z - 0.5 }], center);
}

function startStreetFight(npc) {
  const c = G.career, ch = npc.challenger;
  const opp = { name: ch.name, nick: 'Street Brawler', lvl: ch.lvl, species: npc.species, stats: statsFor(ch.lvl, ch.style), skill: clamp(0.12 + ch.lvl / 115, 0.15, 0.85) * c.D.ai, style: ch.style };
  const oppBird = makeBird({ species: npc.species, glove: 0x374151, trunks: 0x7c2d12, trim: 0xfbbf24 });
  scene.add(oppBird.root);
  npc.bird.root.visible = false;
  const center = findClearSpot(G.player.pos.clone().lerp(npc.bird.root.position, 0.5));
  streetSetup(center);
  c.energy -= Math.round(15 * c.D.energy);
  beginFight({ opp, oppBird, kind: 'street', npc, center, bounds: { type: 'circle', r: 4.6 }, rounds: 2, roundTime: 45 });
}

function startSpar(t) {
  const c = G.career;
  const opp = c.sparPartner(t.def);
  const oppBird = makeBird({ species: t.def.species, glove: t.def.glove, trunks: t.def.trunks, trim: t.def.trim });
  oppBird.root.scale.setScalar(opp.scale);
  scene.add(oppBird.root);
  t.bird.root.visible = false;
  const center = findClearSpot(new THREE.Vector3(HOME.x, 0, HOME.z - 15));
  streetSetup(center);
  c.energy -= Math.round(10 * c.D.energy);
  c.sparredToday.push(t.def.id);
  beginFight({ opp, oppBird, kind: 'spar', sparWith: t, center, bounds: { type: 'circle', r: 4.6 }, rounds: 2, roundTime: 40 });
}

function endFight(res, { opp, oppBird, kind, npc, sparWith }) {
  const c = G.career;
  scene.remove(oppBird.root);
  if (chalk) { scene.remove(chalk); chalk = null; }
  world.arenaSpot.intensity = 0;
  ui.hideFight();
  const fight = G.fight;
  G.fight = null;
  const b = G.player.bird;
  b.rig.rotation.set(0, 0, 0); b.rig.position.set(0, 0, 0); b.head.rotation.set(0, 0, 0);
  b.setPose('idle'); b.snap(); b.setDamage(0);
  sendTeamHome();
  const ko = res.method === 'KO' || res.method === 'TKO';
  const lines = [];
  let title;
  const acc = res.thrown ? Math.round(res.landed / res.thrown * 100) : 0;
  if (!c.record.d) c.record.d = 0;

  if (kind === 'arena') {
    G.player.pos.set(RING.x, 0, RING.z + RING.half + 3.5);
    const purse = c.purse();
    if (res.win) {
      const wasRank = c.rankLabel;
      const titleFight = c.playerRank === 1;
      const defense = c.playerRank === 0;
      c.money += purse; c.fame += 8 + (11 - c.playerRank) * 3 + (ko ? 5 : 0);
      c.record.w++; if (ko) c.record.ko++;
      c.climb();
      title = titleFight ? '🏆 NEW CHAMPION! 🏆' : defense ? 'Title Defended!' : 'Victory!';
      lines.push(`${c.name} beat <b>${opp.name}</b> by <b>${res.method}</b> in round ${res.round}.`);
      lines.push(`Purse: <b>+$${purse}</b> · Rank: ${wasRank} → <b>${c.rankLabel}</b>`);
      if (titleFight) lines.push(`🎉 <b>${c.name}</b> is the Undisputed Featherweight Champion of Featherton! ${G.team.map((t) => t.name).join(' and ')} are losing their minds in the corner.`);
      sfx.levelUp();
    } else if (res.draw) {
      const pay = Math.round(purse * 0.5);
      c.money += pay; c.record.d++;
      title = 'Draw';
      lines.push(`The judges couldn't split ${c.name} and <b>${opp.name}</b>. No change in the rankings. Purse: +$${pay}.`);
    } else {
      const consolation = Math.round(purse * 0.3);
      c.money += consolation; c.fame = Math.max(0, c.fame - 3);
      c.record.l++;
      title = 'Defeat';
      lines.push(`<b>${opp.name}</b> beat ${c.name} by <b>${res.method}</b>.`);
      lines.push(`Show money: +$${consolation}. Train up and try again!`);
      if (c.playerRank === 0) {
        c.rosterOrder.splice(c.rosterOrder.indexOf(opp.idx), 1);
        c.rosterOrder.unshift(opp.idx);
        c.playerRank = 1;
        lines.push(`💔 You lost the belt. ${opp.name} is the new champion. Win it back!`);
      }
    }
    c.time += 120;
    world.updateRankBoard(c.rankings(), c.name);
  } else if (kind === 'street') {
    G.player.pos.copy(fight.p.bird.root.position); G.player.pos.y = 0;
    npc.bird.root.visible = true;
    const ch = npc.challenger;
    if (res.win) {
      c.money += ch.purse; c.fame += 3 + (ko ? 2 : 0); c.record.w++; if (ko) c.record.ko++;
      c.streetBeaten.push(ch.name);
      if (npc.marker) { npc.bird.root.remove(npc.marker); npc.marker = null; }
      npc.challenger = null;
      title = 'Street Win!';
      lines.push(`${c.name} beat <b>${ch.name}</b> by <b>${res.method}</b>. Prize: <b>+$${ch.purse}</b>`);
      sfx.levelUp();
    } else {
      const lost = res.draw ? 0 : Math.min(Math.floor(c.money), Math.round(ch.purse / (c.difficulty === 'rookie' ? 4 : 2)));
      c.money -= lost; if (!res.draw) c.record.l++;
      title = res.draw ? 'Street Draw' : 'Street Loss';
      lines.push(res.draw ? `You and <b>${ch.name}</b> fought to a standstill.` : `<b>${ch.name}</b> got the better of you (${res.method}). You lost <b>$${lost}</b> on the side bet.`);
    }
    c.time += 40;
  } else {
    G.player.pos.copy(fight.p.bird.root.position); G.player.pos.y = 0;
    sparWith.bird.root.visible = true;
    const k = ['power', 'speed', 'stamina', 'defense'][Math.floor(Math.random() * 4)];
    const gain = res.win ? 2 : 1;
    c.addStat(k, gain);
    title = res.win ? 'Sparring win!' : 'Good session';
    lines.push(res.win ? `${c.name} got the better of <b>${sparWith.name}</b> today (${res.method}).` : `<b>${sparWith.name}</b> took this one (${res.method}). Great work anyway.`);
    lines.push(`<b>${k.toUpperCase()} +${gain}</b> → ${c.stats[k]}. Sparring doesn't count on your record.`);
    callOf(sparWith.def.species);
    c.time += 30;
  }
  if (res.cards) lines.push(`<div class="cards">${res.cards.join('<br>')}</div>`);
  const bt = res.byType;
  lines.push(`<span class="muted">Punches landed ${res.landed}/${res.thrown} (${acc}%) · jabs ${bt.jab[1]}/${bt.jab[0]} · hooks ${bt.hook[1]}/${bt.hook[0]} · uppercuts ${bt.upper[1]}/${bt.upper[0]} · knockdowns ${res.kdGiven} given, ${res.kdTaken} taken</span>`);
  G.mode = 'world';
  ui.showHUD(true);
  c.save();
  ui.modal(title, lines.map((l) => (l.startsWith('<div') ? l : `<p>${l}</p>`)).join(''), [{ label: 'Continue' }]);
}

// ---------- title camera ----------
function updateTitle(dt) {
  G.titleT += dt;
  const a = Math.sin(G.titleT * 0.15) * 0.35;
  const wide = camera.aspect > 1.25;
  camera.position.set(Math.sin(a) * 7.5 + (wide ? 2.4 : 0), 2.3, 18 + Math.cos(a) * 7.5);
  camera.lookAt(wide ? 2.6 : 0, wide ? 1.4 : 0.6, 18);
  preview.birds.forEach((bird, i) => {
    if (i === preview.sel) {
      const t = G.titleT % 2.2;
      if (t < 0.14) bird.setHand('l', [-0.08, 1.72, 1.45], 40);
      else if (t > 0.9 && t < 1.08) bird.setHand('r', [-0.1, 1.7, 1.25], 40);
      else if (t > 1.5 && t < 1.66) bird.setHand('r', [0.05, 2.15, 1.05], 40);
      else bird.setPose('guard', 12);
      bird.setCrest(1);
      bird.root.position.y = 0.09 + Math.abs(Math.sin(G.titleT * 5)) * 0.06;
      bird.idleLook = false; bird.head.rotation.set(0, 0, 0);
    } else {
      bird.setPose('folded', 6); bird.setCrest(0.5); bird.idleLook = true; bird.root.position.y = 0.09;
    }
    bird.walk(dt, 0); bird.update(dt);
  });
  world.update(dt, new THREE.Vector3(0, 0, 18), 9.5 * 60, camera, new THREE.Vector3(999, 0, 999));
  world.updateNPCs(dt, new THREE.Vector3(999, 0, 999));
}

// ---------- main loop ----------
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (ui.modalOpen && input.wasPressed('Escape')) { ui.closeModal(); input.pressed.clear(); }
  if (G.mode === 'title') updateTitle(dt);
  else {
    const c = G.career;
    world.update(dt, G.player.pos, c.time, camera);
    if (G.mode === 'world') updateWorldMode(dt);
    else if (G.mode === 'fight' && G.fight) {
      if (!ui.modalOpen) G.fight.update(dt, input);
      if (G.fight) G.fight.updateCamera(camera, dt);
      world.updateNPCs(dt, G.player.pos, true);
    } else if (G.mode === 'training' && G.training) {
      G.training.update(dt, input);
      updateTeam(dt);
      world.updateNPCs(dt, G.player.pos, false);
    }
    G.audioT -= dt;
    if (G.audioT <= 0) {
      G.audioT = 0.3;
      const inArena = Math.hypot(G.player.pos.x - ARENA.x, G.player.pos.z - ARENA.z) < ARENA.rout + 8;
      sfx.crowd(G.mode === 'fight' && G.fight && G.fight.arena ? 0.08 + world.crowdHype * 0.06 : inArena ? 0.03 : 0);
    }
  }
  renderer.toneMappingExposure = 0.62 + (world.night || 0) * 0.45;
  particles.update(dt);
  if (composer) composer.render(); else renderer.render(scene, camera);
  input.endFrame();
}

buildTitle();
frame();
window.__game = { G, world, scene, camera, ui, renderer };
