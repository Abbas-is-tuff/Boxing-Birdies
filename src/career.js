// Career state: stats, money, rankings, saving.
const SAVE_KEY = 'boxing-birdies-save-v1';

// Index 0 is the reigning champion; 10 is the lowest-ranked contender.
export const ROSTER = [
  { id: 'condor', name: 'King Condor', nick: 'The Undisputed', lvl: 80, style: 'tank', scale: 1.18,
    look: { body: 0x2b2b2b, belly: 0xf2f2f2, beak: 0xd9b38c, glove: 0xffd23f, trunks: 0x5b2a86, crest: 0xd94848, crestStyle: 'tufts', beakLen: 0.5, beakW: 0.16 } },
  { id: 'eagle', name: 'Eagle Eddie', nick: 'The Apex', lvl: 71, style: 'balanced', scale: 1.12,
    look: { body: 0x5a3a1e, belly: 0xffffff, beak: 0xffc21a, glove: 0x1e5bd6, trunks: 0xffffff, crest: 0xffffff, crestStyle: 'none', beakLen: 0.38, beakW: 0.15 } },
  { id: 'raven', name: 'Raven Rampage', nick: 'Nevermore', lvl: 63, style: 'brawler', scale: 1.05,
    look: { body: 0x15151f, belly: 0x2a2a3a, beak: 0x333333, glove: 0x8a0f0f, trunks: 0x8a0f0f, crest: 0x15151f, crestStyle: 'spike' } },
  { id: 'flamingo', name: 'Flamingo Fury', nick: 'Pink Lightning', lvl: 56, style: 'speedster', scale: 1.08,
    look: { body: 0xff6fa5, belly: 0xffc2d8, beak: 0x222222, glove: 0x10c0b0, trunks: 0x10c0b0, crest: 0xff6fa5, crestStyle: 'none', legs: 0xff6fa5, beakLen: 0.36 } },
  { id: 'owl', name: 'Owlbert Einstrike', nick: 'The Professor', lvl: 49, style: 'tank', scale: 1,
    look: { body: 0x8b6b4a, belly: 0xe8d6b0, beak: 0xc9a227, glove: 0x2e7d32, trunks: 0x2e7d32, crest: 0x8b6b4a, crestStyle: 'tufts', beakLen: 0.2 } },
  { id: 'hawk', name: 'Hawk Talonson', nick: 'The Talon', lvl: 43, style: 'speedster', scale: 1,
    look: { body: 0xa0522d, belly: 0xf5deb3, beak: 0x333333, glove: 0xff8800, trunks: 0x000000, crest: 0xa0522d, crestStyle: 'spike', beakLen: 0.3 } },
  { id: 'toucan', name: 'Toucan Tommy', nick: 'Big Beak', lvl: 37, style: 'brawler', scale: 1,
    look: { body: 0x111111, belly: 0xffe066, beak: 0xff7b00, glove: 0x00a3ff, trunks: 0x00a3ff, crest: 0x111111, crestStyle: 'none', beakLen: 0.85, beakW: 0.2 } },
  { id: 'gull', name: 'Gull Gutpunch', nick: 'Boardwalk Bully', lvl: 31, style: 'balanced', scale: 1,
    look: { body: 0xf0f0f0, belly: 0xffffff, beak: 0xffd000, glove: 0x444444, trunks: 0x3b6ea5, crest: 0xbfc8d0, crestStyle: 'none' } },
  { id: 'pelican', name: 'Pelican Pete', nick: 'The Pouch', lvl: 25, style: 'tank', scale: 1.1,
    look: { body: 0xd8d2c4, belly: 0xf7f3ea, beak: 0xf2a65a, glove: 0xb22222, trunks: 0x556b2f, crest: 0xd8d2c4, crestStyle: 'tufts', beakLen: 0.9, beakW: 0.17 } },
  { id: 'crow', name: 'Crusher Crow', nick: 'Junkyard', lvl: 19, style: 'brawler', scale: 1,
    look: { body: 0x2f2f3a, belly: 0x45455a, beak: 0x222222, glove: 0x9e9e9e, trunks: 0x7a5c2e, crest: 0x2f2f3a, crestStyle: 'spike' } },
  { id: 'robin', name: 'Rocky Robin', nick: 'The Early Bird', lvl: 13, style: 'balanced', scale: 0.95,
    look: { body: 0x6b5040, belly: 0xe2582b, beak: 0xf0c419, glove: 0xe0e0e0, trunks: 0x1f6feb, crest: 0x6b5040, crestStyle: 'none', beakLen: 0.3 } },
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
  { id: 'seeds', name: 'Sunflower Seeds', desc: '+25 energy', price: 12, energy: 25 },
  { id: 'worms', name: 'Worm Smoothie', desc: '+55 energy', price: 30, energy: 55 },
  { id: 'nectar', name: 'Hummingbird Nectar', desc: '+100 energy', price: 60, energy: 100 },
  { id: 'gloves', name: 'Golden Gloves', desc: '+6 Power (permanent)', price: 450, gear: true, stat: 'power', amount: 6 },
  { id: 'shoes', name: 'Feather-Light Boots', desc: '+6 Speed (permanent)', price: 400, gear: true, stat: 'speed', amount: 6 },
  { id: 'guard', name: 'Iron Beak Guard', desc: '+6 Defense (permanent)', price: 420, gear: true, stat: 'defense', amount: 6 },
  { id: 'lungs', name: 'Altitude Mask', desc: '+6 Stamina (permanent)', price: 380, gear: true, stat: 'stamina', amount: 6 },
];

export class Career {
  constructor(data) { Object.assign(this, data); }

  static create(name, palette) {
    return new Career({
      name: name || 'Birdie', palette,
      day: 1, time: 8 * 60, energy: 100, money: 120, fame: 0,
      stats: { power: 10, speed: 10, stamina: 10, defense: 10 },
      record: { w: 0, l: 0, ko: 0 },
      playerRank: 11, rosterOrder: ROSTER.map((_, i) => i),
      feathers: [], gear: [], streetBeaten: [], titleDefenses: 0, champion: false,
      foughtArenaToday: false,
    });
  }

  static load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return new Career(JSON.parse(raw));
    } catch (e) { return null; }
  }

  static hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this)); } catch (e) { /* storage unavailable */ }
  }

  static wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

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

  // Full ranking table with the player inserted.
  rankings() {
    const list = this.rosterOrder.map((i) => ({ ...ROSTER[i], idx: i, me: false }));
    list.splice(Math.min(this.playerRank, list.length), 0, { name: this.name, nick: 'That\'s you!', me: true });
    return list.slice(0, 11);
  }

  nextOpponent() {
    let idx, boost = 0;
    if (this.playerRank === 0) {
      // Title defense: one of the top three contenders, getting tougher each time.
      idx = this.rosterOrder[Math.floor(Math.random() * 3)];
      boost = 4 + this.titleDefenses * 3;
    } else {
      idx = this.rosterOrder[this.playerRank - 1];
    }
    const base = ROSTER[idx];
    const lvl = Math.min(99, base.lvl + boost);
    return {
      idx, name: base.name, nick: base.nick, look: base.look, scale: base.scale || 1,
      lvl, stats: statsFor(lvl, base.style), skill: clamp(0.18 + lvl / 105, 0.2, 0.95), style: base.style,
      title: this.playerRank <= 1,
    };
  }

  purse() {
    if (this.playerRank === 0) return 2500 + this.titleDefenses * 500;
    if (this.playerRank === 1) return 2000;
    return 90 + (11 - this.playerRank) * 75;
  }

  // Called after an arena win: player climbs one spot.
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
