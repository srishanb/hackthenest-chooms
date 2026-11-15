import { sceneryCorruption } from '../../config/fuel-visibility.config';
/** Full viewport and depleted sight agree across worlds and view sizes. */
import { expect, it } from 'vitest';
import { fuelVisibilityRadius as radius } from '../forest/fuel-visibility';
it('clears all corners at full fuel in either world and preserves emergency light', () => {
  for (const [w,h] of [[960,540],[1280,720],[540,960]] as const) {
    expect(radius(1,0,w,h)).toBe(Math.hypot(w,h));
    expect(radius(1,1,w,h)).toBe(Math.hypot(w,h));
    expect(radius(0,1,w,h)).toBe(60);
    expect(radius(0.5,1,w,h)).toBeLessThan(radius(0.5,0,w,h));
  }
});

it('keeps normal scenery healthy and reveals decay only beyond the normal boundary', () => {
  for (const value of [0, 0.2, 0.35, NaN]) expect(sceneryCorruption(value)).toBe(0);
  expect(sceneryCorruption(0.6)).toBeGreaterThan(0);
  expect(sceneryCorruption(1)).toBe(1);
});

it('brings the shadow into view early instead of consuming an offscreen radius buffer', () => {
  const farX = 480, farY = 270;
  const corner = Math.hypot(farX, farY);
  expect(radius(1, 0, farX, farY)).toBe(corner);
  expect(radius(0.9, 0, farX, farY) * (15 / 12)).toBeLessThan(corner);
  expect(radius(0.5, 0, farX, farY)).toBeLessThan(130);
  expect(radius(0.5, 1, farX, farY)).toBeLessThan(radius(0.5, 0, farX, farY));
});
