/**
 * Moving water over the painted waterfalls of one backdrop layer.
 *
 * The painted chunks are still pictures, so this lays a small fixed pool of animated strips over
 * the falls the painter drew (the same list, from layout.ts): a lip, a long body and a fainter foot,
 * cut from the human-made waterfall sheets already used by the far garden ledges (CREDITS.md).
 * The painter paints each fall in front of its layer's foliage, so a strip lies over water only.
 * Strips are tinted to the layer's fog so a far fall stays pale. A frozen fall gets no strip; a
 * cold one moves slowly. Nothing is created while playing. Decoration only.
 */
import type { GameObjects, Scene } from 'phaser';
import { BACKDROP_CONFIG as C } from '../../config/backdrop.config';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';

const SHEETS = ['wildlife-waterfall-top', 'wildlife-waterfall-middle', 'wildlife-waterfall-bottom'] as const;
const CELL = WILDLIFE_CONFIG.waterfall.frame;

/** Where one strip goes this frame, in screen pixels, and how it looks. */
export interface StripPlacement { x: number; y: number; width: number; length: number; frame: number; tint: number; alpha: number }

export function createWaterfallStrips(scene: Scene, depth: number, count: number, tileScale: number) {
  const ready = SHEETS.every((key) => scene.textures.exists(key));
  const strips = ready ? Array.from({ length: count }, () => SHEETS.map((key) =>
    scene.add.tileSprite(0, 0, CELL, CELL, key, 0).setOrigin(0.5, 0).setTileScale(tileScale).setScrollFactor(0).setDepth(depth).setVisible(false))) : [];
  const cell = CELL * tileScale, ps = C.pixelScale;
  // Frames of a spritesheet are named by their number, so compare numbers.
  const setFrame = (part: GameObjects.TileSprite, frame: number): void => { if (Number(part.frame.name) !== frame) part.setFrame(frame); };
  return {
    /** How many strips there are (0 when the sheets are not loaded). */
    size: strips.length,
    /** Show strip `index` at `place`, or hide it with `null`. */
    place(index: number, place: StripPlacement | null) {
      const strip = strips[index];
      if (!strip) return;
      const [lip, body, foot] = strip as [GameObjects.TileSprite, GameObjects.TileSprite, GameObjects.TileSprite];
      if (!place) { for (const part of strip) part.setVisible(false); return; }
      const lipHeight = Math.min(cell, place.length), footHeight = Math.min(cell, Math.max(0, place.length - lipHeight));
      const bodyHeight = Math.max(0, place.length - lipHeight - footHeight);
      const heights = [lipHeight, bodyHeight, footHeight], shares = [1, 1, C.waterfallView.footAlpha01];
      let top = place.y;
      for (const [i, part] of [lip, body, foot].entries()) {
        const height = heights[i]!;
        part.setVisible(height > 0);
        if (height <= 0) continue;
        setFrame(part, place.frame);
        // Whole art pixels, the same grid as the painted chunks.
        part.setPosition(place.x, Math.round(top / ps) * ps).setSize(place.width, height).setTint(place.tint).setAlpha(place.alpha * shares[i]!);
        top += height;
      }
    },
  };
}
