/**
 * The music crossfade follows the real signal: intensity -> musicTenseMix (effects table) -> equal-power gains.
 * Lives under tools/ because it joins the effects engine (game lane) to the audio mix. Also checks that the tense loop is shipped, licensed and level-matched. Nothing here plays audio.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AUDIO_CONFIG } from '../../src/config/audio.config';
import { EFFECTS_TABLE } from '../../src/config/effects.config';
import { stepEffect, type EffectInput } from '../../src/game/effects/effects-engine';
import { DEFAULT_SETTINGS } from '../../src/shared/contracts/settings';
import { MUSIC_ASSETS, MUSIC_LEVEL_TRIM } from '../../src/audio/asset-list';
import { startMusicLayers } from '../../src/audio/music-layers';
import { computeMix, type MixInput } from '../../src/audio/mix-rules';

const rule = EFFECTS_TABLE.find((row) => row.id === 'musicTenseMix')!;
const input = (over: Partial<EffectInput> = {}): EffectInput => ({ intensity: 0, valid: true, mode: 'adaptive', airborne: false, effectStrength: 1, reducedMotion: false, ...over });
/** The value the effect settles to for a steady intensity. */
const settled = (over: Partial<EffectInput>): number => { let v = rule.neutral; for (let i = 0; i < 600; i += 1) v = stepEffect(v, rule, input(over), 100); return v; };
const mixInput = (tenseMix01: number): MixInput => ({ tenseMix01, volumes: DEFAULT_SETTINGS.volumes, phase: 'playing', inRefuge: false, emberActive: false });

describe('musicTenseMix follows the signal', () => {
  it('is enabled, with a written never-rule', () => {
    expect(rule.enabled).toBe(true);
    expect(rule.never).toMatch(/sound/i);
  });
  it('rises steadily with intensity: calm is the bed alone, high tension is mostly the tense loop', () => {
    const values = [0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => settled({ intensity }));
    expect(values[0]).toBeCloseTo(0, 5);
    for (let i = 1; i < values.length; i += 1) expect(values[i]!).toBeGreaterThan(values[i - 1]!);
    expect(values.at(-1)).toBeCloseTo(0.8, 5);
  });
  it('never reaches the tense loop alone: a little calm bed stays underneath', () => {
    expect(rule.max).toBeLessThan(1);
    expect(computeMix(mixInput(rule.max), AUDIO_CONFIG).quiet).toBeGreaterThan(0);
  });
  it('eases to a mostly-calm neutral when the signal is unusable, in fixed mode, or at effect strength 0', () => {
    for (const over of [{ intensity: 1, valid: false }, { intensity: 1, mode: 'fixed' as const }, { intensity: 1, effectStrength: 0 }]) {
      expect(settled(over)).toBeCloseTo(rule.neutral, 5);
    }
    expect(rule.neutral).toBeLessThan(0.3);
  });
  it('moves slowly: about 63% of the way after one time constant, never a jump', () => {
    const one = stepEffect(0, rule, input({ intensity: 1 }), 100);
    expect(one).toBeLessThan(0.05);
    let v = 0;
    for (let ms = 0; ms < rule.tauMs; ms += 100) v = stepEffect(v, rule, input({ intensity: 1 }), 100);
    expect(v / rule.max).toBeGreaterThan(0.55);
    expect(v / rule.max).toBeLessThan(0.7);
  });
});

describe('gains across the intensity range', () => {
  it('quiet falls and tense rises as tension rises, at constant total power, and never louder than the music cap', () => {
    const cap = DEFAULT_SETTINGS.volumes.master * DEFAULT_SETTINGS.volumes.music * AUDIO_CONFIG.maxMusicGain;
    let previous = computeMix(mixInput(settled({ intensity: 0 })), AUDIO_CONFIG);
    for (const intensity of [0.2, 0.4, 0.6, 0.8, 1]) {
      const now = computeMix(mixInput(settled({ intensity })), AUDIO_CONFIG);
      expect(now.tense).toBeGreaterThan(previous.tense);
      expect(now.quiet).toBeLessThan(previous.quiet);
      expect(now.quiet ** 2 + now.tense ** 2).toBeCloseTo(cap ** 2, 10);
      previous = now;
    }
  });
  it('stays silent on the tense bus during ember recovery, whatever the signal', () => {
    expect(computeMix({ ...mixInput(0.8), emberActive: true }, AUDIO_CONFIG).tense).toBe(0);
  });
});

describe('the tense loop is shipped and level-matched', () => {
  it('has a local file, a licence entry, a hash that matches the inventory and a credit', () => {
    const path = MUSIC_ASSETS.tense;
    expect(path).not.toBeNull();
    const file = new URL(`../../public/${path}`, import.meta.url);
    expect(existsSync(file)).toBe(true);
    const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
    const inventory = JSON.parse(readFileSync(new URL('../../public/assets/inventory.json', import.meta.url), 'utf8')) as Array<{ path: string; sha256: string; license: string }>;
    const entry = inventory.find((item) => item.path === 'audio/music/insistent.ogg');
    expect(entry?.sha256).toBe(sha);
    expect(entry?.license).toBe('CC0-1.0');
    expect(readFileSync(new URL('../../CREDITS.md', import.meta.url), 'utf8')).toContain('insistent.ogg');
  });
  it('raises the quieter tense loop to match the calm bed (measured 4.8 dB apart) without clipping', () => {
    expect(MUSIC_LEVEL_TRIM.quiet).toBe(1);
    expect(20 * Math.log10(MUSIC_LEVEL_TRIM.tense)).toBeCloseTo(4.8, 0);
    expect(0.523 * MUSIC_LEVEL_TRIM.tense).toBeLessThan(1); // the tense file's measured peak
  });
  it('starts both layers through their trim gains and disconnects them on stop', () => {
    const made: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
    const sources: Array<{ loop: boolean; buffer: unknown; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
    const context = {
      currentTime: 1,
      createGain: () => { const g = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }; made.push(g); return g; },
      createBufferSource: () => { const s = { loop: false, buffer: null as unknown, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }; sources.push(s); return s; },
    } as unknown as AudioContext;
    const bus = { connect: vi.fn() } as unknown as GainNode;
    const stop = startMusicLayers(context, { quiet: bus, tense: bus }, { quiet: {} as AudioBuffer, tense: {} as AudioBuffer }, MUSIC_LEVEL_TRIM);
    expect(sources).toHaveLength(2);
    expect(sources.every((s) => s.loop && s.start.mock.calls.length === 1)).toBe(true);
    expect(made.map((g) => g.gain.value)).toEqual([1, MUSIC_LEVEL_TRIM.tense]);
    stop();
    expect(made.every((g) => g.disconnect.mock.calls.length === 1)).toBe(true);
  });
});
