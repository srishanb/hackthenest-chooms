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
  for (let seed = 0; seed < 20; seed++) {
    const g = createCandleGenome(seed * 101 + 7);
    for (const lit of [true, false]) {
      for (let t = 0; t < 2000; t += 83) {
        for (const p of waxBallPixels(g, t, lit, false)) {
          expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThan(BALL_W);
          expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThan(BALL_H);
        }
      }
    }
  }
});

it('burns tall with an ember placed and low without one', () => {
  expect(flameRows(true)).toBeGreaterThan(flameRows(false) + 3);
});

it('uses the candle\'s own wax colours', () => {
  const colors = new Set(waxBallPixels(genome, 0, true, true).map((p) => p.color));
  expect(colors.has(genome.wax.base)).toBe(true);
});
