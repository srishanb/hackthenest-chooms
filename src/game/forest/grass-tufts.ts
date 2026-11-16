/**
 * Tufts of grass that sway on the forest ledges.
 *
 * forest-world.ts asks for a ledge's tufts when it draws the ledge and keeps them with the rest of
 * that ledge's art, so they move and are removed with it. This file only decides where they stand
 * and steps their animation. Decoration only: a tuft has no collision body.
 */
import type { GameObjects, Scene } from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';
import { mixColor, stableUnit } from './presentation';

const C = WILDLIFE_CONFIG.grass;

export function createGrassTufts(scene: Scene) {
  let tufts: Array<{ sprite: GameObjects.Sprite; seed: number }> = [];
  return {
    /** Make the tufts for one ledge. The caller owns the sprites and destroys them with the ledge. */
    plant(id: string, centreX: number, top: number, width: number): GameObjects.Sprite[] {
      const count = Math.min(C.maxPerLedge, Math.floor(width / C.ledgePxPerTuft));
      const made: GameObjects.Sprite[] = [];
      for (let i = 0; i < count; i++) {
        const seed = stableUnit(`grass:${id}:${i}`);
        const x = centreX + (stableUnit(`grass-x:${id}:${i}`) - 0.5) * (width - 36);
        const sprite = scene.add.sprite(Math.round(x), top + 2, seed < 0.5 ? 'wildlife-grass-1' : 'wildlife-grass-3', 0)
          .setOrigin(0.5, C.rootYPx / C.frame.height).setScale(FOREST_CONFIG.pixelScale).setDepth(-0.5).setFlipX(seed * 7 % 1 < 0.5);
        tufts.push({ sprite, seed }); made.push(sprite);
      }
      return made;
    },
    /** `clockMs` already stands still while paused or with reduced motion. */
    update(clockMs: number, corruption: number) {
      // A removed ledge destroyed its tufts; drop them from the list here.
      if (tufts.some((tuft) => !tuft.sprite.active)) tufts = tufts.filter((tuft) => tuft.sprite.active);
      const tint = mixColor(0xe8f5c8, 0x9a6f8c, corruption), alpha = 1 - corruption * 0.55;
      for (const tuft of tufts) {
        const frame = Math.floor((clockMs + tuft.seed * 4000) / C.frameMs) % C.frames;
        if (tuft.sprite.frame.name !== String(frame)) tuft.sprite.setFrame(frame);
        tuft.sprite.setTint(tint).setAlpha(alpha);
      }
    },
  };
}
