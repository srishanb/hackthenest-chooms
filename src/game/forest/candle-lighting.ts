/** Faint candle halo and persistent soft falloff, even when full fuel reveals the whole screen. */
import type { Scene } from 'phaser';
import { FUEL_VISIBILITY_CONFIG as C, sceneryCorruption } from '../../config/fuel-visibility.config';
export function createCandleLighting(scene: Scene) {
  for (const halo of [true, false]) {
    const key = halo ? 'candle-soft-halo' : 'candle-soft-shade';
    if (scene.textures.exists(key)) continue;
    const texture = scene.textures.createCanvas(key, 256, 256);
    if (!texture) throw new Error('Could not create candle lighting');
    const context = texture.getContext();
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, halo ? 'rgba(255,191,100,1)' : 'rgba(5,6,10,0)');
    gradient.addColorStop(1, halo ? 'rgba(255,191,100,0)' : 'rgba(5,6,10,1)');
    context.fillStyle = gradient; context.fillRect(0, 0, 256, 256); texture.refresh();
  }
  const halo = scene.add.image(0, 0, 'candle-soft-halo').setDepth(99);
  const shade = scene.add.image(0, 0, 'candle-soft-shade').setDepth(101);
  return {
    update(x: number, y: number, fuel: number, corruption: number): void {
      const c = sceneryCorruption(corruption);
      const camera = scene.cameras.main;
      // Extend the opaque texture beyond every screen corner; centre stays clear.
      const extent = Math.hypot(camera.width, camera.height);
      shade.setPosition(x, y).setDisplaySize(extent * 2, extent * 2)
        .setAlpha(C.normalVignetteAlpha + (C.corruptedVignetteAlpha - C.normalVignetteAlpha) * c);
      halo.setPosition(x, y).setDisplaySize(C.candleGlowRadiusPx * 2, C.candleGlowRadiusPx * 2)
        .setAlpha((C.normalGlowAlpha + (C.corruptedGlowAlpha - C.normalGlowAlpha) * c) * Math.max(0, Math.min(1, fuel)));
    },
  };
}
