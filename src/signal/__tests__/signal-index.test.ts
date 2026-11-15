import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import { createEventBus } from '../../shared/bus';
import type { GameEvent } from '../../shared/contracts/events';
import { createSignal } from '../index';
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
    expect(fetchText).toHaveBeenCalledWith('/recordings/run.jsonl');
    const state = signal.reader.getState();
    expect(state.source).toBe('REPLAY');
    expect(state.algo).toBe('passthrough-v0');
    expect(state.valid).toBe(true); // recorded timestamps are old, but the replay clock keeps them fresh
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

  it('refuses LIVE_EEG until P3', async () => {
    const signal = createSignal(createEventBus(), SIGNAL_CONFIG, { search: '?source=replay&replay=run.jsonl', fetchText: async () => recordingText() });
    await expect(signal.control.connect('LIVE_EEG')).rejects.toThrow(/P3/);
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
