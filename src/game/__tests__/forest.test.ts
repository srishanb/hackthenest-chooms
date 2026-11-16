/** Forest changes are continuous, bounded and independent of movement/recovery inputs. */
import { describe, expect, it } from 'vitest';
import { EFFECTS_TABLE } from '../../config/effects.config';
import { FOREST_CONFIG, forestPreviewValue } from '../../config/forest.config';
import { neutralFrame, stepEffects, type EffectInput } from '../effects/effects-engine';
import { stepForestEffects } from '../forest/forest-effects';
import { mixColor, pickFitting, pickPartner, reveal, stableUnit } from '../forest/presentation';
import { drawnSize, FOREST_DECAY, FOREST_PROPS, PROP_ART, WINTER_DECAY, WINTER_PROPS, type PropArt } from '../forest/prop-art';

const input: EffectInput = { intensity: 0.8, valid: true, mode: 'adaptive', airborne: false, effectStrength: 1, reducedMotion: false };
describe('forest presentation', () => {
  it('picks ledge props by what fits and never scales them: the own pick when it fits, else the tallest that does', () => {
    const size = (piece: PropArt) => drawnSize(piece);
    const own = PROP_ART['mushroom-tall'];
    expect(pickFitting([own, ...FOREST_PROPS], size, 200, 64)).toBe(own);
    // A 62 px mushroom does not fit under 40 px: the tallest that does (a 32 px bush) stands in.
    expect(pickFitting([own, ...FOREST_PROPS], size, 200, 40)).toBe(PROP_ART.bush);
    // Nothing fits: the smallest, never a squeezed one.
    expect(pickFitting([own, ...FOREST_PROPS], size, 4, 4)).toBe(PROP_ART.stone);
    expect(pickFitting([], size, 10, 10)).toBeUndefined();
  });
  it('a decayed partner is never taller than its healthy prop, and the seed varies it', () => {
    const size = (piece: PropArt) => drawnSize(piece);
    for (const healthy of FOREST_PROPS) {
      const limit = drawnSize(healthy).height + 4;
      const picks = new Set([0, 0.2, 0.4, 0.6, 0.8, 1].map((unit) => pickPartner(FOREST_DECAY, size, limit, unit)));
      const smallest = Math.min(...FOREST_DECAY.map((piece) => drawnSize(piece).height));
      for (const pick of picks) expect(drawnSize(pick!).height).toBeLessThanOrEqual(Math.max(limit, smallest));
    }
    expect(new Set([0, 0.5, 0.99].map((unit) => pickPartner(FOREST_DECAY, size, 64, unit))).size).toBeGreaterThan(1);
    expect(pickPartner(WINTER_DECAY, size, 64, 0.5)).toBe(WINTER_DECAY[0]);
  });
  it('every prop crop has an even width, so a centred prop lands on the art grid', () => {
    for (const piece of [...FOREST_PROPS, ...WINTER_PROPS, ...FOREST_DECAY, ...WINTER_DECAY]) {
      expect(piece.width % 2, piece.frame ?? piece.key).toBe(0);
      expect(drawnSize(piece)).toEqual({ width: piece.width * FOREST_CONFIG.pixelScale, height: piece.height * FOREST_CONFIG.pixelScale });
    }
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
      expect(Math.abs(next.forestCorruption - frame.forestCorruption)).toBeLessThan(0.02);
      frame = next;
    }
  });
});
