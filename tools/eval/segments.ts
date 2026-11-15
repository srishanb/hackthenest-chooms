/**
 * Resting separation per labelled segment: how much higher the resting feature is in eyes-closed
 * segments than in eyes-open ones, read from `label` lines in a recording.
 *
 * Why: before tuning on a real head we need one number that says "this headset sees the alpha
 * difference". Uses the algorithm's own `resting` feature (alpha share), the median of each
 * label's frames, skipping the first `settleMs` of every segment. A segment runs from its label
 * to the next label (the last one ends with an `end` label).
 */
import type { SignalConfig } from '../../src/shared/contracts/config';
import type { Algorithm, BandFrame } from '../../src/shared/contracts/signal-internal';

export interface LabelMark {
  t: number;
  label: string;
}

export interface SegmentStat {
  label: string;
  segments: number;
  frames: number;
  restingMedian: number;
}

export interface RestingSeparation {
  stats: SegmentStat[];
  /** eyes_closed median over eyes_open median, or null when either side is missing or the open median is not above 0. */
  closedOverOpen: number | null;
}

export function extractLabels(jsonlText: string): LabelMark[] {
  const marks: LabelMark[] = [];
  for (const raw of jsonlText.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed['type'] === 'label' && typeof parsed['t'] === 'number' && typeof parsed['label'] === 'string') marks.push({ t: parsed['t'], label: parsed['label'] });
    } catch {
      // parseRecording reports malformed lines
    }
  }
  return marks.sort((a, b) => a.t - b.t);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function restingSeparation(
  frames: readonly BandFrame[],
  marks: readonly LabelMark[],
  algorithm: Algorithm,
  config: SignalConfig,
  settleMs = 3000,
): RestingSeparation | null {
  if (marks.length < 2) return null;
  const values = new Map<string, number[]>();
  const segmentCount = new Map<string, number>();
  marks.forEach((mark, i) => {
    const next = marks[i + 1];
    if (!next || mark.label === 'end') return;
    segmentCount.set(mark.label, (segmentCount.get(mark.label) ?? 0) + 1);
    const list = values.get(mark.label) ?? [];
    for (const frame of frames) {
      if (frame.t >= mark.t + settleMs && frame.t < next.t) list.push(algorithm.extract(frame, config).resting);
    }
    values.set(mark.label, list);
  });
  const stats: SegmentStat[] = [...values.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, segments: segmentCount.get(label) ?? 0, frames: list.length, restingMedian: median(list) }));
  const open = stats.find((s) => s.label === 'eyes_open');
  const closed = stats.find((s) => s.label === 'eyes_closed');
  const closedOverOpen = open && closed && open.restingMedian > 0 ? closed.restingMedian / open.restingMedian : null;
  return { stats, closedOverOpen };
}

export function formatSeparation(result: RestingSeparation): string {
  const rows = result.stats.map((s) => `  ${s.label.padEnd(12)} ${s.segments} segments, ${s.frames} frames, resting median ${s.restingMedian.toFixed(3)}`);
  rows.push(`  closed/open  ${result.closedOverOpen === null ? 'n/a' : result.closedOverOpen.toFixed(2)}`);
  return `Resting separation\n${rows.join('\n')}`;
}
