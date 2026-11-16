/** Body language beyond the face: landings that squash by impact, a flame that reacts, emotes, smoke and cooling wax. */
import { describe, expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { bodyShape, INITIAL_POSE, landingImpact, stepPose, type PoseInput } from '../candle/candle-pose';
import { rasterCandle } from '../candle/candle-raster';
import { emotePixels } from '../candle/emotes';
import type { CandleMood } from '../candle/expression';
import { rasterFlame, wickSmoke } from '../candle/flame';

const genome = createCandleGenome(21);
const still: PoseInput = { vx: 0, vy: 0, grounded: true, charging: false };

describe('landing impact', () => {
  it('is 0 for a soft step, 1 for a long fall, and safe on bad input', () => {
    expect(landingImpact(100)).toBe(0);
    expect(landingImpact(2000)).toBe(1);
    expect(landingImpact(575)).toBeCloseTo(0.5);
    expect(landingImpact(Number.NaN)).toBe(0);
  });

  it('a harder landing squashes the body more, and every landing springs back', () => {
    const land = (vy: number) => stepPose(stepPose({ ...INITIAL_POSE, wasGrounded: true }, { ...still, grounded: false, vy }, 16, false), still, 16, false);
    const soft = land(200), hard = land(1200);
    expect(soft.pose).toBe('land');
    expect(bodyShape(hard, 0).dHeight).toBeLessThan(bodyShape(soft, 0).dHeight);
    expect(bodyShape(hard, 0).dWidth).toBeGreaterThan(bodyShape(soft, 0).dWidth);
    expect(bodyShape({ ...hard, elapsedMs: 5000 }, 0)).toEqual({ dWidth: 0, dHeight: 0, lean: 0, lift: 0 });
  });

  it('a launch stretches hardest in its first moments', () => {
    const rise = { ...INITIAL_POSE, pose: 'rise' as const };
    expect(bodyShape({ ...rise, elapsedMs: 10 }, 0).dHeight).toBeGreaterThan(bodyShape({ ...rise, elapsedMs: 400 }, 0).dHeight);
  });
});

describe('flame reactions', () => {
  const flame = (extra: object) => rasterFlame(genome, { size01: 0.6, timeMs: 0, reducedMotion: true, lean: 0, ...extra });
  const height = (pixels: { y: number }[]) => -Math.min(...pixels.map((p) => p.y));
  const width = (pixels: { x: number }[]) => Math.max(...pixels.map((p) => p.x)) - Math.min(...pixels.map((p) => p.x));

  it('leaps on a flare, is pressed flat by a jolt, and gathers thin and tall on a charge', () => {
    const base = flame({});
    expect(height(flame({ flare01: 1 }))).toBeGreaterThan(height(base));
    expect(height(flame({ duck01: 1 }))).toBeLessThan(height(base));
    expect(width(flame({ duck01: 1 }))).toBeGreaterThanOrEqual(width(base));
    expect(height(flame({ gather01: 1 }))).toBeGreaterThan(height(base));
    expect(width(flame({ gather01: 1 }))).toBeLessThanOrEqual(width(base));
  });

  it('never loses its base row, however hard it is pressed', () => {
    for (const size01 of [0, 0.5, 1]) {
      const pixels = rasterFlame(genome, { size01, timeMs: 0, reducedMotion: true, lean: 0, duck01: 1 });
      expect(Math.max(...pixels.map((p) => p.y))).toBe(-1);
      expect(height(pixels)).toBeGreaterThanOrEqual(2);
    }
  });

  it('ignores out-of-range reaction values', () => {
    expect(flame({ flare01: 9, duck01: -3, gather01: Number.NaN })).toEqual(flame({ flare01: 1, duck01: 0, gather01: 0 }));
  });
});

describe('a dead wick and cold wax', () => {
  it('smoke rises above the wick, drifts over time and is still under reduced motion', () => {
    const smoke = wickSmoke(genome, 1000, false);
    expect(smoke.length).toBeGreaterThan(0);
    expect(smoke.every((p) => p.y < 0)).toBe(true);
    expect(wickSmoke(genome, 1000, false)).not.toEqual(wickSmoke(genome, 1700, false));
    expect(wickSmoke(genome, 0, true)).toEqual(wickSmoke(genome, 9999, true));
  });

  it('cold wax is darker than warm wax and keeps the same shape', () => {
    const shape = bodyShape(INITIAL_POSE, 0);
    const warm = rasterCandle(genome, shape, 1, false, { warmth01: 1 });
    const cold = rasterCandle(genome, shape, 1, false, { warmth01: 0 });
    const brightness = (pixels: { color: number }[]) => pixels.reduce((sum, p) => sum + (p.color >> 16) + ((p.color >> 8) & 0xff) + (p.color & 0xff), 0);
    expect(brightness(cold.pixels)).toBeLessThan(brightness(warm.pixels));
    expect(cold.pixels.map((p) => `${p.x},${p.y}`)).toEqual(warm.pixels.map((p) => `${p.x},${p.y}`));
  });
});

describe('emotes', () => {
  const LOUD: CandleMood[] = ['delighted', 'relieved', 'proud', 'alarmed', 'ouch', 'worried', 'sleepy'];
  const QUIET: CandleMood[] = ['content', 'focused', 'soaring', 'fading'];

  it('strong moments get a sign; everyday moods do not', () => {
    for (const mood of LOUD) expect(emotePixels(mood, 300, false).length, mood).toBeGreaterThan(0);
    for (const mood of QUIET) expect(emotePixels(mood, 300, false), mood).toEqual([]);
  });

  it('stays in a small box beside the flame', () => {
    for (const mood of LOUD) for (let ms = 0; ms < 6000; ms += 40) {
      for (const p of emotePixels(mood, ms, false)) {
        expect(Math.abs(p.x)).toBeLessThanOrEqual(14);
        expect(p.y).toBeGreaterThanOrEqual(-16);
        expect(p.y).toBeLessThanOrEqual(8);
      }
    }
  });

  it('is one still picture under reduced motion', () => {
    for (const mood of LOUD) expect(emotePixels(mood, 100, true)).toEqual(emotePixels(mood, 4000, true));
  });
});

describe('wax droplets from a landing', () => {
  it('a soft step sheds none, a hard landing sheds several, and they are gone in under half a second', async () => {
    const { DROPLET_MS, landingDroplets } = await import('../candle/emotes');
    const drops = (ms: number, impact: number, reduced = false) => landingDroplets(77, ms, impact, 5, 15, 0xffffff, reduced);
    expect(drops(60, 0.1)).toEqual([]);
    expect(drops(60, 1).length).toBeGreaterThanOrEqual(3);
    expect(drops(60, 1).length).toBeLessThanOrEqual(4);
    expect(drops(DROPLET_MS, 1)).toEqual([]);
    expect(drops(60, 1, true)).toEqual([]);
    // They fly outward from both shoulders and never sink below the ground line.
    for (let ms = 0; ms < DROPLET_MS; ms += 20) for (const p of drops(ms, 1)) expect(p.y).toBeLessThanOrEqual(0);
    const early = drops(40, 1), later = drops(200, 1);
    expect(Math.max(...later.map((p) => Math.abs(p.x)))).toBeGreaterThan(Math.max(...early.map((p) => Math.abs(p.x))));
    expect(drops(120, 1)).toEqual(drops(120, 1));
  });
});

describe('the last moment of a run', () => {
  it('the candle slumps a little as it is spent, and not at all before', async () => {
    const { slumpShape } = await import('../candle/candle-pose');
    const rest = { dWidth: 0, dHeight: 0, lean: 1, lift: 1 };
    expect(slumpShape(rest, 0)).toBe(rest);
    expect(slumpShape(rest, 1)).toEqual({ dWidth: 1, dHeight: -2, lean: 1, lift: 0 });
    expect(slumpShape(rest, 0.4).dHeight).toBe(-1);
    expect(slumpShape(rest, Number.NaN)).toBe(rest);
    expect(slumpShape(rest, 7)).toEqual(slumpShape(rest, 1));
  });

  it('its eyes close once the wick has gone cold', async () => {
    const { faceFor, INITIAL_EXPRESSION } = await import('../candle/expression');
    const input = { pose: 'idle' as const, charge01: 0, fall01: 0, aim: 0 as const, facingLeft: false, fuel01: 0, lit: false, reducedMotion: true };
    const fading = { ...INITIAL_EXPRESSION, mood: 'fading' as const };
    expect(faceFor(fading, input, 3).eyes).toBe('half');
    expect(faceFor(fading, { ...input, spent: true }, 3).eyes).toBe('closed');
  });
});
