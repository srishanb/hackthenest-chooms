/** The candle light under corruption: held radius in flight, wax benefit, and the corruption sight cap. There is no fuel. */
import { expect, it } from 'vitest';
import { createLanternLight } from '../forest/lantern-light';
import { waxBenefit01, corruptionVisibilityRadius } from '../../config/lantern-light.config';

it('weakens wax continuously and completely blocks benefits at strongest real corruption', () => {
  expect(waxBenefit01(0.2)).toBe(1);
  expect(waxBenefit01(0.8)).toBeGreaterThan(0); expect(waxBenefit01(0.8)).toBeLessThan(1);
  expect(waxBenefit01(1)).toBe(0);
});

it('does not dim with playing time: calm light stays the same however long you play', () => {
  const light = createLanternLight();
  light.update(0.2);
  const first = light.lightRadius(260, false);
  for (let i = 0; i < 100_000; i++) light.update(0.2);
  expect(light.lightRadius(260, false)).toBe(first);
  expect(first).toBe(260);
});

it('dims with real corruption, never below the minimum, and restores when it falls', () => {
  const light = createLanternLight();
  light.update(1);
  expect(light.lightRadius(260, false)).toBeCloseTo(143, 0);
  expect(light.lightRadius(10, false)).toBe(60);
  light.update(0.2);
  expect(light.lightRadius(260, false)).toBe(260);
});

it('holds light reach in flight despite corruption changes or another base-radius value', () => {
  const light = createLanternLight(); light.update(0.2);
  const takeoff = light.lightRadius(260, false);
  light.update(1);
  expect(light.lightRadius(110, true)).toBe(takeoff);
  expect(light.lightRadius(110, false)).toBeLessThan(takeoff);
});

it('caps maximum corruption sight after any wax boost or airborne held radius, including visual preview', () => {
  for (const radius of [100, 260, 520, 2000]) expect(corruptionVisibilityRadius(radius, 1)).toBe(80);
  expect(corruptionVisibilityRadius(60, 1)).toBe(60);
  expect(corruptionVisibilityRadius(260, 0.2)).toBe(260);
  expect(corruptionVisibilityRadius(260, 0.8)).toBeLessThan(260);
  const light = createLanternLight();
  light.lightRadius(520, false);
  expect(corruptionVisibilityRadius(light.lightRadius(520, true), 1)).toBe(80);
});

it('brief wax pulse widens corrupted sight then returns to its exact cap', () => {
  expect(corruptionVisibilityRadius(520, 1, 1)).toBe(160);
  expect(corruptionVisibilityRadius(520, 1, 0.5)).toBe(120);
  expect(corruptionVisibilityRadius(520, 1, 0)).toBe(80);
});
