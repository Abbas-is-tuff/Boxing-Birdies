import * as THREE from 'three';
import { makeBird, PALETTES } from './bird.js';
import { World, lerpAngle, RING, HOME, GYM, SHOP, ARENA, TOWER, WORLD_R } from './world.js';
import { Career, ROSTER, SHOP_ITEMS, statsFor } from './career.js';
import { Fight } from './fight.js';
import { Training, STATIONS } from './training.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { sfx } from './audio.js';
import { Particles } from './particles.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TIME_SCALE = 1; // game minutes per real second

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 700);
camera.position.set(0, 12, 30);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const ui = new UI();
const input = new Input(renderer.domElement);
input.onTouchEnabled = () => { if (G.mode !== 'title') ui.el.touch.classList.remove('hidden'); };
const world = new World(scene);
const particles = new Particles(scene);
world.onPigeonScatter = () => { if (Math.random() < 0.3) sfx.flap(); };

const G = {
  mode: 'title', career: null, player: null,
  cam: { yaw: Math.PI, pitch: 0.38, dist: 8.5 },
  fight: null, training: null, hudT: 0, mapT: 0, saveT: 0, titleT: 0,
  tutorial: [], tutorialT: 0,
};

// ---------- title screen ----------
function buildTitle() {
  const menu = document.getElementById('titleMenu');
  const saved = Career.load();
  let pal = 0;
  menu.innerHTML = `
    <input id="nameIn" maxlength="18" placeholder="Name your fighter" value="${saved ? '' : 'Rocky Beakboa'}">
    <div class="swatches">${PALETTES.map((p, i) => `<button class="swatch${i === 0 ? ' sel' : ''}" title="${p.name}" data-i="${i}" style="background:#${p.body.toString(16).padStart(6, '0')}"></button>`).join('')}</div>
    <div class="muted" id="palName" style="font-weight:800;margin-bottom:6px">${PALETTES[0].name}</div>
    <div class="buttons">
      ${saved ? `<button id="contBtn">Continue · Day ${saved.day} (${saved.rankLabel})</button>` : ''}
      <button id="newBtn" class="${saved ? 'secondary' : ''}">New Career</button>
    </div>
    <p class="muted" style="font-size:13px;margin:10px 0 0">WASD move · Space jump & flap · J/K/L punch · Shift block · Space dodge</p>`;
  menu.querySelectorAll('.swatch').forEach((b) => b.onclick = () => {
    menu.querySelectorAll('.swatch').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel'); pal = +b.dataset.i;
    document.getElementById('palName').textContent = PALETTES[pal].name;
    previewBird(pal);
  });
  document.getElementById('newBtn').onclick = () => {
    sfx.unlock();
    const go = () => {
      const name = document.getElementById('nameIn').value.trim() || 'Birdie';
      Career.wipe();
      startGame(Career.create(name, pal), true);
    };
    if (saved) {
      ui.modal('Start over?', '<p>This replaces your saved career.</p>', [{ label: 'Cancel', secondary: true }, { label: 'Start new career', onClick: go }]);
    } else go();
  };
  if (saved) document.getElementById('contBtn').onclick = () => { sfx.unlock(); startGame(saved, false); };
  previewBird(0);
}

let preview = null;
function previewBird(i) {
  if (preview) scene.remove(preview.root);
  preview = makeBird({ ...PALETTES[i] });
  preview.root.position.set(0, 0, 18);
  preview.setPose('guard'); preview.snap();
  scene.add(preview.root);
}

// ---------- start / player ----------
function startGame(career, isNew) {
  G.career = career;
  if (preview) { scene.remove(preview.root); preview = null; }
  document.getElementById('title').classList.add('hidden');
  const pal = PALETTES[career.palette] || PALETTES[0];
  const bird = makeBird({ ...pal });
  scene.add(bird.root);
  G.player = { bird, pos: new THREE.Vector3(HOME.x, 0, HOME.z - 10), vel: new THREE.Vector3(), yaw: Math.PI, onGround: true, flaps: 0, flapT: 0, gliding: false };
  G.cam.yaw = 0;
  world.placeFeathers(career.feathers);
  world.refreshChallengers(career.avg, career.streetBeaten);
  world.updateRankBoard(career.rankings(), career.name);
  ui.showHUD(true);
  if (input.touch) ui.el.touch.classList.remove('hidden');
  G.mode = 'world';
  if (isNew) {
    ui.modal(`Welcome to Featherton, ${career.name}!`, `
      <p>You're a scrappy unranked bird with big dreams: <b>become the Undisputed Featherweight Champion</b> by beating every contender in <b>The Coop Coliseum</b>.</p>
      <p>🏋️ <b>Feather Fists Gym</b> (east) — train Power, Speed, Stamina and Defense.<br>
      🥊 <b>The Coop Coliseum</b> (south) — talk to Promoter Pecksworth to book ranked fights.<br>
      🌻 <b>Seed & Feed</b> (west) — buy food for energy and gear upgrades.<br>
      🏠 <b>Your Nest</b> — sleep to start a new day and save.<br>
      ❗ Birds with a <b>!</b> want a street fight. 🪶 20 golden feathers are hidden around town.</p>
      <p class="muted">Tip: press Space in mid-air to flap (up to 4 times) and hold it to glide onto rooftops.</p>`,
      [{ label: 'Let\'s fly!' }]);
  } else ui.toast(`Welcome back, ${career.name}! Day ${career.day}.`);
}

// ---------- world update ----------
const tmpV = new THREE.Vector3();
function updatePlayer(dt) {
  const c = G.career, pl = G.player, b = pl.bird;
  G.cam.yaw -= input.mouseDX * 0.005;
  G.cam.pitch = clamp(G.cam.pitch + input.mouseDY * 0.004, 0.02, 1.25);
  G.cam.dist = clamp(G.cam.dist + input.wheel * 0.8, 4, 18);
  if (input.isDown('KeyQ')) G.cam.yaw += dt * 2.2;
  if (input.isDown('KeyR')) G.cam.yaw -= dt * 2.2;

  const ax = input.axis();
  const fwd = new THREE.Vector3(-Math.sin(G.cam.yaw), 0, -Math.cos(G.cam.yaw));
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const dir = fwd.multiplyScalar(ax.y).add(right.multiplyScalar(ax.x));
  const running = input.isDown('ShiftLeft', 'ShiftRight');
  const speed = (running ? 11 : 6.5) * (0.9 + c.stats.speed / 350);
  const accel = pl.onGround ? 12 : 3.5;
  pl.vel.x += (dir.x * speed - pl.vel.x) * Math.min(1, accel * dt);
  pl.vel.z += (dir.z * speed - pl.vel.z) * Math.min(1, accel * dt);
  if (dir.lengthSq() > 0.01) pl.yaw = lerpAngle(pl.yaw, Math.atan2(dir.x, dir.z), dt * 12);

  if (input.wasPressed('Space')) {
    if (pl.onGround) { pl.vel.y = 9; pl.onGround = false; sfx.flap(); }
    else if (pl.flaps < 4) {
      pl.vel.y = 8; pl.flaps++; pl.flapT = 0.35; sfx.flap();
      if (Math.random() < 0.4) sfx.chirp();
      particles.burst(pl.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), b.opts.body, 2, 2);
    }
  }
  pl.gliding = !pl.onGround && input.isDown('Space') && pl.vel.y < 0;
  pl.vel.y -= 24 * dt;
  if (pl.gliding) pl.vel.y = Math.max(pl.vel.y, -2.2);

  pl.pos.addScaledVector(pl.vel, dt);
  world.ceiling(pl.pos, pl.vel, 2.2);
  world.resolve(pl.pos, 0.5);
  const r = Math.hypot(pl.pos.x, pl.pos.z);
  if (r > WORLD_R) { pl.pos.x *= WORLD_R / r; pl.pos.z *= WORLD_R / r; }
  const gh = world.groundAt(pl.pos.x, pl.pos.z, pl.pos.y);
  if (pl.pos.y <= gh || (pl.onGround && pl.pos.y - gh < 0.6 && pl.vel.y <= 0)) {
    if (!pl.onGround && pl.vel.y < -12) particles.burst(pl.pos.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xd9c89e, 6, 3);
    pl.pos.y = gh; pl.vel.y = Math.max(0, pl.vel.y); pl.onGround = true; pl.flaps = 0;
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
  b.root.position.copy(pl.pos);
  b.root.rotation.y = pl.yaw;
  b.rig.rotation.x = !pl.onGround ? 0.25 : (running && hs > 2 ? 0.15 : 0);
  b.update(dt);

  // camera
  const target = pl.pos.clone().add(new THREE.Vector3(0, 1.7, 0));
  const off = new THREE.Vector3(Math.sin(G.cam.yaw) * Math.cos(G.cam.pitch), Math.sin(G.cam.pitch), Math.cos(G.cam.yaw) * Math.cos(G.cam.pitch)).multiplyScalar(G.cam.dist);
  // pull the camera in so it never ends up inside a building
  const near = world.colliders.filter((cl) => cl.top > 1 && world.overlaps(cl, target.x, target.z, G.cam.dist + 2));
  let dist = G.cam.dist;
  const dirN = off.clone().normalize();
  for (let t = 0.6; t <= G.cam.dist; t += 0.4) {
    const px = target.x + dirN.x * t, py = target.y + dirN.y * t, pz = target.z + dirN.z * t;
    if (near.some((cl) => py < cl.top + 0.3 && py > cl.bottom - 0.3 && world.overlaps(cl, px, pz, 0.3))) { dist = Math.max(1.2, t - 0.4); break; }
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
    if (near) ui.prompt(near.kind === 'npc' ? `<b>E</b> — Accept street fight from ${near.npc.challenger.name}` : `<b>E</b> — ${near.it.label}`);
    else ui.prompt(null);
    if (near && input.wasPressed('KeyE')) {
      ui.prompt(null);
      if (near.kind === 'npc') challengeDialog(near.npc);
      else interact(near.it.id);
    }
    if (input.wasPressed('KeyC', 'Tab')) careerPanel();
    if (input.wasPressed('KeyH', 'Escape')) helpPanel();

    // feathers
    for (const f of world.feathers) {
      if (f.taken) continue;
      if (G.player.pos.distanceTo(f.mesh.position) < 1.7 || (Math.hypot(G.player.pos.x - f.x, G.player.pos.z - f.z) < 1.2 && Math.abs(G.player.pos.y + 1 - f.y) < 1.6)) collectFeather(f);
    }
  } else {
    // keep the bird animated while menus are open
    G.player.bird.walk(dt, 0); G.player.bird.update(dt);
  }
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
  for (const f of world.feathers) if (!f.taken && G.player.pos.distanceTo(f.mesh.position) < 35) dots.push({ x: f.x, z: f.z, color: '#ffd700', r: 3 });
  ui.drawMinimap(world, G.player.pos, G.player.yaw, { markers, dots });
}

function collectFeather(f) {
  const c = G.career;
  f.taken = true; f.mesh.visible = false;
  c.feathers.push(f.id);
  c.money += 25; c.fame += 2;
  const k = ['power', 'speed', 'stamina', 'defense'][Math.floor(Math.random() * 4)];
  c.addStat(k, 1);
  sfx.coin();
  particles.burst(f.mesh.position.clone(), 0xffd700, 14, 4);
  ui.toast(`🪶 Golden feather! +$25, +1 ${k} (${c.feathers.length}/${world.feathers.length})`, '#ffd700');
  if (c.feathers.length === world.feathers.length) {
    c.money += 500; c.fame += 30;
    ui.toast('All golden feathers found! +$500 bonus!', '#ffd700', 6000);
    sfx.levelUp();
  }
}

function passOut() {
  const c = G.career;
  const lost = Math.min(30, Math.floor(c.money));
  c.money -= lost;
  newDay(8 * 60, 60);
  G.player.pos.set(HOME.x, 0, HOME.z - 9); G.player.vel.set(0, 0, 0);
  ui.modal('You passed out!', `<p>You stayed out past midnight and collapsed. A kindly flock of pigeons carried you home… and charged <b>$${lost}</b> for the trip.</p><p class="muted">Sleep in your nest before midnight to wake up with full energy.</p>`, [{ label: 'Ugh, okay' }]);
}

function newDay(startTime, energy) {
  const c = G.career;
  c.day++; c.time = startTime; c.energy = energy;
  c.streetBeaten = []; c.foughtArenaToday = false;
  const sponsor = Math.round(c.fame * 1.2);
  if (sponsor > 0) { c.money += sponsor; setTimeout(() => ui.toast(`Sponsor money: +$${sponsor}`, '#4ade80'), 400); }
  world.refreshChallengers(c.avg, c.streetBeaten);
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
        ui.modal(`Day ${c.day}`, `<p>☀️ Good morning, ${c.name}! You feel fully rested.</p><p class="muted">Game saved.</p>`, [{ label: 'Rise and shine' }]);
        sfx.chirp(); setTimeout(() => sfx.chirp(), 250);
      } },
    ]);
  } else if (STATIONS[id]) {
    if (c.energy < 15) { ui.toast('Too tired to train! Eat something or sleep.', '#ef4444'); sfx.bad(); return; }
    startTraining(id);
  } else if (id === 'coach') coachDialog();
  else if (id === 'shop') shopDialog();
  else if (id === 'promoter') promoterDialog();
}

function coachDialog() {
  const c = G.career, s = c.stats;
  const weakest = Object.keys(s).sort((a, b) => s[a] - s[b])[0];
  const where = { power: 'Heavy Bag', speed: 'Speed Bag', stamina: 'Jump Rope', defense: 'Dodge Drill' }[weakest];
  const opp = c.nextOpponent();
  const gap = opp.lvl - c.avg;
  const advice = gap > 12 ? `${opp.name} would pluck you bald right now. Train more before booking that fight.`
    : gap > 4 ? `${opp.name} is tougher than you, but with good defense you can steal it.`
    : `You're ready for ${opp.name}. Go get 'em, kid!`;
  ui.modal('Coach Gizzard', `
    <p>"Hoo-hoo. Listen up, ${c.name}."</p>
    <p>"Your weakest area is <b>${weakest}</b>. Spend time on the <b>${where}</b>."</p>
    <p>"${advice}"</p>
    <p class="muted">Tips: Jabs are fast but light. Hooks and uppercuts hit hard but are slow — punish your opponent while they wind up for a <b>COUNTER</b> (+40% damage). Holding block drains stamina. Dodging (Space) makes you briefly untouchable.</p>`,
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
      else { c.energy = Math.min(100, c.energy + it.energy); ui.toast(`Yum! ${it.name} (+${it.energy} energy)`, '#38bdf8'); sfx.coin(); }
      render();
    });
  };
  render();
}

function rankingsHTML(c) {
  const list = c.rankings();
  return `<ul class="rank-list">${list.map((r, i) => `<li class="${r.me ? 'me' : ''} ${(!r.me && i === c.playerRank - 1) ? 'next' : ''}"><span>${i === 0 ? '👑' : '#' + i} ${r.name}</span><span class="muted">${r.me ? 'YOU' : r.nick}</span></li>`).join('')}
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
  const tired = c.energy < 30;
  const blocked = late || tired || c.foughtArenaToday;
  const why = c.foughtArenaToday ? 'One Coliseum fight per day — come back tomorrow.' : late ? 'Fight night is over (fights until 22:00).' : tired ? 'You need at least 30% energy to fight.' : '';
  ui.modal('Promoter Pecksworth', `
    <p>"${c.playerRank === 0 ? `The champ! Ready to defend your belt? Defense #${c.titleDefenses + 1} pays big.` : title ? 'This is it, kid. A shot at the TITLE!' : `Ah, ${c.name}! You're ${c.rankLabel}. Beat the bird above you and you take their spot.`}"</p>
    <div class="vs"><div><b>${c.name}</b><div class="muted">${c.rankLabel}</div></div><div class="big">VS</div><div><b>${opp.name}</b><div class="muted">"${opp.nick}" · ${opp.style}</div></div></div>
    <div class="statgrid">
      ${statLine('Power', c.stats.power, opp.stats.power)}${statLine('Speed', c.stats.speed, opp.stats.speed)}
      ${statLine('Stamina', c.stats.stamina, opp.stats.stamina)}${statLine('Defense', c.stats.defense, opp.stats.defense)}
    </div>
    <p>Purse: <b>$${c.purse()}</b> · ${title ? 4 : 3} rounds · costs 30 energy</p>
    ${why ? `<p style="color:#fca5a5"><b>${why}</b></p>` : ''}
    <details><summary class="muted">Rankings</summary>${rankingsHTML(c)}</details>`,
    [{ label: 'Not now', secondary: true }, { label: title ? '🏆 Fight for the title!' : '🥊 Book the fight!', disabled: blocked, onClick: startArenaFight }]);
}

function challengeDialog(npc) {
  const c = G.career, ch = npc.challenger;
  const tired = c.energy < 15;
  ui.modal(ch.name, `<p>"${['Think you can take me? Let\'s go, right here!', 'This is my block. Put up or shut up!', 'Winner takes the seeds. Deal?'][Math.floor(Math.random() * 3)]}"</p>
    <p>Level ~${ch.lvl} ${ch.style} · Prize: <b>$${ch.purse}</b> · 2 short rounds · costs 15 energy</p>
    ${tired ? '<p style="color:#fca5a5"><b>You\'re too tired to fight.</b></p>' : ''}`,
    [{ label: 'Walk away', secondary: true }, { label: 'Put \'em up!', disabled: tired, onClick: () => startStreetFight(npc) }]);
}

function careerPanel() {
  const c = G.career, s = c.stats;
  ui.modal(`${c.name} — ${c.rankLabel}`, `
    <div class="statgrid">${statLine('Power', s.power)}${statLine('Speed', s.speed)}${statLine('Stamina', s.stamina)}${statLine('Defense', s.defense)}</div>
    <p>Record <b>${c.record.w}-${c.record.l}</b> (${c.record.ko} KOs) · Fame <b>${Math.floor(c.fame)}</b> · Money <b>$${Math.floor(c.money)}</b></p>
    <p>Day ${c.day}, ${c.timeLabel} · Golden feathers ${c.feathers.length}/${world.feathers.length}${c.champion ? ` · 🏆 Title defenses: ${c.titleDefenses}` : ''}</p>
    <p class="muted">Gear: ${c.gear.length ? c.gear.map((g) => SHOP_ITEMS.find((i) => i.id === g).name).join(', ') : 'none yet'}</p>
    <b>Rankings</b>${rankingsHTML(c)}`,
    [{ label: 'Controls', secondary: true, onClick: helpPanel }, { label: 'Save', secondary: true, onClick: () => { c.save(); ui.toast('Game saved.'); } }, { label: 'Close' }]);
}

function helpPanel() {
  ui.modal('Controls', `
    <p><b>Exploring</b><br><kbd>W A S D</kbd> move · <kbd>Shift</kbd> run · <kbd>Space</kbd> jump, press again mid-air to flap (×4), hold to glide · drag mouse / <kbd>Q</kbd> <kbd>R</kbd> to turn camera · wheel zoom · <kbd>E</kbd> interact · <kbd>C</kbd> career</p>
    <p><b>Fighting</b><br><kbd>W A S D</kbd> move & circle · <kbd>J</kbd> / left-click jab · <kbd>K</kbd> / right-click hook · <kbd>L</kbd> uppercut · hold <kbd>Shift</kbd> block · <kbd>Space</kbd> dodge (+ direction). Knocked down? Mash <kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> to get up!</p>
    <p><b>Career</b><br>Train at the gym (costs energy), eat at Seed & Feed, sleep at your nest. Climb the Coliseum rankings one fight per day, win street fights for cash, and become champion.</p>`,
    [{ label: 'Got it' }]);
}

// ---------- training ----------
function startTraining(id) {
  G.mode = 'training';
  ui.showHUD(false); ui.prompt(null);
  G.training = new Training({
    id, world, bird: G.player.bird, ui, camera,
    onEnd: (r) => {
      const c = G.career;
      c.energy = Math.max(0, c.energy - 18);
      c.time += 45;
      const stat = r.stat;
      let gain = 0;
      if (r.acc >= 0.25) gain = Math.max(1, Math.round((1.5 + r.acc * 5.5) * Math.max(0.25, 1 - c.stats[stat] / 120)));
      c.addStat(stat, gain);
      const grade = r.acc > 0.9 ? 'S' : r.acc > 0.75 ? 'A' : r.acc > 0.55 ? 'B' : r.acc > 0.25 ? 'C' : 'F';
      if (gain) sfx.levelUp(); else sfx.bad();
      G.training = null;
      G.mode = 'world';
      ui.showHUD(true);
      const st = world.stations[id];
      G.player.pos.copy(st.pos).add(new THREE.Vector3(0, 0, id === 'rope' ? -2.2 : -1.2));
      ui.modal(`Training: ${STATIONS[id].title}`, `
        <p><span class="big" style="font-family:Bungee,sans-serif;font-size:34px;color:var(--accent2);margin-right:12px">${grade}</span><b>${Math.round(r.acc * 100)}%</b> accuracy</p>
        <p class="muted">${r.perfect} perfect · ${r.good} good · ${r.miss} miss · best combo ${r.best}</p>
        <p>${gain ? `<b>${stat.toUpperCase()} +${gain}</b> → ${c.stats[stat]}` : 'Sloppy session... no gains this time.'}</p>
        <p class="muted">-18 energy · 45 minutes passed</p>`,
        [{ label: 'Done' }, { label: 'Again', secondary: true, disabled: c.energy < 15, onClick: () => startTraining(id) }]);
      c.save();
    },
  });
}

// ---------- fights ----------
let chalk = null;
function beginFight({ opp, oppBird, center, bounds, rounds, roundTime, kind, npc }) {
  const c = G.career;
  G.mode = 'fight';
  ui.prompt(null);
  const eff = 0.75 + 0.25 * clamp(c.energy, 0, 100) / 100;
  G.preFightPos = G.player.pos.clone();
  G.player.vel.set(0, 0, 0);
  G.fight = new Fight({
    scene, world, ui, particles, camera, center, bounds, rounds, roundTime, kind,
    playerBird: G.player.bird, playerStats: { ...c.stats }, playerName: c.name, playerEff: eff,
    oppBird, opp, introText: kind === 'arena' ? `ROUND 1` : 'STREET FIGHT!',
    onEnd: (res) => endFight(res, { opp, oppBird, kind, npc }),
  });
  if (kind === 'arena') { world.arenaSpot.intensity = 40; sfx.cheer(0.5); }
}

function startArenaFight() {
  const c = G.career;
  const opp = c.nextOpponent();
  const oppBird = makeBird({ ...opp.look });
  oppBird.root.scale.setScalar(opp.scale);
  scene.add(oppBird.root);
  c.energy -= 30;
  c.foughtArenaToday = true;
  beginFight({
    opp, oppBird, kind: 'arena',
    center: new THREE.Vector3(RING.x, RING.y, RING.z), bounds: { type: 'square', half: RING.half - 0.8 },
    rounds: opp.title ? 4 : 3, roundTime: 60,
  });
}

function startStreetFight(npc) {
  const c = G.career, ch = npc.challenger;
  const o = npc.bird.opts;
  const opp = { name: ch.name, nick: 'Street Brawler', lvl: ch.lvl, stats: statsFor(ch.lvl, ch.style), skill: clamp(0.12 + ch.lvl / 115, 0.15, 0.85), style: ch.style };
  const oppBird = makeBird({ body: o.body, belly: o.belly, crest: o.crest, crestStyle: o.crestStyle, beakLen: o.beakLen, glove: o.glove, trunks: o.trunks, headband: 0xffffff });
  scene.add(oppBird.root);
  npc.bird.root.visible = false;
  // find a clear patch of ground for the fight
  const mid = G.player.pos.clone().lerp(npc.bird.root.position, 0.5);
  let center = null;
  for (let r = 0; r < 30 && !center; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const x = mid.x + Math.cos(a) * r, z = mid.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > WORLD_R - 6) continue;
      if (!world.colliders.some((cl) => world.overlaps(cl, x, z, 5.2))) { center = new THREE.Vector3(x, 0, z); break; }
      if (r === 0) break;
    }
  }
  if (!center) center = new THREE.Vector3(0, 0, 24);
  center.y = 0.02;
  chalk = new THREE.Mesh(new THREE.RingGeometry(5, 5.3, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  chalk.rotation.x = -Math.PI / 2; chalk.position.copy(center).add(new THREE.Vector3(0, 0.06, 0));
  scene.add(chalk);
  c.energy -= 15;
  beginFight({ opp, oppBird, kind: 'street', npc, center, bounds: { type: 'circle', r: 4.6 }, rounds: 2, roundTime: 45 });
}

function endFight(res, { opp, oppBird, kind, npc }) {
  const c = G.career;
  scene.remove(oppBird.root);
  if (chalk) { scene.remove(chalk); chalk = null; }
  world.arenaSpot.intensity = 0;
  ui.hideFight();
  const fight = G.fight;
  G.fight = null;
  const b = G.player.bird;
  b.rig.rotation.set(0, 0, 0); b.rig.position.set(0, 0, 0); b.head.rotation.set(0, 0, 0);
  b.setPose('idle'); b.snap();
  const ko = res.method === 'KO' || res.method === 'TKO';
  let lines = [], title;
  const acc = res.thrown ? Math.round(res.landed / res.thrown * 100) : 0;

  if (kind === 'arena') {
    G.player.pos.set(RING.x, 0, RING.z + RING.half + 3.5);
    const purse = c.purse();
    if (res.win) {
      const wasRank = c.rankLabel;
      const titleFight = c.playerRank === 1;
      const defense = c.playerRank === 0;
      c.money += purse; c.fame += 8 + (11 - c.playerRank) * 3 + (ko ? 5 : 0);
      c.record.w++; if (ko) c.record.ko++;
      c.climb(); // you take the beaten fighter's spot; they drop one place
      title = titleFight ? '🏆 NEW CHAMPION! 🏆' : defense ? 'Title Defended!' : 'Victory!';
      lines.push(`You beat <b>${opp.name}</b> by <b>${res.method}</b>${res.cards ? ` (${res.cards})` : ''} in round ${res.round}.`);
      lines.push(`Purse: <b>+$${purse}</b> · Rank: ${wasRank} → <b>${c.rankLabel}</b>`);
      if (titleFight) lines.push(`🎉 <b>${c.name}</b> is the Undisputed Featherweight Champion of Featherton! Keep defending your belt for bigger purses.`);
      sfx.levelUp();
    } else {
      const consolation = Math.round(purse * 0.25);
      c.money += consolation; c.fame = Math.max(0, c.fame - 3);
      c.record.l++;
      title = 'Defeat';
      lines.push(`<b>${opp.name}</b> beat you by <b>${res.method}</b>${res.cards ? ` (${res.cards})` : ''}.`);
      lines.push(`Show money: +$${consolation}. Train up and try again tomorrow!`);
      if (c.playerRank === 0) {
        // Lost a title defense: the challenger takes the belt.
        c.rosterOrder.splice(c.rosterOrder.indexOf(opp.idx), 1);
        c.rosterOrder.unshift(opp.idx);
        c.playerRank = 1;
        lines.push(`💔 You lost your belt. ${opp.name} is the new champion — win it back tomorrow!`);
      }
    }
    c.time += 120;
    world.updateRankBoard(c.rankings(), c.name);
  } else {
    G.player.pos.copy(fight.p.bird.root.position); G.player.pos.y = 0;
    npc.bird.root.visible = true;
    const ch = npc.challenger;
    if (res.win) {
      c.money += ch.purse; c.fame += 3 + (ko ? 2 : 0); c.record.w++; if (ko) c.record.ko++;
      c.streetBeaten.push(ch.name);
      if (npc.marker) { npc.bird.root.remove(npc.marker); npc.marker = null; }
      npc.challenger = null;
      title = 'Street Win!';
      lines.push(`You beat <b>${ch.name}</b> by <b>${res.method}</b>. Prize: <b>+$${ch.purse}</b>`);
      sfx.levelUp();
    } else {
      const lost = Math.min(Math.floor(c.money), Math.round(ch.purse / 2));
      c.money -= lost; c.record.l++;
      title = 'Street Loss';
      lines.push(`<b>${ch.name}</b> got the better of you (${res.method}). You lost <b>$${lost}</b> on the side bet.`);
    }
    c.time += 40;
  }
  lines.push(`<span class="muted">Punches landed ${res.landed}/${res.thrown} (${acc}%) · Knockdowns ${res.kdGiven} given, ${res.kdTaken} taken</span>`);
  G.mode = 'world';
  ui.showHUD(true);
  c.save();
  ui.modal(title, lines.map((l) => `<p>${l}</p>`).join(''), [{ label: 'Continue' }]);
}

// ---------- title camera ----------
function updateTitle(dt) {
  G.titleT += dt;
  const a = G.titleT * 0.08;
  camera.position.set(Math.sin(a) * 7, 2.6, 18 + Math.cos(a) * 7);
  // On wide screens, frame the fighter to the left of the menu
  const side = camera.aspect > 1.2 ? 2.6 : 0;
  camera.lookAt(Math.cos(a) * side, camera.aspect > 1.2 ? 1.4 : 0.2, 18 - Math.sin(a) * side);
  if (preview) {
    preview.root.rotation.y = a + 0.5;
    const t = G.titleT % 2.4;
    if (t < 0.15) preview.setHand('l', [-0.08, 1.72, 1.45], 40);
    else if (t > 1.2 && t < 1.4) preview.setHand('r', [-0.1, 1.7, 1.25], 40);
    else preview.setPose('guard', 12);
    preview.walk(dt, 0); preview.update(dt);
  }
  world.update(dt, new THREE.Vector3(0, 0, 0), 10 * 60);
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
    world.update(dt, G.player.pos, c.time);
    if (G.mode === 'world') updateWorldMode(dt);
    else if (G.mode === 'fight' && G.fight) {
      if (!ui.modalOpen) G.fight.update(dt, input);
      G.fight && G.fight.updateCamera(camera, dt);
      world.updateNPCs(dt, G.player.pos, true);
    } else if (G.mode === 'training' && G.training) {
      G.training.update(dt, input);
      world.updateNPCs(dt, G.player.pos, false);
    }
  }
  particles.update(dt);
  renderer.render(scene, camera);
  input.endFrame();
}

buildTitle();
frame();
window.__game = { G, world, scene, camera, ui };
