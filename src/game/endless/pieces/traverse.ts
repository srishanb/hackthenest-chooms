/**
 * Traverse: a long run sideways across the screen that gains little height, before the path turns up.
 *
 * Why it is interesting: after climbing, the eye expects "up". A traverse asks for distance instead:
 * long, flat side jumps, each from the front edge of the ledge, landing no lower than the takeoff.
 * A short jump costs the whole run, because there is nothing below but the way you came.
 */
import { lastLedge, roomier } from './shared';
import type { Piece } from './types';

export const TRAVERSE: Piece = {
  id: 'traverse',
  label: 'traverse: long flat jumps sideways across the screen',
  build(kit, entry, run) {
    const tuning = kit.tuning.traverse;
    const hops = kit.count(tuning.hops);
    const direction = roomier(kit, entry);
    for (let i = 0; i < hops; i++) {
      const from = lastLedge(run, entry);
      const ledge = kit.place(run, from, () => ({
        risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), minDxPx: tuning.minHopPx, takeoff: 'front', jitter01: 0.5,
      }));
      if (!ledge) break;
    }
    const exit = lastLedge(run, entry);
    return run.steps.length >= 2 && Math.abs(exit.x - entry.x) >= tuning.minSpanPx;
  },
};
