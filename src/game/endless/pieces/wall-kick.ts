/**
 * Wall kick (Decision D-37): a wall stands beside a gap next to the entry ledge, and the next ledge is higher
 * than any charge jump reaches. Jump at the wall, kick back off it, and come down on the ledge.
 *
 * Why it is interesting: it asks for a new skill (the press on the wall) on top of the old one (the charge that
 * carries you to the wall at the right height). The new ledge's rise is above the highest a full jump lifts the
 * feet (`plainApexPx`), and the wall's top stands above the new ledge, so neither a plain jump nor standing on
 * the wall gets there: only the kick does. A miss falls past the wall into the gap; the wall does not catch a
 * long fall (player/wall.ts `gripHolds`). The kit traces the real flight, kick included, and places the ledge.
 */
import { chargeStepsFor } from '../jump-arcs';
import type { RouteStep } from '../route-replay';
import { roomier } from './shared';
import type { Piece } from './types';
import { firm, standSpan, wallAt } from './walls';

/** Wall placements tried, and takeoffs and charges tried against each (bounds the cost). */
const WALL_TRIES = 3;
const FLIGHT_TRIES = 5;

export const WALL_KICK: Piece = {
  id: 'wall-kick',
  label: 'wall kick: jump at a wall beside a gap and kick off it up to a ledge no jump reaches',
  build(kit, entry, run) {
    const tuning = kit.tuning.wallKick, walls = kit.tuning.walls;
    if (!firm(entry)) return false;
    const span = standSpan(kit, entry);
    if (!span) return false;
    const top = entry.y - entry.height / 2;
    const lowRise = Math.max(tuning.risePx[0], Math.ceil(kit.plainApexPx) + 4);
    if (lowRise > tuning.risePx[1]) return false;
    const open = roomier(kit, entry);
    for (let attempt = 0; attempt < WALL_TRIES; attempt++) {
      const direction = (attempt % 2 === 0 ? open : -open) as -1 | 1;
      const face = entry.x + direction * (entry.width / 2 + kit.between(tuning.gapPx));
      const wallTop = top - tuning.risePx[1] - kit.between(tuning.topAbovePx);
      const wallBottom = Math.min(top + kit.between(tuning.bottomBelowPx), kit.wallFloorPx);
      const wall = wallAt(kit.wallId(run), face, direction, wallTop, wallBottom, walls.widthPx);
      if (!kit.addWall(run, wall)) continue;
      for (let k = 0; k < FLIGHT_TRIES; k++) {
        const level = Math.round(kit.between(tuning.levels));
        // From the third of the ledge nearest the wall.
        const third = (span[1] - span[0]) / 3;
        const [low, high] = direction > 0 ? [span[1] - third, span[1]] : [span[0], span[0] + third];
        const probe: RouteStep = { fromId: entry.id, toId: '', takeoffX: Math.round(kit.between([low, high])),
          chargeSteps: chargeStepsFor(level, kit.config.chargeLevels, kit.game), direction,
          kicks: [Math.round(kit.between(walls.kickDelaySteps))], walls: [wall.id] };
        const ledge = kit.fly(run, entry, { risePx: [lowRise, tuning.risePx[1]], direction, widthPx: kit.ledgeWidth(), levels: tuning.levels }, probe);
        if (ledge) return true;
      }
      // Unused: take the wall back out (it is the run's last ledge).
      run.ledges.pop();
    }
    return false;
  },
};
