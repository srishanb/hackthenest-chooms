/**
 * Preprocess stage: validates incoming band frames and judges freshness against `nowMs`.
 *
 * Why: downstream stages assume finite, non-negative power values, and replay frames
 * keep their original recording timestamps so freshness must be judged against a
 * caller-supplied `nowMs` rather than `performance.now()`.
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame, Preprocess } from '../../shared/contracts/signal-internal';

export interface PreprocessResult {
  frame: BandFrame;
  fresh: boolean;
  valid: boolean;
}

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/** Returns true when `frame` has finite timestamp and finite, non-negative powers. */
export function isValidBandFrame(frame: BandFrame): boolean {
  if (!Number.isFinite(frame.t)) return false;

  const { delta, theta, alpha, beta, gamma } = frame.bands;
  if (
    !isFiniteNonNegative(delta) ||
    !isFiniteNonNegative(theta) ||
    !isFiniteNonNegative(alpha) ||
    !isFiniteNonNegative(beta) ||
    !isFiniteNonNegative(gamma)
  ) {
    return false;
  }

  if (frame.spectrum !== null) {
    const { freqsHz, psd } = frame.spectrum;
    if (freqsHz.length !== psd.length) return false;
    for (let i = 0; i < psd.length; i += 1) {
      if (!Number.isFinite(freqsHz[i]) || !isFiniteNonNegative(psd[i]!)) {
        return false;
      }
    }
  }

  return true;
}

/** Validate `frame` and compute whether `nowMs - frame.t <= config.staleAfterMs`. */
export function preprocess(
  frame: BandFrame,
  nowMs: number,
  config: SignalConfig,
): PreprocessResult {
  const valid = isValidBandFrame(frame);
  if (!valid || !Number.isFinite(nowMs)) {
    return { frame, fresh: false, valid: false };
  }

  const ageMs = nowMs - frame.t;
  const fresh = ageMs >= 0 && ageMs <= config.staleAfterMs;
  return { frame, fresh, valid: true };
}

// Verify conformance with the frozen Preprocess stage contract.
const _preprocessContractCheck: Preprocess = preprocess;
void _preprocessContractCheck;
