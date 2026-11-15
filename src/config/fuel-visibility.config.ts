/** Visual sight curve only. Fuel resources and movement are unchanged. */
export const FUEL_VISIBILITY_CONFIG = {
  minimumRadiusPx: 60, normalExponent: 1, corruptedExponent: 2.5,
  normalWorldMax01: 0.35,
  decayThresholdScale: 0.4, decayFadeWidth: 0.18, decayOpacity: 1,
} as const;

/** Neutral/normal input must never reveal corrupted plants or red grass. */
export function sceneryCorruption(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, (value - FUEL_VISIBILITY_CONFIG.normalWorldMax01) /
    (1 - FUEL_VISIBILITY_CONFIG.normalWorldMax01)));
}
