/**
 * Chimney (Decision D-37): two facing walls above the entry ledge, climbed by kicking from one to the other,
 * then out over the shorter wall's top onto a ledge outside.
 *
 * Why it is interesting: it is the classic use of a wall jump, a rhythm of presses, each one a little after
 * touching the wall. The same wall cannot be kicked twice in a row (GameConfig `wallMoves.sameWallTwice`), so a
 * single wall is never a ladder; two facing walls are. The new ledge is higher than any charge jump reaches, so
 * the chimney is the way up. A press too early or too late, or too long a slide, drops you out of the bottom.
 *
 * How it is built: the walls stand `mouthPx` above the entry ledge, `innerGapPx` apart. A trial flight with both
 * walls tall finds where the last kick happens; the wall that kick flies toward is then cut down to a little
 * below the height the candle will have when it gets there, so it flies over. The kit then proves the real
 * flight, every kick included, and puts the ledge where it comes down outside.
 */
import type { PlatformData } from '../../../shared/contracts/content';
import { chargeStepsFor } from '../jump-arcs';
import { flyStep, type RouteStep } from '../route-replay';
import { eitherWay } from './shared';
import type { Piece } from './types';
import { firm, standSpan, wallAt } from './walls';

/** Chimney shapes tried, and charges tried in each (bounds the cost). */
const SHAPE_TRIES = 3;
const FLIGHT_TRIES = 3;

export const CHIMNEY: Piece = {
  id: 'chimney',
  label: 'chimney: two facing walls climbed by kicking from one to the other',
  build(kit, entry, run) {
    const tuning = kit.tuning.chimney, walls = kit.tuning.walls;
    if (!firm(entry)) return false;
    const span = standSpan(kit, entry);
    if (!span) return false;
    const body = kit.game.player;
    const top = entry.y - entry.height / 2;
    const lowRise = Math.max(tuning.risePx[0], Math.ceil(kit.plainApexPx) + 4);
    for (let attempt = 0; attempt < SHAPE_TRIES; attempt++) {
      const gap = kit.between(tuning.innerGapPx);
      // The chimney's middle is over the ledge, so a jump from it goes straight in.
      const centre = Math.round(kit.between([Math.max(span[0], gap / 2 + walls.widthPx + 2), Math.min(span[1], kit.worldWidth - gap / 2 - walls.widthPx - 2)]));
      if (centre - gap / 2 - walls.widthPx < 0 || centre + gap / 2 + walls.widthPx > kit.worldWidth) continue;
      const kicks = kit.count(tuning.kicks);
      const first = eitherWay(kit);
      // Kicks alternate first, -first, first, ...: the last one is off `lastSide` and flies toward the other wall.
      const lastSide = (kicks % 2 === 1 ? first : -first) as -1 | 1;
      const bottom = Math.min(top - kit.between(tuning.mouthPx), kit.wallFloorPx);
      const tallTop = Math.max(kit.ceilingTopPx, bottom - kit.between(tuning.heightPx));
      if (bottom - tallTop < tuning.heightPx[0] * 0.75) continue;
      const wallOn = (side: -1 | 1, wallTop: number, id: string): PlatformData =>
        wallAt(id, centre + side * gap / 2, side, wallTop, bottom, walls.widthPx);
      for (let k = 0; k < FLIGHT_TRIES; k++) {
        const level = Math.round(kit.between(tuning.levels));
        const delays = Array.from({ length: kicks }, () => Math.round(kit.between(walls.kickDelaySteps)));
        const takeoffX = Math.round(Math.min(span[1], Math.max(span[0], centre - first * kit.between([0, gap / 4]))));
        const probe: RouteStep = { fromId: entry.id, toId: '', takeoffX, chargeSteps: chargeStepsFor(level, kit.config.chargeLevels, kit.game),
          direction: first, kicks: delays };
        // A trial with both walls tall: where are the feet when the last kick happens?
        const tallA = wallOn(lastSide, tallTop, 'trial-a'), tallB = wallOn(-lastSide as -1 | 1, tallTop, 'trial-b');
        let kicked = 0, lastKickFeet: number | null = null, wantFeet = false;
        flyStep(probe, [entry, tallA, tallB], kit.worldWidth, kit.game, { maxSteps: kit.tuning.flightSteps,
          onKick: () => { kicked++; wantFeet = kicked === kicks; },
          onState: (state) => { if (wantFeet) { lastKickFeet = state.y + body.height / 2; wantFeet = false; } } });
        if (lastKickFeet === null) continue;
        // The far wall's top: below where the body will be as it crosses the gap after the last kick.
        const rules = kit.game.wallMoves!;
        const vx = rules.kickSpeed * Math.cos((rules.kickAngleDeg * Math.PI) / 180), vy = rules.kickSpeed * Math.sin((rules.kickAngleDeg * Math.PI) / 180);
        const t = (gap - body.width) / vx;
        const riseOnCrossing = vy * t - kit.game.gravityY * t * t / 2;
        const shortTop = (lastKickFeet as number) - riseOnCrossing * kit.between([0.25, 0.55]);
        if (bottom - shortTop < tuning.heightPx[0] * 0.5 || shortTop - tallTop < tuning.lowerByPx[0] * 0.5) continue;
        const tall = wallOn(lastSide, tallTop, kit.wallId(run));
        if (!kit.addWall(run, tall)) break;
        const short = wallOn(-lastSide as -1 | 1, shortTop, kit.wallId(run));
        if (!kit.addWall(run, short)) { run.ledges.pop(); break; }
        // Alternating from `first`: the kicked walls in order.
        const order = Array.from({ length: kicks }, (_, i) => ((i % 2 === 0 ? first : -first) === lastSide ? tall.id : short.id));
        const ledge = kit.fly(run, entry, { risePx: [lowRise, tuning.risePx[1]], direction: first, widthPx: kit.ledgeWidth(), levels: tuning.levels },
          { ...probe, walls: order });
        if (ledge) return true;
        run.ledges.pop();
        run.ledges.pop();
      }
    }
    return false;
  },
};
