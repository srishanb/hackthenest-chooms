/**
 * The world's mood in endless mode follows the flame instead of a signal.
 *
 * With plenty of fuel the forest is calm. As the fuel runs low the same effects the EEG game used
 * (forest corruption, tense music, a narrower view) rise, and they ease back when wax refills the
 * candle. The output is a 0..1 "intensity" fed to the existing effects table, so every cap and
 * smoothing rule in effects.config.ts still applies. Presentation only: movement never reads it.
 */
import type { EndlessConfig } from '../../config/endless.config';

export function moodIntensity(fuel01: number, config: EndlessConfig): number {
  const { calmAboveFuel01, calmIntensity, peakIntensity } = config.mood;
  const fuel = Math.min(1, Math.max(0, Number.isFinite(fuel01) ? fuel01 : 1));
  if (fuel >= calmAboveFuel01) return calmIntensity;
  const t = 1 - fuel / calmAboveFuel01;
  // Smoothstep: gentle at first, steep in the middle, flat near the end.
  return calmIntensity + (peakIntensity - calmIntensity) * t * t * (3 - 2 * t);
}
