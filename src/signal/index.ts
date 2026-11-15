/**
 * Signal lane entry point: sources + pipeline + clock, exposed as the `SignalHandle`.
 *
 * Why this shape: the game only ever receives `reader` (read-only `ComposureState`). The UI gets
 * `control` (connect, calibrate, mode) and diagnostics for the debug overlay. Nothing outside this
 * lane touches a device, a frame or the SDK.
 *
 * Source and algorithm come from the URL (`?source=sim|replay|live`, `?algo=`, `?mode=fixed`,
 * `?replay=`, `?preset=`), see url-params.ts. Replay presets (built-in or saved) are chosen at runtime through `presets`. `?source=live` starts nothing: the Connect Octopus 16 button
 * calls `control.connect('LIVE_EEG')` from a click. The pipeline publishes about 12 times a second.
 */
import type { ComposureState, InputSourceKind } from '../shared/contracts/composure';
import type { SignalConfig } from '../shared/contracts/config';
import type { EventBus } from '../shared/contracts/events';
import type { SignalHandle } from '../shared/contracts/signal-api';
import type { SourceChoice } from '../shared/contracts/signal-api';
import type { KeyValueStorage } from '../shared/safe-storage';
import type { BandFrame, Source } from '../shared/contracts/signal-internal';
import { ALGORITHMS, resolveAlgorithm } from './algorithms/registry';
import { createPipeline } from './pipeline';
import { createRecorder } from './recorder';
import { parseRecording } from './sources/recording-format';
import { createPresetController } from './presets/controller';
import { createPiEEGSource, type PiEEGSourceDeps } from './sources/pieeg-source';
import { createReplaySource } from './sources/replay-source';
import { createSimSource } from './sources/sim-source';
import { parseSignalUrlParams } from './url-params';

export interface SignalDeps {
  /** The URL query string. Defaults to the page's. */
  search?: string;
  /** Wall clock in ms. Defaults to performance.now(). */
  now?: () => number;
  /** Fetches a recording's text. Defaults to fetch(). */
  fetchText?: (url: string) => Promise<string>;
  /** Replaces the live board source's adapter and `navigator`. For tests. */
  live?: Pick<PiEEGSourceDeps, 'createAdapter' | 'navigatorLike'>;
  /** Where saved presets are kept. Omit for none (saving then reports a readable error). */
  storage?: KeyValueStorage;
}

const defaultFetchText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`);
  return response.text();
};

export function createSignal(bus: EventBus, config: SignalConfig, deps: SignalDeps = {}): SignalHandle {
  const params = parseSignalUrlParams(deps.search ?? window.location.search);
  const now = deps.now ?? (() => performance.now());
  const fetchText = deps.fetchText ?? defaultFetchText;
  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const entry = resolveAlgorithm(params.algo, config.defaultAlgo);
  const startKind: InputSourceKind = params.source === 'replay' ? 'REPLAY' : params.source === 'live' ? 'LIVE_EEG' : config.defaultSource;
  const pipeline = createPipeline({ config, entry, initialMode: params.mode ?? 'adaptive', initialSource: startKind });
  const listeners = new Set<(state: ComposureState) => void>();

  // The recorder buffers frames, states and bus events in memory; exportRecording() returns them as JSONL.
  const recorder = createRecorder({ source: startKind, algo: params.algo !== null && params.algo in ALGORITHMS ? params.algo : config.defaultAlgo });
  bus.onAny((event, tMs) => recorder.recordEvent(event, tMs));

  let source: Source | null = null;
  let activeKind: InputSourceKind = config.defaultSource;
  // Replay frames keep their recorded times, so "now" for replay is the newest frame's time plus real time since it arrived.
  let replayAnchor = { frameT: 0, wall: 0 };
  const clock = (): number => (activeKind === 'REPLAY' ? replayAnchor.frameT + (now() - replayAnchor.wall) : now());

  // What readers see. During replay the pipeline's own `t` is on the recording's clock, but the contract says performance.now().
  let published: ComposureState = pipeline.getState();
  let hadValid = false;
  let calibrating = false;
  let lost = false;
  function publish(): void {
    const state = pipeline.step(clock());
    if (state.valid) {
      hadValid = true;
      if (lost) bus.emit({ type: 'signal_restored' });
      lost = false;
    } else if (hadValid && !lost) {
      lost = true;
      bus.emit({ type: 'signal_lost' });
    }
    recorder.recordState(state);
    published = activeKind === 'REPLAY' ? { ...state, t: now() } : state;
    for (const listener of listeners) listener(published);
  }

  function onFrame(frame: BandFrame): void {
    if (activeKind === 'REPLAY') replayAnchor = { frameT: frame.t, wall: now() };
    recorder.recordFrame(frame);
    pipeline.ingest(frame, clock());
  }

  async function startSource(next: Source): Promise<void> {
    // Keep the running source until the new one has started: a cancelled Bluetooth picker must not leave no input.
    const previous = source;
    const previousKind = activeKind;
    source = next;
    activeKind = next.kind;
    if (next.kind === 'REPLAY') replayAnchor = { frameT: 0, wall: now() };
    try {
      await next.start(onFrame);
    } catch (error) {
      if (source === next) {
        source = previous;
        activeKind = previousKind;
      }
      throw error;
    }
    if (previous !== null && previous !== next) previous.stop();
  }

  function startLive(): Promise<void> {
    const live: Source = createPiEEGSource({
      config,
      ...deps.live,
      onError: (error) => console.error('[signal] board error', error),
      onDisconnect: () => {
        if (source === live) source = null;
      },
    });
    return startSource(live);
  }

  async function startReplay(): Promise<void> {
    if (!params.replay) throw new Error('replay needs ?replay=<name>.jsonl (a file under /recordings/)');
    const recording = parseRecording(await fetchText(`/recordings/${params.replay}`));
    await startSource(createReplaySource({ frames: recording.frames }));
  }

  const startSim = (): Promise<void> => startSource(createSimSource({ config, onError: (error) => console.error('[signal] simulator error', error) }));

  const startFrames = (frames: BandFrame[], onEnd: () => void): Promise<void> => startSource(createReplaySource({ frames, onEnd }));
  const initialChoice: SourceChoice = params.preset ? { kind: 'preset', id: params.preset } : startKind === 'LIVE_EEG' ? { kind: 'live' } : startKind === 'REPLAY' ? { kind: 'preset', id: 'url-replay' } : { kind: 'sim' };
  const presets = createPresetController({
    fetchText,
    storage: deps.storage,
    now,
    startSim,
    startLive,
    startFrames,
    exportRecording: () => recorder.toJSONL(),
    getBaselines: () => pipeline.getBaselines(),
    setBaselines: (baselines) => pipeline.setBaselines(baselines),
    algo: entry.algorithm.id,
    initial: initialChoice,
  });

  async function startFromParams(): Promise<void> {
    if (params.preset) return presets.select({ kind: 'preset', id: params.preset });
    if (params.source === 'replay') return startReplay();
    if (params.source === 'live') return; // wait for the Connect button: Web Bluetooth needs a click
    return startSim();
  }
  void startFromParams().catch((error) => console.error('[signal] could not start the source', error));

  setInterval(publish, 1000 / config.updateHz);

  return {
    reader: {
      getState: () => published,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    control: {
      async connect(kind) {
        // No await before startLive(): the Bluetooth picker must open inside the click that called us.
        await (kind === 'LIVE_EEG' ? startLive() : kind === 'REPLAY' ? startReplay() : startSim());
      },
      disconnect() {
        source?.stop();
        source = null;
      },
      setMode: (mode) => pipeline.setMode(mode),
      async calibrate(step) {
        if (calibrating) throw new Error('a calibration step is already running');
        calibrating = true;
        try {
          pipeline.startCalibration(step, clock());
          await sleep(pipeline.calibrationDurationMs(step));
          const result = pipeline.finishCalibration();
          bus.emit(result.reasonKey === undefined ? { type: 'calibration_result', ok: result.ok } : { type: 'calibration_result', ok: result.ok, reasonKey: result.reasonKey });
          publish();
          return result;
        } finally {
          calibrating = false;
        }
      },
    },
    getDiagnostics: () => pipeline.getDiagnostics(),
    exportRecording: () => recorder.toJSONL(),
    presets,
  };
}
