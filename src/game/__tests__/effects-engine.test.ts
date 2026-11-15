import { describe, expect, it } from 'vitest';
import type { EffectRule } from '../../shared/contracts/effects';
import { neutralFrame, stepEffect, stepEffects, targetFor, type EffectInput } from '../effects/effects-engine';

const lantern: EffectRule = {
  id: 'lanternRadius',
  enabled: true,
  atIntensity0: 260,
  atIntensity1: 110,
  min: 90,
  max: 280,
  unit: 'px',
  tauMs: 1000,
  neutral: 190,
  holdWhileAirborne: true,
  reducedMotionScale: 1,
  never: 'The light never goes out.',
};

const input = (over: Partial<EffectInput> = {}): EffectInput => ({
  intensity: 0.5,
  valid: true,
  mode: 'adaptive',
  airborne: false,
  effectStrength: 1,
  reducedMotion: false,
  ...over,
});

describe('effects engine', () => {
  it('maps intensity 0 and 1 to the configured ends', () => {
    expect(targetFor(lantern, input({ intensity: 0 }))).toBe(260);
    expect(targetFor(lantern, input({ intensity: 1 }))).toBe(110);
  });

  it('never leaves [min, max], even with wild input or a bad row', () => {
    const wild = { ...lantern, atIntensity1: -500, atIntensity0: 9999 };
    for (const intensity of [-3, 0, 0.5, 1, 42, Number.POSITIVE_INFINITY]) {
      const value = stepEffect(190, wild, input({ intensity }), 16);
      expect(value).toBeGreaterThanOrEqual(wild.min);
      expect(value).toBeLessThanOrEqual(wild.max);
    }
  });

  it('holds its value while airborne (fixed from takeoff to landing)', () => {
    expect(stepEffect(200, lantern, input({ intensity: 1, airborne: true }), 5000)).toBe(200);
  });

  it('eases toward the target instead of jumping', () => {
    const afterOneFrame = stepEffect(260, lantern, input({ intensity: 1 }), 16);
    expect(afterOneFrame).toBeLessThan(260);
    expect(afterOneFrame).toBeGreaterThan(250);
    const afterLong = stepEffect(260, lantern, input({ intensity: 1 }), 60_000);
    expect(afterLong).toBeCloseTo(110, 3);
  });

  it('is frame-rate independent: two half steps equal one full step', () => {
    const one = stepEffect(260, lantern, input({ intensity: 1 }), 32);
    const half = stepEffect(260, lantern, input({ intensity: 1 }), 16);
    const two = stepEffect(half, lantern, input({ intensity: 1 }), 16);
    expect(two).toBeCloseTo(one, 6);
  });

  it('heads for neutral when the signal is invalid, the mode is fixed, or the effect is disabled', () => {
    expect(targetFor(lantern, input({ intensity: 1, valid: false }))).toBe(190);
    expect(targetFor(lantern, input({ intensity: 1, mode: 'fixed' }))).toBe(190);
    expect(targetFor({ ...lantern, enabled: false }, input({ intensity: 1 }))).toBe(190);
  });

  it('effect strength 0 removes the signal effect but keeps the light', () => {
    expect(targetFor(lantern, input({ intensity: 1, effectStrength: 0 }))).toBe(190);
  });

  it('reduced motion scales the swing by the rule', () => {
    const still = { ...lantern, reducedMotionScale: 0 };
    expect(targetFor(still, input({ intensity: 1, reducedMotion: true }))).toBe(190);
  });

  it('recovers fully: nothing accumulates after a long time at intensity 1', () => {
    let value = 190;
    for (let i = 0; i < 3600; i++) value = stepEffect(value, lantern, input({ intensity: 1 }), 16);
    for (let i = 0; i < 3600; i++) value = stepEffect(value, lantern, input({ intensity: 0 }), 16);
    expect(value).toBeCloseTo(260, 2);
  });

  it('stepEffects updates every effect that has a row and starts from neutral', () => {
    const start = neutralFrame([lantern]);
    expect(start.lanternRadius).toBe(190);
    expect(start.fogDensity).toBe(0);
    const next = stepEffects(start, [lantern], input({ intensity: 0 }), 500);
    expect(next.lanternRadius).toBeGreaterThan(190);
    expect(next.fogDensity).toBe(0);
  });
});
