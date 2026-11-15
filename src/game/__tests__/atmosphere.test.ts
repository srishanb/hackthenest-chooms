/** Visual chunk stability and stage-driven weather remain independent of gameplay forces. */
import { expect, it } from 'vitest';
import { normalizeEnvironment } from '../../config/atmosphere.config';
import { crownLayout, visibleChunks, wrap } from '../forest/vertical-layout';

it('covers negative camera positions with bounded stable chunk identities when descending', () => {
  for (const factor of [0.12, 0.28]) for (const height of [-100000, -6401, -6400, -6399, 0, 6400]) {
    const ids = visibleChunks(height, 540, factor);
    expect(ids.length).toBeLessThanOrEqual(5);
    expect(ids[0]! * 640).toBeLessThanOrEqual(height * factor);
    expect((ids.at(-1)! + 1) * 640).toBeGreaterThanOrEqual(height * factor + 540);
    const before = ids.map((id) => crownLayout(0, id, 960));
    visibleChunks(height - 10000, 540, factor);
    expect(visibleChunks(height, 540, factor).map((id) => crownLayout(0, id, 960))).toEqual(before);
  }
  expect(wrap(-1, 640)).toBe(639);
});
it('normalizes finite weather and supports wind/snow independently and together', () => {
  expect(normalizeEnvironment({ snowEnabled: true, snow01: 2, wind01: NaN, direction: Infinity }))
    .toEqual({ snowEnabled: true, snow01: 1, windEnabled: false, wind01: 0, direction: 1 });
  for (const [windEnabled, snowEnabled] of [[true, false], [false, true], [true, true]]) {
    const value = normalizeEnvironment({ windEnabled, snowEnabled, wind01: 0.5, snow01: 0.7 });
    expect(value.windEnabled).toBe(windEnabled); expect(value.snowEnabled).toBe(snowEnabled);
    expect(value.wind01).toBe(0.5); expect(value.snow01).toBe(0.7);
  }
});
