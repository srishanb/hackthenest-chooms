/**
 * The charge jump (MOV-2): hold to charge up to a cap, release to launch.
 *
 * Why pure maths here: launch speed and direction are the whole feel of the game and must be
 * identical in the game and in the level checker. EEG never feeds this file (binding rule 2).
 */
import type { GameConfig } from '../../shared/contracts/config';

/** 0..1 charge for `chargeMs` held (capped at the config's `maxChargeMs`). */
export function charge01(chargeMs: number, config: GameConfig): number {
  return Math.min(Math.max(chargeMs / config.jump.maxChargeMs, 0), 1);
}

/** Launch velocity for a charge level and held direction (-1 left, 0 up, 1 right). y grows downward. */
export function launchVelocity(charge: number, direction: -1 | 0 | 1, config: GameConfig): { vx: number; vy: number } {
  const { minSpeed, maxSpeed, angleDeg } = config.jump;
  const speed = minSpeed + (maxSpeed - minSpeed) * charge;
  if (direction === 0) return { vx: 0, vy: -speed };
  const angle = (angleDeg * Math.PI) / 180;
  return { vx: direction * speed * Math.cos(angle), vy: -speed * Math.sin(angle) };
}

/**
 * Air steering (MOV-3): held direction moves horizontal speed at most `airSteer01 x walkSpeed`
 * away from the launch value, so a launch can never be reversed.
 */
export function steeredVx(launchVx: number, direction: -1 | 0 | 1, config: GameConfig): number {
  return launchVx + direction * config.airSteer01 * config.walkSpeed;
}
