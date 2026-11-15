/** The menu emblem loops: breathing with a full flame, gathering into a charge with a flare, springing back. */
import { expect, it } from 'vitest';
import { createCandleGenome } from '../candle/candle-genome';
import { EMBLEM_H, EMBLEM_W, emblemMoment, emblemPixels } from '../candle/emblem';

it('breathes, then charges with a growing flare, then springs up and settles', () => {
  expect(emblemMoment(500)).toMatchObject({ charge01: 0, flare01: 0, tracker: { pose: 'idle' } });
  const early = emblemMoment(2100);
  const late = emblemMoment(2800);
  expect(early.tracker.pose).toBe('charge');
  expect(late.charge01).toBeGreaterThan(early.charge01);
  expect(late.flare01).toBeGreaterThan(early.flare01);
  expect(emblemMoment(3000).tracker.pose).toBe('rise');
  expect(emblemMoment(3200 + 500)).toEqual(emblemMoment(500));
});

it('never draws outside its box, for any candle at any moment of the loop', () => {
  for (let seed = 0; seed < 20; seed++) {
    const genome = createCandleGenome(seed * 7919 + 3);
    for (let t = 0; t < 3200; t += 80) {
      for (const p of emblemPixels(genome, t, false)) {
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThan(EMBLEM_W);
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThan(EMBLEM_H);
      }
    }
  }
});
