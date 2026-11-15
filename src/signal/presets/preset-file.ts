/**
 * Preset files: a normal recording (JSONL) plus an optional `baselines` line.
 *
 * Why: a preset must work the moment it is chosen. The two baselines (low and high for the active and
 * resting features) are what calibration normally measures from a person; a preset carries its own so
 * the same pipeline (preprocess, quality, features, scorer, smoother) scores it on a known scale.
 * `parseRecording` skips unknown line types, so these files still load as ordinary recordings.
 */
import type { BandFrame, Baseline, Baselines } from '../../shared/contracts/signal-internal';
import { createHeader, parseRecording, serializeRecording } from '../sources/recording-format';

export interface PresetData {
  frames: BandFrame[];
  baselines: Baselines | null;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function readBaseline(value: unknown): Baseline | null {
  if (!isObject(value)) return null;
  const { low, high } = value;
  return typeof low === 'number' && typeof high === 'number' && Number.isFinite(low) && Number.isFinite(high) && high > low ? { low, high } : null;
}

export function serializePreset(frames: readonly BandFrame[], baselines: Baselines | null, algo: string | null, createdAt: Date = new Date()): string {
  const base = serializeRecording({ header: createHeader('SIMULATED', algo, createdAt), frames: [...frames] }).split('\n');
  if (baselines) base.splice(1, 0, JSON.stringify({ type: 'baselines', active: baselines.active, resting: baselines.resting }));
  return base.join('\n');
}

/** Parse a preset or a plain recording. Throws a readable error for a bad file or one with no frames. */
export function parsePreset(text: string): PresetData {
  const { frames } = parseRecording(text);
  if (frames.length < 2) throw new Error('This recording has too few samples to replay.');
  let baselines: Baselines | null = null;
  for (const line of text.split('\n')) {
    if (!line.includes('"baselines"')) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isObject(parsed) && parsed['type'] === 'baselines') {
        const active = readBaseline(parsed['active']);
        const resting = readBaseline(parsed['resting']);
        if (active || resting) baselines = { active, resting };
      }
    } catch {
      // parseRecording already rejected malformed lines
    }
  }
  return { frames, baselines };
}

export function durationMs(frames: readonly BandFrame[]): number {
  const first = frames[0];
  const last = frames[frames.length - 1];
  return first && last ? Math.max(0, last.t - first.t) : 0;
}

const round = (value: number, digits: number): number => Math.round(value * 10 ** digits) / 10 ** digits;

/** Keep the newest `keepMs` of frames, start the clock at 0 and round numbers so the file stays small. */
export function compactFrames(frames: readonly BandFrame[], keepMs: number): BandFrame[] {
  const last = frames[frames.length - 1];
  if (!last) return [];
  const kept = frames.filter((frame) => frame.t >= last.t - keepMs);
  const start = kept[0]?.t ?? 0;
  return kept.map((frame) => ({
    ...frame,
    t: round(frame.t - start, 3),
    bands: { delta: round(frame.bands.delta, 3), theta: round(frame.bands.theta, 3), alpha: round(frame.bands.alpha, 3), beta: round(frame.bands.beta, 3), gamma: round(frame.bands.gamma, 3) },
    spectrum: frame.spectrum && { freqsHz: frame.spectrum.freqsHz.map((f) => round(f, 3)), psd: frame.spectrum.psd.map((p) => round(p, 3)) },
  }));
}

/** The frames with every timestamp moved by `offsetMs`. */
export function shiftFrames(frames: readonly BandFrame[], offsetMs: number): BandFrame[] {
  return frames.map((frame) => ({ ...frame, t: frame.t + offsetMs }));
}
