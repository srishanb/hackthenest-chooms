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
import { roomier } from './shared';

export const UPDRAFT_CROSSING: Piece = {
  id: 'updraft-crossing',
  label: 'updraft crossing: a strong jump floats across a wide gap through drifting air',
  build(kit, entry, run) {
    const tuning = kit.tuning.updraftCrossing;
    const direction = roomier(kit, entry);
    const width = Math.round(kit.between(tuning.widthPx));
    const height = Math.round(kit.between(tuning.heightPx));
    const top = entry.y - entry.height / 2;
    const x = Math.round(entry.x + direction * (entry.width / 2 + kit.between(tuning.gapPx) + width / 2));
    const column = { id: `e${kit.index}:u${kit.columns().length + run.updrafts.length + 1}`, kind: 'drift' as const,
      x, y: Math.round(top - height * 0.35), width, height };
    if (!kit.addColumn(run, column)) return false;
    return kit.fly(run, entry, {
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: tuning.levels, takeoff: 'front',
      minDxPx: tuning.minDxPx, ride: column.id,
    }) !== null;
  },
};
