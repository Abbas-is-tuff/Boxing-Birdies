import * as THREE from 'three';

// Feather particles: puffs of feathers fly off on every clean hit.
export class Particles {
  constructor(scene, max = 240) {
    const geo = new THREE.PlaneGeometry(0.1, 0.3);
    geo.translate(0, 0.15, 0);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), max);
    this.mesh.frustumCulled = false;
    this.max = max;
    this.list = [];
    this.next = 0;
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const c = new THREE.Color(1, 1, 1);
    for (let i = 0; i < max; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.mesh.setColorAt(i, c);
      this.list.push({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), rot: new THREE.Euler(), spin: new THREE.Vector3() });
    }
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3();
  }

  burst(pos, color, n = 8, speed = 4) {
    const col = new THREE.Color(color);
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < n; i++) {
      const idx = this.next; this.next = (this.next + 1) % this.max;
      const p = this.list[idx];
      p.life = 1.2 + Math.random() * 0.8;
      p.pos.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8 + 1, (Math.random() - 0.5) * speed);
      p.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      p.spin.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
      this.mesh.setColorAt(idx, Math.random() < 0.25 ? white : col);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.list[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vel.y -= 4 * dt;
      p.vel.multiplyScalar(Math.exp(-2.5 * dt));
      p.vel.y = Math.max(p.vel.y, -1.2);
      p.pos.addScaledVector(p.vel, dt);
      p.pos.x += Math.sin(p.life * 8 + i) * 0.4 * dt;
      p.rot.x += p.spin.x * dt; p.rot.y += p.spin.y * dt; p.rot.z += p.spin.z * dt;
      const s = p.life <= 0 ? 0 : Math.min(1, p.life * 2);
      this._q.setFromEuler(p.rot); this._s.set(s, s, s);
      this._m.compose(p.pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
