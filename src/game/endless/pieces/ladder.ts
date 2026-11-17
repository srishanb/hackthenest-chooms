/**
 * Ladder: two or three ordinary jumps up, mostly zigzagging, sometimes straight up through the ledge above.
 *
 * Why it is here: this was the whole climb before set pieces. It stays as one piece among the others
 * so the climb has breathing room between shapes that ask for a particular skill.
 */
import { lastLedge } from './shared';
import type { Piece } from './types';

export const LADDER: Piece = {
  id: 'ladder',
  label: 'plain ladder: ordinary jumps up',
  build(kit, entry, run) {
    const rungs = kit.count(kit.tuning.ladder.rungs);
    let heading: -1 | 1 = kit.random() < 0.5 ? -1 : 1;
    for (let rung = 0; rung < rungs; rung++) {
      const from = lastLedge(run, entry);
      const roll = kit.random();
      const direction: -1 | 0 | 1 = rung > 0 && roll < kit.config.straightUpChance ? 0 : roll < 0.75 ? (-heading as -1 | 1) : heading;
      const ledge = kit.place(run, from, () => ({
        risePx: [kit.config.rise.minPx, kit.maxRisePx], direction, widthPx: kit.ledgeWidth(),
      }));
      if (!ledge) return false;
      if (direction !== 0) heading = direction;
    }
    return true;
  },
};
