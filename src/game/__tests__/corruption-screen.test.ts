/** Screen motion must disappear for accessibility, pause, neutral input and zero strength. */
import { expect, it } from 'vitest';
import { CORRUPTION_SCREEN_CONFIG as C, screenCorruption } from '../../config/corruption-screen.config';
it('keeps neutral/fixed-fallback corruption quiet and ramps continuously at high corruption', () => {
  expect(screenCorruption(0.2, 1, false, false)).toBe(0);
  expect(screenCorruption(C.onset, 1, false, false)).toBe(0);
  expect(screenCorruption(C.onset + 0.001, 1, false, false)).toBeLessThan(0.0001);
  expect(screenCorruption(1, 1, false, false)).toBe(1);
});
it('removes motion and glitch for reduced motion, pause and zero effect strength', () => {
  expect(screenCorruption(1, 1, true, false)).toBe(0);
  expect(screenCorruption(1, 1, false, true)).toBe(0);
  expect(screenCorruption(1, 0, false, false)).toBe(0);
  expect(screenCorruption(1, 0.5, false, false)).toBe(0.5);
});
it('cannot exceed screen displacement caps, even for malformed values', () => {
  for (const c of [-1, 0, 0.7, 1, 20, NaN, Infinity]) {
    const amount = screenCorruption(c, 2, false, false);
    expect(amount).toBeGreaterThanOrEqual(0); expect(amount).toBeLessThanOrEqual(1);
    expect(amount * C.shakeMaxPx).toBeLessThanOrEqual(4);
  }
});
