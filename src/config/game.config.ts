/**
 * Movement and world constants. Owner: game lane (Ali).
 *
 * Why one file: physics must be consistent and learnable. EEG NEVER changes any value
 * here (binding rule 2 in AGENTS.md). All numbers are starting guesses for P4 to tune.
 */
import type { GameConfig } from '../shared/contracts/config';

export const GAME_CONFIG: GameConfig = {
  view: { width: 960, height: 540 }, // logical pixels; the canvas scales to fit the window
  gravityY: 1400, // px/s^2
  player: { width: 24, height: 36 }, // px
  stepHz: 120, // fixed physics steps per second
  walkSpeed: 220, // px/s; quicker ground response without changing jump strength
  jump: {
    maxChargeMs: 600, // full charge in 0.6 s; tap/release still produces a small jump
    minSpeed: 250, // px/s
    maxSpeed: 780, // px/s
    angleDeg: 62,
  },
  airSteer01: 0.15,
};
