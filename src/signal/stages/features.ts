/**
 * Feature extraction stage: computes raw resting (`a`) and active-play (`m`) ratios.
 *
 * Why: uses our own frequency band edges on the power spectrum (falling back to SDK
 * band powers when the spectrum is absent). Note: `m` (beta / (theta + alpha + beta))
 * is partly muscle activity (e.g. jaw clench) and is never a medical or emotion metric.
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame, FeatureExtractor, Features } from '../../shared/contracts/signal-internal';

// Version 1 band edges (Hz), matching the SDK's theta/alpha/beta ranges.
// Gamma is excluded because the 40 Hz bandpass low-pass cuts most of 30-100 Hz.
const THETA_MIN_HZ = 4;
const THETA_MAX_HZ = 8;
const ALPHA_MIN_HZ = 8;
const ALPHA_MAX_HZ = 13;
const BETA_MIN_HZ = 13;
const BETA_MAX_HZ = 30;

function sumBandPowersFromSpectrum(freqsHz: readonly number[], psd: readonly number[]): {
  theta: number;
  alpha: number;
  beta: number;
} {
  let theta = 0;
  let alpha = 0;
  let beta = 0;

  for (let i = 0; i < freqsHz.length; i += 1) {
    const f = freqsHz[i]!;
    const p = psd[i]!;
    if (!Number.isFinite(f) || !Number.isFinite(p) || p < 0) continue;

    if (f >= THETA_MIN_HZ && f < THETA_MAX_HZ) theta += p;
    else if (f >= ALPHA_MIN_HZ && f < ALPHA_MAX_HZ) alpha += p;
    else if (f >= BETA_MIN_HZ && f <= BETA_MAX_HZ) beta += p;
  }

  return { theta, alpha, beta };
}

/** Extract `active` (`m`) and `resting` (`a`) features from `frame`. */
export const extractFeatures: FeatureExtractor = (
  frame: BandFrame,
  _config: SignalConfig,
): Features => {
  const hasSpectrum =
    frame.spectrum !== null &&
    frame.spectrum.freqsHz.length > 0 &&
    frame.spectrum.freqsHz.length === frame.spectrum.psd.length;

  const { theta, alpha, beta } = hasSpectrum
    ? sumBandPowersFromSpectrum(frame.spectrum!.freqsHz, frame.spectrum!.psd)
    : frame.bands;

  const total = theta + alpha + beta;
  if (!Number.isFinite(total) || total <= 0) {
    return { active: 0, resting: 0 };
  }

  return {
    active: beta / total,
    resting: alpha / total,
  };
};
