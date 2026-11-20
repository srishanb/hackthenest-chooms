/**
 * Walls never stand in the way of standing (Decision D-37, QA finding 4 of the wall prototype).
 *
 * A wall hung less than a body height above a ledge it overlaps splits that ledge: the candle walking along it
 * stops at the wall's face, and a takeoff stored inside the wall cannot be reached in the game (the replay used to
 * put the candle there directly). These tests look at the chunks themselves, not through the replay: no stored
 * takeoff's standing body (across the whole takeoff tolerance) overlaps a wall, no wall cuts into the band a body
 * stands in on any ledge, with the chunks on both sides loaded, and the route bot climbs the seeds that stalled.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import type { PlatformData } from '../../shared/contracts/content';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessGenerator, type EndlessChunk } from '../endless/generator';
import { createRouteBot } from '../endless/route-bot';
import { chargeDriftPx, type RouteStep } from '../endless/route-replay';
import { NO_CRUMBLE } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import { WALL_TYPE } from '../player/wall';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

const BW = G.player.width;
const BH = G.player.height;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const EPS = 1e-6;

/** The walls whose box overlaps the body standing on `ledge` with its centre anywhere in [x0, x1]. */
function wallsAtStand(ledge: PlatformData, x0: number, x1: number, walls: readonly PlatformData[]): PlatformData[] {
  const top = topOf(ledge);
  return walls.filter((wall) => wall.x - wall.width / 2 < x1 + BW / 2 - EPS && wall.x + wall.width / 2 > x0 - BW / 2 + EPS
    && wall.y - wall.height / 2 < top - EPS && wall.y + wall.height / 2 > top - BH + EPS);
}

/** Stored takeoffs inside a wall, and ledges a wall cuts through, in chunk `index` with its neighbours loaded. */
function problems(chunks: { prev: EndlessChunk; chunk: EndlessChunk; next: EndlessChunk }, label: string): string[] {
  const world = [...chunks.prev.platforms, ...chunks.chunk.platforms, ...chunks.next.platforms];
  const walls = world.filter((p) => p.type === WALL_TYPE);
  if (!walls.length) return [];
  const out: string[] = [];
  const steps: RouteStep[] = [...chunks.chunk.route, ...chunks.chunk.altRoute, ...chunks.chunk.sideRoute];
  for (const step of steps) {
    const from = world.find((p) => p.id === step.fromId);
    if (!from) continue;
    const reach = T.takeoffTolerancePx + chargeDriftPx(from, step.chargeSteps, G);
    for (const wall of wallsAtStand(from, step.takeoffX - reach, step.takeoffX + reach, walls)) {
      out.push(`${label}: takeoff ${step.fromId}->${step.toId} at x ${step.takeoffX} stands inside ${wall.id}`);
    }
  }
  for (const ledge of chunks.chunk.platforms) {
    if (ledge.type === WALL_TYPE) continue;
    const travel = ledge.motion?.distance ?? 0;
    const left = ledge.x - ledge.width / 2 - travel + BW / 2, right = ledge.x + ledge.width / 2 + travel - BW / 2;
    for (const wall of wallsAtStand(ledge, left, right, walls)) out.push(`${label}: wall ${wall.id} cuts through ledge ${ledge.id}`);
  }
  return out;
}

/** The route bot climbing from chunk `start`'s anchor as the game does; the longest wait (ms) for a new best height. */
function longestWait(seed: number, start: number, seconds: number): { waitMs: number; chunk: number } {
  const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
  const stream = createChunkStream(generator, C);
  const bot = createRouteBot();
  const anchor = generator.floor(start);
  const stepMs = 1000 / G.stepHz;
  let state = teleportPlayer(anchor.x, topOf(anchor) - BH / 2);
  let crumble = NO_CRUMBLE;
  const startFeet = state.y + BH / 2;
  let best = 0, bestAtMs = 0, waitMs = 0;
  stream.update(startFeet);
  for (let ms = 0; ms <= seconds * 1000; ms += stepMs) {
    const platforms = platformsAt(stream.platforms(), ms, stepMs);
    const input = bot.input(state, stream.chunks().flatMap((chunk) => chunk.route), (id) => platforms.find((p) => p.id === id),
      { base: G, current: G, platforms, updrafts: stream.updrafts() });
    const out = stepWorld(state, crumble, input, platforms, stream.updrafts(), G.view.width, G, stepMs);
    state = out.player; crumble = out.crumble;
    const feet = state.y + BH / 2;
    stream.update(feet, 2 * Math.max(0, state.vy) / G.stepHz);
    if (state.grounded && startFeet - feet > best) { best = startFeet - feet; waitMs = Math.max(waitMs, ms - bestAtMs); bestAtMs = ms; }
  }
  return { waitMs: Math.max(waitMs, seconds * 1000 - bestAtMs), chunk: stream.indexAt(state.y + BH / 2) };
}

const around = (generator: ReturnType<typeof createEndlessGenerator>, index: number) =>
  ({ prev: generator.chunk(index - 1), chunk: generator.chunk(index), next: generator.chunk(index + 1) });

describe('walls never stand where the candle stands', () => {
  it('the chunks QA found (seeds 5, 41, 61, 66, 70, 119) store no takeoff inside a wall and split no ledge', () => {
    const found: Array<[number, number]> = [[5, 4], [41, 6], [61, 2], [66, 2], [70, 2], [119, 3]];
    const all: string[] = [];
    for (const [seed, index] of found) {
      const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
      all.push(...problems(around(generator, index), `seed ${seed} chunk ${index}`));
    }
    expect(all).toEqual([]);
  }, 60_000);

  it('a sweep of seeds and chunks: no stored takeoff inside a wall, no ledge cut by a wall, neighbours loaded', () => {
    const all: string[] = [];
    let wallChunks = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
      for (let index = 1; index <= 14; index++) {
        const chunks = around(generator, index);
        if (chunks.chunk.platforms.some((p) => p.type === WALL_TYPE)) wallChunks++;
        all.push(...problems(chunks, `seed ${seed} chunk ${index}`));
      }
    }
    expect(wallChunks).toBeGreaterThan(100);
    expect(all).toEqual([]);
  }, 120_000);

  it('the route bot climbs seed 5 through chunk 4 from the ground and from chunk 4 without a stall', () => {
    for (const start of [0, 4]) {
      const { waitMs, chunk } = longestWait(5, start, start === 0 ? 120 : 60);
      expect(waitMs, `seed 5 from chunk ${start}`).toBeLessThan(30_000);
      expect(chunk, `seed 5 from chunk ${start}`).toBeGreaterThan(4);
    }
  }, 180_000);
});
