/** Corruption weakens wax; there is no fuel. */
import { expect, it } from 'vitest';
import { createLanternLight } from '../forest/lantern-light';
import { waxBenefit01 } from '../../config/lantern-light.config';

it('weakens wax continuously and completely blocks benefits at strongest real corruption', () => {
  expect(waxBenefit01(0.2)).toBe(1);
  expect(waxBenefit01(0.8)).toBeGreaterThan(0); expect(waxBenefit01(0.8)).toBeLessThan(1);
  expect(waxBenefit01(1)).toBe(0);
});

it('follows the real corruption and ignores bad values; playing time changes nothing', () => {
  const light = createLanternLight();
  expect(light.waxBenefit).toBe(1);
  light.update(1); expect(light.waxBenefit).toBe(0);
  light.update(NaN); expect(light.waxBenefit).toBe(1);
  light.update(0.8);
  const before = light.waxBenefit;
  for (let i = 0; i < 100_000; i++) light.update(0.8);
  expect(light.waxBenefit).toBe(before);
  light.reset(); expect(light.waxBenefit).toBe(1);
});
