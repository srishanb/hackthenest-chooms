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

describe('climb info panel setting', () => {
  it('is off by default, and an older saved hud without it still loads with it off', () => {
    expect(DEFAULT_SETTINGS.hud.showClimbInfo).toBe(false);
    const saved = JSON.stringify({ hud: { showSignal: true, showEmber: false, showStatus: true } });
    const loaded = loadSettings(fakeStorage(saved));
    expect(loaded.hud.showClimbInfo).toBe(false);
    expect(loaded.hud.showSignal).toBe(true);
    expect(loaded.hud.showEmber).toBe(false);
  });
  it('keeps a saved true', () => {
    const saved = JSON.stringify({ hud: { ...DEFAULT_SETTINGS.hud, showClimbInfo: true } });
    expect(loadSettings(fakeStorage(saved)).hud.showClimbInfo).toBe(true);
  });
});

describe('settings safety and persistence', () => {
  it('rejects out-of-range values while preserving valid siblings', () => {
    const settings = loadSettings(fakeStorage(JSON.stringify({
      volumes: { master: -1, music: 1.1, sfx: 0, narrator: 1 },
      effectStrength: 2,
      captions: { enabled: false, scale: 0 },
      keys: { jump: '', left: 'not a key', right: 'KeyD' },
    })));
    expect(settings.volumes).toEqual({ ...DEFAULT_SETTINGS.volumes, sfx: 0, narrator: 1 });
    expect(settings.effectStrength).toBe(DEFAULT_SETTINGS.effectStrength);
    expect(settings.captions).toEqual({ enabled: false, scale: 1 });
    expect(settings.keys).toEqual({ ...DEFAULT_SETTINGS.keys, right: 'KeyD' });
  });

  it('accepts the endpoints of bounded settings', () => {
    for (const value of [0, 1]) {
      const settings = loadSettings(fakeStorage(JSON.stringify({
        volumes: { master: value }, effectStrength: value,
      })));
      expect(settings.volumes.master).toBe(value);
      expect(settings.effectStrength).toBe(value);
    }
    for (const scale of [0.75, 2]) {
      expect(loadSettings(fakeStorage(JSON.stringify({ captions: { scale } }))).captions.scale).toBe(scale);
    }
  });

  it.each([null, [], 'junk', 12, { keys: [], volumes: null, captions: true }])(
    'falls back for invalid saved structures: %j', (candidate) => {
      expect(loadSettings(fakeStorage(JSON.stringify(candidate)))).toEqual(DEFAULT_SETTINGS);
    },
  );

  it('survives denied reads and failed writes while keeping live session updates', () => {
    const store = createSettingsStore({
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('full'); },
    });
    expect(store.get()).toEqual(DEFAULT_SETTINGS);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => { notifications += 1; });
    store.set({ ...store.get(), reducedMotion: true });
    expect(store.get().reducedMotion).toBe(true);
    expect(notifications).toBe(1);
    unsubscribe();
    store.set({ ...store.get(), reducedMotion: false });
    expect(notifications).toBe(1);
  });

  it('round trips live changes into a newly loaded store', () => {
    const storage = fakeStorage();
    const first = createSettingsStore(storage);
    const next = { ...first.get(), captions: { enabled: false, scale: 1.5 } };
    first.set(next);
    expect(createSettingsStore(storage).get()).toEqual(next);
  });

  it('does not share mutable nested defaults between sessions', () => {
    const first = loadSettings(fakeStorage());
    const second = loadSettings(fakeStorage());
    first.keys.jump = 'KeyW';
    first.volumes.master = 0;
    expect(second.keys.jump).toBe('Space');
    expect(DEFAULT_SETTINGS.keys.jump).toBe('Space');
    expect(second.volumes.master).toBe(DEFAULT_SETTINGS.volumes.master);
  });
});
