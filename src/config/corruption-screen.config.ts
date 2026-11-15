/** Presentation-only caps for the existing corruption frame. Never changes camera follow or physics. */
export const CORRUPTION_SCREEN_CONFIG = {
  onset: 0.55, shakeMaxPx: 4, shakeMs: 150, shakeIntervalMs: 1500,
  shiftMaxPx: 3, channelMaxPx: 1.5, noiseMax: 0.05,
  never: 'No flashes, gameplay changes or hidden landing edges; zero motion with reduced motion, pause or strength zero.',
} as const;
export function screenCorruption(c: number, strength: number, reduced: boolean, paused: boolean): number {
  if (reduced || paused || !Number.isFinite(c) || !Number.isFinite(strength)) return 0;
  const t = Math.min(1, Math.max(0, (c - CORRUPTION_SCREEN_CONFIG.onset) / (1 - CORRUPTION_SCREEN_CONFIG.onset)));
  return t * t * (3 - 2 * t) * Math.min(1, Math.max(0, strength));
}
