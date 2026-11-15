/** Verify honest signal status and safe HUD presentation independently of the DOM. */
import { describe, expect, it } from 'vitest';
import type { ComposureState } from '../../shared/contracts/composure';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { hudState, percent, intensityLabel } from '../components/hud/hud-state';
import { STRINGS, t, type StringKey } from '../strings';
const signal: ComposureState = { intensity: 0.2, resting: 0, restingActive: false,
  quality: 0.6, valid: true, sampleAgeMs: 10, held: false, mode: 'adaptive',
  calibrated: true, source: 'SIMULATED', algo: 'fixture', t: 0 };
const snapshot = INITIAL_GAME_SNAPSHOT;
describe('HUD state', () => {
  it('describes feature bands without a composure percentage', () => {
    expect([0, 1/3, 2/3, 1].map(intensityLabel)).toEqual(['hud.intensityLower', 'hud.intensityMidrange', 'hud.intensityHigher', 'hud.intensityHigher']);
  });
  it('keeps quality and composure distinct', () => {
    const view = hudState(snapshot, signal, 500);
    expect(view.qualityPercent).toBe(60);
    expect(view.intensityKey).toBe('hud.intensityLower');
    expect(view.statusKey).toBe('hud.signalReady');
    expect(view.emberKey).toBe('hud.emberReady');
  });
  it('shows missing/stale samples as waiting, never a composure score', () => {
    for (const sampleAgeMs of [501, Infinity, NaN]) {
      const view = hudState(snapshot, { ...signal, sampleAgeMs }, 500);
      expect(view.statusKey).toBe('hud.signalWaiting');
      expect(view.intensityKey).toBeNull();
    }
  });
  it('distinguishes missing calibration and unusable quality', () => {
    expect(hudState(snapshot, { ...signal, calibrated: false, valid: false }, 500).statusKey).toBe('hud.calibrationNeeded');
    const view = hudState(snapshot, { ...signal, valid: false }, 500);
    expect(view.statusKey).toBe('hud.signalCheck');
    expect(view.intensityKey).toBeNull();
  });
  it('represents active and spent ember states with bounded progress', () => {
    expect(hudState({ ...snapshot, ember: { ...snapshot.ember, available: false } }, signal, 500).emberKey).toBe('hud.emberEmpty');
    const view = hudState({ ...snapshot, ember: { ...snapshot.ember, active: true, progress01: 2 } }, signal, 500);
    expect(view.emberKey).toBe('hud.emberRecovering');
    expect(view.progressPercent).toBe(100);
  });
  it('resolves known prompts and hides unknown/prototype keys', () => {
    expect(hudState({ ...snapshot, promptKey: 'hud.emberReady' }, signal, 500).prompt).toBe('Recovery ember available');
    for (const promptKey of [null, 'unknown.internal.key', 'toString', '__proto__']) {
      expect(hudState({ ...snapshot, promptKey }, signal, 500).prompt).toBeNull();
    }
  });
  it('bounds display values and never prints NaN', () => {
    expect([NaN, Infinity, -1, 0, 0.456, 1, 2].map(percent)).toEqual([0, 0, 0, 0, 46, 100, 100]);
    expect(hudState(snapshot, { ...signal, intensity: NaN }, 500).intensityKey).toBeNull();
  });
  it('never puts a digit or % in the composure/intensity text (binding rule 7)', () => {
    // hud.ts renders `${t('hud.composure')} ${t(intensityKey) or t('hud.unavailable')}`; build the same line here.
    const lines = new Set<string>();
    for (const intensity of [-1, 0, 0.1, 0.25, 1 / 3, 0.5, 2 / 3, 0.8, 1, 2, NaN, Infinity]) {
      for (const state of [signal, { ...signal, valid: false }, { ...signal, sampleAgeMs: 9999 }]) {
        const key = hudState(snapshot, { ...state, intensity }, 500).intensityKey;
        lines.add(`${t('hud.composure')} ${key === null ? t('hud.unavailable') : t(key)}`);
      }
    }
    expect(lines.size).toBeGreaterThan(1);
    for (const line of lines) expect(line).not.toMatch(/[0-9%]/);
    const keys = Object.keys(STRINGS).filter((key) => /^hud\.(composure|unavailable|intensity)/.test(key)) as StringKey[];
    expect(keys.length).toBeGreaterThanOrEqual(5);
    for (const key of keys) expect(t(key)).not.toMatch(/[0-9%]/);
  });
});
