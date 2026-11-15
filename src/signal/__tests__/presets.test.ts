/**
 * Replay presets: the generator, the preset file and store, the runtime source switch, and the
 * pipeline's response to each built-in preset (through the real intensity-v2 pipeline, never around it).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPresets, presetBaselines } from '../../../tools/presets/presets';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { createEventBus } from '../../shared/bus';
import type { SourceChoice } from '../../shared/contracts/signal-api';
import type { BandFrame, Baselines } from '../../shared/contracts/signal-internal';
import { createMemoryStorage } from '../../shared/safe-storage';
import { resolveAlgorithm } from '../algorithms/registry';
import { createSignal } from '../index';
import { createPipeline } from '../pipeline';
import { createPresetController, type PresetControllerDeps } from '../presets/controller';
import { compactFrames, parsePreset, serializePreset } from '../presets/preset-file';
import { createPresetStore, MAX_SAVED_PRESETS, PRESET_STORAGE_KEY } from '../presets/preset-store';
import { makeSequence } from './fixtures/make-fixture';

const built = buildPresets();
const text = (name: string): string => built.files[`${name}.jsonl`]!;

/** Run a preset's frames through the real pipeline at the recording's own clock; returns intensity and validity per frame. */
function runThroughPipeline(name: string): Array<{ t: number; intensity: number; valid: boolean }> {
  const { frames, baselines } = parsePreset(text(name));
  const pipeline = createPipeline({ config: SIGNAL_CONFIG, entry: resolveAlgorithm(null, SIGNAL_CONFIG.defaultAlgo), initialMode: 'adaptive', initialSource: 'REPLAY' });
  pipeline.setBaselines(baselines!);
  return frames.map((frame) => {
    const state = pipeline.process(frame, frame.t);
    return { t: frame.t, intensity: state.intensity, valid: state.valid };
  });
}
const between = (rows: ReturnType<typeof runThroughPipeline>, fromS: number, toS: number) => rows.filter((r) => r.t >= fromS * 1000 && r.t < toS * 1000);
const mean = (values: number[]): number => values.reduce((a, b) => a + b, 0) / values.length;

describe('preset generation', () => {
  it('is deterministic: two builds are byte-identical', () => {
    expect(buildPresets()).toEqual(built);
  });
  it('lists every preset in the manifest with a file, a label, a description and a duration', () => {
    expect(built.manifest.presets.map((p) => p.id)).toEqual(['calm-climb', 'rising-tension', 'jaw-clench-bursts', 'mixed-climb', 'poor-contact']);
    for (const preset of built.manifest.presets) {
      expect(built.files[`${preset.id}.jsonl`], preset.id).toBeDefined();
      expect(preset.label.length).toBeGreaterThan(0);
      expect(preset.durationMs).toBeGreaterThan(55_000);
    }
  });
  it('uses framing words only: no emotion, stress or medical wording, no percentages', () => {
    for (const preset of built.manifest.presets) {
      expect(`${preset.label} ${preset.description}`, preset.id).not.toMatch(/emotion|stress|anxi|diagnos|therap|medical|health|\d+\s*%/i);
    }
  });
});

describe('each built-in preset through the real pipeline', () => {
  it('calm climb stays low and valid', () => {
    const rows = runThroughPipeline('calm-climb');
    expect(Math.max(...between(rows, 5, 60).map((r) => r.intensity))).toBeLessThan(0.3);
    expect(between(rows, 5, 60).every((r) => r.valid)).toBe(true);
  });
  it('rising tension rises from low to high', () => {
    const rows = runThroughPipeline('rising-tension');
    const early = mean(between(rows, 3, 10).map((r) => r.intensity));
    const late = mean(between(rows, 52, 60).map((r) => r.intensity));
    expect(early).toBeLessThan(0.3);
    expect(late).toBeGreaterThan(0.75);
    expect(late - early).toBeGreaterThan(0.5);
  });
  it('jaw clench bursts swing between low and high', () => {
    const rows = between(runThroughPipeline('jaw-clench-bursts'), 10, 60);
    expect(Math.max(...rows.map((r) => r.intensity))).toBeGreaterThan(0.6);
    expect(Math.min(...rows.map((r) => r.intensity))).toBeLessThan(0.4);
  });
  it('mixed climb is calm, then tense, then recovering', () => {
    const rows = runThroughPipeline('mixed-climb');
    const calm = mean(between(rows, 5, 18).map((r) => r.intensity));
    const peak = mean(between(rows, 38, 42).map((r) => r.intensity));
    const end = mean(between(rows, 57, 60).map((r) => r.intensity));
    expect(peak).toBeGreaterThan(calm + 0.5);
    expect(end).toBeLessThan(peak - 0.3);
  });
  it('poor contact goes invalid and the intensity eases to neutral', () => {
    const rows = between(runThroughPipeline('poor-contact'), 10, 60);
    expect(rows.every((r) => !r.valid)).toBe(true);
    expect(Math.abs(mean(rows.map((r) => r.intensity)) - SIGNAL_CONFIG.neutralIntensity)).toBeLessThan(0.1);
  });
});

describe('preset files', () => {
  const baselines: Baselines = { active: { low: 0.3, high: 1.5 }, resting: { low: 0.3, high: 0.7 } };
  const frames = makeSequence({ durationMs: 2000, startMs: 1234, hz: 12 });

  it('round-trips frames and baselines', () => {
    const parsed = parsePreset(serializePreset(frames, baselines, 'intensity-v2'));
    expect(parsed.baselines).toEqual(baselines);
    expect(parsed.frames).toHaveLength(frames.length);
  });
  it('loads a plain recording with no baselines line', () => {
    expect(parsePreset(serializePreset(frames, null, null)).baselines).toBeNull();
  });
  it('ignores a malformed baselines line and rejects a file with too few frames', () => {
    const bad = serializePreset(frames, null, null).replace('\n', '\n{"type":"baselines","active":{"low":2,"high":1}}\n');
    expect(parsePreset(bad).baselines).toBeNull();
    expect(() => parsePreset(serializePreset(frames.slice(0, 1), null, null))).toThrow(/too few/);
    expect(() => parsePreset('not json')).toThrow();
  });
  it('compacts to the newest window, from time 0, with rounded numbers', () => {
    const long = makeSequence({ durationMs: 120_000, startMs: 5000, hz: 12 });
    const compact = compactFrames(long, 60_000);
    expect(compact[0]!.t).toBe(0);
    expect(compact.at(-1)!.t).toBeLessThanOrEqual(60_000);
    expect(compact.at(-1)!.t).toBeGreaterThan(59_000);
  });
});

describe('saved preset store', () => {
  it('adds, lists, gets and removes', () => {
    const store = createPresetStore(createMemoryStorage(), () => 1000);
    const saved = store.add('  My run  ', 'jsonl', 5000);
    expect(saved.label).toBe('My run');
    expect(store.list()).toEqual([saved]);
    expect(store.get(saved.id)).toEqual(saved);
    store.remove(saved.id);
    expect(store.list()).toEqual([]);
  });
  it('survives corrupt storage, blocked storage and a full browser', () => {
    const storage = createMemoryStorage();
    storage.setItem(PRESET_STORAGE_KEY, '{oops');
    expect(createPresetStore(storage).list()).toEqual([]);
    expect(() => createPresetStore(undefined).add('x', 'y', 1)).toThrow(/storage/);
    const full = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => {} };
    expect(() => createPresetStore(full).add('x', 'y', 1)).toThrow(/no room/);
  });
  it('limits the count, rejects an empty name and strips control characters', () => {
    const store = createPresetStore(createMemoryStorage(), (() => { let n = 0; return () => (n += 1); })());
    for (let i = 0; i < MAX_SAVED_PRESETS; i += 1) store.add(`p${i}`, 'j', 1);
    expect(() => store.add('extra', 'j', 1)).toThrow(/Delete one/);
    expect(() => createPresetStore(createMemoryStorage()).add('   ', 'j', 1)).toThrow(/name/);
    expect(createPresetStore(createMemoryStorage()).add('a\u0007b', 'j', 1).label).toBe('a b');
  });
});

describe('preset controller (source switching)', () => {
  const calibrated: Baselines = { active: { low: 5, high: 6 }, resting: { low: 5, high: 6 } };

  function setup(overrides: Partial<PresetControllerDeps> = {}) {
    let baselines = calibrated;
    const started: string[] = [];
    const replays: Array<{ frames: BandFrame[]; onEnd: () => void }> = [];
    let recorded = '';
    const deps: PresetControllerDeps = {
      fetchText: async (url) => (url.endsWith('manifest.json') ? built.files['manifest.json']! : built.files[url.split('/').pop()!]!),
      storage: createMemoryStorage(),
      now: () => 100_000,
      startSim: async () => void started.push('sim'),
      startLive: async () => void started.push('live'),
      startFrames: async (frames, onEnd) => void replays.push({ frames, onEnd }),
      exportRecording: () => recorded,
      getBaselines: () => baselines,
      setBaselines: (next) => { baselines = next; },
      algo: 'intensity-v2',
      initial: { kind: 'sim' },
      ...overrides,
    };
    return { controller: createPresetController(deps), started, replays, baselines: () => baselines, setRecorded: (value: string) => { recorded = value; } };
  }

  it('lists built-in presets from the manifest', async () => {
    const { controller } = setup();
    const list = await controller.list();
    expect(list.map((p) => p.id)).toEqual(built.manifest.presets.map((p) => p.id));
    expect(list.every((p) => p.builtIn)).toBe(true);
  });

  it('plays a preset on the current clock with its baselines, then restores the old baselines on leaving', async () => {
    const { controller, replays, baselines, started } = setup();
    await controller.select({ kind: 'preset', id: 'calm-climb' });
    expect(controller.getSelection()).toEqual({ kind: 'preset', id: 'calm-climb' });
    expect(replays[0]!.frames[0]!.t).toBe(100_000);
    expect(baselines()).toEqual(presetBaselines());
    await controller.select({ kind: 'sim' });
    expect(started).toEqual(['sim']);
    expect(baselines()).toEqual(calibrated);
  });

  it('loops by starting the next pass later in time, and stops looping when switched away or loop is off', async () => {
    const { controller, replays } = setup();
    await controller.select({ kind: 'preset', id: 'calm-climb' });
    const firstEnd = replays[0]!.frames.at(-1)!.t;
    replays[0]!.onEnd();
    await Promise.resolve();
    expect(replays).toHaveLength(2);
    expect(replays[1]!.frames[0]!.t).toBeGreaterThan(firstEnd);
    expect(replays[1]!.frames[0]!.t - firstEnd).toBeLessThan(200); // continuous, no jump
    controller.setLoop(false);
    replays[1]!.onEnd();
    await Promise.resolve();
    expect(replays).toHaveLength(2);
    controller.setLoop(true);
    await controller.select({ kind: 'sim' });
    replays[1]!.onEnd();
    await Promise.resolve();
    expect(replays).toHaveLength(2);
  });

  it('keeps the selection and baselines when a switch fails (for example a cancelled Bluetooth picker)', async () => {
    const { controller, baselines } = setup({ startLive: async () => { throw new Error('No board was chosen.'); } });
    await expect(controller.select({ kind: 'live' })).rejects.toThrow('No board was chosen.');
    expect(controller.getSelection()).toEqual({ kind: 'sim' });
    expect(baselines()).toEqual(calibrated);
  });

  it('rejects an unknown preset readably', async () => {
    await expect(setup().controller.select({ kind: 'preset', id: 'nope' })).rejects.toThrow(/not available/);
  });

  it('saves this session as a preset, lists it, replays it and exports it', async () => {
    const { controller, setRecorded, replays } = setup();
    expect(() => controller.saveCurrent('Too early')).toThrow();
    setRecorded(serializePreset(makeSequence({ durationMs: 5000, startMs: 70_000 }), calibrated, 'intensity-v2'));
    const saved = controller.saveCurrent('Board run');
    expect(saved.builtIn).toBe(false);
    expect((await controller.list()).some((p) => p.id === saved.id && p.label === 'Board run')).toBe(true);
    const exported = await controller.exportText(saved.id);
    expect(parsePreset(exported).baselines).toEqual(calibrated);
    await controller.select({ kind: 'preset', id: saved.id });
    expect(replays[0]!.frames[0]!.t).toBe(100_000);
    controller.remove(saved.id);
    expect((await controller.list()).some((p) => p.id === saved.id)).toBe(false);
  });

  it('imports a file and rejects a bad one with a readable message', async () => {
    const { controller } = setup();
    expect(controller.importText('From file', text('mixed-climb')).label).toBe('From file');
    expect(() => controller.importText('Bad', 'garbage')).toThrow(/not valid JSON/);
  });

  it('tells subscribers when the list, loop or selection changes', async () => {
    const { controller } = setup();
    const listener = vi.fn();
    const off = controller.subscribe(listener);
    controller.setLoop(false);
    await controller.select({ kind: 'sim' });
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    controller.setLoop(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe('createSignal with presets', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  const fetchText = async (url: string): Promise<string> => built.files[url.split('/').pop()!]!;

  it('?preset= starts a replay that the lantern-facing state follows, and switching presets keeps it running', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?preset=calm-climb', fetchText, storage: createMemoryStorage(), now: () => performance.now() });
    await vi.advanceTimersByTimeAsync(15_000);
    let state = signal.reader.getState();
    expect(state.source).toBe('REPLAY');
    expect(state.valid).toBe(true);
    expect(state.calibrated).toBe(true);
    const calm = state.intensity;
    expect(calm).toBeLessThan(0.3);

    await signal.presets.select({ kind: 'preset', id: 'jaw-clench-bursts' });
    expect(signal.presets.getSelection()).toEqual<SourceChoice>({ kind: 'preset', id: 'jaw-clench-bursts' });
    let peak = 0;
    for (let i = 0; i < 100; i += 1) {
      await vi.advanceTimersByTimeAsync(100);
      state = signal.reader.getState();
      expect(state.valid).toBe(true); // no stale gap while switching
      peak = Math.max(peak, state.intensity);
    }
    expect(peak).toBeGreaterThan(0.5);
  });

  it('poor contact reaches the reader as invalid', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?preset=poor-contact', fetchText });
    await vi.advanceTimersByTimeAsync(8000);
    expect(signal.reader.getState().valid).toBe(false);
  });

  it('plays the preset again from the start when it ends (loop)', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?preset=calm-climb', fetchText });
    await vi.advanceTimersByTimeAsync(75_000); // past the 60 s preset
    const state = signal.reader.getState();
    expect(state.valid).toBe(true);
    expect(signal.presets.getLoop()).toBe(true);
  });
});
