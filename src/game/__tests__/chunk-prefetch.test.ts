/**
 * Building chunks ahead of need (chunk-stream.ts `prefetch`) and the per-chunk work bound (endless-pieces
 * config `pieceWorkSteps`): at most one chunk's work per frame, and a chunk is the same however and whenever
 * it is built (QA item 7: stutter when chunks were generated during a long fall).
 */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessGenerator } from '../endless/generator';

describe('building chunks ahead of need', () => {
  it('builds at most one chunk per call, none in a frame whose update already built one, and below first while falling', () => {
    const generator = createEndlessGenerator(7, G, C);
    const built: number[] = [];
    const counting = { ...generator, chunk: (index: number) => { if (!generator.isBuilt(index)) built.push(index); return generator.chunk(index); } };
    const stream = createChunkStream(counting, C);
    const feet = generator.floorTopPx(10) - 100;
    stream.update(feet);
    built.length = 0;
    // The update just built the window: this frame's prefetch does nothing.
    expect(stream.prefetch(feet, 500)).toBeNull();
    const first = stream.prefetch(feet, 500);
    expect(first).toBe(10 - C.keepBelow - 1);
    expect(built).toEqual([first]);
    for (let i = 0; i < 20; i++) stream.prefetch(feet, 500);
    // Everything near is built: the prefetched chunks below and the one above, nothing else.
    expect(built.length).toBe(C.prefetchBelow + 1);
  });

  it('a chunk is the same whether it was prefetched, built in order or built alone, and the work bound is a count', () => {
    for (const seed of [3, 780, 829]) {
      const ahead = createEndlessGenerator(seed, G, C);
      const stream = createChunkStream(ahead, C);
      stream.update(ahead.floorTopPx(20) - 100);
      for (let i = 0; i < 10; i++) stream.prefetch(ahead.floorTopPx(20) - 100, 900);
      for (const index of [15, 16, 17, 18, 21]) {
        expect(ahead.isBuilt(index)).toBe(true);
        expect(createEndlessGenerator(seed, G, C).chunk(index)).toEqual(ahead.chunk(index));
      }
    }
  });
});
