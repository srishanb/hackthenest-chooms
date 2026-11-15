/**
 * The pipeline: wires the stages into one object that turns band frames into `ComposureState`.
 *
 *   frame -> preprocess -> features -> (calibration) -> scorer -> smoother -> gates -> ComposureState
 *
 * Why no timers and no source here: the pipeline only does maths on what it is given, with the
 * current time passed in. That makes it testable and lets the evaluation script run any
 * recording through any algorithm faster than real time. `index.ts` adds the sources and clock.
 *
 * Usage: call `ingest(frame, nowMs)` as frames arrive and `step(nowMs)` about 12 times a second
 * to get the state. `process` does both, for headless use.
 *
 * Calibration: each step (active, resting) is two equal phases. Active: relaxed play, then jaw
 * clench. Resting: eyes open, then eyes closed. The first half collects the LOW window and the
 * second half the HIGH window; the screens cue the player from the configured durations.
 */
import type { ComposureState, InputSourceKind, SignalMode } from '../shared/contracts/composure';
import type { SignalConfig } from '../shared/contracts/config';
import type { CalibrationResult, CalibrationStep, SignalDiagnostics } from '../shared/contracts/signal-api';
import type { BandFrame, Baselines, Features } from '../shared/contracts/signal-internal';
import type { AlgorithmEntry } from './algorithms/registry';
import { calibrateBaseline, createCalibrationCollector, stepCalibrationCollector, type CalibrationCollectorState } from './stages/calibration';
import { isValid, nextRestingActive, targetsFor } from './stages/gates';
import { preprocess } from './stages/preprocess';
import { estimateQuality } from './stages/quality';
import { smooth } from './stages/smoother';

/** Reported when no frame has ever arrived. */
const NO_SAMPLE_AGE_MS = 99_999;

export interface PipelineDeps {
  config: SignalConfig;
  entry: AlgorithmEntry;
  initialMode: SignalMode;
  initialSource: InputSourceKind;
}

export interface Pipeline {
  ingest(frame: BandFrame, nowMs: number): void;
  step(nowMs: number): ComposureState;
  /** `ingest` then `step`. */
  process(frame: BandFrame, nowMs: number): ComposureState;
  setMode(mode: SignalMode): void;
  /** The baselines in force; a saved preset stores these so it replays on the same scale. */
  getBaselines(): Baselines;
  /** Replace the baselines (a preset brings its own; null entries clear one). Runs through the same scoring as a calibration. */
  setBaselines(next: Baselines): void;
  getState(): ComposureState;
  getDiagnostics(): SignalDiagnostics;
  calibrationDurationMs(step: CalibrationStep): number;
  /** Start collecting; replaces any calibration already in progress. */
  startCalibration(step: CalibrationStep, nowMs: number): void;
  /** Stop collecting, check the two windows, and keep the baseline if they pass. */
  finishCalibration(): CalibrationResult;
}

interface ActiveCalibration {
  step: CalibrationStep;
  startMs: number;
  low: CalibrationCollectorState;
  high: CalibrationCollectorState;
}

export function createPipeline(deps: PipelineDeps): Pipeline {
  const { config, entry } = deps;
  const { algorithm } = entry;

  let mode = deps.initialMode;
  let lastFrame: BandFrame | null = null;
  let features: Features = { active: 0, resting: 0 };
  let quality = 0;
  let baselines: Baselines = { active: null, resting: null };
  let calibration: ActiveCalibration | null = null;

  let intensity = config.neutralIntensity;
  let resting = 0;
  let restingActive = false;
  let lastStepMs: number | null = null;
  let scoresNow = { intensity: config.neutralIntensity, resting: 0 };

  const isCalibrated = (): boolean =>
    !entry.needsCalibration || (mode === 'fixed' ? baselines.resting !== null : baselines.active !== null);

  let state: ComposureState = {
    intensity,
    resting,
    restingActive,
    quality: 0,
    valid: false,
    sampleAgeMs: NO_SAMPLE_AGE_MS,
    held: false,
    mode,
    calibrated: isCalibrated(),
    source: deps.initialSource,
    algo: algorithm.id,
    t: 0,
  };

  function ingest(frame: BandFrame, nowMs: number): void {
    if (!preprocess(frame, nowMs, config).valid) return; // keep the last good frame; it will age out
    lastFrame = frame;
    features = algorithm.extract(frame, config);
    quality = estimateQuality(frame, config);

    if (calibration) {
      const half = (calibrationDurationMs(calibration.step) / 2) | 0;
      const phase = nowMs - calibration.startMs < half ? 'low' : 'high';
      const value = calibration.step === 'active' ? features.active : features.resting;
      calibration[phase] = stepCalibrationCollector(calibration[phase], frame, nowMs, config, value);
    }
  }

  function step(nowMs: number): ComposureState {
    const fresh = lastFrame !== null && preprocess(lastFrame, nowMs, config).fresh;
    const calibrated = isCalibrated();
    const currentQuality = lastFrame ? quality : 0;
    const valid = isValid({ fresh, quality: currentQuality, calibrated }, config);

    scoresNow = lastFrame ? algorithm.score(features, baselines, config) : { intensity: config.neutralIntensity, resting: 0 };
    const targets = targetsFor(scoresNow, valid, mode, config);
    const nominalMs = 1000 / config.updateHz;
    const deltaMs = lastStepMs === null ? nominalMs : nowMs - lastStepMs;
    const dtMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : nominalMs;
    if (Number.isFinite(nowMs)) lastStepMs = nowMs;

    intensity = smooth(intensity, targets.intensity, dtMs, config.smoothing.intensityTauMs);
    const restingValid = valid && (!entry.needsCalibration || baselines.resting !== null);
    resting = restingValid ? smooth(resting, targets.resting, dtMs, config.smoothing.restingTauMs) : 0;
    restingActive = nextRestingActive(restingActive, resting, restingValid, config.restingThreshold);

    state = {
      intensity,
      resting,
      restingActive,
      quality: currentQuality,
      valid,
      sampleAgeMs: lastFrame ? Math.max(0, nowMs - lastFrame.t) : NO_SAMPLE_AGE_MS,
      held: false, // the camera artifact gate that would set this is deferred
      mode,
      calibrated,
      source: lastFrame?.source ?? deps.initialSource,
      algo: algorithm.id,
      t: nowMs,
    };
    return state;
  }

  function calibrationDurationMs(stepName: CalibrationStep): number {
    return stepName === 'active' ? config.calibration.activeMs : config.calibration.restingMs;
  }

  return {
    ingest,
    step,
    process(frame, nowMs) {
      ingest(frame, nowMs);
      return step(nowMs);
    },
    setMode(next) {
      mode = next;
    },
    getState: () => state,
    getDiagnostics(): SignalDiagnostics {
      const thresholds: Record<string, number> = {
        restingOn: config.restingThreshold.on,
        restingOff: config.restingThreshold.off,
        qualityFloor: config.qualityFloor,
        staleAfterMs: config.staleAfterMs,
      };
      for (const name of ['active', 'resting'] as const) {
        const baseline = baselines[name];
        if (baseline) {
          thresholds[`${name}.low`] = baseline.low;
          thresholds[`${name}.high`] = baseline.high;
        }
      }
      return {
        features: {
          active: features.active,
          resting: features.resting,
          'score.intensity': scoresNow.intensity,
          'score.resting': scoresNow.resting,
        },
        thresholds,
        contactGood01: lastFrame?.contactGood01 ?? null,
        packetLoss01: lastFrame?.packetLoss01 ?? null,
      };
    },
    calibrationDurationMs,
    getBaselines: () => ({ active: baselines.active && { ...baselines.active }, resting: baselines.resting && { ...baselines.resting } }),
    setBaselines(next) {
      baselines = { active: next.active && { ...next.active }, resting: next.resting && { ...next.resting } };
    },
    startCalibration(stepName, nowMs) {
      calibration = { step: stepName, startMs: nowMs, low: createCalibrationCollector(), high: createCalibrationCollector() };
    },
    finishCalibration(): CalibrationResult {
      if (!calibration) throw new Error('finishCalibration called with no calibration in progress');
      const { step: stepName, low, high } = calibration;
      calibration = null;
      const outcome = calibrateBaseline(low.samples, high.samples, stepName);
      if (outcome.ok && outcome.baseline) baselines = { ...baselines, [stepName]: outcome.baseline };
      return outcome.reasonKey === undefined ? { step: stepName, ok: outcome.ok } : { step: stepName, ok: outcome.ok, reasonKey: outcome.reasonKey };
    },
  };
}
