/**
 * Zigzag shaft: up a narrow column of space, from one side of it to the other and back.
 *
 * Why it is fun: the column is only a little wider than two ledges, so every jump is a short,
 * steep diagonal and the next ledge is always the one you just jumped past on the other side.
 * It asks for height and a precise sideways distance at once, and a miss drops you down the shaft.
 */
import type { Piece } from './types';
import { lastLedge } from './shared';

export const ZIGZAG: Piece = {
  id: 'zigzag',
  label: 'zigzag shaft: side to side up a narrow column',
  build(kit, entry, run) {
    const tuning = kit.tuning.zigzag;
    const count = kit.count(tuning.ledges);
    const column = Math.round(kit.between(tuning.columnPx));
    const width = Math.round(kit.ledgeWidth(tuning.widthScale));
    if (column < 2 * width + kit.config.sideClearancePx) return false;
    // The column stands over the entry ledge, inside the walls.
    const centre = Math.min(kit.worldWidth - column / 2 - 2, Math.max(column / 2 + 2, entry.x));
    const sides = [centre - column / 2 + width / 2, centre + column / 2 - width / 2] as const;
    let side = entry.x < centre ? 1 : 0;
    for (let i = 0; i < count; i++) {
      const from = lastLedge(run, entry);
      const target = sides[side]!;
      const direction: -1 | 1 = target >= from.x ? 1 : -1;
      const ledge = kit.place(run, from, () => ({
        risePx: [kit.config.rise.minPx, kit.maxRisePx], direction, widthPx: width, centreX: [target - 6, target + 6],
      }));
      if (!ledge) break;
      side = 1 - side;
    }
    return run.steps.length >= tuning.ledges[0];
  },
};
