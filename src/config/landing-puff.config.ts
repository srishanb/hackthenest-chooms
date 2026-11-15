/** Small renderer-only landing feedback, never collision or player forces. */
export const LANDING_PUFF_CONFIG = {
  maxParticles: 48, count: 7, lifeMs: 360, spreadPx: 10,
  speedX: 44, speedY: 36, gravity: 140, minSizePx: 2,
  soil: [0x806148, 0xa18357, 0x657844], snow: [0xc3d9df, 0xe1edf0, 0xa2bdce],
} as const;
