/**
 * Quality estimation stage: maps contact quality and packet loss to a 0..1 score.
 *
 * Why: keeps signal quality strictly separate from the EEG features so poor contact or
 * dropped packets gate validity without distorting feature values.
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { BandFrame, QualityEstimator } from '../../shared/contracts/signal-internal';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Compute `contactGood01 * (1 - packetLoss01)`, defaulting unknown factors to 1, clamped to 0..1. */
export const estimateQuality: QualityEstimator = (
  frame: BandFrame,
  _config: SignalConfig,
): number => {
  const contactFactor =
    frame.contactGood01 !== null && Number.isFinite(frame.contactGood01)
      ? clamp01(frame.contactGood01)
      : 1;

  const packetFactor =
    frame.packetLoss01 !== null && Number.isFinite(frame.packetLoss01)
      ? clamp01(1 - clamp01(frame.packetLoss01))
      : 1;

  return clamp01(contactFactor * packetFactor);
};
