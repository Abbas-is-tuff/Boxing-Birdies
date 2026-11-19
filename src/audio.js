// Tiny synthesized sound effects (no audio files needed).
let ctx = null, master = null, noise = null;

function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function env(gainNode, t, a, peak, d) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + a);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function noiseHit(dur, type, freq, vol, q = 1) {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noise;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const gn = c.createGain(); env(gn, t, 0.005, vol, dur);
  src.connect(f).connect(gn).connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  const gn = c.createGain(); env(gn, t, 0.01, vol, dur);
  o.connect(gn).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() { ac(); },
  punch(strength = 1) {
    noiseHit(0.12, 'lowpass', 900 + 600 * strength, 0.7 * Math.min(1.4, strength));
    tone('sine', 140, 45, 0.18, 0.6 * Math.min(1.4, strength));
  },
  block() { noiseHit(0.08, 'bandpass', 500, 0.5, 2); tone('triangle', 220, 120, 0.08, 0.25); },
  whiff() { noiseHit(0.12, 'highpass', 2500, 0.12); },
  bell() { [880, 1320, 1760, 2640].forEach((f, i) => tone('sine', f, f * 0.995, 1.4 - i * 0.2, 0.25 / (i + 1))); },
  chirp() {
    const b = 2200 + Math.random() * 1200;
    tone('sine', b, b * 1.5, 0.08, 0.12);
    tone('sine', b * 1.1, b * 1.7, 0.07, 0.1, 0.11);
  },
  flap() { noiseHit(0.1, 'bandpass', 700, 0.25, 0.8); },
  cheer(vol = 0.35) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.6;
    const gn = c.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.3);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    src.connect(f).connect(gn).connect(master);
    src.start(t); src.stop(t + 2.3);
  },
  ooh() {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(260, t + 0.9);
    const gn = c.createGain(); env(gn, t, 0.15, 0.5, 0.9);
    src.connect(f).connect(gn).connect(master);
    src.start(t); src.stop(t + 1.2);
  },
  // Grey/lutino cockatiel wolf-whistle
  whistle() {
    tone('sine', 1500, 2600, 0.22, 0.12);
    tone('sine', 1300, 2200, 0.18, 0.1, 0.3);
    tone('sine', 2200, 1200, 0.3, 0.1, 0.5);
  },
  // Lovebird: sharp, high, rapid chirps
  lovebird() {
    for (let i = 0; i < 3; i++) tone('square', 3200 + Math.random() * 600, 4200, 0.04, 0.05, i * 0.07);
  },
  crowd(level) {
    const c = ac(); if (!c) return;
    if (!this._crowd) {
      const src = c.createBufferSource(); src.buffer = noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.5;
      const gn = c.createGain(); gn.gain.value = 0;
      src.connect(f).connect(gn).connect(master);
      src.start();
      this._crowd = gn;
    }
    this._crowd.gain.setTargetAtTime(level, c.currentTime, 0.3);
  },
  coin() { tone('square', 988, 988, 0.07, 0.12); tone('square', 1319, 1319, 0.18, 0.12, 0.07); },
  good() { tone('triangle', 660, 990, 0.1, 0.18); },
  bad() { tone('sawtooth', 200, 110, 0.15, 0.12); },
  levelUp() { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.16, 0.18, i * 0.09)); },
};
