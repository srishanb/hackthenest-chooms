/**
 * Updraft crossing: a column of drifting air in the middle of a gap too wide for any jump, so a strong
 * jump floats across it (Decision D-36).
 *
 * Why it is interesting: it is a big leap that only works through the air. In the column the candle
 * floats higher and sinks slowly, then falls normally again once it is out; too short a jump falls into
 * the column and sinks through it, too long a jump sails over. The kit traces the flight through the
 * column with the real physics and puts the far ledge where it comes down.
 */
import type { Piece } from './types';
import { besideColumn } from './columns';

export const UPDRAFT_CROSSING: Piece = {
  id: 'updraft-crossing',
  label: 'updraft crossing: a strong jump floats across a wide gap through drifting air',
  build(kit, entry, run) {
    const tuning = kit.tuning.updraftCrossing;
    // Most of the column above the takeoff height, where the jump flies.
    return besideColumn(kit, entry, run, 'drift', tuning, (top, height) => top - height * 0.35, (direction, column) => ({
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: tuning.levels, takeoff: 'front' as const,
      beyondJumpPx: tuning.beyondJumpPx, ride: column,
    }));
  },
};
