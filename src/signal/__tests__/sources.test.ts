import { describe, expect, it, vi } from 'vitest';
import { SIGNAL_CONFIG } from '../../config/signal.config';
import type { BandFrame } from '../../shared/contracts/signal-internal';
import { createPiEEGAdapter, toBandFrame } from '../sources/pieeg-adapter';
import { createHeader, parseRecording, serializeRecording } from '../sources/recording-format';
import { createReplaySource } from '../sources/replay-source';
import { createSimSource, simKeyLegend } from '../sources/sim-source';
import { getPiEEGConstructor, type PiEEGBandPowersRaw, type PiEEGConstructor, type PiEEGInstance } from '../vendor/pieeg-types';

const POWERS: PiEEGBandPowersRaw = { Delta: 5, Theta: 4, Alpha: 3, Beta: 2, Gamma: 1 };

/** 10 seconds of frames at 12 Hz, with a recognisable alpha value per frame. */
function makeFrames(seconds = 10, hz = 12): BandFrame[] {
  return Array.from({ length: seconds * hz }, (_, i) => ({
    t: 1000 + (i * 1000) / hz,
    bands: { delta: 1, theta: 1, alpha: i, beta: 1, gamma: 1 },
    spectrum: null,
    contactGood01: 1,
    packetLoss01: 0,
    source: 'SIMULATED' as const,
  }));
}

/** A fake SDK that records what it was asked to do and lets tests push band powers. */
function makeFakeSdk() {
  const log: string[] = [];
  const sim: Array<[string, unknown]> = [];
  let push: (() => void) | null = null;
  let options: unknown;
  class FakePiEEG implements PiEEGInstance {
    constructor(opts?: unknown) {
      options = opts;
    }
    connectSimulator = async () => void log.push('connectSimulator');
    connectBLE = async () => void log.push('connectBLE');
    disconnect = () => void log.push('disconnect');
    onBandPowers = (cb: (p: PiEEGBandPowersRaw, s: { psd: number[]; freqs: number[] }) => void) => {
      push = () => cb(POWERS, { psd: [1, 2], freqs: [10, 11] });
    };
    onError = () => {};
    onDisconnect = () => {};
    triggerSimEvent = (type: string, value?: unknown) => void sim.push([type, value]);
    getContactQuality = () => [{ status: 'good' as const }, { status: 'good' as const }, { status: 'railed' as const }, { status: 'flat' as const }];
    getStats = () => ({ packetLossRate: 0.25 });
  }
  return { Ctor: FakePiEEG as unknown as PiEEGConstructor, log, sim, emit: () => push?.(), options: () => options };
}

describe('toBandFrame', () => {
  it('lower-cases bands, copies the spectrum to plain arrays and derives contact and loss', () => {
    const frame = toBandFrame(POWERS, { psd: Float64Array.of(1, 2), freqs: Float64Array.of(10, 11) }, [{ status: 'good' }, { status: 'railed' }], { packetLossRate: 0.1 }, 'SIMULATED', 42);
    expect(frame.bands).toEqual({ delta: 5, theta: 4, alpha: 3, beta: 2, gamma: 1 });
    expect(frame.spectrum).toEqual({ freqsHz: [10, 11], psd: [1, 2] });
    expect(frame.contactGood01).toBe(0.5);
    expect(frame.packetLoss01).toBe(0.1);
    expect(frame.t).toBe(42);
  });

  it('reports unknown contact and a missing spectrum as null', () => {
    const frame = toBandFrame(POWERS, { psd: null, freqs: null }, [], { packetLossRate: Number.NaN }, 'LIVE_EEG', 0);
    expect(frame.spectrum).toBeNull();
    expect(frame.contactGood01).toBeNull();
    expect(frame.packetLoss01).toBeNull();
    expect(frame.source).toBe('LIVE_EEG');
  });
});

describe('PiEEG global access', () => {
  it('fails with a clear message when the script was not loaded', () => {
    expect(() => getPiEEGConstructor({})).toThrow(/index\.html must include/);
  });
});

describe('PiEEG adapter', () => {
  it('passes our filter config to the SDK, with the notch on and updateHz from config', () => {
    const sdk = makeFakeSdk();
    createPiEEGAdapter(SIGNAL_CONFIG, { onFrame: () => {}, onError: () => {}, onDisconnect: () => {} }, sdk.Ctor);
    expect(sdk.options()).toEqual({ updateHz: 12, filter: { bandpass: { low: 1, high: 40, order: 5 }, notch: 60 } });
  });

  it('delivers frames stamped by the injected clock and tagged by connection kind', async () => {
    const sdk = makeFakeSdk();
    const frames: BandFrame[] = [];
    const adapter = createPiEEGAdapter(SIGNAL_CONFIG, { onFrame: (f) => frames.push(f), onError: () => {}, onDisconnect: () => {} }, sdk.Ctor, () => 7);
    await adapter.connect('simulator');
    sdk.emit();
    await adapter.connect('ble');
    sdk.emit();
    expect(frames.map((f) => [f.source, f.t])).toEqual([['SIMULATED', 7], ['LIVE_EEG', 7]]);
    expect(sdk.log).toEqual(['connectSimulator', 'connectBLE']);
  });
});

describe('SimSource', () => {
  function setup() {
    const sdk = makeFakeSdk();
    const target = new EventTarget();
    const frames: BandFrame[] = [];
    const source = createSimSource({
      config: SIGNAL_CONFIG,
      keyTarget: target,
      createAdapter: (config, callbacks) => createPiEEGAdapter(config, callbacks, sdk.Ctor, () => 1),
    });
    const press = (code: string, repeat = false) => target.dispatchEvent(Object.assign(new Event('keydown'), { code, repeat }));
    return { sdk, source, frames, press };
  }

  it('starts the SDK simulator without a click and delivers SIMULATED frames', async () => {
    const { sdk, source, frames } = setup();
    await source.start((f) => frames.push(f));
    sdk.emit();
    expect(sdk.log).toEqual(['connectSimulator']);
    expect(frames[0]?.source).toBe('SIMULATED');
  });

  it('maps the configured keys to simulator events and ignores key repeat, Space and other keys', async () => {
    const { sdk, source, press } = setup();
    await source.start(() => {});
    press(SIGNAL_CONFIG.simKeys.alpha);
    press(SIGNAL_CONFIG.simKeys.clench);
    press(SIGNAL_CONFIG.simKeys.clench, true);
    press('Space');
    press('KeyA');
    expect(sdk.sim.map(([type]) => type)).toEqual(['alpha', 'clench']);
  });

  it('stops listening and disconnects on stop', async () => {
    const { sdk, source, press } = setup();
    await source.start(() => {});
    source.stop();
    press(SIGNAL_CONFIG.simKeys.alpha);
    expect(sdk.sim).toEqual([]);
    expect(sdk.log).toContain('disconnect');
  });

  it('cleans up after a failed connect, so a retry builds a fresh adapter', async () => {
    const target = new EventTarget();
    const disconnect = vi.fn();
    const triggerSimEvent = vi.fn();
    const connect = vi.fn().mockRejectedValueOnce(new Error('no simulator')).mockResolvedValue(undefined);
    const createAdapter = vi.fn(() => ({ connect, disconnect, triggerSimEvent })) as unknown as typeof createPiEEGAdapter;
    const source = createSimSource({ config: SIGNAL_CONFIG, keyTarget: target, createAdapter });
    await expect(source.start(() => {})).rejects.toThrow('no simulator');
    expect(disconnect).toHaveBeenCalledOnce();
    target.dispatchEvent(Object.assign(new Event('keydown'), { code: SIGNAL_CONFIG.simKeys.alpha, repeat: false }));
    expect(triggerSimEvent).not.toHaveBeenCalled();
    await source.start(() => {});
    expect(createAdapter).toHaveBeenCalledTimes(2);
  });

  it('never binds the game keys', () => {
    const codes = simKeyLegend(SIGNAL_CONFIG).map((entry) => entry.code);
    expect(codes).not.toContain('Space');
    expect(codes).not.toContain('KeyA');
    expect(codes).not.toContain('KeyC');
  });
});

describe('recording format', () => {
  it('round-trips a header and frames', () => {
    const recording = { header: createHeader('SIMULATED', 'intensity-v1', new Date('2026-11-14T20:00:00Z')), frames: makeFrames(1) };
    const parsed = parseRecording(serializeRecording(recording));
    expect(parsed.header.createdAt).toBe('2026-11-14T20:00:00.000Z');
    expect(parsed.frames).toEqual(recording.frames);
  });

  it('skips line types it does not know', () => {
    const text = `${serializeRecording({ header: createHeader('REPLAY', null), frames: makeFrames(1) })}{"type":"event","t":1}\n`;
    expect(parseRecording(text).frames).toHaveLength(12);
  });

  it('rejects a missing header, bad JSON and bad frames with readable errors', () => {
    expect(() => parseRecording('')).toThrow(/no header/);
    expect(() => parseRecording('{nope')).toThrow(/line 1 is not valid JSON/);
    const header = JSON.stringify(createHeader('SIMULATED', null));
    expect(() => parseRecording(`${header}\n{"type":"frame","t":1}`)).toThrow(/line 2 is not a valid frame/);
    expect(() => parseRecording('{"type":"header","format":"other","version":1}')).toThrow(/unsupported/);
  });

  it('reads a frame with no spectrum key as spectrum null, and rejects a bad spectrum or an infinite time', () => {
    const header = JSON.stringify(createHeader('SIMULATED', null));
    const bands = '"bands":{"delta":1,"theta":1,"alpha":1,"beta":1,"gamma":1}';
    expect(parseRecording(`${header}\n{"type":"frame","t":1,${bands}}`).frames[0]?.spectrum).toBeNull();
    expect(() => parseRecording(`${header}\n{"type":"frame","t":1,${bands},"spectrum":{}}`)).toThrow(/line 2 is not a valid frame/);
    expect(() => parseRecording(`${header}\n{"type":"frame","t":1e999,${bands},"spectrum":null}`)).toThrow(/line 2 is not a valid frame/);
  });
});

describe('ReplaySource', () => {
  it('replays 10 s of frames headlessly in well under a second, in order, with timestamps preserved', async () => {
    const frames = makeFrames();
    const seen: BandFrame[] = [];
    const onEnd = vi.fn();
    const started = performance.now();
    await createReplaySource({ frames, speed: Number.POSITIVE_INFINITY, onEnd }).start((f) => seen.push(f));
    expect(performance.now() - started).toBeLessThan(1000);
    expect(seen).toHaveLength(frames.length);
    expect(seen.map((f) => f.t)).toEqual(frames.map((f) => f.t));
    expect(seen.map((f) => f.bands.alpha)).toEqual(frames.map((f) => f.bands.alpha));
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('labels every replayed frame REPLAY, whatever it was recorded as', async () => {
    const seen: BandFrame[] = [];
    await createReplaySource({ frames: makeFrames(1), speed: Number.POSITIVE_INFINITY }).start((f) => seen.push(f));
    expect(new Set(seen.map((f) => f.source))).toEqual(new Set(['REPLAY']));
  });

  it('paces frames by their timestamps divided by speed', async () => {
    const delays: number[] = [];
    let pending: (() => void) | null = null;
    const source = createReplaySource({
      frames: makeFrames(1, 4), // 250 ms apart
      speed: 5,
      setTimer: (callback, delayMs) => {
        delays.push(delayMs);
        pending = callback;
        return 1;
      },
      clearTimer: () => {},
    });
    const seen: BandFrame[] = [];
    await source.start((f) => seen.push(f));
    while (pending) {
      const next: () => void = pending;
      pending = null;
      next();
    }
    expect(seen).toHaveLength(4);
    expect(delays.slice(0, 3)).toEqual([50, 50, 50]);
  });

  it('stops delivering after stop()', async () => {
    let pending: (() => void) | null = null;
    const seen: BandFrame[] = [];
    const source = createReplaySource({ frames: makeFrames(1), setTimer: (cb) => ((pending = cb), 1), clearTimer: () => {} });
    await source.start((f) => seen.push(f));
    source.stop();
    (pending as (() => void) | null)?.();
    expect(seen).toHaveLength(1);
  });

  it('rejects a speed that is not positive', () => {
    expect(() => createReplaySource({ frames: [], speed: 0 })).toThrow(/greater than 0/);
  });
});
