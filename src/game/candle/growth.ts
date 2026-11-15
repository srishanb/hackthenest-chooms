/**
 * Wax growth: each collected wax makes the candle slightly bigger and its movement slightly
 * stronger, a small permanent buff for the run (reset on Play again).
 *
 * Why the square root on jumps: jump height and distance grow with the square of launch
 * speed. Scaling launch speed by sqrt(growth) makes jump height and distance grow by exactly
 * `growth`, the same as the candle's size and walking speed (+2% per wax, at most +6%).
 * The growth comes from the wax count only, never from the signal (binding rule 2). The
 * collision body keeps its size, and the level checker and LAN-3 outlines keep using the
 * base config, so a buff can only make a ledge easier, never mark an unreachable one.
 */
import type { GameConfig } from '../../shared/contracts/config';

/** 1 with no wax, 1 + perWax x collected, never past `maxCount` pieces. */
export function waxGrowth(collected: number, perWax: number, maxCount: number): number {
  const count = Math.min(Math.max(Math.floor(Number.isFinite(collected) ? collected : 0), 0), Math.max(0, maxCount));
  return 1 + Math.max(0, perWax) * count;
}

/** The movement config for a grown candle: walk x growth, launch speeds x sqrt(growth). */
export function grownMovement(base: GameConfig, growth: number): GameConfig {
  const g = Math.max(1, growth);
  if (g === 1) return base;
  const jumpScale = Math.sqrt(g);
  return {
    ...base,
    walkSpeed: base.walkSpeed * g,
    jump: { ...base.jump, minSpeed: base.jump.minSpeed * jumpScale, maxSpeed: base.jump.maxSpeed * jumpScale },
  };
}
