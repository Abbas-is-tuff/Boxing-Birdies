// DOM-side interface: HUD, fight HUD, modals, toasts, minimap.
const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'), name: $('hudName'), rank: $('hudRank'), day: $('hudDay'), time: $('hudTime'),
      money: $('hudMoney'), fame: $('hudFame'), energy: $('hudEnergy'), record: $('hudRecord'), feathers: $('hudFeathers'),
      prompt: $('prompt'), announce: $('announce'), toasts: $('toasts'),
      fightHud: $('fightHud'), pName: $('fhPName'), oName: $('fhOName'), pHp: $('fhPHp'), oHp: $('fhOHp'),
      pSt: $('fhPSt'), oSt: $('fhOSt'), pKd: $('fhPKd'), oKd: $('fhOKd'), round: $('fhRound'), ftime: $('fhTime'),
      getUp: $('getUp'), getUpFill: $('getUpFill'),
      modal: $('modal'), mTitle: $('modalTitle'), mBody: $('modalBody'), mButtons: $('modalButtons'),
      minimap: $('minimap'), title: $('title'), touch: $('touch'),
    };
    this.mapCtx = this.el.minimap.getContext('2d');
    this.announceTimer = null;
    this.modalOpen = false;
    this.modalKeyHandler = null;
  }

  showHUD(v) { this.el.hud.classList.toggle('hidden', !v); }

  updateHUD(c, featherCount) {
    this.el.name.textContent = c.name;
    this.el.rank.textContent = c.rankLabel;
    this.el.rank.classList.toggle('champ', c.playerRank === 0);
    this.el.day.textContent = 'Day ' + c.day;
    this.el.time.textContent = (c.time >= 20 * 60 || c.time < 6 * 60 ? '🌙 ' : '☀️ ') + c.timeLabel;
    this.el.money.textContent = '$' + Math.floor(c.money);
    this.el.fame.textContent = Math.floor(c.fame);
    this.el.energy.style.width = Math.max(0, Math.min(100, c.energy)) + '%';
    this.el.record.textContent = `${c.record.w}-${c.record.l} (${c.record.ko} KO)`;
    this.el.feathers.textContent = `🪶 ${c.feathers.length}/${featherCount}`;
  }

  prompt(html) {
    if (!html) { this.el.prompt.classList.add('hidden'); return; }
    if (this.el.prompt.innerHTML !== html) this.el.prompt.innerHTML = html;
    this.el.prompt.classList.remove('hidden');
  }

  toast(text, color = '#ffb703', ms = 3200) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text; t.style.borderLeftColor = color;
    this.el.toasts.appendChild(t);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), ms);
  }

  announce(text, sec = 1.2, red = false) {
    const a = this.el.announce;
    a.textContent = text;
    a.classList.toggle('red', !!red);
    a.classList.add('show');
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => a.classList.remove('show'), sec * 1000);
  }

  callout(text, color = '#fde047') {
    const d = document.createElement('div');
    d.textContent = text;
    Object.assign(d.style, {
      position: 'fixed', left: (40 + Math.random() * 20) + '%', top: (52 + Math.random() * 8) + '%', transform: 'translate(-50%,-50%)',
      fontFamily: 'Bungee, sans-serif', fontSize: 'clamp(18px, 4vw, 32px)', color, textShadow: '0 3px 0 #000',
      pointerEvents: 'none', transition: 'all .7s ease-out', zIndex: 5, whiteSpace: 'nowrap',
    });
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.top = (parseFloat(d.style.top) - 8) + '%'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 800);
  }

  // ----- fight HUD -----
  showFight(pName, oName) {
    this.el.fightHud.classList.remove('hidden');
    this.el.pName.textContent = pName; this.el.oName.textContent = oName;
    this.showHUD(false); this.prompt(null);
  }
  hideFight() { this.el.fightHud.classList.add('hidden'); this.showGetUp(false); }
  updateFight(f) {
    const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100)) + '%';
    this.el.pHp.style.width = pct(f.p.hp, f.p.maxHp);
    this.el.oHp.style.width = pct(f.o.hp, f.o.maxHp);
    this.el.pSt.style.width = pct(f.p.st, f.p.maxSt);
    this.el.oSt.style.width = pct(f.o.st, f.o.maxSt);
    this.el.pKd.textContent = '💥'.repeat(f.p.kd);
    this.el.oKd.textContent = '💥'.repeat(f.o.kd);
    this.el.round.textContent = `ROUND ${f.round}/${f.rounds}`;
    const t = Math.max(0, Math.ceil(f.timeLeft));
    this.el.ftime.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }
  showGetUp(show, fill = 0) {
    this.el.getUp.classList.toggle('hidden', !show);
    if (show) this.el.getUpFill.style.width = Math.min(100, fill * 100) + '%';
  }

  // ----- modal -----
  modal(title, html, buttons = [{ label: 'OK' }]) {
    this.el.mTitle.textContent = title;
    this.el.mBody.innerHTML = html;
    this.el.mButtons.innerHTML = '';
    let first = null;
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.textContent = b.label;
      if (b.secondary) btn.className = 'secondary';
      if (b.disabled) btn.disabled = true;
      btn.onclick = () => { if (b.keepOpen) { b.onClick && b.onClick(); return; } this.closeModal(); b.onClick && b.onClick(); };
      this.el.mButtons.appendChild(btn);
      if (!first && !b.disabled && !b.secondary) first = btn;
    }
    this.el.modal.classList.remove('hidden');
    this.modalOpen = true;
    this.prompt(null);
    return this.el.mBody;
  }
  closeModal() {
    this.el.modal.classList.add('hidden');
    this.modalOpen = false;
    this.onModalClose && this.onModalClose();
  }

  // ----- minimap -----
  drawMinimap(world, pos, yaw, extras) {
    const ctx = this.mapCtx, W = 170, R = W / 2, scale = R / 70;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#3d7a45'; ctx.fillRect(0, 0, W, W);
    const tx = (x) => R + (x - pos.x) * scale, tz = (z) => R + (z - pos.z) * scale;
    for (const r of world.mapRects) {
      ctx.fillStyle = r.color;
      if (r.r) {
        ctx.beginPath(); ctx.arc(tx(r.x), tz(r.z), r.r * scale, 0, Math.PI * 2); ctx.fill();
        if (r.ring) { ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.arc(tx(r.x), tz(r.z), r.ring * scale, 0, Math.PI * 2); ctx.fill(); }
      } else ctx.fillRect(tx(r.x - r.w / 2), tz(r.z - r.d / 2), r.w * scale, r.d * scale);
    }
    ctx.font = 'bold 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const m of extras.markers) {
      let x = tx(m.x), y = tz(m.z);
      const dx = x - R, dy = y - R, d = Math.hypot(dx, dy);
      if (d > R - 10) { x = R + dx / d * (R - 10); y = R + dy / d * (R - 10); }
      ctx.fillStyle = m.bg || '#1f1a2b';
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.color || '#fff'; ctx.fillText(m.label, x, y + 1);
    }
    for (const d of extras.dots) {
      const x = tx(d.x), y = tz(d.z);
      if (Math.hypot(x - R, y - R) > R - 4) continue;
      ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(x, y, d.r || 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(R, R); ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#ffb703'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
