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
    // 600 ms after first standing on it: exactly a full charge's time, so a full jump off it is never
    // possible (the charge and the release step take 608 ms). A held key does nothing on landing (the latch),
    // so the press comes after it: a person who reacts in 250 ms still has time for the small hop the route
    // asks (charge level 3 to 5 of 12, endless-pieces.config.ts `crumbleReactionMs`). Gone for at least 3 s, so a fall below it costs a real climb back,
    // but a second try is never locked out. (It was 400 ms; QA: with a 250 ms reaction 56 of 88 steps failed.)
    crumble: {
      holdMs: 600, // ms it holds after the candle first stands on it
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
      // px: once the candle's feet are this far below where it last took off, it is falling, and a column lets it
      // fall straight through, so a column never catches a fall (D-33). Every route flight that rides a column
      // stays within 4 px of its takeoff height while inside (614 measured), so 24 px leaves room for steering.
      holdBelowTakeoffPx: 24,
    },
  },
  // Wall slide and wall jump (prototype behind `?walls=1`; only the endless climb's wall pieces grip, never the
  // world's edges). Fixed rules, never the signal. With no wall in the world none of this runs.
  wallMoves: {
    // px/s: the most a slide falls. Lower feels stickier (more time to think on the wall); higher feels slippery.
    slideVy: 90,
    // 1/s: how fast a fall's extra speed bleeds off once you press into a wall. Higher grabs at once; lower skids.
    slideBrakePerS: 16,
    // px: a wall grips only while your feet are at most this far below where you last took off or kicked. It is
    // the safety rule: a long fall (more than this) slides straight past every wall, so walls never catch a miss
    // (D-33). It also caps a slide's length at about a second. Larger forgives more; smaller asks for a quick kick.
    gripBelowTakeoffPx: 96,
    // px/s and degrees: the kick. 620 px/s at 58 deg climbs about 100 px (a full charge jump climbs 170 to 217) and
    // throws you about 330 px/s sideways: a wall is a tool, never a shortcut over a charge jump.
    kickSpeed: 620,
    kickAngleDeg: 58,
    // px: how close to a wall a jump press still kicks (no need to be pressed flat against it). Larger is easier.
    kickReachPx: 6,
    // ms: held direction is ignored this long after a kick, so you cannot steer straight back onto the wall.
    kickLockMs: 160,
    // false: the same wall cannot be kicked twice in a row (it needs a landing or another wall first), so one
    // wall is not a ladder; a chimney of two facing walls is climbed by kicking from one to the other.
    sameWallTwice: false,
  },
};
