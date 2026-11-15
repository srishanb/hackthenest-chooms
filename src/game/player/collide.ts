/**
 * Collision helpers: one-way platform landing (swept) and solid side walls.
 *
 * Why swept: a fast fall can move more than a platform's thickness in one step, so we test whether
 * the feet crossed the top edge between steps instead of testing overlap after the move.
 */
import type { PlatformBox } from './types';

const EDGE_EPSILON = 1e-6;

/** Do the body's horizontal extent and the platform's overlap (touching edges do not count)? */
export function overlapsX(bodyX: number, bodyWidth: number, platform: PlatformBox): boolean {
  return Math.abs(bodyX - platform.x) < (bodyWidth + platform.width) / 2 - EDGE_EPSILON;
}

export const platformTop = (platform: PlatformBox): number => platform.y - platform.height / 2;

/**
 * The platform the feet land on this step, or null. The feet went from `prevBottom` to `newBottom`
 * moving down (or staying level); a platform counts if its top lies in between. The highest one wins.
 */
export function findLanding(platforms: readonly PlatformBox[], bodyX: number, bodyWidth: number, prevBottom: number, newBottom: number): PlatformBox | null {
  let best: PlatformBox | null = null;
  for (const platform of platforms) {
    const top = platformTop(platform);
    if (top < prevBottom - EDGE_EPSILON || top > newBottom + EDGE_EPSILON) continue;
    if (!overlapsX(bodyX, bodyWidth, platform)) continue;
    if (best === null || top < platformTop(best)) best = platform;
  }
  return best;
}

/** The platform directly under the feet at `bottom` (standing on it), or null. */
export function findSupport(platforms: readonly PlatformBox[], bodyX: number, bodyWidth: number, bottom: number): PlatformBox | null {
  for (const platform of platforms) {
    if (Math.abs(platformTop(platform) - bottom) <= EDGE_EPSILON * 10 && overlapsX(bodyX, bodyWidth, platform)) return platform;
  }
  return null;
}

/** Clamp the body between the solid side walls at x = 0 and x = worldWidth. */
export function clampToWalls(bodyX: number, bodyWidth: number, worldWidth: number): { x: number; hit: boolean } {
  const min = bodyWidth / 2;
  const max = worldWidth - bodyWidth / 2;
  if (bodyX < min) return { x: min, hit: true };
  if (bodyX > max) return { x: max, hit: true };
  return { x: bodyX, hit: false };
}
