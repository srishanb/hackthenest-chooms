/**
 * Big leap: one full-charge jump from the edge of a ledge across a wide gap, onto a generous landing.
 *
 * Why it is fun: it is the one moment the climb asks you to commit everything. Run to the edge, hold
 * to (almost) full charge, and fly; the landing is as wide as an ordinary ledge gets here, but there
 * is nothing under the gap, so a short jump falls as far as it falls.
 */
import type { Piece } from './types';
import { roomier } from './shared';

export const BIG_LEAP: Piece = {
  id: 'big-leap',
  label: 'big leap: one full-charge jump across a wide gap',
  build(kit, entry, run) {
    const tuning = kit.tuning.bigLeap;
    const direction = roomier(kit, entry);
    return kit.place(run, entry, () => ({
      risePx: tuning.risePx, direction, widthPx: kit.widestWidth(), levels: [tuning.minLevel, kit.config.chargeLevels],
      minDxPx: tuning.minGapPx, takeoff: 'front', jitter01: 0.4,
    })) !== null;
  },
};
