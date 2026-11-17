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
import { roomier } from './shared';

export const UPDRAFT_RISE: Piece = {
  id: 'updraft-rise',
  label: 'updraft rise: a rising column carries the candle up a tall stretch',
  build(kit, entry, run) {
    const tuning = kit.tuning.updraftRise;
    const direction = roomier(kit, entry);
    const width = Math.round(kit.between(tuning.widthPx));
    const height = Math.round(kit.between(tuning.heightPx));
    const top = entry.y - entry.height / 2;
    const x = Math.round(entry.x + direction * (entry.width / 2 + kit.between(tuning.gapPx) + width / 2));
    // The column starts a little below the ledge's top, so a hop off its edge goes straight in.
    const bottom = top + 30;
    const column = { id: `e${kit.index}:u${kit.columns().length + run.updrafts.length + 1}`, kind: 'rise' as const,
      x, y: Math.round(bottom - height / 2), width, height };
    if (!kit.addColumn(run, column)) return false;
    return kit.fly(run, entry, {
      risePx: tuning.risePx, direction, widthPx: kit.ledgeWidth(), levels: tuning.levels, takeoff: 'front', ride: column.id,
    }) !== null;
  },
};
