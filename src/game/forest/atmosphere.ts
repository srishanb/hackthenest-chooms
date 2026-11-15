/** Fixed-size, corruption-aware weather overlays. No emitter growth or connection to gameplay wind. */
import type { Scene } from 'phaser';
import { ATMOSPHERE_CONFIG as C, DEFAULT_ENVIRONMENT, normalizeEnvironment, unit, type VisualEnvironment } from '../../config/atmosphere.config';
import { mixColor } from './presentation';
export function createAtmosphere(scene: Scene) {
  let base = { ...DEFAULT_ENVIRONMENT };
  let snow = 0, wind = 0, clock = 0, drift = 0;
  const grade = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x8abfdb)
    .setOrigin(0).setScrollFactor(0).setDepth(-7).setAlpha(0);
  const overlays = ['snow', 'leaves', 'fog'].map((kind, i) => scene.add.tileSprite(0, 0,
    scene.scale.width, scene.scale.height, `weather-${kind}`, 0).setOrigin(0).setScrollFactor(0)
    .setTileScale(2).setDepth(5 + i).setAlpha(0));
  return {
    setEnvironment(value: Partial<VisualEnvironment>) { base = normalizeEnvironment(value); },
    update(c: number, dt: number, reduced: boolean, paused: boolean, strength: number) {
      const target = base;
      const blend = 1 - Math.exp(-Math.max(0, dt) / C.weatherTauMs);
      snow += ((target.snowEnabled ? target.snow01 : 0) * unit(strength) - snow) * blend;
      wind += ((target.windEnabled ? target.wind01 : 0) * unit(strength) - wind) * blend;
      if (!paused && !reduced) { clock += Math.min(dt, 100); drift += Math.min(dt, 100) / 1000 * wind * target.direction * C.windPxPerSecond; }
      grade.setSize(scene.cameras.main.width, scene.cameras.main.height)
        .setFillStyle(mixColor(0x8abfdb, 0x592944, c)).setAlpha(snow * 0.08);
      for (const [i, overlay] of overlays.entries()) {
        overlay.setSize(scene.cameras.main.width, scene.cameras.main.height);
        const frame = Math.floor(clock / (i === 2 ? 120 : 80)) % 32;
        if (overlay.frame.name !== String(frame)) overlay.setFrame(frame);
        overlay.tilePositionX = Math.round(drift * (i + 1) * 0.5);
        overlay.setTint(mixColor(i === 0 ? 0xe9f6ff : 0xb4cea0, i === 0 ? 0xb5768f : 0x96506d, c));
        overlay.setAlpha(i === 0 ? snow * C.snowOpacity : i === 1 ? wind * C.leavesOpacity : Math.max(snow, wind) * C.fogOpacity);
      }
    },
  };
}
