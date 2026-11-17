/**
 * Staircase: the same jump again and again in one direction, four to six times. A rhythm section.
 *
 * Why it is fun: one charge level is chosen for the whole stair and every step rises about the same,
 * so once you find the hold time you can repeat it, tap-tap-tap up the steps. Getting greedy and
 * holding a little long overshoots the next narrow step, so the rhythm has to stay exact.
 */
import { lastLedge, roomier } from './shared';
import type { Piece } from './types';

export const STAIRCASE: Piece = {
  id: 'staircase',
  label: 'staircase: the same short hop again and again, one way',
  build(kit, entry, run) {
    const tuning = kit.tuning.staircase;
    const steps = kit.count(tuning.steps);
    const level = kit.count(tuning.levels);
    const direction = roomier(kit, entry);
    // One rise for the stair, with a little wobble per step.
    const rise = Math.round(kit.between(tuning.risePx));
    for (let i = 0; i < steps; i++) {
      const from = lastLedge(run, entry);
      const ledge = kit.place(run, from, () => ({
        risePx: [rise - 4, rise + 4], direction, widthPx: kit.ledgeWidth(0.85), levels: [level, level], jitter01: 0.3,
      }));
      if (!ledge) break;
    }
    // A stair needs a few steps to read as one.
    return run.steps.length >= tuning.steps[0] - 1;
  },
};
