/**
 * Algorithm intensity-v2: active feature from absolute 13-30 Hz power, resting feature unchanged.
 *
 * Why: v1's active feature, beta/(theta+alpha+beta), is a ratio, and a jaw clench raises every band,
 * so the ratio barely moves (simulator: 0.523 relaxed, 0.502 clench) and calibration fails with
 * `calibration.noSeparation`. Absolute power in 13-30 Hz moves a lot (log10 1.5 to 2.4 on the
 * simulator). This feature is mostly muscle activity (say so); it is never a medical or emotion
 * measure. `log10(1 + power)` keeps values non-negative so the calibration ratio checks stay valid.
 * Real-board scale is unverified. Falls back to SDK band powers when a frame has no spectrum.
 */
import type { Algorithm, BandFrame, FeatureExtractor, Features } from '../../shared/contracts/signal-internal';
import { extractFeatures } from '../stages/features';
import { scoreWithBaselines } from '../stages/scorer';

const BETA_MIN_HZ = 13;
const BETA_MAX_HZ = 30;

function betaPower(frame: BandFrame): number {
  const spectrum = frame.spectrum;
  if (spectrum === null || spectrum.freqsHz.length === 0 || spectrum.freqsHz.length !== spectrum.psd.length) return frame.bands.beta;
  let sum = 0;
  spectrum.freqsHz.forEach((freq, i) => {
    const power = spectrum.psd[i]!;
    if (freq >= BETA_MIN_HZ && freq <= BETA_MAX_HZ && Number.isFinite(power) && power >= 0) sum += power;
  });
  return sum;
}

export const extractFeaturesV2: FeatureExtractor = (frame, config): Features => {
  const power = betaPower(frame);
  const active = Number.isFinite(power) && power > 0 ? Math.log10(1 + power) : 0;
  return { active, resting: extractFeatures(frame, config).resting };
};

export const intensityV2: Algorithm = { id: 'intensity-v2', extract: extractFeaturesV2, score: scoreWithBaselines };
