/**
 * Set pieces in the endless climb (Decision D-35). These tests generate many chunks over many seeds and
 * check, with the real `stepPlayer`, that the pieces keep every rule of the generator (random access,
 * every jump and drop replays, falls unbounded, no wider ledges) and that each piece really has its shape.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import type { PlatformData } from '../../shared/contracts/content';
import { grownMovement } from '../candle/growth';
import { createEndlessGenerator, replayStep, stepsHold, type EndlessChunk, type PieceSpan } from '../endless/generator';
import { chargeStepsFor } from '../endless/jump-arcs';
import { allowedPieces } from '../endless/pieces/pacing';
import { PIECES, type PieceEntry } from '../endless/pieces/registry';
import { heldStepsFor, createRouteBot } from '../endless/route-bot';
import { stepPlayer, teleportPlayer } from '../player/movement';
import type { PlayerState } from '../player/types';
import { launchVelocity, charge01 } from '../player/charge-jump';

const WIDTH = G.view.width;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const SEEDS = Array.from({ length: 24 }, (_, i) => (i + 1) * 2654435761 % 1_000_003);
const CHUNKS = Array.from({ length: 24 }, (_, i) => i);

interface Sample { seed: number; chunk: EndlessChunk; next: PlatformData; nextChunk: EndlessChunk }
const samples: Sample[] = [];
for (const seed of SEEDS) {
  const generator = createEndlessGenerator(seed, G, C);
  for (const index of CHUNKS) samples.push({ seed, chunk: generator.chunk(index), next: generator.floor(index + 1), nextChunk: generator.chunk(index + 1) });
}
const ledgeOf = (chunk: EndlessChunk, id: string): PlatformData => chunk.platforms.find((p) => p.id === id)!;
const spansOf = (id: string): Array<{ sample: Sample; span: PieceSpan }> =>
  samples.flatMap((sample) => sample.chunk.pieces.filter((span) => span.id === id).map((span) => ({ sample, span })));
const stepsOf = (chunk: EndlessChunk, span: PieceSpan) => chunk.route.slice(span.firstStep, span.firstStep + span.stepCount);

describe('set pieces: the rules of the generator still hold', () => {
  it('every piece in the registry appears, and the approach always ends the chunk on the next anchor', () => {
    const seen = new Set(samples.flatMap((s) => s.chunk.pieces.map((span) => span.id)));
    // The wall pieces exist only with the `?walls=1` switch (Decision D-37): endless-walls.test.ts covers them.
    for (const entry of PIECES) if (!entry.needs.includes('walls')) expect(seen.has(entry.piece.id), entry.piece.id).toBe(true);
    expect(seen.has('wall-kick') || seen.has('chimney')).toBe(false);
    for (const { chunk, next } of samples) {
      expect(chunk.pieces.at(-1)!.id).toBe('approach');
      expect(chunk.pieces.at(-1)!.exitId).toBe(next.id);
      // Pieces follow one another: each starts where the one before ended, and they cover the whole route.
      expect(chunk.pieces[0]!.entryId).toBe(chunk.platforms[0]!.id);
      for (let i = 1; i < chunk.pieces.length; i++) expect(chunk.pieces[i]!.entryId).toBe(chunk.pieces[i - 1]!.exitId);
      expect(chunk.pieces.reduce((sum, span) => sum + span.stepCount, 0)).toBe(chunk.route.length);
    }
  });

  it('pacing: no piece twice in a row, a calm piece after a demanding one, and nothing before it unlocks', () => {
    const byId = new Map(PIECES.map((entry) => [entry.piece.id, entry]));
    for (const { chunk } of samples) {
      const laid = chunk.pieces.filter((span) => span.id !== 'approach').map((span) => byId.get(span.id)!);
      for (let i = 0; i < laid.length; i++) {
        const entry = laid[i]!;
        expect(chunk.index).toBeGreaterThanOrEqual(entry.fromChunk);
        if (entry.needs.includes('snow')) expect(Math.floor(chunk.index / C.biome.chunksPerBand) % 2).toBe(1);
        if (entry.needs.includes('moving')) expect(chunk.index).toBeGreaterThanOrEqual(C.moving.fromChunk);
        if (i === 0) continue;
        expect(entry.piece.id, `chunk ${chunk.index}`).not.toBe(laid[i - 1]!.piece.id);
        if (laid[i - 1]!.demanding) expect(entry.demanding).toBe(false);
      }
    }
    // Most chunks are made of several pieces, not the plain ladder alone.
    const plain = samples.filter((s) => s.chunk.index > 0 && s.chunk.pieces.length === 1).length;
    expect(plain / samples.length).toBeLessThan(0.05);
  });

  it('every stored step, jumps and drops, main way and other way, replays onto its ledge, with the next chunk in place too', () => {
    let drops = 0;
    for (const { seed, chunk, next, nextChunk } of samples) {
      const steps = [...chunk.route, ...chunk.altRoute];
      for (let i = 1; i < chunk.route.length; i++) expect(chunk.route[i]!.fromId).toBe(chunk.route[i - 1]!.toId);
      // Updraft columns (Decision D-36) act on every step: this chunk's, and the next chunk's with it.
      expect(stepsHold(steps, [...chunk.platforms, next], WIDTH, G, chunk.updrafts), `seed ${seed} chunk ${chunk.index}`).toBe(true);
      expect(stepsHold(steps, [...chunk.platforms, ...nextChunk.platforms], WIDTH, G, [...chunk.updrafts, ...nextChunk.updrafts]),
        `seed ${seed} chunk ${chunk.index} with next`).toBe(true);
      for (const step of chunk.sideRoute) expect(replayStep(step, [...chunk.platforms, next], WIDTH, G, 0, false, chunk.updrafts)).toBe(step.toId);
      drops += chunk.route.filter((step) => step.kind === 'drop').length;
    }
    expect(drops).toBeGreaterThan(20);
  }, 60_000);

  it('random access: a chunk built alone equals the same chunk built after its neighbours, and matches the cheap anchor', () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const inOrder = createEndlessGenerator(seed, G, C);
      for (let index = 0; index < 12; index++) inOrder.chunk(index);
      for (const index of [3, 7, 11]) {
        const alone = createEndlessGenerator(seed, G, C);
        expect(alone.chunk(index)).toEqual(inOrder.chunk(index));
        expect(alone.floor(index)).toEqual(inOrder.chunk(index).platforms[0]);
      }
    }
  });

  it('still hard: no ledge above the ground is wider than an ordinary ledge can be, and none goes outside its chunk', () => {
    const widest = C.width.easyPx * (1 + C.width.widthJitter01);
    for (const { chunk, next } of samples) {
      for (const p of chunk.index === 0 ? chunk.platforms.slice(1) : chunk.platforms) expect(p.width).toBeLessThanOrEqual(widest);
      for (const p of chunk.platforms) {
        expect(topOf(p)).toBeLessThanOrEqual(chunk.floorTopPx);
        expect(topOf(p)).toBeGreaterThan(topOf(next));
        expect(p.x - p.width / 2 - (p.motion?.distance ?? 0)).toBeGreaterThanOrEqual(0);
        expect(p.x + p.width / 2 + (p.motion?.distance ?? 0)).toBeLessThanOrEqual(WIDTH);
      }
    }
  });

  it('always ends: a piece that never fits is abandoned, and with no piece that fits the chunk is the plain ladder', () => {
    const never: PieceEntry = { piece: { id: 'never', label: 'never fits', build: () => false }, weight: 50, fromChunk: 0, demanding: false, needs: [] };
    const generator = createEndlessGenerator(99, G, C, T, [never, ...PIECES]);
    for (let index = 0; index < 8; index++) {
      const chunk = generator.chunk(index);
      expect(chunk.pieces.some((span) => span.id === 'never')).toBe(false);
      expect(chunk.route.at(-1)!.toId).toBe(generator.floor(index + 1).id);
    }
    const onlyNever = createEndlessGenerator(99, G, C, T, [never]);
    for (let index = 0; index < 4; index++) expect(onlyNever.chunk(index).pieces.map((span) => span.id)).toEqual(['approach']);
  });

  it('pacing rules on their own: unlock, features, no repeat, calm after demanding', () => {
    const none = { previous: null, excluded: new Set<string>() };
    const ids = (list: ReturnType<typeof allowedPieces>) => list.map((option) => option.entry.piece.id);
    expect(ids(allowedPieces(PIECES, 0, new Set(), none, T))).toEqual(['ladder', 'staircase']);
    expect(ids(allowedPieces(PIECES, 20, new Set(), none, T))).not.toContain('ice-run');
    expect(ids(allowedPieces(PIECES, 20, new Set(['snow', 'moving']), none, T))).toContain('ice-run');
    const zigzag = PIECES.find((entry) => entry.piece.id === 'zigzag')!;
    const after = allowedPieces(PIECES, 20, new Set(['snow', 'moving']), { previous: zigzag, excluded: new Set(['ladder']) }, T);
    expect(after.every((option) => !option.entry.demanding && option.entry !== zigzag && option.entry.piece.id !== 'ladder')).toBe(true);
    // A piece fades in after it unlocks.
    const fresh = allowedPieces(PIECES, T.pillars.fromChunk, new Set(), none, T).find((o) => o.entry.piece.id === 'pillars')!;
    expect(fresh.weight).toBeLessThan(T.pillars.weight);
  });
});

describe('set pieces: each has its shape', () => {
  it('staircase: the same jump, one way, every step about the same rise', () => {
    const found = spansOf('staircase');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const steps = stepsOf(sample.chunk, span);
      expect(steps.length).toBeGreaterThanOrEqual(T.staircase.steps[0] - 1);
      expect(new Set(steps.map((s) => s.chargeSteps)).size).toBe(1);
      expect(new Set(steps.map((s) => s.direction)).size).toBe(1);
      const rises = steps.map((s) => topOf(ledgeOf(sample.chunk, s.fromId)) - topOf(ledgeOf(sample.chunk, s.toId)));
      expect(Math.max(...rises) - Math.min(...rises)).toBeLessThanOrEqual(10);
    }
  });

  it('traverse: a long way sideways for little height, never landing lower than the takeoff', () => {
    const found = spansOf('traverse');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const entry = ledgeOf(sample.chunk, span.entryId);
      const exit = ledgeOf(sample.chunk, span.exitId);
      const across = Math.abs(exit.x - entry.x);
      const gained = topOf(entry) - topOf(exit);
      expect(across).toBeGreaterThanOrEqual(T.traverse.minSpanPx);
      expect(gained).toBeLessThan(across / 3);
      for (const step of stepsOf(sample.chunk, span)) expect(topOf(ledgeOf(sample.chunk, step.toId))).toBeLessThanOrEqual(topOf(ledgeOf(sample.chunk, step.fromId)));
    }
  });

  it('zigzag shaft: side to side, each jump back the other way, up a column narrower than half the screen', () => {
    const found = spansOf('zigzag');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const steps = stepsOf(sample.chunk, span);
      expect(steps.length).toBeGreaterThanOrEqual(T.zigzag.ledges[0]);
      const ledges = steps.map((s) => ledgeOf(sample.chunk, s.toId));
      for (let i = 1; i < ledges.length; i++) {
        // From the column's first ledge on, every jump goes back the other way.
        expect(steps[i]!.direction).toBe(-steps[i - 1]!.direction);
        expect(topOf(ledges[i - 1]!) - topOf(ledges[i]!)).toBeGreaterThanOrEqual(C.rise.minPx - 1);
      }
      // Alternate sides of the column: every second ledge on the same side.
      const xs = ledges.map((l) => l.x);
      for (let i = 2; i < xs.length; i++) expect(Math.abs(xs[i]! - xs[i - 2]!)).toBeLessThanOrEqual(14);
      const span01 = Math.max(...ledges.map((l) => l.x + l.width / 2)) - Math.min(...ledges.map((l) => l.x - l.width / 2));
      expect(span01).toBeLessThanOrEqual(T.zigzag.columnPx[1] + 14);
    }
  });

  it('detour down: the route walks off an edge and lands lower before it jumps up past the start, and no drop shakes the candle', () => {
    const found = spansOf('detour');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const steps = stepsOf(sample.chunk, span);
      const entry = ledgeOf(sample.chunk, span.entryId);
      expect(steps[0]!.kind).toBe('drop');
      for (const step of steps.filter((s) => s.kind === 'drop')) {
        const fall = topOf(ledgeOf(sample.chunk, step.toId)) - topOf(ledgeOf(sample.chunk, step.fromId));
        expect(fall).toBeGreaterThan(0);
        expect(fall).toBeLessThan(C.composure.fall.minPx);
        expect(step.chargeSteps).toBe(0);
        // A drop starts on firm ground: never ice, never a moving ledge.
        expect(ledgeOf(sample.chunk, step.fromId).type).toBe('static');
      }
      const last = steps.at(-1)!;
      expect(last.kind ?? 'jump').toBe('jump');
      expect(topOf(ledgeOf(sample.chunk, last.toId))).toBeLessThan(topOf(entry));
    }
  });

  it('pillar hops: a row of ledges narrower than any ordinary ledge', () => {
    const found = spansOf('pillars');
    expect(found.length).toBeGreaterThan(10);
    expect(T.pillars.widthPx).toBeLessThan(C.width.minPx);
    for (const { sample, span } of found) {
      const steps = stepsOf(sample.chunk, span);
      expect(steps.length).toBeGreaterThanOrEqual(T.pillars.hops[0]);
      for (const step of steps) expect(ledgeOf(sample.chunk, step.toId).width).toBe(T.pillars.widthPx);
    }
  });

  it('big leap: one near-full charge across a wide gap from the edge of the ledge', () => {
    const found = spansOf('big-leap');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const [step, ...rest] = stepsOf(sample.chunk, span);
      expect(rest).toEqual([]);
      expect(step!.chargeSteps).toBeGreaterThanOrEqual(chargeStepsFor(T.bigLeap.minLevel, C.chargeLevels, G));
      const to = ledgeOf(sample.chunk, step!.toId);
      expect(Math.abs(to.x - step!.takeoffX)).toBeGreaterThanOrEqual(T.bigLeap.minGapPx - to.width / 2);
    }
  });

  it('fork: a short risky way through a narrow ledge with wax, and a longer safe way, that meet on one ledge', () => {
    const found = spansOf('fork');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      const main = stepsOf(sample.chunk, span);
      expect(span.altSteps.length).toBe(2);
      expect(main.length).toBeGreaterThan(span.altSteps.length);
      expect(span.altSteps[0]!.fromId).toBe(span.entryId);
      expect(span.altSteps[1]!.fromId).toBe(span.altSteps[0]!.toId);
      expect(span.altSteps[1]!.toId).toBe(span.exitId);
      const risky = ledgeOf(sample.chunk, span.altSteps[0]!.toId);
      expect(risky.width).toBe(T.fork.riskyWidthPx);
      expect(sample.chunk.wax.some((drop) => Math.abs(drop.x - risky.x) < 1 && drop.y < topOf(risky))).toBe(true);
    }
  });

  it('ice run: only in snow, every ledge of it icy, each jump from the far third of the ice', () => {
    const found = spansOf('ice-run');
    expect(found.length).toBeGreaterThan(10);
    for (const { sample, span } of found) {
      expect(Math.floor(sample.chunk.index / C.biome.chunksPerBand) % 2).toBe(1);
      const steps = stepsOf(sample.chunk, span);
      for (const step of steps) {
        const to = ledgeOf(sample.chunk, step.toId);
        expect(to.type).toBe('slippery');
        expect(to.ice01).toBeGreaterThanOrEqual(T.iceRun.ice01[0]);
      }
      for (const step of steps.slice(1)) {
        const from = ledgeOf(sample.chunk, step.fromId);
        expect((step.takeoffX - from.x) * step.direction).toBeGreaterThan(from.width / 6 - G.player.width);
      }
    }
  });

  it('moving crossing: the main path rides one sliding ledge', () => {
    const found = spansOf('moving-crossing');
    expect(found.length).toBeGreaterThan(5);
    for (const { sample, span } of found) {
      const steps = stepsOf(sample.chunk, span);
      expect(steps.length).toBe(2);
      const mover = ledgeOf(sample.chunk, steps[0]!.toId);
      expect(mover.type).toBe('moving');
      expect(mover.motion!.distance).toBeGreaterThanOrEqual(T.movingCrossing.distancePx[0]);
      expect(ledgeOf(sample.chunk, steps[1]!.toId).motion).toBeUndefined();
    }
  });
});

describe('the route bot through set pieces', () => {
  it('climbs a chunk with a detour, walking off the edge for the drop, onto the next anchor', () => {
    const { sample } = spansOf('detour')[0]!;
    const { chunk, next } = sample;
    const platforms = [...chunk.platforms, next];
    const anchor = chunk.platforms[0]!;
    const bot = createRouteBot();
    let state: PlayerState = { ...teleportPlayer(anchor.x, topOf(anchor) - G.player.height / 2), grounded: true, platformId: anchor.id, jumpLatch: false };
    const visited = new Set<string>();
    for (let step = 0; step < 120 * 200 && state.platformId !== next.id; step++) {
      const input = bot.input(state, chunk.route, (id) => platforms.find((p) => p.id === id), { base: G, current: G });
      state = stepPlayer(state, input, platforms, WIDTH, G, 1000 / G.stepHz).state;
      if (state.grounded && state.platformId) visited.add(state.platformId);
    }
    expect(state.platformId).toBe(next.id);
    for (const step of chunk.route) expect(visited.has(step.toId)).toBe(true);
  });

  it('holds jump for the launch speed the route was built for, also when wax has grown the candle', () => {
    expect(heldStepsFor(36, G, G)).toBe(36);
    const grown = grownMovement(G, 1.06);
    const stepMs = 1000 / G.stepHz;
    for (const steps of [12, 36, 60]) {
      const wanted = launchVelocity(charge01(steps * stepMs, G), 1, G).vx;
      const got = launchVelocity(charge01(heldStepsFor(steps, G, grown) * stepMs, grown), 1, grown).vx;
      expect(Math.abs(got - wanted) / wanted).toBeLessThan(0.01);
    }
  });
});
