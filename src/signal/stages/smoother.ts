/**
 * Smoother stage: time-based exponential smoothing.
 *
 * Why time-based and not per-sample: the signal arrives at about 12 Hz but the board's real
 * rate drifts and frames can be dropped. Using elapsed milliseconds gives the same feel at
 * any rate. This is the same formula the effects engine uses (src/game/effects).
 */
import type { Smoother } from '../../shared/contracts/signal-internal';

/** Move `previous` toward `target` over `dtMs` with time constant `tauMs` (63 % of the way after one tau). */
export const smooth: Smoother = (previous, target, dtMs, tauMs) => {
  if (!Number.isFinite(target)) return previous;
  if (tauMs <= 0) return target;
  const blend = 1 - Math.exp(-Math.max(dtMs, 0) / tauMs);
  return previous + (target - previous) * blend;
};
