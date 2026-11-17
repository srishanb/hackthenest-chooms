/**
 * Movement and world constants. Owner: game lane (Ali).
 *
 * Why one file: physics must be consistent and learnable. EEG NEVER changes any value
 * here (binding rule 2 in AGENTS.md). All numbers are starting guesses for P4 to tune.
 */
import type { GameConfig } from '../shared/contracts/config';

export const GAME_CONFIG: GameConfig = {
  surfaces: { iceAcceleration: 500, iceDrag: 1.6, maxWindSpeed: 60, windDecay: 1.2 },
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
  fallSteer01: 0.24, // +19.8 px/s of correction only after vertical velocity becomes positive
  // Wait 0.35 s after the apex, then build speed at a steady, gentler rate.
  falling: { accelerationX: 1800, speedX: 280, ledgeReachPx: 4, activationDelayMs: 350 },
  // Special ledges and zones of the endless climb (Decision D-36). Fixed rules, never the signal; the
  // authored climb has none of these ledges or columns, so nothing there changes.
  ledgeKinds: {
    // A full straight-up jump peaks 217 px above its ledge (780^2 / 2 / 1400). A bounce leaves the cap at
    // 1000..1100 px/s, so it peaks 357..432 px above the cap: about twice a full jump, so it opens gaps no
    // jump can cross, while the spread from a soft or a hard landing stays small enough to learn.
    bounce: {
      launchSpeed: 1000, // px/s upward, from a landing at no speed
      impactGain: 0.12, // extra launch px/s per px/s of landing speed (a hard landing bounces a little higher)
      maxLaunchSpeed: 1100, // px/s; the cap on that extra
    },
    // 400 ms after first standing on it: enough to charge 8 of the 12 charge levels (a small jump), never a
    // full 600 ms charge, so the hop must be planned before landing. Gone for at least 3 s, so a fall below
    // it costs a real climb back, but a second try is never locked out.
    crumble: {
      holdMs: 400, // ms it holds after the candle first stands on it
      regrowMs: 3000, // ms after it fell before it may grow back
      clearancePx: 48, // the candle's body must be at least this far from its box for it to grow back (px)
    },
    // Inside a column a rising candle feels half gravity (700 px/s^2), so a jump into it floats about twice
    // as high; a falling candle eases (time constant 0.25 s) to a 60 px/s sink in a drift column, or turns
    // into a 150 px/s climb in a rise column. Air steering is the normal rule throughout.
    updraft: {
      gravity01: 0.5, // fraction of gravity left while rising faster than the column's terminal speed
      brakePerS: 4, // 1/s: how fast a fall's extra speed bleeds off toward the terminal speed
      driftVy: 60, // px/s downward: the gentle sink of a drift column
      riseVy: -150, // px/s upward: the climb of a rise column
    },
  },
};
