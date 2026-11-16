/** The candle's face: one mood at a time, short reactions that end, a seeded blink, and pixels that stay on the wax. */
import { describe, expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { bodyShape, INITIAL_POSE, type CandlePoseName } from '../candle/candle-pose';
import { rasterCandle } from '../candle/candle-raster';
import { EXPRESSION_TIMING as T, faceFor, idleGlance, INITIAL_EXPRESSION, isBlinking, stepExpression,
  type CandleMood, type ExpressionInput } from '../candle/expression';
import { facePixels } from '../candle/face';

const calm: ExpressionInput = { pose: 'idle', charge01: 0, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: false };
const step = (input: Partial<ExpressionInput>, events = {}, prev = INITIAL_EXPRESSION, dt = 16) =>
  stepExpression(prev, { ...calm, ...input }, events, dt, false);

describe('mood', () => {
  it('follows what the body is doing', () => {
    expect(step({}).mood).toBe('content');
    expect(step({ pose: 'charge', charge01: 0.5 }).mood).toBe('focused');
    expect(step({ pose: 'rise' }).mood).toBe('soaring');
    expect(step({ pose: 'fall', fall01: 0.8 }).mood).toBe('alarmed');
    expect(step({ pose: 'fall', fall01: 0.1 }).mood).toBe('content');
    expect(step({ fuel01: 0.2 }).mood).toBe('worried');
    expect(step({ lit: false, fuel01: 0 }).mood).toBe('fading');
  });

  it('a flame that is out beats everything, and a hard landing beats a pickup', () => {
    expect(step({ lit: false }, { wax: true, hardLanding: true }).mood).toBe('fading');
    expect(step({}, { wax: true, hardLanding: true }).mood).toBe('ouch');
    expect(step({ pose: 'charge' }, { wax: true }).mood).toBe('delighted');
    expect(step({ fuel01: 0.1 }, { newBest: true }).mood).toBe('proud');
  });

  it('reactions end after their time', () => {
    let tracker = step({}, { hardLanding: true });
    expect(tracker.mood).toBe('ouch');
    tracker = step({}, {}, tracker, T.ouchMs + 1);
    expect(tracker.mood).toBe('content');
    tracker = step({}, { wax: true }, tracker);
    tracker = step({}, {}, tracker, T.delightMs - 20);
    expect(tracker.mood).toBe('delighted');
    expect(step({}, {}, tracker, 40).mood).toBe('content');
  });

  it('gets sleepy only after standing still for a long time, and wakes on any move', () => {
    let tracker = step({}, {}, INITIAL_EXPRESSION, T.sleepyAfterMs - 10);
    expect(tracker.mood).toBe('content');
    tracker = step({}, {}, tracker, 20);
    expect(tracker.mood).toBe('sleepy');
    expect(step({ pose: 'run' }, {}, tracker).mood).toBe('content');
  });

  it('pausing freezes every clock', () => {
    const before = step({}, { wax: true });
    const after = stepExpression(before, calm, {}, 5000, true);
    expect(after).toEqual(before);
  });
});

describe('blink and glance', () => {
  it('are seeded, brief and never happen under reduced motion', () => {
    let blinking = 0, glancing = 0;
    for (let ms = 0; ms < 120_000; ms += 10) {
      expect(isBlinking(7, ms)).toBe(isBlinking(7, ms));
      if (isBlinking(7, ms)) blinking++;
      if (idleGlance(7, ms) !== 0) glancing++;
    }
    // Eyes are shut a few percent of the time, and a glance takes well under half of it.
    expect(blinking / 12_000).toBeGreaterThan(0.02);
    expect(blinking / 12_000).toBeLessThan(0.12);
    expect(glancing / 12_000).toBeGreaterThan(0.05);
    expect(glancing / 12_000).toBeLessThan(0.4);
    for (let ms = 0; ms < 20_000; ms += 10) {
      const face = faceFor({ ...INITIAL_EXPRESSION, clockMs: ms }, { ...calm, reducedMotion: true }, 7);
      expect(face.eyes).toBe('open');
      expect(face.gazeX).toBe(0);
    }
  });

  it('two candles do not blink in step', () => {
    const pattern = (seed: number): string => Array.from({ length: 400 }, (_, i) => (isBlinking(seed, i * 50) ? '1' : '0')).join('');
    expect(pattern(1)).not.toBe(pattern(2));
  });
});

describe('face', () => {
  const MOODS: CandleMood[] = ['content', 'focused', 'soaring', 'alarmed', 'ouch', 'delighted', 'proud', 'worried', 'sleepy', 'fading'];
  const POSES: CandlePoseName[] = ['idle', 'run', 'charge', 'rise', 'fall', 'land'];

  it('each mood has its own look', () => {
    const looks = new Set(MOODS.map((mood) => {
      const face = faceFor({ ...INITIAL_EXPRESSION, mood, clockMs: 1 }, { ...calm, charge01: 1, fall01: 1, reducedMotion: true }, 3);
      return `${face.eyes}|${face.mouth}|${face.gazeY}|${face.blush}|${face.sweat}`;
    }));
    expect(looks.size).toBe(MOODS.length);
  });

  it('turns toward where it is going only when running or aiming', () => {
    const face = (input: Partial<ExpressionInput>) => faceFor(INITIAL_EXPRESSION, { ...calm, ...input, reducedMotion: true }, 3);
    expect(face({}).turned).toBe(false);
    expect(face({ pose: 'run' }).turned).toBe(true);
    expect(face({ pose: 'charge', aim: 1 }).turned).toBe(true);
    expect(face({ pose: 'charge', aim: 0 }).turned).toBe(false);
  });

  it('every face pixel sits on the wax, for every seed, mood, pose and gaze', () => {
    for (let seed = 0; seed < 60; seed++) {
      const genome = createCandleGenome(seed * 31 + 1);
      for (const mood of MOODS) for (const pose of POSES) for (const gazeX of [-1, 0, 1] as const) {
        const shape = bodyShape({ ...INITIAL_POSE, pose }, 1);
        const face = { ...faceFor({ ...INITIAL_EXPRESSION, mood }, { ...calm, pose, charge01: 1, fall01: 1, reducedMotion: true }, genome.seed), gazeX };
        for (const facingLeft of [false, true]) {
          const plain = rasterCandle(genome, shape, 1, facingLeft);
          const faced = rasterCandle(genome, shape, 1, facingLeft, { face });
          // A face recolours wax; it never adds or removes a cell, so the silhouette is unchanged.
          const cells = (pixels: { x: number; y: number }[]) => pixels.map((p) => `${p.x},${p.y}`).sort();
          expect(cells(faced.pixels)).toEqual(cells(plain.pixels));
          expect(faced.wickTip).toEqual(plain.wickTip);
        }
      }
    }
  });

  it('draws eyes in the candle\'s own eye colour, and nothing on a body too squashed to hold a face', () => {
    const genome = createCandleGenome(9);
    const face = faceFor(INITIAL_EXPRESSION, { ...calm, reducedMotion: true }, genome.seed);
    const box = { x0: -4, width: genome.width, topY: -genome.height, height: genome.height };
    const pixels = facePixels(genome, face, box);
    expect(pixels.filter((p) => p.color === genome.face.eyeColor).length).toBeGreaterThanOrEqual(4);
    expect(facePixels(genome, face, { ...box, height: 7 })).toEqual([]);
    expect(facePixels(genome, face, { ...box, width: 5 })).toEqual([]);
  });

  it('a faced candle still mirrors exactly when it faces left', () => {
    const genome = createCandleGenome(5);
    const face = faceFor(INITIAL_EXPRESSION, { ...calm, pose: 'run', reducedMotion: true }, genome.seed);
    const shape = bodyShape(INITIAL_POSE, 0);
    const right = rasterCandle(genome, shape, 1, false, { face, glow01: 0.7 }).pixels.map((p) => `${-p.x - 1},${p.y},${p.color}`).sort();
    const left = rasterCandle(genome, shape, 1, true, { face, glow01: 0.7 }).pixels.map((p) => `${p.x},${p.y},${p.color}`).sort();
    expect(left).toEqual(right);
  });
});
