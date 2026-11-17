/**
 * Long falls in the endless climb (Decision D-33): with no full-width landings above the ground, a
 * missed jump falls until it lands on some ledge below or on the ground. These tests drop the candle
 * with the real `stepPlayer` and the real chunk stream, updated after every step as the scene does,
 * and check the same fall against the full, unstreamed list of ledges: if the stream ever failed to
 * load a ledge in time, the two falls would land in different places.
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import type { PlatformData } from '../../shared/contracts/content';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessGenerator, type EndlessGenerator } from '../endless/generator';
import { stepPlayer, teleportPlayer } from '../player/movement';
import type { PlayerInput, PlayerState } from '../player/types';
import { platformsAt } from '../world/environment';

const STEP_MS = 1000 / G.stepHz;
const IDLE: PlayerInput = { left: false, right: false, jump: false };
const feetOf = (state: PlayerState): number => state.y + G.player.height / 2;
/** How far the body may fall before the next update, exactly as the scene passes it. */
const fallAhead = (state: PlayerState): number => 2 * Math.max(0, state.vy + G.gravityY / G.stepHz) / G.stepHz;

interface Fall { landedOn: string | null; steps: number; dropPx: number; mostChunks: number }

/** Step a body from `start` with `input` held until it has been standing still for a moment. */
function fall(start: PlayerState, input: PlayerInput, source: (state: PlayerState) => readonly PlatformData[],
  onStep: (state: PlayerState) => number = () => 0): Fall {
  let state = start;
  let mostChunks = 0;
  let leftGround = false;
  for (let step = 0; step < 60_000; step++) {
    const time = step * STEP_MS;
    state = stepPlayer(state, input, platformsAt(source(state), time, STEP_MS), G.view.width, G, STEP_MS).state;
    mostChunks = Math.max(mostChunks, onStep(state));
    if (!state.grounded) leftGround = true;
    if (leftGround && state.grounded) return { landedOn: state.platformId, steps: step, dropPx: feetOf(state) - feetOf(start), mostChunks };
  }
  return { landedOn: null, steps: -1, dropPx: 0, mostChunks };
}

/** Every ledge of chunks 0..top+1, with no streaming at all. */
const everything = (generator: EndlessGenerator, top: number): PlatformData[] =>
  [...Array.from({ length: top + 1 }, (_, i) => generator.chunk(i).platforms).flat(), generator.floor(top + 1)];

describe('long falls through the streamed climb', () => {
  it('a candle that walks off a high anchor lands where it would with every ledge loaded, and the window stays small', () => {
    let longest = 0;
    let falls = 0;
    let ground = 0;
    for (const seed of [3, 42, 1234, 98765, 209, 379]) {
      for (const startChunk of [1, 2, 4, 7, 11]) {
        for (const direction of [-1, 1] as const) {
          const generator = createEndlessGenerator(seed, G, C);
          const anchor = generator.floor(startChunk);
          // An anchor against a wall has no edge to walk off on that side.
          const edge = direction < 0 ? anchor.x - anchor.width / 2 : G.view.width - (anchor.x + anchor.width / 2);
          if (edge < G.player.width) continue;
          const start = { ...teleportPlayer(anchor.x, anchor.y - anchor.height / 2 - G.player.height / 2), grounded: true, platformId: anchor.id };
          const input = { ...IDLE, left: direction < 0, right: direction > 0 };
          const stream = createChunkStream(generator, C);
          stream.update(feetOf(start));
          const streamed = fall(start, input, () => stream.platforms(), (state) => {
            stream.update(feetOf(state), fallAhead(state));
            return stream.chunks().length;
          });
          const full = everything(generator, startChunk + C.keepAbove);
          const reference = fall(start, input, () => full);
          expect(streamed.landedOn, `seed ${seed} chunk ${startChunk} dir ${direction}`).not.toBeNull();
          expect(streamed).toMatchObject({ landedOn: reference.landedOn, steps: reference.steps, dropPx: reference.dropPx });
          // Bounded cost: the window never grows past the player's chunk and its neighbours.
          expect(streamed.mostChunks).toBeLessThanOrEqual(C.keepBelow + C.keepAbove + 1);
          longest = Math.max(longest, streamed.dropPx);
          // Only a fall that started two or more chunks up shows the ground can catch a long fall.
          if (streamed.landedOn === 'e0:floor' && startChunk >= 2) ground++;
          falls++;
        }
      }
    }
    expect(falls).toBeGreaterThanOrEqual(18);
    // A slip can cost more than two whole chunks. (Before set pieces, D-35, one of these falls passed
    // through about nine; traverses and pillar rows now catch more falls: measured longest 2.6 chunks.)
    // The stricter guard against a cap on every fall is the straight-drop test below (more than 3 chunks).
    expect(longest).toBeGreaterThan(2 * C.chunkHeightPx);
    // The ground still catches a fall that began two or more chunks up (seeds 209 and 379 from chunk 2;
    // measured over 78 walk-offs from chunk 2 with 40 other seeds: 2 reach the ground, none from chunk 3 or up).
    expect(ground).toBeGreaterThan(0);
  });

  it('a candle dropped from high up at many places falls as far as it must, sometimes through more than three chunks', () => {
    let longest = 0;
    for (const seed of [42, 7, 98765]) {
      const generator = createEndlessGenerator(seed, G, C);
      const top = 6;
      const full = everything(generator, top + C.keepAbove);
      // Drop from above the top chunk's anchor, at many places across the screen.
      for (let x = 14; x < G.view.width - 14; x += 9) {
        const start = teleportPlayer(x, C.baseFloorTopPx - top * C.chunkHeightPx - 200);
        const stream = createChunkStream(generator, C);
        stream.update(feetOf(start));
        const streamed = fall(start, IDLE, () => stream.platforms(), (state) => {
          stream.update(feetOf(state), fallAhead(state));
          return stream.chunks().length;
        });
        const reference = fall(start, IDLE, () => full);
        // Every drop lands somewhere (a ledge or the ground): nothing falls out of the world.
        expect(streamed.landedOn, `seed ${seed} x ${x}`).not.toBeNull();
        expect(streamed.landedOn, `seed ${seed} x ${x}`).toBe(reference.landedOn);
        expect(streamed.steps).toBe(reference.steps);
        expect(streamed.mostChunks).toBeLessThanOrEqual(C.keepBelow + C.keepAbove + 1);
        longest = Math.max(longest, streamed.dropPx);
      }
    }
    // Some straight drops pass through more than three whole chunks: a fall is not bounded. Measured on
    // these seeds from chunk 6: the longest is 3.9 chunks (20 other seeds: 2.6 to 3.9), so a safety net
    // that caps every fall near two chunks fails here.
    expect(longest).toBeGreaterThan(3 * C.chunkHeightPx);
  });

  it('loads every chunk that a very fast fall can reach before the next update', () => {
    const generator = createEndlessGenerator(7, G, C);
    const stream = createChunkStream(generator, C);
    // A body that may move three chunks before the next update: the window reaches down to there.
    const feet = C.baseFloorTopPx - 12 * C.chunkHeightPx;
    stream.update(feet, 3 * C.chunkHeightPx);
    const loaded = new Set(stream.chunks().map((chunk) => chunk.index));
    for (let index = 9; index <= 13; index++) expect(loaded.has(index)).toBe(true);
  });
});
