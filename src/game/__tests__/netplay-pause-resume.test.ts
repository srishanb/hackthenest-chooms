/**
 * Second QA round, finding 3: a pause shorter than the world-time snap (1 s) left moving ledges out of step for
 * seconds, because a difference under the snap was only caught up by a slow nudge. The game knows when it resumes
 * (its steps stop, and the next one comes a long gap later), so then the world time is set to the shared clock at
 * once, carried by the ledge's real displacement. Two games over the in-process link, with the real physics.
 */
import { describe, expect, it } from 'vitest';
import { NETPLAY_CONFIG as N } from '../../config/netplay.config';
import { platformsAt } from '../world/environment';
import { createSim, FRAME_MS, STEP_MS, type Side, type SimLedge } from './netplay-sim';

const FLOOR: SimLedge = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const MOVER_A: SimLedge = { id: 'ma', x: 300, y: 404, width: 140, height: 16, motion: { axis: 'x', distance: 60, periodMs: 2600 } };
const MOVER_B: SimLedge = { id: 'mb', x: 700, y: 404, width: 140, height: 16, motion: { axis: 'x', distance: 60, periodMs: 2600 } };
const LIFT: SimLedge = { id: 'lift', x: 480, y: 404, width: 100, height: 16, motion: { axis: 'y', distance: 18, periodMs: 5600 } };
const WORLD = [FLOOR, MOVER_A, MOVER_B, LIFT];

/** How far (px) a side's moving ledge is from where it should be at the shared time of its latest step. */
function ledgeError(side: Side, ledge: SimLedge): number {
  const lastAt = side.truth[side.truth.length - 1]!.atMs;
  const placed = side.platforms.find((p) => p.id === ledge.id)!;
  const right = platformsAt([{ ...ledge, type: 'static' }], lastAt)[0]!;
  return Math.hypot(placed.x - right.x, placed.y - right.y);
}

describe('a short pause leaves moving ledges in step at once', () => {
  it.each([100, 300, 600, 900, 990])('after a pause of %i ms either side is within a few px of the shared clock within one step', (pauseMs) => {
    for (const who of ['host', 'guest'] as const) {
      for (const seed of [1, 2, 3]) {
        const sim = createSim(WORLD, { host: { x: 300, y: 370 }, guest: { x: 700, y: 370 } }, { delayMs: 40, jitterMs: 20, loss01: 0.03 }, seed);
        sim.run(2500);
        const paused = sim[who];
        paused.paused = true;
        sim.run(pauseMs);
        paused.paused = false;
        // One frame (two steps) after the resume.
        sim.run(FRAME_MS + STEP_MS);
        const ledge = who === 'host' ? MOVER_A : MOVER_B;
        expect(ledgeError(paused, ledge), `${who} paused ${pauseMs} ms, seed ${seed}`).toBeLessThan(3);
        // ...and the two games agree on where it is.
        const other = who === 'host' ? sim.guest : sim.host;
        expect(ledgeError(other, ledge), `the other game, ${who} paused ${pauseMs} ms, seed ${seed}`).toBeLessThan(3);
      }
    }
  });

  it.each([100, 300, 600, 900, 990])('a candle standing on a moving ledge is not dropped by a pause of %i ms (many trials)', (pauseMs) => {
    for (const who of ['host', 'guest'] as const) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        // The paused candle stands on the x-moving ledge, the other on the vertical lift, through the clock's nudges.
        const sim = createSim(WORLD, { host: { x: who === 'host' ? 300 : 480, y: 370 }, guest: { x: who === 'host' ? 480 : 700, y: 370 } },
          { delayMs: 40, jitterMs: 20, loss01: 0.03 }, seed);
        sim.run(2500 + seed * 137);
        const paused = sim[who], other = who === 'host' ? sim.guest : sim.host;
        expect(paused.state.platformId).toBe(who === 'host' ? 'ma' : 'mb');
        paused.paused = true;
        sim.run(pauseMs);
        paused.paused = false;
        sim.run(1500);
        expect(paused.state.platformId, `${who} paused ${pauseMs} ms, seed ${seed}`).toBe(who === 'host' ? 'ma' : 'mb');
        expect(other.state.platformId).toBe('lift');
        expect(paused.throughLedges).toEqual([]);
      }
    }
  });

  it('small clock drift is still nudged slowly: a world time a few ms off, without a pause, is never set outright', () => {
    const sim = createSim(WORLD, { host: { x: 300, y: 370 }, guest: { x: 700, y: 370 } }, { delayMs: 40, jitterMs: 20, loss01: 0.03 }, 1);
    let largestJump = 0, last = 0;
    sim.run(6000, undefined, () => {
      const world = sim.guest.worldMs;
      if (last) largestJump = Math.max(largestJump, Math.abs(world - last - FRAME_MS));
      last = world;
    });
    // A frame is two steps; the nudge adds at most `worldTimeSlewMs` to each.
    expect(largestJump).toBeLessThanOrEqual(2 * N.worldTimeSlewMs + 1e-6 + STEP_MS);
  });
});
