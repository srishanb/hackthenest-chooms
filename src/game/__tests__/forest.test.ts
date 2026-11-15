/** Forest changes are continuous, bounded and independent of movement/recovery inputs. */
import { describe, expect, it } from 'vitest';
import { EFFECTS_TABLE } from '../../config/effects.config';
import { forestPreviewValue } from '../../config/forest.config';
import { neutralFrame, stepEffects, type EffectInput } from '../effects/effects-engine';
import { stepForestEffects } from '../forest/forest-effects';
import { fitPropScale, mixColor, reveal, stableUnit } from '../forest/presentation';

const input: EffectInput = { intensity: 0.8, valid: true, mode: 'adaptive', airborne: false, effectStrength: 1, reducedMotion: false };
describe('forest presentation', () => {
  it('fits corrupted crystals to the displayed pine rather than its 110px source', () => {
    const displayedPineHeight = 110 * (48 / 110);
    expect(16 * fitPropScale(16, displayedPineHeight)).toBeCloseTo(48);
    expect(16 * fitPropScale(16, 220)).toBe(48);
    expect(fitPropScale(0, 48)).toBe(0);
    expect(fitPropScale(16, NaN)).toBe(0);
  });
  it('reveal thresholds and positions remain deterministic and fade continuously', () => {
    expect(stableUnit('ledge:1')).toBe(stableUnit('ledge:1'));
    expect(stableUnit('ledge:1')).not.toBe(stableUnit('ledge:2'));
    expect(reveal(0.3, 0.3)).toBe(0);
    expect(reveal(0.45, 0.3)).toBeCloseTo(0.5);
    expect(reveal(0.6, 0.3)).toBe(1);
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
  });
  it('dev overrides are opt-in and ignored by production', () => {
    expect(forestPreviewValue('?forestDemo=1', false)).toBeNull();
    for (const query of ['', '?forestDemo=', '?forestDemo=no', '?forestDemo=Infinity']) expect(forestPreviewValue(query, true)).toBeNull();
    expect(forestPreviewValue('?forestDemo=0.25', true)).toBe(0.25);
    expect(forestPreviewValue('?forestDemo=5', true)).toBe(1);
  });
  it('an explicit preview alters only the visual field, not other effects or the input', () => {
    const before = { ...input };
    const previous = neutralFrame(EFFECTS_TABLE);
    const normal = stepEffects(previous, EFFECTS_TABLE, input, 500);
    const preview = stepForestEffects(previous, EFFECTS_TABLE, input, 500, 0);
    expect(input).toEqual(before);
    expect(preview.forestCorruption).toBeLessThan(normal.forestCorruption);
    expect({ ...preview, forestCorruption: 0 }).toEqual({ ...normal, forestCorruption: 0 });
    expect(stepForestEffects(previous, EFFECTS_TABLE, input, 500, null)).toEqual(normal);
  });
  it('returns to neutral for invalid, fixed and zero strength, including reduced-motion settings', () => {
    for (const patch of [{ valid: false }, { mode: 'fixed' as const }, { effectStrength: 0 }]) {
      const frame = stepForestEffects({ ...neutralFrame(EFFECTS_TABLE), forestCorruption: 1 }, EFFECTS_TABLE,
        { ...input, ...patch }, 60000, null);
      expect(frame.forestCorruption).toBeCloseTo(0.2, 6);
    }
    expect(stepForestEffects(neutralFrame(EFFECTS_TABLE), EFFECTS_TABLE, { ...input, reducedMotion: true }, 60000, null)
      .forestCorruption).toBeCloseTo(input.intensity);
  });
  it('rises and recovers consistently at 30, 60 and 144 Hz without flicker', () => {
    const simulate = (fps: number, intensity: number, initial: number) => {
      let frame = { ...neutralFrame(EFFECTS_TABLE), forestCorruption: initial };
      for (let i = 0; i < fps * 4; i++) frame = stepForestEffects(frame, EFFECTS_TABLE, { ...input, intensity }, 1000 / fps, null);
      return frame.forestCorruption;
    };
    for (const target of [0, 1]) for (const fps of [30, 60, 144]) {
      expect(simulate(fps, target, 1 - target)).toBeCloseTo(simulate(60, target, 1 - target), 8);
    }
    let frame = neutralFrame(EFFECTS_TABLE);
    for (let i = 0; i < 100; i++) {
      const next = stepForestEffects(frame, EFFECTS_TABLE, { ...input, intensity: i % 2 }, 16, null);
      expect(Math.abs(next.forestCorruption - frame.forestCorruption)).toBeLessThan(0.008);
      frame = next;
    }
  });
});
