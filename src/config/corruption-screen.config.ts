/** Presentation-only caps for the existing corruption frame. Never changes camera follow or physics. */
export const CORRUPTION_SCREEN_CONFIG = {
  fogAlpha: 0.48, fogPeriodMs: 6000, decoyAlpha: 0.2,
  onset: 0.55, shakeMaxPx: 8, shakeMs: 220, shakeIntervalMs: 1200,
  shiftMaxPx: 5, channelMaxPx: 2, noiseMax: 0.07,
  lightningPeriodMs: 8000, lightningPulseMs: 700, lightningAlpha: 0.16,
  never: 'No full-screen flashes, gameplay changes or hidden landing edges; zero motion with reduced motion, pause or strength zero.',
} as const;
export function screenCorruption(c: number, strength: number, reduced: boolean, paused: boolean): number {
  if (reduced || paused || !Number.isFinite(c) || !Number.isFinite(strength)) return 0;
  const t = Math.min(1, Math.max(0, (c - CORRUPTION_SCREEN_CONFIG.onset) / (1 - CORRUPTION_SCREEN_CONFIG.onset)));
  return t * t * (3 - 2 * t) * Math.min(1, Math.max(0, strength));
}
