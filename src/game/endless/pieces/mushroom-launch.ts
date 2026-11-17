/**
 * Mushroom launch: an ordinary jump onto a big bounce cap, whose throw carries the candle up a gap no jump
 * could cross, onto a ledge high above (Decision D-36).
 *
 * Why it is interesting: it is the first time the climb goes up faster than you can jump, and it is aimed
 * by how you arrive. The cap keeps your sideways speed, so the jump onto it decides where the throw goes;
 * steering in the air corrects it. The route's step is the jump that lands on the cap: the kit traces the
 * whole flight, bounce included, with the real physics and puts the high ledge where it comes down.
 */
import type { Piece } from './types';
import { roomier } from './shared';

export const MUSHROOM_LAUNCH: Piece = {
  id: 'mushroom-launch',
  label: 'mushroom launch: a bounce cap throws the candle up a tall gap',
  build(kit, entry, run) {
    const tuning = kit.tuning.mushroomLaunch;
    const direction = roomier(kit, entry);
    const placed = kit.placeCap(run, entry, {
      risePx: tuning.capRisePx, direction, widthPx: kit.between(tuning.capWidthPx), levels: tuning.levels, jitter01: 0.3,
    });
    if (!placed) return false;
    return kit.fly(run, entry, {
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: tuning.levels, via: placed.cap.id,
    }, placed.step) !== null;
  },
};
