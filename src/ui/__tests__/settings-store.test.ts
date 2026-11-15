import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import { createSettingsStore, loadSettings, mergeWithDefaults, SETTINGS_STORAGE_KEY } from '../settings-store';

function fakeStorage(initial: string | null = null) {
  const data = new Map<string, string>();
  if (initial !== null) data.set(SETTINGS_STORAGE_KEY, initial);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

describe('settings store', () => {
  it('uses defaults when nothing is saved', () => {
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('uses defaults when the saved value is not JSON', () => {
    expect(loadSettings(fakeStorage('{not json'))).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid saved fields and replaces wrong-typed ones with defaults', () => {
    const saved = JSON.stringify({
      reducedMotion: true,
      effectStrength: 'loud',
      volumes: { master: 0.2, music: null },
      keys: { jump: 'KeyW' },
      unknownField: 1,
    });
    const settings = loadSettings(fakeStorage(saved));
    expect(settings.reducedMotion).toBe(true);
    expect(settings.effectStrength).toBe(DEFAULT_SETTINGS.effectStrength);
    expect(settings.volumes.master).toBe(0.2);
    expect(settings.volumes.music).toBe(DEFAULT_SETTINGS.volumes.music);
    expect(settings.keys.jump).toBe('KeyW');
    expect(settings.keys.left).toBe(DEFAULT_SETTINGS.keys.left);
    expect('unknownField' in settings).toBe(false);
  });

  it('rejects numbers that are not finite', () => {
    expect(mergeWithDefaults({ n: 1 }, { n: Number.NaN })).toEqual({ n: 1 });
  });

  it('saves on every change', () => {
    const storage = fakeStorage();
    const store = createSettingsStore(storage);
    store.set({ ...store.get(), reducedMotion: true });
    expect(JSON.parse(storage.data.get(SETTINGS_STORAGE_KEY) ?? '{}').reducedMotion).toBe(true);
  });
});
