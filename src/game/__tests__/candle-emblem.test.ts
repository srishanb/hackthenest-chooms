/** The menu emblem loops: breathing with a full flame, gathering into a charge with a flare, springing back. */
import { expect, it } from 'vitest';
import { emblemMoment } from '../candle/emblem';

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
