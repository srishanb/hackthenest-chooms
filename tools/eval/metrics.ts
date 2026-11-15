/**
 * Evaluation metrics for headless signal-pipeline replays.
 *
 * Why separate from run-eval.ts: pure functions are fast to unit test without spawning
 * a CLI process.
 */
import type { ComposureState } from '../../src/shared/contracts/composure';

export interface CalibrationOutcomeSummary {
  t: number;
  ok: boolean;
  reasonKey?: string;
}

export interface EvalMetrics {
  algo: string;
  frameCount: number;
  durationSec: number;
  validSec: number;
  intensityMean: number;
  intensityMin: number;
  intensityMax: number;
  restingActiveSec: number;
  restingFlipsPerMin: number;
  calibrationOutcomes: CalibrationOutcomeSummary[];
}

export function computeEvalMetrics(
  algo: string,
  states: readonly ComposureState[],
  calibrationOutcomes: readonly CalibrationOutcomeSummary[] = [],
): EvalMetrics {
  if (states.length === 0) {
    return {
      algo,
      frameCount: 0,
      durationSec: 0,
      validSec: 0,
      intensityMean: 0,
      intensityMin: 0,
      intensityMax: 0,
      restingActiveSec: 0,
      restingFlipsPerMin: 0,
      calibrationOutcomes: [...calibrationOutcomes],
    };
  }

  let durationSec = 0;
  let validSec = 0;
  let restingActiveSec = 0;
  let intensitySum = 0;
  let intensityMin = Number.POSITIVE_INFINITY;
  let intensityMax = Number.NEGATIVE_INFINITY;
  let flips = 0;

  for (let i = 0; i < states.length; i += 1) {
    const curr = states[i]!;
    intensitySum += curr.intensity;
    if (curr.intensity < intensityMin) intensityMin = curr.intensity;
    if (curr.intensity > intensityMax) intensityMax = curr.intensity;

    if (i > 0) {
      const prev = states[i - 1]!;
      const dtSec = Math.max(0, curr.t - prev.t) / 1000;
      durationSec += dtSec;
      if (curr.valid) validSec += dtSec;
      if (curr.restingActive) restingActiveSec += dtSec;
      if (curr.restingActive !== prev.restingActive) flips += 1;
    }
  }

  const restingFlipsPerMin = durationSec > 0 ? (flips / durationSec) * 60 : 0;

  return {
    algo,
    frameCount: states.length,
    durationSec,
    validSec,
    intensityMean: intensitySum / states.length,
    intensityMin,
    intensityMax,
    restingActiveSec,
    restingFlipsPerMin,
    calibrationOutcomes: [...calibrationOutcomes],
  };
}

/** Extract any `calibration_result` events from raw recording JSONL text. */
export function extractCalibrationOutcomes(jsonlText: string): CalibrationOutcomeSummary[] {
  const outcomes: CalibrationOutcomeSummary[] = [];
  for (const rawLine of jsonlText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed['type'] !== 'event') continue;
      const event = parsed['event'] as Record<string, unknown> | undefined;
      if (!event || event['type'] !== 'calibration_result') continue;
      const ok = Boolean(event['ok']);
      const reasonKey = typeof event['reasonKey'] === 'string' ? event['reasonKey'] : undefined;
      const t = typeof parsed['t'] === 'number' ? parsed['t'] : 0;
      outcomes.push(reasonKey !== undefined ? { t, ok, reasonKey } : { t, ok });
    } catch {
      // Ignore malformed lines here; parseRecording validates the recording.
    }
  }
  return outcomes;
}

export function formatEvalTable(metrics: EvalMetrics): string {
  const rows: Array<[string, string]> = [
    ['Algorithm', metrics.algo],
    ['Frames', String(metrics.frameCount)],
    ['Duration (s)', metrics.durationSec.toFixed(2)],
    ['Seconds valid', metrics.validSec.toFixed(2)],
    ['Intensity mean', metrics.intensityMean.toFixed(3)],
    ['Intensity min', metrics.intensityMin.toFixed(3)],
    ['Intensity max', metrics.intensityMax.toFixed(3)],
    ['Resting-active (s)', metrics.restingActiveSec.toFixed(2)],
    ['On/off flips / min', metrics.restingFlipsPerMin.toFixed(2)],
  ];

  if (metrics.calibrationOutcomes.length > 0) {
    const formatted = metrics.calibrationOutcomes
      .map((item) => (item.ok ? `ok @ ${item.t.toFixed(0)}ms` : `fail(${item.reasonKey ?? 'unknown'}) @ ${item.t.toFixed(0)}ms`))
      .join(', ');
    rows.push(['Calibration', formatted]);
  }

  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  return rows.map(([label, value]) => `${label.padEnd(labelWidth)}  ${value}`).join('\n');
}
