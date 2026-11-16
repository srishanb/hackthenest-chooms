/**
 * The sky behind the generated backdrop: a vertical gradient drawn as a few flat bands, dark at the
 * top of the screen and the fog colour at the bottom, where the far layers fade into it. Banding
 * rather than a smooth blend, to match the pixel art. A fixed set of rectangles that only change
 * colour, so it costs the same every frame. Decoration only.
 */
import type { GameObjects, Scene } from 'phaser';
import { mixRgb } from './sky';

export function createSkyGradient(scene: Scene, depth: number, bands: number) {
  const width = scene.scale.width, height = scene.scale.height, band = Math.ceil(height / bands);
  const rects: GameObjects.Rectangle[] = Array.from({ length: bands }, (_, i) =>
    scene.add.rectangle(0, i * band, width, band + 1, 0).setOrigin(0).setScrollFactor(0).setDepth(depth));
  let last = -1;
  return {
    /** Colour the bands from `top` down to `bottom`. Does nothing when the colours have not changed. */
    update(top: number, bottom: number) {
      const key = top * 31 + bottom;
      if (key === last) return;
      last = key;
      // Most of the change happens low down, so the upper sky stays deep and the haze sits near the bottom.
      for (const [i, rect] of rects.entries()) rect.setFillStyle(mixRgb(top, bottom, (i / (bands - 1)) ** 1.6));
    },
    resize(width: number) { for (const rect of rects) rect.width = width; },
  };
}
