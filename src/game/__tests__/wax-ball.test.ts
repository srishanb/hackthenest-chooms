/** The compass's flaming wax ball: round, inside its box, and its flame shows whether an ember is placed. */
import { expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { BALL_H, BALL_W, waxBallPixels } from '../candle/wax-ball';

const genome = createCandleGenome(40);
const flameRows = (lit: boolean) => {
  const pixels = waxBallPixels(genome, 0, lit, true);
  const wax = new Set([genome.wax.base, genome.wax.light, genome.wax.shade, 0x241c24]);
  return new Set(pixels.filter((p) => !wax.has(p.color)).map((p) => p.y)).size;
};

it('stays inside its box for any candle and moment', () => {
  const stray: string[] = [];
  for (let seed = 0; seed < 20; seed++) {
    const g = createCandleGenome(seed * 101 + 7);
    for (const lit of [true, false]) {
      for (let t = 0; t < 2000; t += 83) {
        // One check per picture, not per pixel: thousands of `expect` calls made this the slowest game test.
        const outside = waxBallPixels(g, t, lit, false).filter((p) => p.x < 0 || p.x >= BALL_W || p.y < 0 || p.y >= BALL_H);
        if (outside.length > 0) stray.push(`seed ${seed * 101 + 7}, lit ${lit}, ${t} ms: ${JSON.stringify(outside[0])}`);
      }
    }
  }
  expect(stray).toEqual([]);
});

it('burns tall with an ember placed and low without one', () => {
  expect(flameRows(true)).toBeGreaterThan(flameRows(false) + 3);
});

it('uses the candle\'s own wax colours', () => {
  const colors = new Set(waxBallPixels(genome, 0, true, true).map((p) => p.color));
  expect(colors.has(genome.wax.base)).toBe(true);
});
