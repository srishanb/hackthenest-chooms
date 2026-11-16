/**
 * Which animation the candle plays, and how its body bends, from the player's state.
 *
 * Why it mirrors ruby-view.ts: the candle replaces the Ruby sprite with the same six poses
 * and timings, so the game reads the same. Priority: charge, then rise or fall in the air,
 * then a 180 ms landing, then run, then idle. Frame rates and frame counts match Ruby's
 * sheets (idle 10 @ 9 fps, run 10 @ 14, rise 3 @ 9, fall 3 @ 9, charge 6 @ 9, land 3 @ 18
 * once). Pure: the view only draws what this returns.
 */
export type CandlePoseName = 'idle' | 'run' | 'charge' | 'rise' | 'fall' | 'land';

export const POSE_TIMING: Readonly<Record<CandlePoseName, { frames: number; fps: number; loop: boolean }>> = {
  idle: { frames: 10, fps: 9, loop: true },
  run: { frames: 10, fps: 14, loop: true },
  rise: { frames: 3, fps: 9, loop: true },
  fall: { frames: 3, fps: 9, loop: true },
  charge: { frames: 6, fps: 9, loop: true },
  land: { frames: 3, fps: 18, loop: false },
};

const LAND_MS = 180;

/** The parts of the player state the pose needs (a subset of PlayerState). */
export interface PoseInput {
  vx: number;
  vy: number;
  grounded: boolean;
  charging: boolean;
  /** Held direction while charging (-1, 0, 1): the candle turns to face where it will jump. */
  aim?: -1 | 0 | 1;
}

export interface PoseTracker {
  pose: CandlePoseName;
  /** Time spent in the current pose, for its frame. */
  elapsedMs: number;
  landedMs: number;
  wasGrounded: boolean;
  facingLeft: boolean;
  /** Downward speed in the last airborne step (px/s), kept to judge the next landing. */
  airVy?: number;
  /** 0..1 how hard the latest landing was: a soft step barely squashes, a long fall flattens. */
  impact01?: number;
}

export const INITIAL_POSE: PoseTracker = { pose: 'idle', elapsedMs: 0, landedMs: 0, wasGrounded: false, facingLeft: false };

/** Landing speeds (px/s, downward) that count as the softest and the hardest landing. */
const SOFT_LANDING_PX_S = 250;
const HARD_LANDING_PX_S = 900;

/** 0..1 for a landing at `vy` px/s downward. */
export function landingImpact(vy: number): number {
  if (!Number.isFinite(vy)) return 0;
  return Math.min(Math.max((vy - SOFT_LANDING_PX_S) / (HARD_LANDING_PX_S - SOFT_LANDING_PX_S), 0), 1);
}

export function stepPose(prev: PoseTracker, state: PoseInput, deltaMs: number, paused: boolean): PoseTracker {
  const dt = paused ? 0 : Math.max(0, deltaMs);
  let { landedMs, facingLeft } = prev;
  if (state.charging && state.aim) facingLeft = state.aim < 0;
  else if (state.vx < -1) facingLeft = true;
  else if (state.vx > 1) facingLeft = false;
  let impact01 = prev.impact01 ?? 0;
  if (!prev.wasGrounded && state.grounded) { landedMs = LAND_MS; impact01 = landingImpact(prev.airVy ?? 0); }
  const airVy = state.grounded ? 0 : state.vy;
  landedMs = Math.max(0, landedMs - dt);
  const pose: CandlePoseName = state.charging ? 'charge' : !state.grounded ? (state.vy < 0 ? 'rise' : 'fall')
    : landedMs > 0 ? 'land' : Math.abs(state.vx) > 1 ? 'run' : 'idle';
  const elapsedMs = pose === prev.pose ? prev.elapsedMs + dt : 0;
  return { pose, elapsedMs, landedMs, wasGrounded: state.grounded, facingLeft, airVy, impact01 };
}

/** Frame index within the pose (a one-shot pose holds its last frame). */
export function poseFrame(tracker: PoseTracker): number {
  const { frames, fps, loop } = POSE_TIMING[tracker.pose];
  const raw = Math.floor((tracker.elapsedMs / 1000) * fps);
  return loop ? raw % frames : Math.min(raw, frames - 1);
}

/** How the body bends in this frame, in whole art pixels. */
export interface BodyShape {
  /** Added to the body width (negative is thinner). */
  dWidth: number;
  /** Added to the body height (negative is squashed). */
  dHeight: number;
  /** The wick tilts this many px toward the facing side (the body stays straight). */
  lean: number;
  /** Whole body lifts off its feet line (idle breathing, run bob). */
  lift: number;
}

/**
 * The slump of a candle whose wick has gone cold: it sinks and spreads a little as `spent01`
 * goes from 0 to 1. Applied on top of whatever shape the pose gave.
 */
export function slumpShape(shape: BodyShape, spent01: number): BodyShape {
  const s = Math.min(Math.max(Number.isFinite(spent01) ? spent01 : 0, 0), 1);
  if (s === 0) return shape;
  return { ...shape, dHeight: shape.dHeight - Math.round(2 * s), dWidth: shape.dWidth + (s > 0.5 ? 1 : 0), lift: 0 };
}

/** `charge01` is 0..1 of a full jump charge (only used by the charge pose). */
export function bodyShape(tracker: PoseTracker, charge01: number): BodyShape {
  const frame = poseFrame(tracker);
  switch (tracker.pose) {
    case 'idle': return { dWidth: 0, dHeight: frame >= 3 && frame <= 6 ? 1 : 0, lean: 0, lift: 0 };
    case 'run': return { dWidth: 0, dHeight: frame % 5 === 2 ? -1 : 0, lean: 1, lift: frame % 5 < 2 ? 1 : 0 };
    case 'charge': {
      const squash = Math.round(Math.min(Math.max(charge01, 0), 1) * 3);
      return { dWidth: squash > 1 ? 1 : 0, dHeight: -squash, lean: 0, lift: 0 };
    }
    // The launch stretches hardest in its first frame, then settles into the rise.
    case 'rise': return tracker.elapsedMs < 90 ? { dWidth: -2, dHeight: 3, lean: 0, lift: 0 } : { dWidth: -1, dHeight: 2, lean: 0, lift: 0 };
    case 'fall': return { dWidth: -1, dHeight: 1, lean: 0, lift: 0 };
    case 'land': {
      // A soft step squashes 2 px, a hard landing up to 5 px, and both spring back over three frames.
      const extra = Math.round(2 * (tracker.impact01 ?? 0.5));
      return frame === 0 ? { dWidth: 1 + Math.ceil(extra / 2), dHeight: -(2 + extra), lean: 0, lift: 0 }
        : frame === 1 ? { dWidth: extra > 1 ? 1 : 0, dHeight: -(1 + Math.floor(extra / 2)), lean: 0, lift: 0 }
        : { dWidth: 0, dHeight: 0, lean: 0, lift: 0 };
    }
  }
}
