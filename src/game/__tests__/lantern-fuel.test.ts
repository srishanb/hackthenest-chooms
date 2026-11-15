/** Fuel is an actual resource but never changes jump physics or light radius during a jump. */
import { expect, it } from 'vitest';
import { burnFuel, createLanternFuel } from '../forest/lantern-fuel';
import { waxBenefit01, corruptionVisibilityRadius } from '../../config/lantern-fuel.config';
it('burns faster with actual corruption and integrates at different frame rates', () => {
  expect(burnFuel(1, 1, 10000)).toBeLessThan(burnFuel(1, 0, 10000));
  const simulate = (fps: number) => { let fuel = 1; for (let i = 0; i < fps * 10; i++) fuel = burnFuel(fuel, 0.8, 1000 / fps); return fuel; };
  expect(simulate(30)).toBeCloseTo(simulate(144), 10);
  expect(burnFuel(1, 1, -500)).toBe(1);
  expect(burnFuel(1, NaN, 1000)).toBe(burnFuel(1, 0.2, 1000));
});
it('wax replenishes fuel, restart refills it, and empty fuel preserves a minimum light', () => {
  const fuel = createLanternFuel(); fuel.update(1, 100000);
  expect(fuel.value).toBe(0); expect(fuel.lightRadius(110, false)).toBe(60);
  fuel.refill(); expect(fuel.value).toBe(0);
  fuel.update(0.2, 0);
  fuel.refill(); expect(fuel.value).toBeCloseTo(0.35);
  for (let i = 0; i < 10; i++) fuel.refill(); expect(fuel.value).toBe(1);
  fuel.update(1, 10000); fuel.reset(); expect(fuel.value).toBe(1);
});
it('weakens wax continuously and completely blocks benefits at strongest real corruption', () => {
  expect(waxBenefit01(0.2)).toBe(1);
  expect(waxBenefit01(0.8)).toBeGreaterThan(0); expect(waxBenefit01(0.8)).toBeLessThan(1);
  expect(waxBenefit01(1)).toBe(0);
  const fuel = createLanternFuel(); fuel.update(1, 50000); fuel.refill(); expect(fuel.value).toBe(0);
  fuel.update(0.2, 0); fuel.refill(); expect(fuel.value).toBeCloseTo(0.35);
});
it('holds light reach in flight despite burn, wax pickup or another base-radius value', () => {
  const fuel = createLanternFuel(); const takeoff = fuel.lightRadius(260, false);
  fuel.update(1, 60000); expect(fuel.lightRadius(110, true)).toBe(takeoff);
  expect(fuel.lightRadius(110, false)).toBeLessThan(takeoff);
  const held = fuel.lightRadius(110, true); fuel.refill(); expect(fuel.lightRadius(260, true)).toBe(held);
});

it('caps maximum corruption sight after any wax boost or airborne held radius, including visual preview', () => {
  for (const radius of [100, 260, 520, 2000]) expect(corruptionVisibilityRadius(radius, 1)).toBe(80);
  expect(corruptionVisibilityRadius(60, 1)).toBe(60);
  expect(corruptionVisibilityRadius(260, 0.2)).toBe(260);
  expect(corruptionVisibilityRadius(260, 0.8)).toBeLessThan(260);
  const fuel = createLanternFuel();
  fuel.lightRadius(520, false); fuel.refill();
  expect(corruptionVisibilityRadius(fuel.lightRadius(520, true), 1)).toBe(80);
});

it('brief wax pulse widens corrupted sight then returns to its exact cap', () => {
  expect(corruptionVisibilityRadius(520, 1, 1)).toBe(160);
  expect(corruptionVisibilityRadius(520, 1, 0.5)).toBe(120);
  expect(corruptionVisibilityRadius(520, 1, 0)).toBe(80);
});
