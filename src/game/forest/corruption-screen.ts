/** Existing visual corruption drives a bounded shader and short shake bursts, never player motion. */
import type { Scene } from 'phaser';
import { CORRUPTION_SCREEN_CONFIG as C, screenCorruption } from '../../config/corruption-screen.config';
import { createCorruptionFilter } from './corruption-filter';
export function createCorruptionScreen(scene: Scene) {
  const filter = createCorruptionFilter(scene);
  let clock = 0, nextShake = C.shakeIntervalMs, ownsShake = false;
  return {
    update(c: number, dt: number, reduced: boolean, paused: boolean, strength: number) {
      const amount = screenCorruption(c, strength, reduced, paused);
      if (!reduced && !paused) clock += Math.min(100, Math.max(0, dt));
      if (filter) { filter.amount = amount; filter.seconds = clock / 1000; filter.active = amount > 0.001; }
      if (amount === 0) {
        if (ownsShake) scene.cameras.main.shakeEffect.reset();
        ownsShake = false; nextShake = clock + C.shakeIntervalMs;
      } else if (clock >= nextShake && !scene.cameras.main.shakeEffect.isRunning) {
        scene.cameras.main.shake(C.shakeMs, amount * C.shakeMaxPx / Math.max(scene.cameras.main.width, scene.cameras.main.height), false);
        ownsShake = true; nextShake = clock + C.shakeIntervalMs;
      }
    },
  };
}
