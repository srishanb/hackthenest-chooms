/**
 * The wall pieces of the endless climb (Decision D-37, a prototype behind `?walls=1`): wall kick and chimney.
 * Many chunks over many seeds, checked with the real physics: with the switch off nothing changes; with it on
 * every stored step replays with the chunks on both sides in place, random access holds, each piece really
 * needs its kicks, no wall catches a long fall, the night outlines find each wall step's target, and the route
 * bot (on the game's own world step) climbs through every one.
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessGenerator, stepsHold, type EndlessChunk, type PieceSpan } from '../endless/generator';
import { chargeStepsFor } from '../endless/jump-arcs';
import { PIECES } from '../endless/pieces/registry';
import { createRouteBot } from '../endless/route-bot';
import { flyStep, replayStep } from '../endless/route-replay';
import { NO_CRUMBLE } from '../player/crumble';
import { createPlayer, stepPlayer, teleportPlayer } from '../player/movement';
import type { PlayerState } from '../player/types';
import { WALL_TYPE } from '../player/wall';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';
import { reachableLedges } from '../world/reachable-ledges';

/** sha256 of the classic run below, taken on the code before walls (c7dca6f). */
const CLASSIC_RUN_SHA256 = 'de10e8ff793952707c3963a36ee5032559a08dbe33c267ec849b073d62a19ca5';
const WIDTH = G.view.width;
const H = G.player.height;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const SEEDS = Array.from({ length: 14 }, (_, i) => (i + 5) * 69069 % 1_000_003);
const CHUNKS = Array.from({ length: 12 }, (_, i) => i + 1);
const WALL_PIECES = ['wall-kick', 'chimney'] as const;
/** The highest a full straight-up jump lifts the feet (px). */
const FULL_JUMP_PX = G.jump.maxSpeed ** 2 / (2 * G.gravityY);

interface Sample { seed: number; chunk: EndlessChunk; prev: EndlessChunk; next: EndlessChunk; nextFloor: PlatformData }
const samples: Sample[] = [];
for (const seed of SEEDS) {
  const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
  for (const index of CHUNKS) {
    samples.push({ seed, chunk: generator.chunk(index), prev: generator.chunk(index - 1), next: generator.chunk(index + 1), nextFloor: generator.floor(index + 1) });
  }
}
const spansOf = (id: string): Array<{ sample: Sample; span: PieceSpan }> =>
  samples.flatMap((sample) => sample.chunk.pieces.filter((span) => span.id === id).map((span) => ({ sample, span })));
const stepsOf = (chunk: EndlessChunk, span: PieceSpan) => chunk.route.slice(span.firstStep, span.firstStep + span.stepCount);
const ledgeOf = (chunk: EndlessChunk, id: string): PlatformData => chunk.platforms.find((p) => p.id === id)!;
const wallsOf = (chunk: EndlessChunk): PlatformData[] => chunk.platforms.filter((p) => p.type === WALL_TYPE);

describe('the switch', () => {
  it('off: every chunk for every seed is the same as a generator that has no wall pieces and no wall rules', () => {
    const noWallPieces = PIECES.filter((entry) => !entry.needs.includes('walls'));
    const { wallMoves: _unused, ...noWallRules } = G;
    void _unused;
    for (const seed of [1, 7, 42, 99, 1234, 31337]) {
      const off = createEndlessGenerator(seed, G, C);
      const today = createEndlessGenerator(seed, noWallRules as GameConfig, C, T, noWallPieces);
      for (let index = 0; index < 22; index++) {
        const chunk = off.chunk(index);
        expect(chunk, `seed ${seed} chunk ${index}`).toEqual(today.chunk(index));
        expect(chunk.platforms.some((p) => p.type === WALL_TYPE)).toBe(false);
      }
    }
  }, 120_000);

  it('the classic climb is bit-identical with or without the wall rules: no wall, no change', () => {
    // The authored climb has no walls, so its physics never runs the wall code. Long random key traces over
    // ledges of every authored kind give exactly the same states, field for field, with and without the rules.
    const { wallMoves: _unused, ...noWallRules } = G;
    void _unused;
    const ledges: PlatformData[] = [
      { id: 'g', x: 480, y: 1010, width: 960, height: 20, type: 'static' },
      { id: 'a', x: 300, y: 880, width: 160, height: 20, type: 'static' },
      { id: 'b', x: 620, y: 760, width: 140, height: 20, type: 'slippery', ice01: 0.9 },
      { id: 'c', x: 420, y: 640, width: 120, height: 20, type: 'static', dx: 0.5 } as PlatformData,
    ];
    let seed = 12345;
    const random = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let a: PlayerState = createPlayer(480, 1000 - H / 2), b = a;
    for (let i = 0; i < 40_000; i++) {
      const input = { left: random() < 0.3, right: random() < 0.4, jump: random() < 0.35 };
      const env = { windAccelerationX: Math.sin(i / 300) * 40 };
      const outA = stepPlayer(a, input, ledges, WIDTH, G, 1000 / G.stepHz, env);
      const outB = stepPlayer(b, input, ledges, WIDTH, noWallRules as GameConfig, 1000 / G.stepHz, env);
      expect(outA).toEqual(outB);
      a = outA.state; b = outB.state;
    }
  });
});

describe('the classic climb against the code before walls', () => {
  it('a fixed random-key run over authored kinds of ledge gives the same states as before walls existed (pinned hash)', () => {
    // The hash was taken with the code before the wall prototype (commit c7dca6f) and still holds: the wall rules
    // and the shared steering path change no number in a world with no wall.
    const ledges: PlatformData[] = [
      { id: 'g', x: 480, y: 1010, width: 960, height: 20, type: 'static' },
      { id: 'a', x: 300, y: 880, width: 160, height: 20, type: 'static' },
      { id: 'b', x: 620, y: 760, width: 140, height: 20, type: 'slippery', ice01: 0.9 },
      { id: 'c', x: 420, y: 640, width: 120, height: 20, type: 'static', dx: 0.5 } as PlatformData,
      { id: 'd', x: 200, y: 520, width: 100, height: 20, type: 'static' },
    ];
    let seed = 2024;
    const random = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const hash = createHash('sha256');
    let state: PlayerState = createPlayer(480, 1000 - H / 2);
    for (let i = 0; i < 60_000; i++) {
      const input = { left: random() < 0.3, right: random() < 0.4, jump: random() < 0.35 };
      const out = stepPlayer(state, input, ledges, WIDTH, G, 1000 / G.stepHz, { windAccelerationX: Math.sin(i / 300) * 40 });
      hash.update(JSON.stringify(out));
      state = out.state;
    }
    expect(hash.digest('hex')).toBe(CLASSIC_RUN_SHA256);
  });
});

describe('wall pieces keep the generator rules', () => {
  it('each wall piece appears over many seeds, from an early chunk, with walls of the 2x grid', () => {
    for (const id of WALL_PIECES) expect(spansOf(id).length, id).toBeGreaterThanOrEqual(8);
    const early = Math.min(...WALL_PIECES.flatMap((id) => spansOf(id).map(({ sample }) => sample.chunk.index)));
    expect(early).toBeLessThanOrEqual(2);
    for (const { chunk } of samples) {
      for (const wall of wallsOf(chunk)) {
        for (const v of [wall.x - wall.width / 2, wall.width, topOf(wall), wall.height]) expect(Math.abs(v % 2), wall.id).toBe(0);
        // Inside its chunk: under the next anchor, over its own.
        expect(topOf(wall)).toBeGreaterThan(topOf(chunk.platforms[0]!) - C.chunkHeightPx);
        expect(wall.y + wall.height / 2).toBeLessThan(topOf(chunk.platforms[0]!) - C.rise.minPx);
      }
    }
  });

  it('every stored step replays onto its ledge with the previous and the next chunk in place, walls and all', () => {
    for (const { seed, chunk, prev, next, nextFloor } of samples) {
      const steps = [...chunk.route, ...chunk.altRoute];
      const label = `seed ${seed} chunk ${chunk.index}`;
      expect(stepsHold(steps, [...chunk.platforms, nextFloor], WIDTH, G, chunk.updrafts), label).toBe(true);
      const around = [...prev.platforms, ...chunk.platforms, ...next.platforms];
      expect(stepsHold(steps, around, WIDTH, G, [...prev.updrafts, ...chunk.updrafts, ...next.updrafts]), `${label} with neighbours`).toBe(true);
      for (const step of chunk.sideRoute) expect(replayStep(step, [...chunk.platforms, nextFloor], WIDTH, G, 0, false, chunk.updrafts), label).toBe(step.toId);
    }
  }, 180_000);

  it('every wall step lands from takeoffs 0.25 px apart within 2 px, and with every kick pressed 6 steps early or late', () => {
    for (const id of WALL_PIECES) {
      for (const { sample, span } of spansOf(id).slice(0, 10)) {
        const world = [...sample.chunk.platforms, sample.nextFloor];
        for (const step of stepsOf(sample.chunk, span).filter((s) => s.kicks)) {
          for (let shift = -T.takeoffTolerancePx; shift <= T.takeoffTolerancePx + 1e-9; shift += T.takeoffSamplePx) {
            expect(replayStep(step, world, WIDTH, G, shift, true, sample.chunk.updrafts), `${id} shift ${shift}`).toBe(step.toId);
          }
          for (let offset = -T.walls.kickTimingSteps; offset <= T.walls.kickTimingSteps; offset++) {
            expect(replayStep(step, world, WIDTH, G, 0, true, sample.chunk.updrafts, offset), `${id} press ${offset}`).toBe(step.toId);
          }
        }
      }
    }
  }, 120_000);

  it('random access: a chunk with a wall piece comes out the same built alone', () => {
    for (const id of WALL_PIECES) {
      const { seed, chunk } = spansOf(id)[0]!.sample;
      expect(createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true }).chunk(chunk.index)).toEqual(chunk);
    }
  });
});

describe('the wall pieces need the walls', () => {
  /** Every ordinary jump the night search samples, plus 9 takeoffs: does any land on `target`? */
  const plainJumpReaches = (from: PlatformData, target: PlatformData, world: readonly PlatformData[]): boolean => {
    for (let k = 0; k <= 8; k++) {
      const takeoffX = from.x - from.width / 2 + H / 3 + (from.width - H / 1.5) * k / 8;
      for (const direction of [-1, 0, 1] as const) for (let level = 1; level <= C.chargeLevels; level++) {
        const step = { fromId: from.id, toId: target.id, takeoffX, chargeSteps: chargeStepsFor(level, C.chargeLevels, G), direction };
        if (replayStep(step, world, WIDTH, G) === target.id) return true;
      }
    }
    return false;
  };

  it('wall kick: one jump that kicks its wall once and lands higher than any charge jump rises; no plain jump gets there', () => {
    for (const { sample, span } of spansOf('wall-kick')) {
      const [step] = stepsOf(sample.chunk, span);
      expect(span.stepCount).toBe(1);
      expect(step!.walls).toHaveLength(1);
      const from = ledgeOf(sample.chunk, step!.fromId), to = ledgeOf(sample.chunk, step!.toId);
      expect(topOf(from) - topOf(to)).toBeGreaterThan(FULL_JUMP_PX);
      const wall = ledgeOf(sample.chunk, step!.walls![0]!);
      // Its top stands above the ledge it leads to, so it cannot be climbed onto instead.
      expect(topOf(wall)).toBeLessThan(topOf(to));
      expect(plainJumpReaches(from, to, [...sample.chunk.platforms, sample.nextFloor])).toBe(false);
    }
  }, 120_000);

  it('chimney: three or four kicks, alternating between two facing walls, never the same wall twice in a row', () => {
    for (const { sample, span } of spansOf('chimney')) {
      const [step] = stepsOf(sample.chunk, span);
      const kicked = step!.walls!;
      expect(kicked.length).toBeGreaterThanOrEqual(3);
      expect(new Set(kicked).size).toBe(2);
      for (let i = 1; i < kicked.length; i++) expect(kicked[i]).not.toBe(kicked[i - 1]);
      const [a, b] = [...new Set(kicked)].map((id) => ledgeOf(sample.chunk, id));
      // Facing: side by side, overlapping in height.
      expect(Math.abs(a!.y - b!.y)).toBeLessThan((a!.height + b!.height) / 2);
      const from = ledgeOf(sample.chunk, step!.fromId), to = ledgeOf(sample.chunk, step!.toId);
      expect(topOf(from) - topOf(to)).toBeGreaterThan(FULL_JUMP_PX);
      const flight = flyStep(step!, [...sample.chunk.platforms, sample.nextFloor], WIDTH, G, { updrafts: sample.chunk.updrafts });
      expect(flight.kicks).toEqual(kicked);
      expect(flight.landedId).toBe(to.id);
    }
  }, 60_000);
});

describe('walls never catch a long fall', () => {
  it('a candle falling from far above, pressed into any wall and pressing jump, slides and kicks never', () => {
    let walls = 0;
    for (const { chunk, nextFloor } of samples) {
      const world = [...chunk.platforms, nextFloor];
      for (const wall of wallsOf(chunk)) {
        for (const side of [-1, 1] as const) {
          walls++;
          // Took off 200 px above the wall's top (a fall from a higher ledge), and now passes its face, pressing into it.
          const x = wall.x - side * (wall.width / 2 + G.player.width / 2);
          const takeoffFeet = topOf(wall) - 200;
          const feet = topOf(wall) + 10;
          let state: PlayerState = { ...createPlayer(x, feet - H / 2), vy: Math.sqrt(2 * G.gravityY * 210), jumpLatch: false, takeoffBottomY: takeoffFeet };
          let previousVy = -1;
          for (let i = 0; i < 400 && !state.grounded && state.y - H / 2 < wall.y + wall.height / 2; i++) {
            const out = stepPlayer(state, { left: side < 0, right: side > 0, jump: i % 2 === 0 }, world, WIDTH, G, 1000 / G.stepHz);
            expect(out.events.wallKicked ?? null, wall.id).toBeNull();
            state = out.state;
            if (state.grounded) break;
            // Alongside the wall it only ever speeds up: no slide.
            if (Math.abs(state.y - wall.y) < (H + wall.height) / 2) { expect(state.vy).toBeGreaterThan(previousVy); }
            previousVy = state.vy;
          }
        }
      }
    }
    expect(walls).toBeGreaterThan(20);
  }, 60_000);
});

describe('the night outlines', () => {
  it('outline the ledge each wall step leads to, from the ledge it leaves', () => {
    for (const id of WALL_PIECES) {
      for (const { sample, span } of spansOf(id).slice(0, 8)) {
        const world = [...sample.prev.platforms, ...sample.chunk.platforms, ...sample.next.platforms];
        const bounds = { width: WIDTH, top: topOf(sample.nextFloor) - C.chunkHeightPx, bottom: topOf(sample.prev.platforms[0]!) + 40 };
        for (const step of stepsOf(sample.chunk, span).filter((s) => s.kicks)) {
          const from = ledgeOf(sample.chunk, step.fromId);
          const kickSteps = [{ takeoffX: step.takeoffX, chargeSteps: step.chargeSteps, direction: step.direction, kicks: step.kicks! }];
          expect(reachableLedges(from, world, bounds, G, C.outlineLowerReachPx, sample.chunk.updrafts, kickSteps), `${id} ${step.toId}`).toContain(step.toId);
        }
      }
    }
  }, 60_000);
});

describe('the route bot on the game world step', () => {
  it('climbs every chunk that holds a wall piece onto the next anchor, kicking on the way', () => {
    const stepMs = 1000 / G.stepHz;
    const picked = WALL_PIECES.flatMap((id) => spansOf(id).slice(0, 8).map(({ sample }) => sample));
    for (const { seed, chunk, nextFloor } of picked) {
      const platforms = [...chunk.platforms, nextFloor];
      const anchor = chunk.platforms[0]!;
      const bot = createRouteBot();
      let state: PlayerState = { ...teleportPlayer(anchor.x, topOf(anchor) - H / 2), grounded: true, platformId: anchor.id, jumpLatch: false };
      let crumble = NO_CRUMBLE;
      let kicks = 0;
      const visited = new Set<string>();
      for (let i = 0; i < 120 * 240 && state.platformId !== nextFloor.id; i++) {
        const now = platformsAt(platforms, (i + 1) * stepMs, stepMs);
        const input = bot.input(state, chunk.route, (id) => now.find((p) => p.id === id), { base: G, current: G, platforms: now, updrafts: chunk.updrafts });
        const out = stepWorld(state, crumble, input, now, chunk.updrafts, WIDTH, G, stepMs);
        state = out.player; crumble = out.crumble;
        if (out.events.wallKicked) kicks++;
        if (state.grounded && state.platformId) visited.add(state.platformId);
      }
      const label = `seed ${seed} chunk ${chunk.index}`;
      expect(state.platformId, label).toBe(nextFloor.id);
      for (const step of chunk.route) expect(visited.has(step.toId), `${label} ${step.toId}`).toBe(true);
      expect(kicks, label).toBeGreaterThanOrEqual(chunk.route.reduce((sum, step) => sum + (step.kicks?.length ?? 0), 0));
    }
  }, 120_000);

  it('climbs a long wall course headless without stalling (30 s without a new best height at most)', () => {
    // 5, 41, 61 and 119 are seeds whose routes once stored a takeoff inside a wall (QA finding 4).
    for (const seed of [3, 11, 5, 41, 61, 119]) {
      const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
      const stream = createChunkStream(generator, C);
      const bot = createRouteBot();
      const anchor = generator.floor(0);
      const STEP_MS = 1000 / G.stepHz;
      let state = teleportPlayer(anchor.x, topOf(anchor) - H / 2);
      let crumble = NO_CRUMBLE;
      const startFeet = state.y + H / 2;
      let best = 0, bestAtMs = 0, longestWaitMs = 0, kicks = 0;
      stream.update(startFeet);
      const seconds = 150;
      for (let ms = 0; ms <= seconds * 1000; ms += STEP_MS) {
        const platforms = platformsAt(stream.platforms(), ms, STEP_MS);
        const input = bot.input(state, stream.chunks().flatMap((chunk) => chunk.route), (id) => platforms.find((p) => p.id === id),
          { base: G, current: G, platforms, updrafts: stream.updrafts() });
        const out = stepWorld(state, crumble, input, platforms, stream.updrafts(), WIDTH, G, STEP_MS);
        state = out.player; crumble = out.crumble;
        if (out.events.wallKicked) kicks++;
        const feet = state.y + H / 2;
        stream.update(feet, 2 * Math.max(0, state.vy) / G.stepHz);
        if (state.grounded && startFeet - feet > best) { best = startFeet - feet; longestWaitMs = Math.max(longestWaitMs, ms - bestAtMs); bestAtMs = ms; }
      }
      longestWaitMs = Math.max(longestWaitMs, seconds * 1000 - bestAtMs);
      expect(longestWaitMs, `seed ${seed}`).toBeLessThan(30_000);
      expect(best, `seed ${seed}`).toBeGreaterThan(5 * C.chunkHeightPx);
      expect(kicks, `seed ${seed}`).toBeGreaterThan(3);
    }
  }, 180_000);
});
