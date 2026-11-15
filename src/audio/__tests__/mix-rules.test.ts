/** Verify loudness bounds and phase behavior without audio devices or files. */
import { describe, expect, it } from 'vitest';
import { AUDIO_CONFIG } from '../../config/audio.config';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { computeMix, MIX_SCALES, type MixInput } from '../mix-rules';

const input: MixInput = {
  tenseMix01: 0.3, volumes: DEFAULT_SETTINGS.volumes,
  phase: 'playing', inRefuge: false, emberActive: false,
};
const energy = (mix: ReturnType<typeof computeMix>) => mix.quiet ** 2 + mix.tense ** 2;

describe('adaptive audio mix', () => {
  it('stays within the equal-power music cap across mix and volume grids', () => {
    for (const master of [0, 0.2, 0.8, 1]) {
      for (const music of [0, 0.3, 0.7, 1]) {
        for (const tenseMix01 of [0, 0.1, 0.3, 0.5, 0.9, 1]) {
          const result = computeMix({ ...input, tenseMix01, volumes: { ...input.volumes, master, music } }, AUDIO_CONFIG);
          const cap = master * music * AUDIO_CONFIG.maxMusicGain;
          expect(energy(result)).toBeLessThanOrEqual(cap ** 2 + 1e-12);
          expect(energy(result)).toBeCloseTo(cap ** 2, 12);
        }
      }
    }
  });

  it('selects exact endpoints and keeps default SFX above full tense music', () => {
    const quiet = computeMix({ ...input, tenseMix01: 0 }, AUDIO_CONFIG);
    const tense = computeMix({ ...input, tenseMix01: 1 }, AUDIO_CONFIG);
    expect(quiet.tense).toBe(0);
    expect(tense.quiet).toBe(0);
    expect(tense.sfx).toBeGreaterThanOrEqual(1.4 * tense.tense);
  });

  it('makes refuges and ember quieter and suppresses tense music during ember', () => {
    const normal = computeMix(input, AUDIO_CONFIG);
    const refuge = computeMix({ ...input, inRefuge: true }, AUDIO_CONFIG);
    for (const emberInput of [{ emberActive: true }, { phase: 'ember' as const }]) {
      const ember = computeMix({ ...input, ...emberInput }, AUDIO_CONFIG);
      expect(ember.tense).toBe(0);
      expect(energy(ember)).toBeLessThan(energy(normal));
    }
    expect(energy(refuge)).toBeCloseTo(energy(normal) * MIX_SCALES.refuge ** 2);
  });

  it('uses pause priority when states overlap and preserves cue/voice volumes', () => {
    const normal = computeMix(input, AUDIO_CONFIG);
    const paused = computeMix({ ...input, phase: 'paused', inRefuge: true, emberActive: true }, AUDIO_CONFIG);
    expect(energy(paused)).toBeCloseTo(energy(normal) * MIX_SCALES.paused ** 2);
    expect(paused.tense).toBe(0);
    expect(paused.sfx).toBe(normal.sfx);
    expect(paused.narrator).toBe(normal.narrator);
  });

  it('mutes each bus independently and master mutes everything', () => {
    const run = (volumes: Partial<MixInput['volumes']>) => computeMix({ ...input, volumes: { ...input.volumes, ...volumes } }, AUDIO_CONFIG);
    expect(run({ master: 0 })).toEqual({ quiet: 0, tense: 0, sfx: 0, narrator: 0 });
    expect(run({ music: 0 }).quiet).toBe(0);
    expect(run({ music: 0 }).tense).toBe(0);
    expect(run({ sfx: 0 }).sfx).toBe(0);
    expect(run({ narrator: 0 }).narrator).toBe(0);
    expect(run({ narrator: 0 }).quiet).toBeGreaterThan(0);
  });

  it('uses neutral for nonfinite mix and clamps finite mix positions', () => {
    for (const tenseMix01 of [NaN, Infinity, -Infinity]) {
      expect(computeMix({ ...input, tenseMix01 }, AUDIO_CONFIG)).toEqual(computeMix(input, AUDIO_CONFIG));
    }
    expect(computeMix({ ...input, tenseMix01: 2 }, AUDIO_CONFIG)).toEqual(computeMix({ ...input, tenseMix01: 1 }, AUDIO_CONFIG));
    expect(computeMix({ ...input, tenseMix01: -2 }, AUDIO_CONFIG)).toEqual(computeMix({ ...input, tenseMix01: 0 }, AUDIO_CONFIG));
  });

  it('fails silent for nonfinite gains and clamps excessive finite volumes', () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(computeMix({ ...input, volumes: { ...input.volumes, master: bad } }, AUDIO_CONFIG)).toEqual({ quiet: 0, tense: 0, sfx: 0, narrator: 0 });
      expect(energy(computeMix(input, { ...AUDIO_CONFIG, maxMusicGain: bad }))).toBe(0);
      expect(computeMix({ ...input, volumes: { ...input.volumes, sfx: bad } }, AUDIO_CONFIG).sfx).toBe(0);
    }
    const result = computeMix({ ...input, volumes: { master: 3, music: -1, sfx: 2, narrator: -3 } }, { ...AUDIO_CONFIG, maxMusicGain: 4 });
    expect(result).toEqual({ quiet: 0, tense: 0, sfx: 1, narrator: 0 });
  });
});
