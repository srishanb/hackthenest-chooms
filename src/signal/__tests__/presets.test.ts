import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { createEventBus } from '../../shared/bus';
import { createSignal, type SignalDeps } from '../index';
import { createMemoryPresetStore } from '../presets/preset-store';
import type { AdapterCallbacks } from '../sources/pieeg-adapter';
import { parseRecording } from '../sources/recording-format';
import { makeSequence } from './fixtures/make-fixture';

const dir = new URL('../../../public/recordings/presets/', import.meta.url);
/** Serves the committed preset files the way the dev server and the build do. */
const fetchText = async (url: string): Promise<string> => readFileSync(new URL(url.split('/recordings/presets/')[1]!, dir), 'utf8');

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as { window?: unknown }).window = { addEventListener() {}, removeEventListener() {} }; // the simulator source listens for keys on window
  // The simulator source asks the SDK for a board; a board that never produces frames is enough here.
  (globalThis as { PiEEG?: unknown }).PiEEG = class {
    onBandPowers(): void {}
    onError(): void {}
    onDisconnect(): void {}
    async connectSimulator(): Promise<void> {}
    disconnect(): void {}
    triggerSimEvent(): void {}
    getContactQuality(): [] { return []; }
    getStats(): { packetLossRate: number } { return { packetLossRate: 0 }; }
  };
});
afterEach(() => {
  vi.useRealTimers();
  delete (globalThis as { PiEEG?: unknown }).PiEEG;
  delete (globalThis as { window?: unknown }).window;
});

const make = (deps: SignalDeps = {}, bus = createEventBus()) =>
  createSignal(bus, SIGNAL_CONFIG, { search: '', fetchText, presetStore: createMemoryPresetStore(), ...deps });

describe('signal presets', () => {
  it('lists the built-in presets from the shipped manifest', async () => {
    const list = await make().presets.list();
    expect(list.map((p) => p.id)).toEqual(['calm-climb', 'rising-tension', 'jaw-clench-bursts', 'mixed-climb', 'noisy-pin']);
    expect(list.every((p) => p.builtIn)).toBe(true);
  });

  it('plays a preset through the pipeline: REPLAY label, valid, intensity from the scorer, no reload', async () => {
    const signal = make();
    await vi.advanceTimersByTimeAsync(500);
    await signal.presets.select({ kind: 'REPLAY', presetId: 'rising-tension' });
    expect(signal.presets.getSelection()).toEqual({ kind: 'REPLAY', presetId: 'rising-tension' });
    await vi.advanceTimersByTimeAsync(10_000);
    const early = signal.reader.getState();
    expect(early.source).toBe('REPLAY');
    expect(early.valid).toBe(true);
    expect(early.intensity).toBeLessThan(0.2);
    await vi.advanceTimersByTimeAsync(32_000);
    expect(signal.reader.getState().intensity).toBeGreaterThan(0.7);
  });

  it('loops while the loop flag is on and goes stale when it is off', async () => {
    const bus = createEventBus();
    const events: string[] = [];
    bus.onAny((event) => events.push(event.type));
    const signal = make({}, bus);
    await signal.presets.select({ kind: 'REPLAY', presetId: 'calm-climb' });
    expect(signal.presets.getLoop()).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000); // past the 45 s end
    expect(signal.reader.getState().valid).toBe(true);
    expect(events).not.toContain('signal_lost');
    signal.presets.setLoop(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signal.reader.getState().valid).toBe(false);
    expect(events).toContain('signal_lost');
  });

  it('switching back to the simulator restores the player calibration', async () => {
    const signal = make();
    await vi.advanceTimersByTimeAsync(300);
    expect(signal.getDiagnostics().thresholds['active.low']).toBeUndefined();
    await signal.presets.select({ kind: 'REPLAY', presetId: 'calm-climb' });
    await vi.advanceTimersByTimeAsync(300);
    expect(signal.getDiagnostics().thresholds['active.low']).toBeGreaterThan(0);
    await signal.presets.select({ kind: 'SIMULATED' });
    expect(signal.presets.getSelection()).toEqual({ kind: 'SIMULATED' });
    expect(signal.getDiagnostics().thresholds['active.low']).toBeUndefined();
  });

  it('saves the current live signal as a preset, exports it, imports it, plays it and deletes it', async () => {
    let callbacks: AdapterCallbacks | null = null;
    const createAdapter = ((_config: unknown, cbs: AdapterCallbacks) => {
      callbacks = cbs;
      return { connect: async () => undefined, disconnect: vi.fn(), triggerSimEvent: vi.fn() };
    }) as unknown as NonNullable<SignalDeps['live']>['createAdapter'];
    const signal = make({ live: { createAdapter, navigatorLike: { bluetooth: {} } } });
    await expect(signal.presets.saveCurrent('too early')).rejects.toThrow('preset.tooShort');

    await signal.presets.select({ kind: 'LIVE_EEG' });
    const frames = makeSequence({ durationMs: 7000, startMs: 0 });
    for (const frame of frames) {
      callbacks!.onFrame({ ...frame, t: performance.now(), source: 'LIVE_EEG' });
      await vi.advanceTimersByTimeAsync(1000 / 12);
    }
    const saved = await signal.presets.saveCurrent('  My   run  ');
    expect(saved).toMatchObject({ label: 'My run', builtIn: false });
    expect((await signal.presets.list()).map((p) => p.id)).toContain(saved.id);

    const text = await signal.presets.exportText(saved.id);
    const recording = parseRecording(text);
    expect(recording.header.source).toBe('LIVE_EEG');
    expect(recording.frames[0]!.t).toBe(0);
    expect(recording.frames.length).toBeGreaterThan(60);
    expect(recording.frames.at(-1)!.t).toBeGreaterThan(5000);

    const copy = await signal.presets.importText('copy', text);
    expect(parseRecording(await signal.presets.exportText(copy.id)).frames).toEqual(recording.frames);
    await expect(signal.presets.importText('bad', 'not a recording')).rejects.toThrow();
    await signal.presets.importText('third', text);
    await signal.presets.importText('fourth', text);
    await expect(signal.presets.importText('fifth', text)).rejects.toThrow('preset.limit');

    await signal.presets.select({ kind: 'REPLAY', presetId: saved.id });
    await vi.advanceTimersByTimeAsync(1000);
    expect(signal.reader.getState().source).toBe('REPLAY');

    await signal.presets.remove(saved.id);
    expect((await signal.presets.list()).map((p) => p.id)).not.toContain(saved.id);
    expect(signal.presets.getSelection()).toEqual({ kind: 'SIMULATED' }); // the deleted preset was playing
    await expect(signal.presets.remove('calm-climb')).rejects.toThrow(/built-in/);
  });
});
