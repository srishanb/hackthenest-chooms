/**
 * The special-ledge set pieces of the endless climb (Decision D-36): mushroom launch, crumbling run,
 * updraft rise and updraft crossing. Many chunks over many seeds, checked with the real physics: every
 * stored step replays with the chunks on both sides in place, random access holds, a crumbling ledge is
 * never stood on longer than it holds, each piece really needs its ledge kind, and the route bot (on the
 * game's own world step) gets through every one.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import type { PlatformData } from '../../shared/contracts/content';
import { createEndlessGenerator, replayStep, stepsHold, type EndlessChunk, type PieceSpan } from '../endless/generator';
import { createRouteBot } from '../endless/route-bot';
import { standMsBefore } from '../endless/route-replay';
import { PIECES } from '../endless/pieces/registry';
import { NO_CRUMBLE } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import type { PlayerState } from '../player/types';
import { stepWorld } from '../player/world-step';
import { platformsAt } from '../world/environment';

const WIDTH = G.view.width;
const K = G.ledgeKinds!;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const SEEDS = Array.from({ length: 16 }, (_, i) => (i + 3) * 40503 % 1_000_003);
const FIRST = T.ledgeKinds.bounceFromChunk;
const CHUNKS = Array.from({ length: 18 }, (_, i) => FIRST + i);
const NEW = ['mushroom-launch', 'crumbling-run', 'updraft-rise', 'updraft-crossing'] as const;
/** The straight-up full jump's rise (px): 780^2 / (2 x 1400). */
const FULL_JUMP_PX = G.jump.maxSpeed ** 2 / (2 * G.gravityY);

interface Sample { seed: number; chunk: EndlessChunk; prev: EndlessChunk; next: EndlessChunk; nextFloor: PlatformData }
const samples: Sample[] = [];
for (const seed of SEEDS) {
  const generator = createEndlessGenerator(seed, G, C);
  for (const index of CHUNKS) {
    samples.push({ seed, chunk: generator.chunk(index), prev: generator.chunk(index - 1), next: generator.chunk(index + 1), nextFloor: generator.floor(index + 1) });
  }
}
const spansOf = (id: string): Array<{ sample: Sample; span: PieceSpan }> =>
  samples.flatMap((sample) => sample.chunk.pieces.filter((span) => span.id === id).map((span) => ({ sample, span })));
const stepsOf = (chunk: EndlessChunk, span: PieceSpan) => chunk.route.slice(span.firstStep, span.firstStep + span.stepCount);
const ledgeOf = (chunk: EndlessChunk, id: string): PlatformData => chunk.platforms.find((p) => p.id === id)!;

describe('special-ledge pieces keep the generator rules', () => {
  it('each new piece appears over many seeds, never before its kind unlocks', () => {
    for (const id of NEW) expect(spansOf(id).length, id).toBeGreaterThanOrEqual(8);
    const entry = (id: string) => PIECES.find((e) => e.piece.id === id)!;
    for (const id of NEW) for (const { sample } of spansOf(id)) expect(sample.chunk.index).toBeGreaterThanOrEqual(entry(id).fromChunk);
    expect(entry('mushroom-launch').fromChunk).toBeGreaterThanOrEqual(T.ledgeKinds.bounceFromChunk);
    expect(entry('crumbling-run').fromChunk).toBeGreaterThanOrEqual(T.ledgeKinds.crumbleFromChunk);
    expect(entry('updraft-rise').fromChunk).toBeGreaterThanOrEqual(T.ledgeKinds.updraftFromChunk);
    // Lower down there are none of these kinds at all, so the early climb is unchanged.
    const early = createEndlessGenerator(SEEDS[0]!, G, C);
    for (let index = 0; index < FIRST; index++) {
      const chunk = early.chunk(index);
      expect(chunk.updrafts).toEqual([]);
      expect(chunk.platforms.every((p) => p.type !== 'bounce' && p.type !== 'crumbling'), `chunk ${index}`).toBe(true);
    }
  });

  it('every stored step replays onto its ledge with the previous and the next chunk in place, columns and all', () => {
    for (const { seed, chunk, prev, next, nextFloor } of samples) {
      const steps = [...chunk.route, ...chunk.altRoute];
      const label = `seed ${seed} chunk ${chunk.index}`;
      expect(stepsHold(steps, [...chunk.platforms, nextFloor], WIDTH, G, chunk.updrafts), label).toBe(true);
      const around = [...prev.platforms, ...chunk.platforms, ...next.platforms];
      expect(stepsHold(steps, around, WIDTH, G, [...prev.updrafts, ...chunk.updrafts, ...next.updrafts]), `${label} with neighbours`).toBe(true);
      for (const step of chunk.sideRoute) expect(replayStep(step, [...chunk.platforms, nextFloor], WIDTH, G, 0, false, chunk.updrafts), label).toBe(step.toId);
    }
  }, 120_000);

  it('random access: a chunk with a new piece comes out the same built alone', () => {
    const found = NEW.map((id) => spansOf(id)[0]!.sample);
    for (const { seed, chunk } of found) {
      expect(createEndlessGenerator(seed, G, C).chunk(chunk.index)).toEqual(chunk);
    }
  });

  it('bounce caps are never stood on, and updraft columns stay inside their chunk', () => {
    for (const { chunk, nextFloor } of samples) {
      const caps = new Set(chunk.platforms.filter((p) => p.type === 'bounce').map((p) => p.id));
      for (const step of [...chunk.route, ...chunk.altRoute, ...chunk.sideRoute]) {
        expect(caps.has(step.fromId)).toBe(false);
        expect(caps.has(step.toId)).toBe(false);
      }
      expect(chunk.wax.every((drop) => !caps.has(drop.ledgeId ?? '') && !chunk.platforms.some((p) => caps.has(p.id)
        && Math.abs(drop.x - p.x) < p.width / 2 && Math.abs(drop.y - topOf(p)) < 40))).toBe(true);
      for (const column of chunk.updrafts) {
        expect(column.x - column.width / 2).toBeGreaterThanOrEqual(0);
        expect(column.x + column.width / 2).toBeLessThanOrEqual(WIDTH);
        expect(column.y - column.height / 2).toBeGreaterThan(topOf(nextFloor));
        expect(column.y + column.height / 2).toBeLessThan(chunk.floorTopPx - C.rise.minPx);
      }
    }
  });
});

describe('each new piece has its shape and needs its kind', () => {
  it('mushroom launch: one jump that bounces on a cap and rises more than any jump can, and misses without the cap', () => {
    for (const { sample, span } of spansOf('mushroom-launch')) {
      const [step] = stepsOf(sample.chunk, span);
      expect(span.stepCount).toBe(1);
      const cap = ledgeOf(sample.chunk, step!.via!);
      expect(cap.type).toBe('bounce');
      const rise = topOf(ledgeOf(sample.chunk, step!.fromId)) - topOf(ledgeOf(sample.chunk, step!.toId));
      expect(rise).toBeGreaterThan(FULL_JUMP_PX);
      const all = [...sample.chunk.platforms, sample.nextFloor];
      expect(replayStep(step!, all.filter((p) => p.id !== cap.id), WIDTH, G, 0, false, sample.chunk.updrafts)).not.toBe(step!.toId);
    }
  });

  it('crumbling run: two to four crumbling ledges, and the route never stands on one longer than it holds', () => {
    const budget = K.crumble.holdMs - T.crumbleMarginMs;
    for (const { sample, span } of spansOf('crumbling-run')) {
      const crumbling = span.ledgeIds.filter((id) => ledgeOf(sample.chunk, id).type === 'crumbling');
      expect(crumbling.length).toBeGreaterThanOrEqual(T.crumblingRun.ledges[0]);
      expect(crumbling.length).toBeLessThanOrEqual(T.crumblingRun.ledges[1]);
    }
    let checked = 0;
    for (const { chunk } of samples) {
      for (const step of [...chunk.route, ...chunk.altRoute]) {
        const from = chunk.platforms.find((p) => p.id === step.fromId);
        if (from?.type !== 'crumbling') continue;
        checked++;
        expect(step.kind).not.toBe('drop');
        expect(step.arriveX).toBeDefined();
        expect(standMsBefore(step, G)).toBeLessThanOrEqual(budget);
      }
      // No optional side jump leaves a crumbling ledge.
      for (const step of chunk.sideRoute) expect(chunk.platforms.find((p) => p.id === step.fromId)?.type).not.toBe('crumbling');
    }
    expect(checked).toBeGreaterThan(15);
  });

  it('updraft rise and crossing: the step rides its column, and without the column it does not get there', () => {
    for (const id of ['updraft-rise', 'updraft-crossing'] as const) {
      for (const { sample, span } of spansOf(id)) {
        const [step] = stepsOf(sample.chunk, span);
        expect(span.updraftIds.length).toBe(1);
        expect(step!.ride).toBe(span.updraftIds[0]);
        const column = sample.chunk.updrafts.find((c) => c.id === step!.ride)!;
        expect(column.kind).toBe(id === 'updraft-rise' ? 'rise' : 'drift');
        const all = [...sample.chunk.platforms, sample.nextFloor];
        const others = sample.chunk.updrafts.filter((c) => c.id !== column.id);
        expect(replayStep(step!, all, WIDTH, G, 0, false, others), `${id} seed ${sample.seed} chunk ${sample.chunk.index}`).not.toBe(step!.toId);
        if (id === 'updraft-rise') {
          const rise = topOf(ledgeOf(sample.chunk, step!.fromId)) - topOf(ledgeOf(sample.chunk, step!.toId));
          expect(rise).toBeGreaterThanOrEqual(T.updraftRise.risePx[0]);
        }
      }
    }
  });
});

describe('the route bot on the game world step', () => {
  it('climbs every chunk that holds a new piece onto the next anchor: bounces, crumbles and rides included', () => {
    const stepMs = 1000 / G.stepHz;
    const picked = NEW.flatMap((id) => spansOf(id).slice(0, 8).map(({ sample }) => sample));
    for (const { seed, chunk, nextFloor } of picked) {
      const platforms = [...chunk.platforms, nextFloor];
      const anchor = chunk.platforms[0]!;
      const bot = createRouteBot();
      let state: PlayerState = { ...teleportPlayer(anchor.x, topOf(anchor) - G.player.height / 2), grounded: true, platformId: anchor.id, jumpLatch: false };
      let crumble = NO_CRUMBLE;
      let bounced = 0, crumbled = 0;
      const visited = new Set<string>();
      for (let i = 0; i < 120 * 240 && state.platformId !== nextFloor.id; i++) {
        // As in the game: moving ledges move with world time.
        const now = platformsAt(platforms, (i + 1) * stepMs, stepMs);
        const input = bot.input(state, chunk.route, (id) => now.find((p) => p.id === id), { base: G, current: G });
        const out = stepWorld(state, crumble, input, now, chunk.updrafts, WIDTH, G, stepMs);
        state = out.player; crumble = out.crumble;
        if (out.events.bounced) bounced++;
        crumbled += out.crumbled.length;
        if (state.grounded && state.platformId) visited.add(state.platformId);
      }
      const label = `seed ${seed} chunk ${chunk.index}`;
      expect(state.platformId, label).toBe(nextFloor.id);
      for (const step of chunk.route) expect(visited.has(step.toId), `${label} ${step.toId}`).toBe(true);
      if (chunk.pieces.some((span) => span.id === 'mushroom-launch')) expect(bounced).toBeGreaterThan(0);
      if (chunk.pieces.some((span) => span.id === 'crumbling-run')) expect(crumbled).toBeGreaterThan(0);
    }
  }, 120_000);
});
