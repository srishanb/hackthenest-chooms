/**
 * Scorer stage: turns raw features into 0..1 scores using the player's own baselines.
 *
 * Why: heads differ, so a raw ratio means nothing until it is placed between this player's
 * low and high calibration values. Before calibration there is no baseline, so the intensity
 * falls back to the neutral value and the resting score to 0 (and the pipeline marks the
 * state not calibrated, which makes it invalid).
 */
import type { SignalConfig } from '../../shared/contracts/config';
import type { Baseline, Baselines, Features, Scorer, Scores } from '../../shared/contracts/signal-internal';

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

/** Where `value` sits between `baseline.low` (0) and `baseline.high` (1). A degenerate baseline gives 0. */
export function normalise(value: number, baseline: Baseline): number {
  const span = baseline.high - baseline.low;
  if (!Number.isFinite(value) || !(span > 0)) return 0;
  return clamp01((value - baseline.low) / span);
}

export const scoreWithBaselines: Scorer = (features: Features, baselines: Baselines, config: SignalConfig): Scores => ({
  intensity: baselines.active ? normalise(features.active, baselines.active) : config.neutralIntensity,
  resting: baselines.resting ? normalise(features.resting, baselines.resting) : 0,
});
