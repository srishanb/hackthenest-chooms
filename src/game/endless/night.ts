/**
 * Night falls as the climb goes up, so the candle's own light comes to matter.
 *
 * Low down the whole screen can be seen. Higher up the dark closes in, and how far you see
 * depends on how much fuel the candle has: a full candle lights a wide circle, a nearly empty one
 * a small one. The ledge underfoot and the ledges a jump can reach are still outlined inside the
 * light (protected-visibility.ts), so the next step stays readable.
 *
 * Presentation only: it sets how big the hole in the darkness is and how dark the rest is. It
 * never changes how the candle moves.
 */
import type { EndlessConfig } from '../../config/endless.config';

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** How far night has fallen at a height: 0 below `fromChunk`, rising smoothly to `max01` at `fullChunk`. */
export function nightAt(feetY: number, config: EndlessConfig): number {
  const { fromChunk, fullChunk, max01 } = config.night;
  const chunks = (config.baseFloorTopPx - feetY) / config.chunkHeightPx;
  const t = clamp01((chunks - fromChunk) / Math.max(1e-6, fullChunk - fromChunk));
  return max01 * t * t * (3 - 2 * t);
}

/** The candle's own circle of light for a fuel level, in px. */
export function candleRadius(fuel01: number, config: EndlessConfig): number {
  const { radiusEmptyPx, radiusFullPx } = config.night;
  return radiusEmptyPx + (radiusFullPx - radiusEmptyPx) * clamp01(fuel01);
}

/**
 * How far the player sees: `openRadius` (what the daylight rule gives) blended toward the candle's
 * own circle as night falls. Night never makes the view wider than the daylight rule allows.
 */
export function sightRadius(openRadius: number, fuel01: number, night01: number, config: EndlessConfig): number {
  const night = clamp01(night01);
  const lit = Math.min(openRadius, candleRadius(fuel01, config));
  return openRadius + (lit - openRadius) * night;
}

/** How dark the unlit part of the screen is: `dayAlpha` blended toward the night's own alpha. */
export function nightShadowAlpha(dayAlpha: number, night01: number, config: EndlessConfig): number {
  return dayAlpha + (Math.max(dayAlpha, config.night.shadowAlpha) - dayAlpha) * clamp01(night01);
}
