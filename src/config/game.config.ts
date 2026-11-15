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
  walkSpeed: 180, // px/s
  jump: {
    maxChargeMs: 900,
    minSpeed: 250, // px/s
    maxSpeed: 780, // px/s
    angleDeg: 62,
  },
  airSteer01: 0.15,
};
