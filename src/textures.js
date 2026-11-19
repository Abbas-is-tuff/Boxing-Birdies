import * as THREE from 'three';

// Procedural canvas textures, so the game needs no image files.
const cache = new Map();
const rnd = (a, b) => a + Math.random() * (b - a);

function tex(key, w, h, draw, { srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

// Per-pixel brightness noise over whatever is already drawn.
function grain(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

// Draw something at x and its horizontal/vertical wrap copies so textures tile.
function wrapDraw(w, h, x, y, fn) {
  for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) fn(x + dx, y + dy);
}

export const TEX = {
  // Overlapping contour feathers, greyscale so vertex colours tint them.
  featherBody: () => tex('featherBody', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d8d8d8'; ctx.fillRect(0, 0, w, h);
    const sx = 16, sy = 14;
    const rows = Math.round(h / sy);
    for (let r = rows + 1; r >= -1; r--) {
      for (let col = -1; col <= w / sx + 1; col++) {
        const x = col * sx + (r % 2 ? sx / 2 : 0), y = r * sy;
        wrapDraw(w, h, x, y, (px, py) => {
          if (px < -20 || px > w + 20 || py < -20 || py > h + 20) return;
          const g = ctx.createRadialGradient(px, py - 6, 1, px, py, 13);
          const v = 235 + Math.floor(rnd(-10, 12));
          g.addColorStop(0, `rgb(${v},${v},${v})`);
          g.addColorStop(1, 'rgb(196,196,196)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(px, py, 9.5, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(px, py, 9.5, 12, 0, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.moveTo(px, py - 9); ctx.lineTo(px, py + 9); ctx.stroke();
        });
      }
    }
    grain(ctx, w, h, 14);
  }),

  // A single flight/tail feather: rachis down the middle, barbs angled out.
  featherVane: () => tex('featherVane', 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#bdbdbd'); g.addColorStop(0.45, '#f4f4f4'); g.addColorStop(0.55, '#f4f4f4'); g.addColorStop(1, '#bdbdbd');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let y = -40; y < h + 40; y += 3) {
      ctx.strokeStyle = `rgba(0,0,0,${rnd(0.04, 0.1)})`;
      ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.lineTo(0, y - 22); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.lineTo(w, y - 22); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(w / 2 - 1.5, 0, 3, h);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(w / 2 + 1.5, 0, 1, h);
    grain(ctx, w, h, 10);
  }),

  grass: () => tex('grass', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4a6f2c'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `hsla(${rnd(70, 105)}, 40%, ${rnd(22, 40)}%, 0.25)`;
      const x = rnd(0, w), y = rnd(0, h), r = rnd(20, 70);
      wrapDraw(w, h, x, y, (px, py) => { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill(); });
    }
    for (let i = 0; i < 14000; i++) {
      const x = rnd(0, w), y = rnd(0, h), l = rnd(3, 9), a = rnd(-0.5, 0.5);
      ctx.strokeStyle = `hsl(${rnd(68, 110)}, ${rnd(30, 55)}%, ${rnd(20, 48)}%)`;
      ctx.lineWidth = rnd(0.8, 1.6);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * l, y - Math.cos(a) * l); ctx.stroke();
    }
    grain(ctx, w, h, 12);
  }),

  grassBlades: () => tex('grassBlades', 128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = rnd(8, w - 8), top = rnd(8, 60), bend = rnd(-18, 18);
      const g = ctx.createLinearGradient(0, h, 0, top);
      g.addColorStop(0, `hsl(${rnd(80, 95)}, 45%, 18%)`);
      g.addColorStop(1, `hsl(${rnd(70, 100)}, ${rnd(40, 60)}%, ${rnd(38, 55)}%)`);
      ctx.fillStyle = g;
      const bw = rnd(2, 4.5);
      ctx.beginPath();
      ctx.moveTo(x - bw, h);
      ctx.quadraticCurveTo(x - bw * 0.4 + bend * 0.4, (h + top) / 2, x + bend, top);
      ctx.quadraticCurveTo(x + bw * 0.4 + bend * 0.4, (h + top) / 2, x + bw, h);
      ctx.fill();
    }
  }),

  asphalt: () => tex('asphalt', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#3b3e42'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${rnd(0.03, 0.12)})` : `rgba(0,0,0,${rnd(0.05, 0.2)})`;
      ctx.fillRect(rnd(0, w), rnd(0, h), rnd(1, 3), rnd(1, 3));
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      let x = rnd(0, w), y = rnd(0, h);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rnd(-12, 12); y += rnd(4, 12); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    grain(ctx, w, h, 18);
  }),

  pavers: () => tex('pavers', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8f8a80'; ctx.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h; y += s / 2) {
      for (let x = 0; x < w; x += s) {
        const ox = (y / (s / 2)) % 2 ? s / 2 : 0;
        const v = Math.floor(rnd(170, 200));
        ctx.fillStyle = `rgb(${v},${v - 4},${v - 12})`;
        wrapDraw(w, h, x + ox, y, (px, py) => ctx.fillRect(px + 2, py + 2, s - 4, s / 2 - 4));
      }
    }
    grain(ctx, w, h, 16);
  }),

  concrete: () => tex('concrete', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#a7a39b'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${rnd(0.02, 0.06)})`;
      ctx.beginPath(); ctx.arc(rnd(0, w), rnd(0, h), rnd(10, 50), 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, w, h, 22);
  }),

  // Greyscale building materials (tinted with material colour)
  siding: () => tex('siding', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ededed'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const g = ctx.createLinearGradient(0, y, 0, y + 16);
      g.addColorStop(0, '#fafafa'); g.addColorStop(0.85, '#e4e4e4'); g.addColorStop(1, '#b5b5b5');
      ctx.fillStyle = g; ctx.fillRect(0, y, w, 16);
    }
    grain(ctx, w, h, 10);
  }),

  brick: () => tex('brick', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#cfc8bd'; ctx.fillRect(0, 0, w, h);
    const bw = 64, bh = 21.333;
    for (let r = 0; r < 12; r++) {
      for (let c = -1; c < 5; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
        const hue = rnd(5, 18), l = rnd(32, 45);
        ctx.fillStyle = `hsl(${hue}, ${rnd(35, 55)}%, ${l}%)`;
        wrapDraw(w, h, x, y, (px, py) => ctx.fillRect(px + 2, py + 2, bw - 4, bh - 4));
      }
    }
    grain(ctx, w, h, 20);
  }),

  shingles: () => tex('shingles', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0, 0, w, h);
    const sw = 32, sh = 16;
    for (let r = 0; r < h / sh; r++) {
      for (let c = -1; c < w / sw + 1; c++) {
        const x = c * sw + (r % 2 ? sw / 2 : 0), y = r * sh;
        const v = Math.floor(rnd(150, 215));
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x + 1, y, sw - 2, sh - 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 1, y + sh - 3, sw - 2, 2);
      }
    }
    grain(ctx, w, h, 14);
  }),

  wood: () => tex('wood', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e6e6e6'; ctx.fillRect(0, 0, w, h);
    const pw = 32;
    for (let x = 0; x < w; x += pw) {
      const v = Math.floor(rnd(205, 245));
      ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(x, 0, pw - 2, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      for (let k = 0; k < 6; k++) {
        ctx.beginPath(); let gx = x + rnd(3, pw - 5); ctx.moveTo(gx, 0);
        for (let y = 0; y <= h; y += 16) { gx += rnd(-1.2, 1.2); ctx.lineTo(gx, y); }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + pw - 2, 0, 2, h);
    }
    grain(ctx, w, h, 10);
  }),

  metal: () => tex('metal', 128, 128, (ctx, w, h) => {
    for (let x = 0; x < w; x += 8) {
      const g = ctx.createLinearGradient(x, 0, x + 8, 0);
      g.addColorStop(0, '#9a9a9a'); g.addColorStop(0.5, '#e8e8e8'); g.addColorStop(1, '#9a9a9a');
      ctx.fillStyle = g; ctx.fillRect(x, 0, 8, h);
    }
    grain(ctx, w, h, 8);
  }),

  bark: () => tex('bark', 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5b4330'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? '20,12,6' : '140,115,90'},${rnd(0.2, 0.5)})`;
      ctx.lineWidth = rnd(1, 3);
      let x = rnd(0, w); ctx.beginPath(); ctx.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) { x += rnd(-3, 3); ctx.lineTo(x, y); }
      ctx.stroke();
    }
    grain(ctx, w, h, 16);
  }),

  leaves: () => tex('leaves', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2d4a1e'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const x = rnd(0, w), y = rnd(0, h), a = rnd(0, Math.PI);
      ctx.fillStyle = `hsl(${rnd(75, 120)}, ${rnd(35, 60)}%, ${rnd(20, 45)}%)`;
      wrapDraw(w, h, x, y, (px, py) => { ctx.beginPath(); ctx.ellipse(px, py, rnd(3, 6), rnd(1.5, 3), a, 0, Math.PI * 2); ctx.fill(); });
    }
    grain(ctx, w, h, 14);
  }),

  dirt: () => tex('dirt', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7a6347'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `hsla(${rnd(20, 40)}, ${rnd(20, 40)}%, ${rnd(20, 55)}%, 0.5)`;
      ctx.fillRect(rnd(0, w), rnd(0, h), rnd(1, 4), rnd(1, 4));
    }
    grain(ctx, w, h, 20);
  }),

  rock: () => tex('rock', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7d7a73'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '30,30,30' : '200,200,190'},${rnd(0.05, 0.15)})`;
      ctx.beginPath(); ctx.ellipse(rnd(0, w), rnd(0, h), rnd(4, 30), rnd(2, 12), rnd(0, 3), 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, w, h, 24);
  }),

  // Tileable normal map for rippling water, built from sine waves with whole-number frequencies.
  waterNormal: () => tex('waterNormal', 256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h), d = img.data;
    const waves = [];
    for (let i = 0; i < 9; i++) waves.push({ kx: Math.round(rnd(-6, 6)), ky: Math.round(rnd(1, 7)) * (Math.random() < 0.5 ? -1 : 1), a: rnd(0.3, 1), p: rnd(0, 6.28) });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let dx = 0, dy = 0;
        for (const wv of waves) {
          const ph = 2 * Math.PI * (wv.kx * x / w + wv.ky * y / h) + wv.p;
          const c = Math.cos(ph) * wv.a;
          dx += c * wv.kx; dy += c * wv.ky;
        }
        const n = new THREE.Vector3(-dx * 0.08, -dy * 0.08, 1).normalize();
        const i = (y * w + x) * 4;
        d[i] = (n.x * 0.5 + 0.5) * 255; d[i + 1] = (n.y * 0.5 + 0.5) * 255; d[i + 2] = (n.z * 0.5 + 0.5) * 255; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false }),
};

// Box geometry whose UVs are measured in world units, so one tiling texture fits any size.
export function boxWorldUV(w, h, d, unit = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    let fw, fh;
    if (nx > 0.5) { fw = d; fh = h; } else if (ny > 0.5) { fw = w; fh = d; } else { fw = w; fh = h; }
    uv.setXY(i, uv.getX(i) * fw / unit, uv.getY(i) * fh / unit);
  }
  return g;
}
