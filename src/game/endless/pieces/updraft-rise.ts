/**
 * Updraft rise: a column of rising air beside a ledge carries the candle up a tall empty stretch
 * (Decision D-36).
 *
 * Why it is interesting: after hard jumps it is a breather that still asks for aim. A short hop sideways
 * into the column is lifted, drifts across it at the hop's own sideways speed, and comes out of the far
 * side high above; too hard a hop crosses it before it has lifted you, too soft a hop misses it. The kit
 * traces the flight through the column with the real physics and puts the ledge where it comes down.
 */
import type { Piece } from './types';
import { besideColumn } from './columns';

export const UPDRAFT_RISE: Piece = {
  id: 'updraft-rise',
  label: 'updraft rise: a rising column carries the candle up a tall stretch',
  build(kit, entry, run) {
    const tuning = kit.tuning.updraftRise;
    return besideColumn(kit, entry, run, 'rise', tuning, (top, height) => {
      // The column starts a little below the ledge's top, so a hop off its edge goes straight in.
      const bottom = top + 30;
      return bottom - height / 2;
    }, (direction, column) => ({
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: tuning.levels, takeoff: 'front' as const, ride: column,
    }));
  },
};
