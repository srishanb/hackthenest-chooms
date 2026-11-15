/** Calibrated v2 responsiveness only; zero activity stays zero, invalid inputs never get boosted. */
export const ACTIVE_RESPONSE_CONFIG = { gain: 1.8, attackMs: 600, releaseMs: 1600 } as const;
export function responsiveActivity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value * ACTIVE_RESPONSE_CONFIG.gain)) : 0;
}
