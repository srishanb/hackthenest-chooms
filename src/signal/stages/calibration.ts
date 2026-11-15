/**
 * Calibration stage: pure reducers and baseline checks for active-play and resting windows.
 *
 * Why: per-player baselines normalise individual EEG/EMG amplitude differences.
 * P1 starting-guess constants (until real-head tuning in P3):
 * - MIN_WINDOW_SAMPLES = 4 (at least 2 samples per half for repeatability)
 * - MAX_HALF_DIFF_RATIO = 0.25 (halves' medians must agree within 25% of their mean)
 * - MIN_SEPARATION_RATIO = 1.3 (high must be at least 1.3x low)
 * - ACTIVE_HIGH_QUANTILE = 0.9 (90th percentile of the clench window)
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { CalibrationStep } from '../../shared/contracts/signal-api';
import type { BandFrame, Baseline } from '../../shared/contracts/signal-internal';
import { preprocess } from './preprocess';
import { estimateQuality } from './quality';

export const MIN_WINDOW_SAMPLES = 4;
export const MAX_HALF_DIFF_RATIO = 0.25;
export const MIN_SEPARATION_RATIO = 1.3;
export const ACTIVE_HIGH_QUANTILE = 0.9;

export interface CalibrationOutcome {
  ok: boolean;
  baseline: Baseline | null;
  reasonKey?: string;
}

export interface CalibrationCollectorState {
  samples: number[];
  rejectedStale: number;
  rejectedInvalid: number;
}

/** Linear-interpolated quantile in [0, 1] over finite numbers. */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;

  const pos = Math.max(0, Math.min(1, p)) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo]! + frac * (sorted[hi]! - sorted[lo]!);
}

function isRepeatable(windowSamples: readonly number[]): boolean {
  const mid = Math.floor(windowSamples.length / 2);
  const firstHalf = windowSamples.slice(0, mid);
  const secondHalf = windowSamples.slice(mid);
  const m1 = quantile(firstHalf, 0.5);
  const m2 = quantile(secondHalf, 0.5);
  const meanMedian = (m1 + m2) / 2;

  if (meanMedian === 0) return m1 === m2;
  return Math.abs(m1 - m2) / Math.abs(meanMedian) <= MAX_HALF_DIFF_RATIO;
}

/**
 * Compute a calibrated `{ low, high }` baseline from separate low and high windows.
 * - `resting`: `low` = eyes-open median, `high` = eyes-closed median.
 * - `active`: `low` = relaxed-play median, `high` = 90th percentile of clench window.
 */
export function calibrateBaseline(
  lowWindow: readonly number[],
  highWindow: readonly number[],
  kind: CalibrationStep,
): CalibrationOutcome {
  const cleanLow = lowWindow.filter((v) => Number.isFinite(v));
  const cleanHigh = highWindow.filter((v) => Number.isFinite(v));

  if (cleanLow.length < MIN_WINDOW_SAMPLES || cleanHigh.length < MIN_WINDOW_SAMPLES) {
    return { ok: false, baseline: null, reasonKey: 'calibration.tooFewSamples' };
  }

  if (!isRepeatable(cleanLow) || !isRepeatable(cleanHigh)) {
    return { ok: false, baseline: null, reasonKey: 'calibration.unstable' };
  }

  const low = quantile(cleanLow, 0.5);
  const high = kind === 'active' ? quantile(cleanHigh, ACTIVE_HIGH_QUANTILE) : quantile(cleanHigh, 0.5);

  if (high <= low || high < MIN_SEPARATION_RATIO * low) {
    return { ok: false, baseline: null, reasonKey: 'calibration.noSeparation' };
  }

  return { ok: true, baseline: { low, high } };
}

/** Create an empty calibration sample collector state. */
export function createCalibrationCollector(): CalibrationCollectorState {
  return { samples: [], rejectedStale: 0, rejectedInvalid: 0 };
}

/**
 * Pure reducer step: accepts `featureValue` only if `frame` is fresh (against `nowMs`),
 * valid, and meets `config.qualityFloor`.
 */
export function stepCalibrationCollector(
  state: CalibrationCollectorState,
  frame: BandFrame,
  nowMs: number,
  config: SignalConfig,
  featureValue: number,
): CalibrationCollectorState {
  const checked = preprocess(frame, nowMs, config);
  if (!checked.valid || !Number.isFinite(featureValue)) {
    return { ...state, rejectedInvalid: state.rejectedInvalid + 1 };
  }
  if (!checked.fresh) {
    return { ...state, rejectedStale: state.rejectedStale + 1 };
  }

  const quality = estimateQuality(frame, config);
  if (quality < config.qualityFloor) {
    return { ...state, rejectedInvalid: state.rejectedInvalid + 1 };
  }

  return {
    ...state,
    samples: [...state.samples, featureValue],
  };
}
