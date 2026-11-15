/**
 * Signal recorder: buffers band frames, published ComposureState, and bus events as JSONL in memory.
 *
 * Why standalone: `src/signal/index.ts` does not yet expose raw `BandFrame`s on `SignalHandle`.
 * The integrator can hook `recordFrame`, `recordState`, and `recordEvent` into `createSignal`
 * without changing this module.
 *
 * Privacy: stores only band powers, PSD spectrum, quality metrics, composure states, and game
 * events. Never raw time-series EEG samples, and never a person's name.
 */
import type { ComposureState, InputSourceKind } from '../shared/contracts/composure';
import type { GameEvent } from '../shared/contracts/events';
import type { BandFrame } from '../shared/contracts/signal-internal';
import { createHeader } from './sources/recording-format';

export interface RecorderOptions {
  source: InputSourceKind;
  algo: string | null;
  createdAt?: Date;
}

export interface RecorderCounts {
  frames: number;
  states: number;
  events: number;
}

export interface Recorder {
  recordFrame(frame: BandFrame): void;
  recordState(state: ComposureState): void;
  recordEvent(event: GameEvent, tMs: number): void;
  toJSONL(): string;
  counts(): RecorderCounts;
  clear(): void;
}

export function createRecorder(options: RecorderOptions): Recorder {
  const createdAt = options.createdAt ?? new Date();
  let lines: string[] = [];
  let frameCount = 0;
  let stateCount = 0;
  let eventCount = 0;

  return {
    recordFrame(frame) {
      const sanitized: BandFrame = {
        t: frame.t,
        bands: { ...frame.bands },
        spectrum: frame.spectrum ? { freqsHz: [...frame.spectrum.freqsHz], psd: [...frame.spectrum.psd] } : null,
        contactGood01: frame.contactGood01,
        packetLoss01: frame.packetLoss01,
        source: frame.source,
      };
      lines.push(JSON.stringify({ type: 'frame', ...sanitized }));
      frameCount += 1;
    },

    recordState(state) {
      lines.push(JSON.stringify({ type: 'state', ...state }));
      stateCount += 1;
    },

    recordEvent(event, tMs) {
      lines.push(JSON.stringify({ type: 'event', t: tMs, event }));
      eventCount += 1;
    },

    toJSONL() {
      const header = createHeader(options.source, options.algo, createdAt);
      return `${[JSON.stringify(header), ...lines].join('\n')}\n`;
    },

    counts() {
      return { frames: frameCount, states: stateCount, events: eventCount };
    },

    clear() {
      lines = [];
      frameCount = 0;
      stateCount = 0;
      eventCount = 0;
    },
  };
}

/** Trigger a browser download of a JSONL recording string. */
export function downloadRecording(jsonl: string, filename?: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = filename ?? `lighten-recording-${stamp}.jsonl`;
  const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
