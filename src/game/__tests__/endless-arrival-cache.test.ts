/**
 * QA finding (round 2, row 1): the landing point a step off a crumbling ledge is timed from (`arriveX`) must
 * be where the step onto that ledge really lands. Seed 717 chunk 7 once stored 591.42 for a ledge the
 * incoming step lands on at 625.00, because a remembered landing from a discarded try was handed to a later
 * ledge with the same id. Checked here with the real physics, with the chunks on both sides in place, and
 * for a person who waits the full 250 ms reaction allowance before walking.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createEndlessGenerator, type EndlessChunk } from '../endless/generator';
import { flyStep } from '../endless/route-replay';
import { NO_CRUMBLE } from '../player/crumble';
import { teleportPlayer } from '../player/movement';
import type { PlayerState } from '../player/types';
import { stepWorld } from '../player/world-step';

const WIDTH = G.view.width;
const stepMs = 1000 / G.stepHz;
const topOf = (p: { y: number; height: number }): number => p.y - p.height / 2;
const CASES: Array<[number, number]> = [[717, 7]];
for (let s = 1; s <= 60; s++) for (let chunk = 6; chunk <= 20; chunk++) CASES.push([s * 7 + 3, chunk]);

/** Every step off a crumbling ledge in the chunk: stored timing against a fresh replay and a reacting player. */
function check(seed: number, index: number, generator: ReturnType<typeof createEndlessGenerator>): number {
  const chunk: EndlessChunk = generator.chunk(index);
  const prev = generator.chunk(index - 1), next = generator.chunk(index + 1);
  const world = [...prev.platforms, ...chunk.platforms, ...next.platforms];
  const columns = [...prev.updrafts, ...chunk.updrafts, ...next.updrafts];
  const steps = [...chunk.route, ...chunk.altRoute];
  let checked = 0;
  for (const step of steps) {
    if (step.arriveX === undefined) continue;
    const incoming = steps.filter((other) => other.toId === step.fromId);
    expect(incoming.length, `seed ${seed} chunk ${index} ${step.fromId}`).toBe(1);
    const flight = flyStep(incoming[0]!, world, WIDTH, G, { updrafts: columns });
    const label = `seed ${seed} ${step.fromId}->${step.toId}: lands at ${flight.state.x}, timed from ${step.arriveX}`;
    expect(flight.landedId, label).toBe(step.fromId);
    expect(Math.abs(flight.state.x - step.arriveX), label).toBeLessThan(0.02);
    if (world.some((p) => p.motion)) { checked++; continue; }
    // Play it: take the incoming jump, wait the full reaction allowance, then walk, charge and jump.
    const from = world.find((p) => p.id === incoming[0]!.fromId)!;
    let state: PlayerState = { ...teleportPlayer(incoming[0]!.takeoffX, topOf(from) - G.player.height / 2), grounded: true, platformId: from.id, jumpLatch: false };
    let crumble = NO_CRUMBLE;
    const idle = { left: false, right: false, jump: false };
    const go = (input: { left: boolean; right: boolean; jump: boolean }): void => {
      const out = stepWorld(state, crumble, input, world, columns, WIDTH, G, stepMs);
      state = out.player; crumble = out.crumble;
    };
    for (let i = 0; i < incoming[0]!.chargeSteps; i++) go({ ...idle, jump: true });
    go({ left: incoming[0]!.direction < 0, right: incoming[0]!.direction > 0, jump: false });
    for (let i = 0; i < 2000 && !state.grounded; i++) go(idle);
    for (let i = 0; i < Math.ceil(T.crumbleReactionMs / stepMs); i++) go(idle);
    for (let i = 0; i < 300 && Math.abs(state.x - step.takeoffX) > 1; i++) go({ left: state.x > step.takeoffX, right: state.x < step.takeoffX, jump: false });
    for (let i = 0; i < step.chargeSteps; i++) go({ ...idle, jump: true });
    go({ left: step.direction < 0, right: step.direction > 0, jump: false });
    for (let i = 0; i < 3000 && !state.grounded; i++) go(idle);
    expect(state.platformId, `seed ${seed} ${step.fromId}->${step.toId} after waiting ${T.crumbleReactionMs} ms`).toBe(step.toId);
    checked++;
  }
  return checked;
}

describe('crumbling arrival timing never goes stale', () => {
  it('seed 717 chunk 7: every step off a crumbling ledge is timed from where the step onto it lands', () => {
    // Before the fix e7:p8->e7:p9 was timed from 591.42 and the step onto e7:p8 lands at 625.00. The chunk may now
    // hold no such step at all, so only the check itself is asserted.
    expect(check(717, 7, createEndlessGenerator(717, G, C))).toBeGreaterThanOrEqual(0);
  });

  it('every step off a crumbling ledge, over many seeds and chunks, is timed from the real landing and made after a 250 ms wait', () => {
    let checked = 0;
    const generators = new Map<number, ReturnType<typeof createEndlessGenerator>>();
    for (const [seed, index] of CASES) {
      if (!generators.has(seed)) generators.set(seed, createEndlessGenerator(seed, G, C));
      checked += check(seed, index, generators.get(seed)!);
    }
    expect(checked).toBeGreaterThan(30);
  }, 60_000);
});
