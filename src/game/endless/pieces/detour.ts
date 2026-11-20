/**
 * Detour down: the way on is below. Walk off the edge onto a lower ledge (once or twice), then jump
 * from down there to a ledge above the one you started on.
 *
 * Why it is interesting: in a climb every instinct says "up", and here up is the wrong first move.
 * Going down to go up makes you read the shape before acting. The drops are short (under the height
 * at which a fall shakes the candle), so taking the right way is never punished; the jump back up
 * from the low ledge is a long one.
 */
import type { Piece } from './types';
import { eitherWay, lastLedge, roomier } from './shared';

export const DETOUR: Piece = {
  id: 'detour',
  label: 'detour down: walk off onto a lower ledge, then jump up past the start',
  build(kit, entry, run) {
    const tuning = kit.tuning.detour;
    const drops = kit.count(tuning.drops);
    const direction = roomier(kit, entry);
    for (let i = 0; i < drops; i++) {
      const from = lastLedge(run, entry);
      if (!kit.placeDrop(run, from, () => ({ fallPx: tuning.fallPx, direction, widthPx: kit.ledgeWidth(0.85) }))) break;
    }
    if (!run.steps.length) return false;
    const low = lastLedge(run, entry);
    const below = (low.y - low.height / 2) - (entry.y - entry.height / 2);
    // The way up ends above the entry; it may carry on outward or turn back over the low ledge.
    const up = kit.place(run, low, () => ({
      risePx: [below + tuning.gainPx[0], below + tuning.gainPx[1]], direction: kit.random() < 0.6 ? direction : eitherWay(kit),
      widthPx: kit.ledgeWidth(),
    }));
    return up !== null;
  },
};
