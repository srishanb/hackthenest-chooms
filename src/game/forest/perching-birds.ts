/**
 * Draws the birds that sit on ledges ahead of the candle and fly off when it comes near.
 *
 * A small fixed pool of sprites is reused: a bird is placed on a ledge that is still above the
 * view, so it is already there when the climb reaches it. bird-behaviour.ts decides what each
 * bird does. Decoration only: no collision bodies, and nothing here is read by movement.
 */
import type { GameObjects, Scene } from 'phaser';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';
import { birdFrame, isAirborne, perchedBird, stepBird, type Bird } from './bird-behaviour';
import { mixColor, stableUnit } from './presentation';

const C = WILDLIFE_CONFIG.bird;
/** A bird is drawn above the ledge art and below the candle. */
const DEPTH = 1;

interface Perch { x: number; top: number; width: number; visited: boolean }

export function createPerchingBirds(scene: Scene) {
  const perches = new Map<string, Perch>();
  const pool = Array.from({ length: C.pool }, () => ({
    sprite: scene.add.sprite(0, 0, 'wildlife-bird', C.clips.stand.row * C.columns)
      .setOrigin(0.5, 1).setDepth(DEPTH).setVisible(false) as GameObjects.Sprite,
    bird: null as Bird | null,
    perchId: null as string | null,
    /** Where the bird stands relative to the middle of its ledge, so it rides a moving ledge. */
    offsetX: 0,
  }));
  let settled = false;

  /** Where on a ledge a bird stands: seeded, and clear of the ledge's ends. */
  const spotOn = (id: string, perch: Perch): number =>
    (stableUnit(`bird-x:${id}`) - 0.5) * Math.max(0, perch.width - 44);

  return {
    /** A ledge appeared. Only some ledges are places a bird will sit. */
    addPerch(id: string, x: number, top: number, width: number) {
      if (width < 60 || stableUnit(`bird:${id}`) >= C.perchChance01) return;
      perches.set(id, { x, top, width, visited: false });
    },
    removePerch(id: string) {
      perches.delete(id);
      for (const slot of pool) if (slot.perchId === id && slot.bird && !isAirborne(slot.bird)) { slot.bird = null; slot.perchId = null; slot.sprite.setVisible(false); }
    },
    /** A ledge moved (authored moving ledges): its bird moves with it. */
    movePerch(id: string, x: number, top: number) {
      const perch = perches.get(id);
      if (perch) { perch.x = x; perch.top = top; }
    },
    update(deltaMs: number, candle: { x: number; y: number } | null, corruption: number, reducedMotion: boolean, paused: boolean) {
      const camera = scene.cameras.main;
      const viewTop = camera.scrollY, viewBottom = viewTop + camera.height;
      const leaving = corruption >= C.leaveAtCorruption01;

      // Seat free birds on ledges that have not been reached yet. After the first frame only ledges
      // above the view are used, so a bird never pops into sight.
      if (!leaving) for (const slot of pool) {
        if (slot.bird) continue;
        for (const [id, perch] of perches) {
          if (perch.visited) continue;
          const above = perch.top < viewTop - 12 && perch.top > viewTop - camera.height * 1.5;
          const farFromCandle = !candle || Math.hypot(candle.x - perch.x, candle.y - perch.top) > C.startleRadiusPx * 2.5;
          const onScreenAtStart = !settled && perch.top >= viewTop && perch.top < viewBottom && farFromCandle;
          if (!above && !onScreenAtStart) continue;
          perch.visited = true;
          slot.perchId = id; slot.offsetX = spotOn(id, perch);
          slot.bird = perchedBird(perch.x + slot.offsetX, perch.top + 1, Math.floor(stableUnit(`bird-seed:${id}`) * 4294967295), C);
          break;
        }
      }
      settled = true;

      const tint = mixColor(0xffffff, 0xb79ab0, corruption);
      for (const slot of pool) {
        if (!slot.bird) continue;
        const perch = slot.perchId ? perches.get(slot.perchId) : undefined;
        if (!isAirborne(slot.bird) && perch) { slot.bird.x = perch.x + slot.offsetX; slot.bird.y = perch.top + 1; }
        if (!paused) {
          // With reduced motion a bird neither fidgets nor flaps: it stands, and is simply gone when scared off.
          if (reducedMotion) {
            const near = candle !== null && Math.hypot(candle.x - slot.bird.x, candle.y - slot.bird.y) <= C.startleRadiusPx;
            if (near || leaving) { slot.bird = null; slot.perchId = null; slot.sprite.setVisible(false); continue; }
          } else {
            slot.bird = stepBird(slot.bird, deltaMs, candle, leaving, C);
          }
        }
        const bird = slot.bird;
        const gone = bird.x < camera.scrollX - 40 || bird.x > camera.scrollX + camera.width + 40 || bird.y < viewTop - 60 || bird.y > viewBottom + camera.height;
        if (gone) { slot.bird = null; slot.perchId = null; slot.sprite.setVisible(false); continue; }
        const frame = reducedMotion ? C.clips.stand.row * C.columns : birdFrame(bird, C);
        if (slot.sprite.frame.name !== String(frame)) slot.sprite.setFrame(frame);
        slot.sprite.setPosition(Math.round(bird.x), Math.round(bird.y)).setFlipX(bird.facing < 0).setTint(tint).setVisible(true);
      }
    },
  };
}
