// Keyboard, mouse and touch input in one place.
const BLOCK_DEFAULT = ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export class Input {
  constructor(dom) {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0; this.mouseDY = 0; this.wheel = 0;
    this.dragging = false;
    this.joy = { x: 0, y: 0 };
    this.touch = false;

    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.code;
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
      if (BLOCK_DEFAULT.includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());

    dom.addEventListener('mousedown', (e) => {
      this.pressed.add('Mouse' + e.button);
      this.down.add('Mouse' + e.button);
      this.dragging = true;
    });
    addEventListener('mouseup', (e) => { this.down.delete('Mouse' + e.button); this.dragging = false; });
    addEventListener('mousemove', (e) => {
      if (this.dragging) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; }
    });
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });

    // Touch: drag on the canvas rotates the camera
    let lastTouch = null;
    dom.addEventListener('touchstart', (e) => { this.enableTouch(); const t = e.changedTouches[0]; lastTouch = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
    dom.addEventListener('touchmove', (e) => {
      if (!lastTouch) return;
      for (const t of e.changedTouches) {
        if (t.identifier === lastTouch.id) {
          this.mouseDX += (t.clientX - lastTouch.x) * 1.2;
          this.mouseDY += (t.clientY - lastTouch.y) * 1.2;
          lastTouch.x = t.clientX; lastTouch.y = t.clientY;
        }
      }
    }, { passive: true });
    dom.addEventListener('touchend', () => { lastTouch = null; }, { passive: true });
    addEventListener('touchstart', () => this.enableTouch(), { passive: true, once: true });

    this.setupTouchControls();
  }

  enableTouch() {
    if (this.touch) return;
    this.touch = true;
    document.body.classList.add('touch');
    this.onTouchEnabled && this.onTouchEnabled();
  }

  setupTouchControls() {
    const joy = document.getElementById('joy');
    const knob = document.getElementById('joyKnob');
    let jid = null;
    const setJoy = (cx, cy) => {
      const r = joy.getBoundingClientRect();
      let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
      const max = r.width / 2;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx *= max / len; dy *= max / len; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / max; this.joy.y = -dy / max;
    };
    joy.addEventListener('pointerdown', (e) => { jid = e.pointerId; joy.setPointerCapture(jid); setJoy(e.clientX, e.clientY); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === jid) setJoy(e.clientX, e.clientY); });
    const endJoy = (e) => { if (e.pointerId !== jid) return; jid = null; knob.style.transform = ''; this.joy.x = this.joy.y = 0; };
    joy.addEventListener('pointerup', endJoy);
    joy.addEventListener('pointercancel', endJoy);

    for (const b of document.querySelectorAll('#tbtns button')) {
      const code = b.dataset.code;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pressed.add(code); this.down.add(code); });
      const up = () => this.down.delete(code);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    }
  }

  isDown(...codes) { return codes.some((c) => this.down.has(c)); }
  wasPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }

  // Movement axis from WASD / arrows / joystick: x = right, y = forward
  axis() {
    let x = 0, y = 0;
    if (this.isDown('KeyW', 'ArrowUp')) y += 1;
    if (this.isDown('KeyS', 'ArrowDown')) y -= 1;
    if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1;
    x += this.joy.x; y += this.joy.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  endFrame() { this.pressed.clear(); this.mouseDX = this.mouseDY = 0; this.wheel = 0; }
}
