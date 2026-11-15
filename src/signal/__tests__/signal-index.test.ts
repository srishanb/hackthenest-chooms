import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { createEventBus } from '../../shared/bus';
import type { GameEvent } from '../../shared/contracts/events';
import { createSignal, type SignalDeps } from '../index';
import type { AdapterCallbacks } from '../sources/pieeg-adapter';
import { createHeader, parseRecording, serializeRecording } from '../sources/recording-format';
import { createReplaySource } from '../sources/replay-source';
import { makeSequence } from './fixtures/make-fixture';

// createSignal starts a 12 Hz timer; fake timers keep tests fast and leave nothing running.
beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

const recordingText = () =>
  serializeRecording({
    header: createHeader('SIMULATED', 'intensity-v1'),
    frames: makeSequence({ durationMs: 3000, startMs: 500_000, frame: () => ({ spectrum: null, bands: { theta: 1, alpha: 1, beta: 2 } }) }),
  });

describe('createSignal', () => {
  it('replays a recording from ?source=replay, labels it REPLAY, and uses ?algo=', async () => {
    const fetchText = vi.fn(async () => recordingText());
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl&algo=passthrough-v0', fetchText });
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchText).toHaveBeenCalledWith(`${import.meta.env.BASE_URL}recordings/run.jsonl`);
    const state = signal.reader.getState();
    expect(state.source).toBe('REPLAY');
    expect(state.algo).toBe('passthrough-v0');
    expect(state.valid).toBe(true); // recorded timestamps are old, but the replay clock keeps them fresh
  });

  it('boots with the default algorithm when ?algo= names an Object.prototype member', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl&algo=constructor', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(200);
    expect(signal.reader.getState().algo).toBe(SIGNAL_CONFIG.defaultAlgo);
    expect(parseRecording(signal.exportRecording()).header.algo).toBe(SIGNAL_CONFIG.defaultAlgo);
  });

  it('emits signal_lost when a replay ends and the data goes stale', async () => {
    const bus = createEventBus();
    const events: GameEvent['type'][] = [];
    bus.onAny((event) => events.push(event.type));
    createSignal(bus, SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl&algo=passthrough-v0', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(5000);
    expect(events).toContain('signal_lost');
  });

  it('applies ?mode=fixed and setMode', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl&mode=fixed', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(200);
    expect(signal.reader.getState().mode).toBe('fixed');
    signal.control.setMode('adaptive');
    await vi.advanceTimersByTimeAsync(200);
    expect(signal.reader.getState().mode).toBe('adaptive');
  });

  it('?source=live starts nothing and shows the live source label', async () => {
    const adapterFactory = vi.fn();
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=live', live: { createAdapter: adapterFactory, navigatorLike: { bluetooth: {} } } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(adapterFactory).not.toHaveBeenCalled();
    const state = signal.reader.getState();
    expect(state.source).toBe('LIVE_EEG');
    expect(state.valid).toBe(false);
  });

  it('connect(LIVE_EEG) says so when Web Bluetooth is missing', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=live', live: { navigatorLike: {} } });
    await expect(signal.control.connect('LIVE_EEG')).rejects.toThrow(/Web Bluetooth/);
  });

  it('live frames flow through, and a board disconnect leads to signal_lost once', async () => {
    const bus = createEventBus();
    const events: string[] = [];
    bus.onAny((event) => events.push(event.type));
    let callbacks: AdapterCallbacks | null = null;
    const connect = vi.fn(async () => undefined);
    const createAdapter = ((_config: unknown, cbs: AdapterCallbacks) => {
      callbacks = cbs;
      return { connect, disconnect: vi.fn(), triggerSimEvent: vi.fn() };
    }) as unknown as NonNullable<SignalDeps['live']>['createAdapter'];
    const signal = createSignal(bus, SIGNAL_CONFIG, { search: '?source=live&algo=passthrough-v0', live: { createAdapter, navigatorLike: { bluetooth: {} } } });
    await signal.control.connect('LIVE_EEG');
    expect(connect).toHaveBeenCalledWith('ble');
    const push = () => callbacks!.onFrame({ ...makeSequence({ durationMs: 100, startMs: performance.now() })[0]!, source: 'LIVE_EEG' });
    for (let i = 0; i < 12; i += 1) {
      push();
      await vi.advanceTimersByTimeAsync(80);
    }
    expect(signal.reader.getState().valid).toBe(true);
    expect(signal.reader.getState().source).toBe('LIVE_EEG');
    callbacks!.onDisconnect();
    await vi.advanceTimersByTimeAsync(3000);
    expect(events.filter((type) => type === 'signal_lost')).toHaveLength(1);
  });

  it('a failed connect (picker cancelled) keeps the running source and its label', async () => {
    const createAdapter = (() => ({
      connect: async () => {
        throw Object.assign(new Error('chooser closed'), { name: 'NotFoundError' });
      },
      disconnect: vi.fn(),
      triggerSimEvent: vi.fn(),
    })) as unknown as NonNullable<SignalDeps['live']>['createAdapter'];
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, {
      search: '?source=replay&replay=run.jsonl&algo=passthrough-v0',
      fetchText: async () => recordingText(),
      live: { createAdapter, navigatorLike: { bluetooth: {} } },
    });
    await vi.advanceTimersByTimeAsync(500);
    await expect(signal.control.connect('LIVE_EEG')).rejects.toThrow(/No board was chosen/);
    await vi.advanceTimersByTimeAsync(1500);
    expect(signal.reader.getState().valid).toBe(true); // the replay kept playing
    expect(signal.reader.getState().source).toBe('REPLAY');
  });

  it('keeps ComposureState.t on the now() clock during replay (the contract says performance.now())', async () => {
    let wall = 600_000; // the page has been open a long time; the recording was made early (frames at 20_000)
    const text = serializeRecording({
      header: createHeader('SIMULATED', 'passthrough-v0'),
      frames: makeSequence({ durationMs: 3000, startMs: 20_000, frame: () => ({ spectrum: null, bands: { theta: 1, alpha: 1, beta: 2 } }) }),
    });
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, {
      search: '?source=replay&replay=run.jsonl&algo=passthrough-v0',
      fetchText: async () => text,
      now: () => wall,
    });
    for (let i = 0; i < 10; i += 1) {
      wall += 100;
      await vi.advanceTimersByTimeAsync(100);
    }
    const state = signal.reader.getState();
    expect(state.source).toBe('REPLAY');
    expect(state.valid).toBe(true);
    expect(Math.abs(wall - state.t)).toBeLessThanOrEqual(150);
  });

  it('calibrate() runs for the configured time and emits calibration_result', async () => {
    const bus = createEventBus();
    const results: boolean[] = [];
    bus.on('calibration_result', (event) => results.push(event.ok));
    const signal = createSignal(bus, SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(100);
    const pending = signal.control.calibrate('resting');
    await vi.advanceTimersByTimeAsync(SIGNAL_CONFIG.calibration.restingMs + 10);
    const result = await pending;
    expect(result.step).toBe('resting');
    expect(results).toEqual([result.ok]);
  });

  it('calibrate() rejects a second call while one is running', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(100);
    const first = signal.control.calibrate('resting');
    const second = signal.control.calibrate('resting');
    await expect(second).rejects.toThrow(/already running/);
    await vi.advanceTimersByTimeAsync(SIGNAL_CONFIG.calibration.restingMs + 10);
    await expect(first).resolves.toMatchObject({ step: 'resting' });
  });

  it('exportRecording() returns frames, states and events that replay again', async () => {
    const bus = createEventBus();
    const signal = createSignal(bus, SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl&algo=passthrough-v0', fetchText: async () => recordingText() });
    await vi.advanceTimersByTimeAsync(1500);
    bus.emit({ type: 'signal_lost' });
    const text = signal.exportRecording();
    const lines = text.trim().split('\n').map((line) => JSON.parse(line) as { type: string });
    expect(lines[0]).toMatchObject({ type: 'header', format: 'lighten-recording', algo: 'passthrough-v0' });
    for (const type of ['frame', 'state', 'event']) expect(lines.some((line) => line.type === type)).toBe(true);
    const recording = parseRecording(text);
    expect(recording.frames.length).toBeGreaterThan(0);
    const frames: number[] = [];
    await createReplaySource({ frames: recording.frames, speed: Infinity }).start((frame) => frames.push(frame.t));
    expect(frames.length).toBe(recording.frames.length);
  });
});
