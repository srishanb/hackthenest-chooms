/**
 * The compass needle turns gradually toward the checkpoint instead of snapping.
 *
 * Pure: time-based easing (the same feel at any frame rate) along the shortest way round, so a
 * target just past north never makes the needle spin the long way.
 */

/** Signed smallest turn from `from` to `to`, in degrees, in (-180, 180]. */
export function shortestTurn(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Ease `current` toward `target` with time constant `tauMs`. Reduced motion snaps. */
export function stepNeedle(current: number, target: number, dtMs: number, tauMs: number, reducedMotion = false): number {
  const from = Number.isFinite(current) ? current : 0;
  if (!Number.isFinite(target) || !Number.isFinite(dtMs)) return from;
  if (reducedMotion || tauMs <= 0) return target;
  const blend = 1 - Math.exp(-Math.max(0, dtMs) / tauMs);
  return from + shortestTurn(from, target) * blend;
}
