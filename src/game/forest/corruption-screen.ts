/** Existing visual corruption drives a bounded shader and short shake bursts, never player motion. */
import type { Scene } from 'phaser';
import { CORRUPTION_SCREEN_CONFIG as C, screenCorruption } from '../../config/corruption-screen.config';
import { createCorruptionFilter } from './corruption-filter';
export function createCorruptionScreen(scene: Scene) {
  const filter = createCorruptionFilter(scene);
  const abstract = scene.add.image(0, 0, 'corruption-abstract').setOrigin(0).setScrollFactor(0).setDepth(-4).setAlpha(0);
  const lightning = scene.add.graphics().setScrollFactor(0).setDepth(-3);
  const fog = scene.add.graphics().setScrollFactor(0).setDepth(-2);
  const decoys = scene.add.graphics().setScrollFactor(0).setDepth(-2.5);
  let clock = 0, nextShake = C.shakeIntervalMs, ownsShake = false;
  return {
    update(c: number, dt: number, reduced: boolean, paused: boolean, strength: number) {
      const amount = screenCorruption(c, strength, reduced, paused);
      if (!reduced && !paused) clock += Math.min(100, Math.max(0, dt));
      if (filter) { filter.amount = amount; filter.seconds = clock / 1000; filter.active = amount > 0.001; }
      abstract.setDisplaySize(scene.cameras.main.width, scene.cameras.main.height)
        .setTint(0xaa7192).setAlpha(amount * 0.12);
      // A distant, gently faded bolt; never a full-screen flash or rapid strobe.
      fog.clear(); decoys.clear();
      const width = scene.cameras.main.width, height = scene.cameras.main.height;
      // Behind real platforms: nearby landing edges remain unobscured.
      const veil = amount * C.fogAlpha * (0.65 + 0.35 * Math.sin(clock / C.fogPeriodMs * Math.PI * 2));
      fog.fillStyle(0x32293e, veil);
      fog.fillEllipse(width * 0.15, height * 0.35, width * 0.9, height * 0.65);
      fog.fillEllipse(width * 0.85, height * 0.7, width * 0.95, height * 0.7);
      decoys.fillStyle(0x875c7b, amount * C.decoyAlpha);
      for (let i = 0; i < 4; i++) {
        const x = width * (i % 2 ? 0.62 : 0.12), y = height * (0.18 + i * 0.2);
        decoys.fillRoundedRect(x, y, 90 + i * 17, 12, 6);
        decoys.fillTriangle(x + 12, y + 10, x + 70, y + 10, x + 36, y + 32);
      }
      lightning.clear();
      const phase = clock % C.lightningPeriodMs;
      if (amount > 0 && phase < C.lightningPulseMs) {
        const alpha = Math.sin(phase / C.lightningPulseMs * Math.PI) * amount * C.lightningAlpha;
        const x = scene.cameras.main.width * (Math.floor(clock / C.lightningPeriodMs) % 2 ? 0.75 : 0.25);
        lightning.lineStyle(2, 0xbba9df, alpha).beginPath();
        lightning.moveTo(x, 0); lightning.lineTo(x - 22, 80); lightning.lineTo(x + 6, 76);
        lightning.lineTo(x - 36, 190); lightning.strokePath();
      }
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
