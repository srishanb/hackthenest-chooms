/** Fuel is an actual resource but never changes jump physics or light radius during a jump. */
import { expect, it } from 'vitest';
import { burnFuel, createLanternFuel } from '../forest/lantern-fuel';
import { waxBenefit01 } from '../../config/lantern-fuel.config';
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
it('empty fuel stays an ember after returning to normal until wax relights it', () => {
  const fuel = createLanternFuel();
  fuel.lightRadius(500, false); fuel.update(1, 1000000);
  expect(fuel.isLit).toBe(false);
  expect(fuel.lightRadius(500, true)).toBe(60);
  fuel.refill(); expect(fuel.isLit).toBe(false);
  fuel.update(0.2, 0); expect(fuel.isLit).toBe(false);
  expect(fuel.lightRadius(500, false)).toBe(60);
  fuel.refill(); expect(fuel.isLit).toBe(true);
  expect(fuel.lightRadius(500, false)).toBeGreaterThan(60);
});

it('uses fuel alone for sight in either world, including flight and wax boosts', () => {
  const calm = createLanternFuel(), corrupt = createLanternFuel();
  corrupt.update(1, 0); calm.update(0.2, 0);
  expect(calm.lightRadius(100, false)).toBe(280);
  expect(corrupt.lightRadius(900, true)).toBe(280);
  calm.update(0.2, 10000); corrupt.update(1, 10000);
  expect(calm.lightRadius()).toBeCloseTo(60 + 220 * calm.value);
  expect(corrupt.lightRadius()).toBeCloseTo(60 + 220 * corrupt.value);
  expect(corrupt.lightRadius()).toBeLessThan(calm.lightRadius());
});
