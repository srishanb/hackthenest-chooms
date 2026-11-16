/**
 * The candle's shadow on the ledge below it.
 *
 * Why: a small dark patch under the feet ties the candle to the ground, and in the air it shows
 * where the body would come down: the patch stays on the ledge straight below, and shrinks and
 * fades the higher the candle is. Pure: positions in, one ellipse out. Drawn only; the physics
 * never reads it.
 */
import type { PlatformBox } from '../player/types';

export interface GroundShadow {
  /** Centre of the ellipse in world px (on the ledge's top surface). */
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
  alpha: number;
}

/** A shadow is cast on a ledge up to this far below the feet (px); beyond that there is none. */
export const SHADOW_REACH_PX = 260;

export function groundShadow(feet: { x: number; y: number }, bodyWidth: number, platforms: readonly PlatformBox[]): GroundShadow | null {
  // The nearest ledge top at or below the feet that the body overlaps sideways.
  let top = Number.POSITIVE_INFINITY;
  for (const platform of platforms) {
    const surface = platform.y - platform.height / 2;
    if (surface < feet.y - 1 || surface >= top) continue;
    if (Math.abs(feet.x - platform.x) >= (bodyWidth + platform.width) / 2) continue;
    top = surface;
  }
  const drop = top - feet.y;
  if (!Number.isFinite(drop) || drop > SHADOW_REACH_PX) return null;
  const near = 1 - Math.max(0, drop) / SHADOW_REACH_PX;
  // Wider than the body, so it shows either side of the candle when it stands.
  return { x: feet.x, y: top + 2, widthPx: bodyWidth * (0.9 + 1.0 * near), heightPx: 4 + 4 * near, alpha: 0.16 + 0.34 * near };
}
