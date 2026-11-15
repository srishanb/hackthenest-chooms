/**
 * Signal lane entry point: sources + pipeline + clock, exposed as the `SignalHandle`.
 *
 * Why this shape: the game only ever receives `reader` (read-only `ComposureState`). The UI gets
 * `control` (connect, calibrate, mode) and diagnostics for the debug overlay. Nothing outside this
 * lane touches a device, a frame or the SDK.
 *
 * Source and algorithm come from the URL (`?source=sim|replay|live`, `?algo=`, `?mode=fixed`,
 * `?replay=`), see url-params.ts. The pipeline publishes about 12 times a second.
 */
import type { ComposureState, InputSourceKind } from '../shared/contracts/composure';
import type { SignalConfig } from '../shared/contracts/config';
import type { EventBus } from '../shared/contracts/events';
import type { SignalHandle } from '../shared/contracts/signal-api';
import type { BandFrame, Source } from '../shared/contracts/signal-internal';
import { resolveAlgorithm } from './algorithms/registry';
import { createPipeline } from './pipeline';
import { parseRecording } from './sources/recording-format';
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
  const pipeline = createPipeline({ config, entry, initialMode: params.mode ?? 'adaptive', initialSource: config.defaultSource });
  const listeners = new Set<(state: ComposureState) => void>();

  let source: Source | null = null;
  let activeKind: InputSourceKind = config.defaultSource;
  // Replay frames keep their recorded times, so "now" for replay is the newest frame's time plus real time since it arrived.
  let replayAnchor = { frameT: 0, wall: 0 };
  const clock = (): number => (activeKind === 'REPLAY' ? replayAnchor.frameT + (now() - replayAnchor.wall) : now());

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
    for (const listener of listeners) listener(state);
  }

  function onFrame(frame: BandFrame): void {
    if (activeKind === 'REPLAY') replayAnchor = { frameT: frame.t, wall: now() };
    pipeline.ingest(frame, clock());
  }

  async function startSource(next: Source): Promise<void> {
    source?.stop();
    source = next;
    activeKind = next.kind;
    if (next.kind === 'REPLAY') replayAnchor = { frameT: 0, wall: now() };
    await next.start(onFrame);
  }

  async function startReplay(): Promise<void> {
    if (!params.replay) throw new Error('replay needs ?replay=<name>.jsonl (a file under /recordings/)');
    const recording = parseRecording(await fetchText(`/recordings/${params.replay}`));
    await startSource(createReplaySource({ frames: recording.frames }));
  }

  const startSim = (): Promise<void> => startSource(createSimSource({ config, onError: (error) => console.error('[signal] simulator error', error) }));

  async function startFromParams(): Promise<void> {
    if (params.source === 'replay') return startReplay();
    if (params.source === 'live') console.error('[signal] ?source=live is not available until P3; using the simulator (the badge says SIMULATED INPUT)');
    return startSim();
  }
  void startFromParams().catch((error) => console.error('[signal] could not start the source', error));

  setInterval(publish, 1000 / config.updateHz);

  return {
    reader: {
      getState: () => pipeline.getState(),
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    control: {
      async connect(kind) {
        if (kind === 'LIVE_EEG') throw new Error('Live EEG is not available until P3 (PiEEGSource)');
        await (kind === 'REPLAY' ? startReplay() : startSim());
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
  };
}
