/**
 * The route bot with a grown candle. Wax makes the candle's jumps a hair stronger (candle/growth.ts);
 * a bot that only rounded its hold to whole steps could land on a different ledge than the route's,
 * walk back and repeat that jump for ever (QA finding, seed 1 from chunk 6, seed 29 from chunk 25). These tests
 * run the bot headless on the game's own world step, as `tools/endless/chunk-map.ts --bot` does, with
 * the candle fully grown (+6%), and check it never goes 30 s without a new best height, and that the
 * bot's hold search and its memory of failed holds behave.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import { grownMovement } from '../candle/growth';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessGenerator } from '../endless/generator';
import { chooseHold, createRouteBot, heldStepsFor } from '../endless/route-bot';
import { NO_CRUMBLE } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

const STEP_MS = 1000 / G.stepHz;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const GROWN = grownMovement(G, 1.06);
/** The longest the bot may go without a new best height (ms). */
const STALL_MS = 30_000;

/** Climb headless for `seconds` with `movement`; the longest time without a new best height (ms), and the best height (px). */
function climb(seed: number, startChunk: number, seconds: number, movement: typeof G): { longestWaitMs: number; bestPx: number } {
  const generator = createEndlessGenerator(seed, G, C);
  const stream = createChunkStream(generator, C);
  const bot = createRouteBot();
  const anchor = generator.floor(startChunk);
  let state = teleportPlayer(anchor.x, topOf(anchor) - G.player.height / 2);
  let crumble = NO_CRUMBLE;
  const startFeet = state.y + G.player.height / 2;
  let best = 0, bestAtMs = 0, longestWaitMs = 0;
  stream.update(startFeet);
  for (let ms = 0; ms <= seconds * 1000; ms += STEP_MS) {
    const platforms = platformsAt(stream.platforms(), ms, STEP_MS);
    const input = bot.input(state, stream.chunks().flatMap((chunk) => chunk.route), (id) => platforms.find((p) => p.id === id),
      { base: G, current: movement, platforms, updrafts: stream.updrafts() });
    const out = stepWorld(state, crumble, input, platforms, stream.updrafts(), G.view.width, movement, STEP_MS);
    state = out.player; crumble = out.crumble;
    const feet = state.y + G.player.height / 2;
    stream.update(feet, 2 * Math.max(0, state.vy) / G.stepHz);
    if (state.grounded && startFeet - feet > best) { best = startFeet - feet; longestWaitMs = Math.max(longestWaitMs, ms - bestAtMs); bestAtMs = ms; }
  }
  return { longestWaitMs: Math.max(longestWaitMs, seconds * 1000 - bestAtMs), bestPx: best };
}

describe('the route bot with a fully grown candle', () => {
  // Seed 29 from chunk 25 is the QA case (it no longer stalls on the head, whose generator has changed); seed 1 from chunk 6 stalled before the fix.
  for (const [seed, start] of [[29, 25], [1, 6], [4, 0]] as const) {
    it(`never goes ${STALL_MS / 1000} s without a new best height (seed ${seed}, from chunk ${start})`, () => {
      const run = climb(seed, start, 200, GROWN);
      expect(run.longestWaitMs).toBeLessThan(STALL_MS);
      expect(run.bestPx).toBeGreaterThan(5 * C.chunkHeightPx);
    });
  }
});

describe('the bot picks its hold', () => {
  const step = { fromId: 'a', toId: 'b', takeoffX: 100, chargeSteps: 30, direction: 1 as const };

  it('uses the first choice when nothing is checked', () => {
    expect(chooseHold(step, 30, 100, new Set(), undefined, true)).toBe(30);
    expect(heldStepsFor(30, G, G)).toBe(30);
  });

  it('skips holds that already failed, nearest first, and never picks the same one again', () => {
    const tried = new Set<number>();
    const picks: number[] = [];
    for (let i = 0; i < 5; i++) { const hold = chooseHold(step, 30, 100, tried, undefined, false); picks.push(hold); tried.add(hold); }
    expect(picks).toEqual([30, 31, 29, 32, 28]);
  });

  it('with every nearby hold failed it still answers, with the first choice', () => {
    const tried = new Set<number>(Array.from({ length: 60 }, (_, i) => i));
    expect(chooseHold(step, 30, 100, tried, undefined, false)).toBe(30);
  });
});
