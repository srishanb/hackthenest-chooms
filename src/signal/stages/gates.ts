/**
 * Gates stage: decides when the signal may be trusted, and what to do when it may not.
 *
 * Why separate from the maths: these are the safety rules. Invalid data eases effects toward
 * neutral and pauses the resting activation; it never jumps, never resets, and never counts.
 * Quality is checked here and is never folded into the features themselves.
 */
import type { SignalMode } from '../../shared/contracts/composure';
import type { SignalConfig } from '../../shared/contracts/config';
import type { Scores } from '../../shared/contracts/signal-internal';

export interface ValidityInput {
  /** The newest frame is recent enough (see preprocess). */
  fresh: boolean;
  quality: number;
  calibrated: boolean;
}

/** Valid means: fresh sample, quality at or above the floor, and calibrated. */
export function isValid(input: ValidityInput, config: SignalConfig): boolean {
  return input.fresh && input.quality >= config.qualityFloor && input.calibrated;
}

/**
 * Hysteresis: turn on at or above `on`, turn off at or below `off`, and never flip in between.
 * An invalid signal is never active.
 */
export function nextRestingActive(previous: boolean, resting: number, valid: boolean, threshold: { on: number; off: number }): boolean {
  if (!valid) return false;
  return previous ? resting > threshold.off : resting >= threshold.on;
}

/**
 * What the smoothed values should head toward this step.
 * - Invalid signal: intensity heads to neutral, resting to 0.
 * - Fixed mode (the active-play fallback): intensity stays at neutral, but resting still follows the signal.
 */
export function targetsFor(scores: Scores, valid: boolean, mode: SignalMode, config: SignalConfig): { intensity: number; resting: number } {
  return {
    intensity: valid && mode === 'adaptive' ? scores.intensity : config.neutralIntensity,
    resting: valid ? scores.resting : 0,
  };
}
