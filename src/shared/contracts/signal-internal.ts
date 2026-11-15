/**
 * Types used inside the signal lane and by its tools (replay, evaluation).
 *
 * Why here and not in src/signal/: `tools/eval` and recordings need the same shapes, and
 * keeping the stage interfaces in one place is what makes "a new algorithm is a new file
 * plus a registry line" true. Nothing outside the signal lane and its tools imports this.
 *
 * Pipeline: Source -> Preprocess -> Features -> Calibration -> Scorer -> Smoother -> Gates -> ComposureState
 *
 * FROZEN after P0. Only the integrator changes this file.
 */
import type { InputSourceKind } from './composure';
import type { SignalConfig } from './config';

/** Band powers averaged across channels. Units are whatever the source gives; only ratios are used. */
export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

/** One frame from a source, about 12 times a second. This is also the recording format (one JSON object per line). */
export interface BandFrame {
  /** Timestamp in ms on the performance.now() clock (or the recording's clock for replay). */
  t: number;
  bands: BandPowers;
  /** Optional power spectrum, so the Features stage can use its own band edges. */
  spectrum: { freqsHz: number[]; psd: number[] } | null;
  /** Fraction of channels with good contact, 0 to 1, or null when unknown. */
  contactGood01: number | null;
  /** Fraction of packets lost, 0 to 1, or null when unknown. */
  packetLoss01: number | null;
  source: InputSourceKind;
}

/** Anything that produces band frames: the simulator, the real board, a recording. */
export interface Source {
  kind: InputSourceKind;
  /** Start delivering frames. LIVE_EEG must be started from a click handler. */
  start(onFrame: (frame: BandFrame) => void): Promise<void>;
  stop(): void;
}

/** The two raw features, before per-player normalisation. */
export interface Features {
  /** Active-play feature (drives intensity). Partly muscle activity; say so. */
  active: number;
  /** Resting feature (drives the ember). */
  resting: number;
}

/** A calibrated range for one feature: `low` maps to 0 and `high` maps to 1. */
export interface Baseline {
  low: number;
  high: number;
}

export interface Baselines {
  active: Baseline | null;
  resting: Baseline | null;
}

/** Both outputs normalised to 0..1, before smoothing and gates. */
export interface Scores {
  intensity: number;
  resting: number;
}

export type Preprocess = (frame: BandFrame, nowMs: number, config: SignalConfig) => { frame: BandFrame; fresh: boolean };
export type FeatureExtractor = (frame: BandFrame, config: SignalConfig) => Features;
export type QualityEstimator = (frame: BandFrame, config: SignalConfig) => number;
export type Calibrator = (samples: number[]) => Baseline | null;
export type Scorer = (features: Features, baselines: Baselines, config: SignalConfig) => Scores;
/** Time-based exponential smoothing: move `previous` toward `target` over `dtMs` with time constant `tauMs`. */
export type Smoother = (previous: number, target: number, dtMs: number, tauMs: number) => number;

/** A registered algorithm version. Adding one is a new file plus one line in the registry. */
export interface Algorithm {
  /** Shown on the debug overlay and selectable with `?algo=<id>`. */
  id: string;
  extract: FeatureExtractor;
  score: Scorer;
}
