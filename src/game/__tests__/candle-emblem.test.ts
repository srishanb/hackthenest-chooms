/** The menu emblem loops: waiting, gathering into a charge, a real hop, a landing and a pleased moment. */
import { expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { EMBLEM_H, EMBLEM_LOOP_MS, EMBLEM_W, emblemMoment, emblemPixels } from '../candle/emblem';

it('breathes, then charges with a growing flare, then springs up and settles', () => {
  expect(emblemMoment(500)).toMatchObject({ charge01: 0, flare01: 0, tracker: { pose: 'idle' } });
  const early = emblemMoment(2100);
  const late = emblemMoment(2800);
  expect(early.tracker.pose).toBe('charge');
  expect(late.charge01).toBeGreaterThan(early.charge01);
  expect(late.flare01).toBeGreaterThan(early.flare01);
  expect(emblemMoment(3000).tracker.pose).toBe('rise');
  expect(emblemMoment(EMBLEM_LOOP_MS + 500)).toEqual(emblemMoment(500));
});

it('really hops: off the ground only in the air, highest in the middle, then lands and looks pleased', () => {
  expect(emblemMoment(1000).lift).toBe(0);
  expect(emblemMoment(2500).lift).toBe(0);
  const lifts = [2950, 3140, 3330].map((t) => emblemMoment(t).lift);
  expect(lifts[1]).toBeGreaterThan(lifts[0]!);
  expect(lifts[1]).toBeGreaterThan(lifts[2]!);
  expect(emblemMoment(3300).tracker.pose).toBe('fall');
  expect(emblemMoment(3400)).toMatchObject({ lift: 0, mood: 'delighted', tracker: { pose: 'land' } });
  expect(emblemMoment(4000)).toMatchObject({ lift: 0, mood: 'delighted', tracker: { pose: 'idle' } });
  expect(emblemMoment(5000).mood).toBe('content');
});

it('never draws outside its box, for any candle at any moment of the loop', () => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let seed = 0; seed < 20; seed++) {
    const genome = createCandleGenome(seed * 7919 + 3);
    for (let t = 0; t < EMBLEM_LOOP_MS; t += 40) {
      for (const p of emblemPixels(genome, t, false)) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
  }
  // One check for the whole sweep: asserting per pixel is far too slow.
  expect(minX).toBeGreaterThanOrEqual(0);
  expect(maxX).toBeLessThan(EMBLEM_W);
  expect(minY).toBeGreaterThanOrEqual(0);
  expect(maxY).toBeLessThan(EMBLEM_H);
});

it('is eager while Play has the focus: a waiting candle grins toward the menu, and a hopping one is left alone', () => {
  const genome = createCandleGenome(11);
  const waiting = 600, hopping = 3100;
  expect(JSON.stringify(emblemPixels(genome, waiting, true, true))).not.toBe(JSON.stringify(emblemPixels(genome, waiting, true, false)));
  expect(emblemPixels(genome, hopping, true, true)).toEqual(emblemPixels(genome, hopping, true, false));
  // Same outline either way: eagerness only changes the face.
  const cells = (pixels: { x: number; y: number }[]) => pixels.map((p) => p.x * 1000 + p.y).sort((a, b) => a - b).join(',');
  expect(cells(emblemPixels(genome, waiting, true, true))).toBe(cells(emblemPixels(genome, waiting, true, false)));
});
