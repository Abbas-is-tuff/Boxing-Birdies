// Career state: your birds, stats, money, rankings, difficulty, saving.
const SAVE_KEY = 'boxing-birdies-save-v2';

// The player's own birds. Pick one to box; the other two work your corner.
export const MY_BIRDS = [
  { id: 'pepper', name: 'Pepper', nick: 'The Crest', species: 'cockatielGrey', glove: 0xc0141c, trunks: 0x1e3a8a, trim: 0xfacc15,
    bonus: { power: 1, speed: 1, stamina: 1, defense: 1 },
    bio: 'Grey cockatiel. The yellow crest shoots straight up when the bell rings. Well-rounded.' },
  { id: 'sunny', name: 'Sunny', nick: 'Lemon Drop', species: 'cockatielLutino', glove: 0x1d4ed8, trunks: 0xf97316, trim: 0xffffff,
    bonus: { power: 0, speed: 4, stamina: 1, defense: 0 },
    bio: 'Lutino cockatiel: creamy yellow, bright orange cheeks and ruby-red eyes. Fastest wings in Featherton.' },
  { id: 'rosie', name: 'Rosie', nick: 'The Red Rocket', species: 'lovebirdPeach', glove: 0xfacc15, trunks: 0x0f766e, trim: 0xf43f5e,
    bonus: { power: 4, speed: 1, stamina: 0, defense: 0 },
    bio: 'Peach-faced lovebird with a fiery red head. Tiny, fearless and punches way above 52 grams.' },
];

export const DIFFICULTY = {
  rookie: { label: 'Rookie', desc: 'Relaxed. You hit harder and take less damage, rivals are slower, and you see their punches coming.',
    dealt: 1.45, taken: 0.55, ai: 0.55, aggr: 0.7, mash: 2.2, energy: 0.65, train: 1.6, window: 1.45, tempo: 1.22, start: 18, telegraph: true, flapCost: 6, dailyLimit: false },
  pro: { label: 'Pro', desc: 'Balanced. A fair fight with a little help reading your rival.',
    dealt: 1.15, taken: 0.8, ai: 0.8, aggr: 0.88, mash: 1.5, energy: 0.85, train: 1.25, window: 1.2, tempo: 1.1, start: 14, telegraph: true, flapCost: 10, dailyLimit: false },
  legend: { label: 'Legend', desc: 'The original challenge. No hints, one Coliseum bout per day.',
    dealt: 1, taken: 1, ai: 1, aggr: 1, mash: 1, energy: 1, train: 1, window: 1, tempo: 1, start: 10, telegraph: false, flapCost: 14, dailyLimit: true },
};

// Index 0 is the reigning champion; 10 is the lowest-ranked contender.
export const ROSTER = [
  { id: 'condor', name: 'King Condor', nick: 'The Undisputed', lvl: 80, style: 'tank', species: 'condor', glove: 0xd4af37, trunks: 0x5b2a86, trim: 0xd4af37, scale: 1.15 },
  { id: 'eagle', name: 'Eagle Eddie', nick: 'The Apex', lvl: 71, style: 'balanced', species: 'eagle', glove: 0x1e40af, trunks: 0xf5f5f5, trim: 0xb91c1c, scale: 1.1 },
  { id: 'raven', name: 'Raven Rampage', nick: 'Nevermore', lvl: 63, style: 'brawler', species: 'raven', glove: 0x7f1d1d, trunks: 0x18181b, trim: 0x991b1b, scale: 1.05 },
  { id: 'flamingo', name: 'Flamingo Fury', nick: 'Pink Lightning', lvl: 56, style: 'speedster', species: 'flamingo', glove: 0x0d9488, trunks: 0x0d9488, trim: 0xffffff, scale: 1.08 },
  { id: 'owl', name: 'Owlbert Einstrike', nick: 'The Professor', lvl: 49, style: 'tank', species: 'owl', glove: 0x166534, trunks: 0x166534, trim: 0xfacc15, scale: 1 },
  { id: 'hawk', name: 'Hawk Talonson', nick: 'The Talon', lvl: 43, style: 'speedster', species: 'hawk', glove: 0xea580c, trunks: 0x18181b, trim: 0xea580c, scale: 1 },
  { id: 'toucan', name: 'Toucan Tommy', nick: 'Big Beak', lvl: 37, style: 'brawler', species: 'toucan', glove: 0x0284c7, trunks: 0x0284c7, trim: 0xfacc15, scale: 1 },
  { id: 'pearl', name: 'Pearl', nick: 'The Whistler', lvl: 31, style: 'speedster', species: 'cockatielPearl', glove: 0xf472b6, trunks: 0x4c1d95, trim: 0xf472b6, scale: 1 },
  { id: 'pelican', name: 'Pelican Pete', nick: 'The Pouch', lvl: 25, style: 'tank', species: 'pelican', glove: 0xb91c1c, trunks: 0x3f6212, trim: 0xffffff, scale: 1.08 },
  { id: 'blaze', name: 'Blaze', nick: 'Lovebug', lvl: 19, style: 'brawler', species: 'lovebirdLutino', glove: 0x7c3aed, trunks: 0x111827, trim: 0xf59e0b, scale: 0.97 },
  { id: 'robin', name: 'Rocky Robin', nick: 'The Early Bird', lvl: 13, style: 'balanced', species: 'robin', glove: 0xe5e7eb, trunks: 0x1d4ed8, trim: 0xe5e7eb, scale: 0.95 },
];

const STYLE_MOD = {
  balanced: { power: 0, speed: 0, stamina: 0, defense: 0 },
  brawler: { power: 8, speed: -4, stamina: 3, defense: -6 },
  speedster: { power: -5, speed: 9, stamina: 2, defense: -3 },
  tank: { power: 2, speed: -7, stamina: 6, defense: 8 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function statsFor(lvl, style = 'balanced') {
  const m = STYLE_MOD[style] || STYLE_MOD.balanced;
  const s = {};
  for (const k of ['power', 'speed', 'stamina', 'defense']) s[k] = clamp(Math.round(lvl + m[k]), 3, 99);
  return s;
}

export const SHOP_ITEMS = [
  { id: 'seeds', name: 'Sunflower Seeds', desc: '+30 energy', price: 10, energy: 30 },
  { id: 'millet', name: 'Millet Spray', desc: '+55 energy · a cockatiel favourite', price: 22, energy: 55 },
  { id: 'nectar', name: 'Fruit & Nectar Bowl', desc: 'Full energy', price: 45, energy: 100 },
  { id: 'gloves', name: 'Pro Leather Gloves', desc: '+6 Power (permanent)', price: 380, gear: true, stat: 'power', amount: 6 },
  { id: 'shoes', name: 'Grip Perch Boots', desc: '+6 Speed (permanent)', price: 340, gear: true, stat: 'speed', amount: 6 },
  { id: 'guard', name: 'Beak Guard', desc: '+6 Defense (permanent)', price: 360, gear: true, stat: 'defense', amount: 6 },
  { id: 'lungs', name: 'Cuttlebone Supplements', desc: '+6 Stamina (permanent)', price: 320, gear: true, stat: 'stamina', amount: 6 },
];

export class Career {
  constructor(data) { Object.assign(this, data); }

  static create(birdId, difficulty = 'rookie') {
    const b = MY_BIRDS.find((x) => x.id === birdId) || MY_BIRDS[0];
    const D = DIFFICULTY[difficulty] || DIFFICULTY.rookie;
    const stats = {};
    for (const k of ['power', 'speed', 'stamina', 'defense']) stats[k] = D.start + (b.bonus[k] || 0);
    return new Career({
      name: b.name, birdId: b.id, difficulty,
      day: 1, time: 8 * 60, energy: 100, money: 150, fame: 0,
      stats, record: { w: 0, l: 0, ko: 0 },
      playerRank: 11, rosterOrder: ROSTER.map((_, i) => i),
      feathers: [], gear: [], streetBeaten: [], titleDefenses: 0, champion: false,
      foughtArenaToday: false, sparredToday: [],
    });
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const c = new Career(JSON.parse(raw));
      if (!c.sparredToday) c.sparredToday = [];
      if (!DIFFICULTY[c.difficulty]) c.difficulty = 'rookie';
      return c;
    } catch (e) { return null; }
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this)); } catch (e) { /* storage unavailable */ }
  }

  static wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  get D() { return DIFFICULTY[this.difficulty] || DIFFICULTY.rookie; }
  get bird() { return MY_BIRDS.find((b) => b.id === this.birdId) || MY_BIRDS[0]; }
  get team() { return MY_BIRDS.filter((b) => b.id !== this.birdId); }

  get avg() { const s = this.stats; return (s.power + s.speed + s.stamina + s.defense) / 4; }

  get rankLabel() {
    if (this.playerRank === 0) return 'CHAMPION';
    if (this.playerRank >= 11) return 'Unranked';
    return '#' + this.playerRank;
  }

  get timeLabel() {
    const h = Math.floor(this.time / 60) % 24, m = Math.floor(this.time % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  rankings() {
    const list = this.rosterOrder.map((i) => ({ ...ROSTER[i], idx: i, me: false }));
    list.splice(Math.min(this.playerRank, list.length), 0, { name: this.name, nick: 'That\'s you!', me: true });
    return list.slice(0, 11);
  }

  nextOpponent() {
    let idx, boost = 0;
    if (this.playerRank === 0) {
      idx = this.rosterOrder[Math.floor(Math.random() * 3)];
      boost = 4 + this.titleDefenses * 3;
    } else {
      idx = this.rosterOrder[this.playerRank - 1];
    }
    const base = ROSTER[idx];
    const lvl = Math.min(99, base.lvl + boost);
    return {
      idx, name: base.name, nick: base.nick, species: base.species, glove: base.glove, trunks: base.trunks, trim: base.trim, scale: base.scale || 1,
      lvl, stats: statsFor(lvl, base.style), skill: clamp(0.18 + lvl / 105, 0.2, 0.95) * this.D.ai, style: base.style,
      title: this.playerRank <= 1,
    };
  }

  // One of your own birds as a friendly sparring partner, pitched near your level.
  sparPartner(b) {
    const lvl = Math.max(6, Math.round(this.avg - (this.difficulty === 'rookie' ? 3 : 0)));
    const style = b.bonus.speed > 2 ? 'speedster' : b.bonus.power > 2 ? 'brawler' : 'balanced';
    return { name: b.name, nick: b.nick, species: b.species, glove: b.glove, trunks: b.trunks, trim: b.trim, scale: b.species.startsWith('lovebird') ? 0.95 : 1,
      lvl, stats: statsFor(lvl, style), skill: clamp(0.15 + lvl / 110, 0.15, 0.85) * this.D.ai, style, spar: true };
  }

  purse() {
    if (this.playerRank === 0) return 2500 + this.titleDefenses * 500;
    if (this.playerRank === 1) return 2000;
    return 110 + (11 - this.playerRank) * 85;
  }

  climb() {
    if (this.playerRank > 0) {
      this.playerRank -= 1;
      if (this.playerRank === 0) this.champion = true;
    } else {
      this.titleDefenses += 1;
    }
  }

  addStat(k, n) { this.stats[k] = clamp(this.stats[k] + n, 1, 99); }
}
