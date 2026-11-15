/**
 * Pure helpers for the guided eyes-open / eyes-closed checkpoint in the debug overlay.
 *
 * Why separate from the overlay: the maths and the file format are easy to unit test without a DOM.
 * The checkpoint compares the raw resting feature (alpha share) between eyes-open and eyes-closed
 * segments. Labels are written into the recording as `{"type":"label"}` lines, which older readers
 * skip, so the file still replays and `tools/eval` can score each segment.
 */

export type CheckpointLabel = 'eyes_open' | 'eyes_closed';

export interface CheckpointSegment {
  label: CheckpointLabel;
  ms: number;
}

/** Eyes open 15 s, eyes closed 15 s, twice. */
export const CHECKPOINT_PLAN: readonly CheckpointSegment[] = [
  { label: 'eyes_open', ms: 15_000 },
  { label: 'eyes_closed', ms: 15_000 },
  { label: 'eyes_open', ms: 15_000 },
  { label: 'eyes_closed', ms: 15_000 },
];

/** Samples in the first seconds of a segment are ignored while the person settles and the filters catch up. */
export const CHECKPOINT_SETTLE_MS = 3000;
/** The closed/open ratio must beat this to count as a clear separation. */
export const CHECKPOINT_PASS_RATIO = 1.3;

export interface CheckpointSample {
  label: CheckpointLabel;
  value: number;
}

export interface CheckpointResult {
  openMedian: number;
  closedMedian: number;
  /** closedMedian / openMedian, or null when a side has no samples or the open median is not above 0. */
  ratio: number | null;
  pass: boolean;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function summariseCheckpoint(samples: readonly CheckpointSample[]): CheckpointResult {
  const open = samples.filter((s) => s.label === 'eyes_open').map((s) => s.value);
  const closed = samples.filter((s) => s.label === 'eyes_closed').map((s) => s.value);
  const openMedian = median(open);
  const closedMedian = median(closed);
  const ratio = open.length > 0 && closed.length > 0 && openMedian > 0 ? closedMedian / openMedian : null;
  return { openMedian, closedMedian, ratio, pass: ratio !== null && ratio > CHECKPOINT_PASS_RATIO };
}

export interface CheckpointMark {
  /** performance.now() clock, the same clock as the recording's frames. */
  t: number;
  label: CheckpointLabel | 'end';
}

/** Adds one `label` line per mark to a recording's JSONL text. */
export function appendLabels(recordingText: string, marks: readonly CheckpointMark[]): string {
  const lines = marks.map((mark) => JSON.stringify({ type: 'label', t: mark.t, label: mark.label }));
  const base = recordingText.endsWith('\n') ? recordingText : `${recordingText}\n`;
  return `${base}${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`;
}
