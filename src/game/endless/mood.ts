/**
 * The world's mood in endless mode follows the candle instead of a signal.
 *
 * Two things darken the forest. A shaken candle (composure.ts: falls shake it, standing still steadies
 * it), and a flame that is running low. Whichever is stronger wins. The output is a 0..1 "intensity" fed
 * to the existing effects table, so the same effects the EEG game used (forest corruption, tense music,
 * a narrower view) rise and fall, and every cap and smoothing rule in effects.config.ts still applies.
 * Presentation only: movement never reads it.
 */
import type { EndlessConfig } from '../../config/endless.config';

/** `shaken01` is the candle's composure (0 steady, 1 badly shaken); leave it out for the fuel alone. */
export function moodIntensity(fuel01: number, config: EndlessConfig, shaken01 = 0): number {
  const { calmAboveFuel01, calmIntensity, peakIntensity } = config.mood;
  const span = peakIntensity - calmIntensity;
  const shaken = Math.min(1, Math.max(0, Number.isFinite(shaken01) ? shaken01 : 0));
  const fromComposure = calmIntensity + span * shaken;
  const fuel = Math.min(1, Math.max(0, Number.isFinite(fuel01) ? fuel01 : 1));
  if (fuel >= calmAboveFuel01) return fromComposure;
  const t = 1 - fuel / calmAboveFuel01;
  // Smoothstep: gentle at first, steep in the middle, flat near the end.
  return Math.max(fromComposure, calmIntensity + span * t * t * (3 - 2 * t));
}
