/**
 * A wall step lands when the takeoff and the press are both a little off (Decision D-37, QA finding 1 of the wall
 * prototype). The generator proves every stored wall step from shifted takeoffs pressed on time, from the stored
 * takeoff pressed early or late, and from the cross of the two (endless-pieces.config.ts `walls.crossShiftPx`,
 * `crossOffsetSteps`). This test builds that grid itself, from the config's numbers, without the replay's own
 * variant list, and replays every stored wall step of a sweep of seeds with the neighbouring chunks loaded.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { ENDLESS_PIECES_CONFIG as T } from '../../config/endless-pieces.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createEndlessGenerator } from '../endless/generator';
import { replayStep } from '../endless/route-replay';

/** Every multiple of `spacing` in [-range, range] (0 included). */
const grid = (range: number, spacing: number): number[] => {
  const out: number[] = [];
  for (let k = -Math.floor(range / spacing + 1e-9); k * spacing <= range + 1e-9; k++) out.push(k * spacing);
  return out;
};

describe('wall steps under combined errors', () => {
  it('every stored wall step lands from every promised takeoff shift and press offset, alone and together', () => {
    const variants: Array<[number, number]> = [];
    for (const shift of grid(T.takeoffTolerancePx, T.takeoffSamplePx)) variants.push([shift, 0]);
    for (const offset of grid(T.walls.kickTimingSteps, 1)) variants.push([0, offset]);
    for (const shift of grid(T.takeoffTolerancePx, T.walls.crossShiftPx)) {
      for (const offset of grid(T.walls.kickTimingSteps, T.walls.crossOffsetSteps)) variants.push([shift, offset]);
    }
    // The grid reaches the middle of the press window, not only its ends.
    expect(variants.some(([shift, offset]) => shift !== 0 && Math.abs(offset) === 2)).toBe(true);
    let steps = 0;
    const misses: string[] = [];
    for (let s = 1; s <= 24; s++) {
      const seed = s * 7919 + 13;
      const generator = createEndlessGenerator(seed, G, C, undefined, undefined, { walls: true });
      for (let index = 1; index <= 12; index++) {
        const chunk = generator.chunk(index);
        const wallSteps = [...chunk.route, ...chunk.altRoute].filter((step) => step.kicks);
        if (!wallSteps.length) continue;
        const prev = generator.chunk(index - 1), next = generator.chunk(index + 1);
        const world = [...prev.platforms, ...chunk.platforms, ...next.platforms];
        const updrafts = [...prev.updrafts, ...chunk.updrafts, ...next.updrafts];
        for (const step of wallSteps) {
          steps++;
          for (const [shift, offset] of variants) {
            const landed = replayStep(step, world, G.view.width, G, shift, true, updrafts, offset);
            if (landed !== step.toId) misses.push(`seed ${seed} chunk ${index} ${step.fromId}->${step.toId} shift ${shift} press ${offset}: ${landed}`);
          }
        }
      }
    }
    expect(steps).toBeGreaterThan(60);
    expect(misses).toEqual([]);
  }, 180_000);
});
