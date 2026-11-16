/** The detailed close-up keeps every rule of the earlier portrait and shows the hero's face and squash. */
import { describe, expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { bodyShape, INITIAL_POSE } from '../candle/candle-pose';
import { CLOSE_UP_RADIUS, rasterCloseUp } from '../candle/close-up';
import { faceFor, INITIAL_EXPRESSION, type CandleMood, type ExpressionInput } from '../candle/expression';

const genome = createCandleGenome(40);
const calm: ExpressionInput = { pose: 'idle', charge01: 0, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: true };
const faceOf = (mood: CandleMood) => faceFor({ ...INITIAL_EXPRESSION, mood }, { ...calm, charge01: 1, fall01: 1 }, genome.seed);
const closeUp = (strength01: number, timeMs = 0, reducedMotion = false, extra: object = {}) =>
  rasterCloseUp(genome, { strength01, timeMs, reducedMotion, growth: 1, ...extra });
const MOODS: CandleMood[] = ['content', 'focused', 'soaring', 'alarmed', 'ouch', 'relieved', 'delighted', 'proud', 'worried', 'sleepy', 'fading'];
const brightness = (color: number) => ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255);

describe('candle close-up', () => {
  it('everything stays inside the circle, for every mood, pose and seed', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = createCandleGenome(seed * 97);
      for (const mood of MOODS) for (const pose of ['idle', 'charge', 'rise', 'land'] as const) {
        const picture = rasterCloseUp(g, { strength01: 0.9, timeMs: 444, reducedMotion: false, growth: 1.06,
          shape: bodyShape({ ...INITIAL_POSE, pose, impact01: 1 }, 1), face: faceOf(mood) });
        // One check per picture, not per pixel: there are over a million pixels in this sweep.
        expect(picture.pixels.every((p) => p.x * p.x + p.y * p.y < CLOSE_UP_RADIUS * CLOSE_UP_RADIUS)).toBe(true);
        const cells = new Set(picture.pixels.map((p) => `${p.x},${p.y}`));
        expect(cells.size).toBe(picture.pixels.length);
      }
    }
  });

  it('is much more detailed than the hero: hundreds of pixels and many tones', () => {
    const picture = closeUp(0.8, 0, true, { face: faceOf('content') });
    expect(picture.pixels.length).toBeGreaterThan(600);
    expect(new Set(picture.pixels.map((p) => p.color)).size).toBeGreaterThan(14);
  });

  it('every mood draws a different face', () => {
    const pictures = new Set(MOODS.map((mood) => JSON.stringify(closeUp(0.8, 0, true, { face: faceOf(mood) }).pixels)));
    expect(pictures.size).toBe(MOODS.length);
    expect(JSON.stringify(closeUp(0.8, 0, true).pixels)).not.toBe(JSON.stringify(closeUp(0.8, 0, true, { face: faceOf('content') }).pixels));
  });

  it('a strong candle glows more and has a bigger flame; the wax dims as the light fades', () => {
    const strong = closeUp(1, 0, true), weak = closeUp(0.35, 0, true);
    expect(strong.glow01).toBeGreaterThan(weak.glow01);
    const above = (p: ReturnType<typeof closeUp>) => p.pixels.filter((x) => x.y < -12).length;
    expect(above(strong)).toBeGreaterThan(above(weak));
    const wax = (p: ReturnType<typeof closeUp>) => p.pixels.filter((x) => x.y === 20).reduce((sum, x) => sum + brightness(x.color), 0);
    expect(wax(strong)).toBeGreaterThan(wax(closeUp(0.1, 0, true)));
  });

  it('smokes when weak, gutters near death, burns blue at the last, and is still under reduced motion', () => {
    const smoke = (p: ReturnType<typeof closeUp>) => p.pixels.filter((x) => x.color === 0x8a8f99).length;
    const most = (s: number) => Math.max(...Array.from({ length: 20 }, (_, i) => smoke(closeUp(s, i * 137))));
    expect(most(0.4)).toBeGreaterThan(0);
    expect(most(0.53)).toBe(0);
    expect(most(0.05)).toBeGreaterThan(most(0.4));
    const frames = Array.from({ length: 60 }, (_, f) => closeUp(0.05, (f * 1000) / 12));
    expect(frames.some((p) => p.guttered)).toBe(true);
    expect(frames.find((p) => p.guttered)!.pixels.some((p) => p.color === 0xff4a1f)).toBe(true);
    const blue = new Set<number>([0xe6f1ff, 0x9cc4ff, 0x5a8ae8]);
    expect(frames.find((p) => !p.guttered)!.pixels.some((p) => blue.has(p.color))).toBe(true);
    expect(closeUp(0.8, 0).pixels.some((p) => blue.has(p.color))).toBe(false);
    expect(closeUp(0.05, 0, true)).toEqual(closeUp(0.05, 5000, true));
    expect(smoke(closeUp(0.05, 1234, true))).toBe(0);
  });

  it('copies the hero\'s squash and stretch: a charge sits lower, a launch stands taller', () => {
    const topOfWax = (shape: { dWidth: number; dHeight: number; lean: number; lift: number }) => {
      const picture = closeUp(1, 0, true, { shape });
      // The outline colour marks the top edge of the body on the centre column's neighbour.
      return Math.min(...picture.pixels.filter((p) => p.color === 0x241c24).map((p) => p.y));
    };
    const resting = topOfWax({ dWidth: 0, dHeight: 0, lean: 0, lift: 0 });
    expect(topOfWax({ dWidth: 1, dHeight: -3, lean: 0, lift: 0 })).toBeGreaterThan(resting);
    expect(topOfWax({ dWidth: -1, dHeight: 2, lean: 0, lift: 0 })).toBeLessThan(resting);
  });
});

it('the close-up flame leaps, ducks and gathers with the hero flame', () => {
  const flameTop = (flame: object) => Math.min(...closeUp(0.7, 0, true, { flame }).pixels.map((p) => p.y));
  const resting = flameTop({});
  expect(flameTop({ flare01: 1 })).toBeLessThan(resting);
  expect(flameTop({ duck01: 1 })).toBeGreaterThan(resting);
  expect(flameTop({ gather01: 1 })).toBeLessThan(resting);
});

describe('the spent candle on the end screen', () => {
  it('is the same candle, cold and tired, with a glowing or guttering wick and no steady flame', async () => {
    const { spentCandle } = await import('../candle/run-candle');
    const spent = spentCandle(genome, 0, true);
    const lit = closeUp(0.9, 0, true, { face: faceOf('content') });
    expect(spent.glow01).toBeLessThan(lit.glow01);
    expect(spent.pixels.length).toBeLessThan(lit.pixels.length);
    expect(spent.pixels.every((p) => p.x * p.x + p.y * p.y < CLOSE_UP_RADIUS * CLOSE_UP_RADIUS)).toBe(true);
    // Still under reduced motion; smoking and changing otherwise.
    expect(spentCandle(genome, 0, true)).toEqual(spentCandle(genome, 4000, true));
    const frames = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(spentCandle(genome, i * 200, false).pixels)));
    expect(frames.size).toBeGreaterThan(1);
  });
});
