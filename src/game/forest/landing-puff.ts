/** Bounded tiny soil/snow flecks at real landing contacts; pauses with play and respects Reduced Motion. */
import type { Scene } from 'phaser';
import { LANDING_PUFF_CONFIG as C } from '../../config/landing-puff.config';
import { snapToGrid } from './pixel-grid-snap';
export function createLandingPuff(scene: Scene) {
  const graphics = scene.add.graphics().setDepth(3);
  type Fleck = { x: number; y: number; vx: number; vy: number; age: number; color: number; size: number };
  let particles: Fleck[] = [];
  return {
    burst(x: number, y: number, snowy: boolean, reduced: boolean): void {
      if (reduced) return;
      const palette = snowy ? C.snow : C.soil;
      for (let i = 0; i < C.count; i++) {
        if (particles.length >= C.maxParticles) particles.shift();
        const t = i / (C.count - 1);
        particles.push({ x: x + (t - 0.5) * C.spreadPx, y: y - 1,
          vx: (t - 0.5) * C.speedX * 2, vy: -C.speedY * (0.6 + (i % 3) * 0.2),
          // One or two art pixels across (whole art pixels, so a fleck never straddles the grid).
          age: 0, color: palette[i % palette.length]!, size: snapToGrid(C.minSizePx) * (1 + i % 2) });
      }
    },
    update(dtMs: number, running: boolean, reduced: boolean): void {
      graphics.clear();
      if (reduced) { particles = []; return; }
      const dt = running ? Math.min(50, Math.max(0, dtMs)) : 0;
      for (const p of particles) {
        p.age += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000; p.vy += C.gravity * dt / 1000;
        if (p.age >= C.lifeMs) continue;
        graphics.fillStyle(p.color, (1 - p.age / C.lifeMs) * 0.7);
        graphics.fillRect(snapToGrid(p.x), snapToGrid(p.y), p.size, p.size);
      }
      particles = particles.filter(p => p.age < C.lifeMs);
    },
  };
}
