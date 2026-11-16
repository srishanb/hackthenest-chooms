/**
 * What the candle feels like right now, and the face that shows it.
 *
 * Why a state machine: the candle is the only character on screen, so it should react to what
 * happens to it. This picks one mood from what the body is doing and from short events (wax picked
 * up, a hard landing, a new best height), then turns the mood into eyes, a mouth and a gaze. It
 * also blinks and glances around on its own. Everything is pure and seeded, so a mood can be
 * tested and one seed always blinks in the same rhythm.
 *
 * Presentation only. It reads player state and never feeds movement. A mood is a reaction to the
 * game (a fall, low fuel), never a reading of the player.
 */
import type { CandlePoseName } from './candle-pose';

export type CandleMood =
  | 'content'    // standing or walking with nothing going on
  | 'focused'    // charging a jump
  | 'soaring'    // rising
  | 'alarmed'    // falling fast
  | 'ouch'       // just landed hard
  | 'delighted'  // just picked up wax
  | 'proud'      // just beat the best height
  | 'worried'    // fuel is low
  | 'sleepy'     // idle for a long time
  | 'fading';    // the flame is out

/** `set` is an open eye under a slanted brow (determined); `half` is an eye under a drooping lid. */
export type EyeShape = 'open' | 'wide' | 'closed' | 'happy' | 'set' | 'half';
export type MouthShape = 'smile' | 'flat' | 'grit' | 'open' | 'frown' | 'grin' | 'small' | 'wobble';

export interface CandleFace {
  mood: CandleMood;
  eyes: EyeShape;
  mouth: MouthShape;
  /** Where the eyes look, in art pixels: -1 back or up, 0 centre, 1 ahead or down (the body mirrors when it faces left). */
  gazeX: -1 | 0 | 1;
  gazeY: -1 | 0 | 1;
  /** The whole face shifts one pixel toward the facing side: the candle turns to where it is going. */
  turned: boolean;
  blush: boolean;
  /** A bead of wax at the temple (worry, a near miss). */
  sweat: boolean;
}

export interface ExpressionInput {
  pose: CandlePoseName;
  /** 0..1 of a full jump charge. */
  charge01: number;
  /** 0 when not falling, up to 1 in a fast fall (flame.ts `fallIntensity`). */
  fall01: number;
  /** Held direction: -1 left, 0 none, 1 right. */
  aim: -1 | 0 | 1;
  facingLeft: boolean;
  /** 0..1 fuel left. */
  fuel01: number;
  /** False once the fuel is gone and only the wick glows. */
  lit: boolean;
  reducedMotion: boolean;
}

/** One-off moments the scene reports; each starts a short reaction. */
export interface ExpressionEvents {
  wax?: boolean;
  hardLanding?: boolean;
  newBest?: boolean;
}

export interface ExpressionTracker {
  mood: CandleMood;
  /** Time in the current mood, ms. */
  moodMs: number;
  /** Total running time, for the blink and glance rhythm. */
  clockMs: number;
  /** Time left on each short reaction, ms. */
  ouchMs: number;
  delightMs: number;
  proudMs: number;
  /** Time standing still with nothing happening, ms. */
  idleMs: number;
}

export const INITIAL_EXPRESSION: ExpressionTracker = { mood: 'content', moodMs: 0, clockMs: 0, ouchMs: 0, delightMs: 0, proudMs: 0, idleMs: 0 };

/** How long each reaction lasts, and the thresholds between moods. */
export const EXPRESSION_TIMING = {
  ouchMs: 520,
  delightMs: 1100,
  proudMs: 1600,
  /** Standing still this long makes the candle drowsy. */
  sleepyAfterMs: 9000,
  /** Fuel at or below this worries the candle. */
  worriedBelowFuel01: 0.25,
  /** A fall at least this strong (0..1) alarms it. */
  alarmedFromFall01: 0.3,
  /** A blink lasts this long; blinks come every `blinkEveryMs` on average. */
  blinkMs: 130,
  blinkEveryMs: 3400,
  /** While idle the eyes glance to one side for `glanceMs` about every `glanceEveryMs`. */
  glanceMs: 900,
  glanceEveryMs: 5200,
} as const;

export function stepExpression(prev: ExpressionTracker, input: ExpressionInput, events: ExpressionEvents, deltaMs: number, paused: boolean): ExpressionTracker {
  const dt = paused ? 0 : Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  const T = EXPRESSION_TIMING;
  const ouchMs = events.hardLanding ? T.ouchMs : Math.max(0, prev.ouchMs - dt);
  const delightMs = events.wax ? T.delightMs : Math.max(0, prev.delightMs - dt);
  const proudMs = events.newBest ? T.proudMs : Math.max(0, prev.proudMs - dt);
  const idleMs = input.pose === 'idle' ? prev.idleMs + dt : 0;

  // One mood at a time. Order matters: what is happening to the body right now beats a lingering reaction.
  const mood: CandleMood = !input.lit ? 'fading'
    : ouchMs > 0 ? 'ouch'
    : input.fall01 >= T.alarmedFromFall01 ? 'alarmed'
    : delightMs > 0 ? 'delighted'
    : input.pose === 'charge' ? 'focused'
    : input.pose === 'rise' ? 'soaring'
    : proudMs > 0 ? 'proud'
    : input.fuel01 <= T.worriedBelowFuel01 ? 'worried'
    : idleMs >= T.sleepyAfterMs ? 'sleepy'
    : 'content';
  return { mood, moodMs: mood === prev.mood ? prev.moodMs + dt : 0, clockMs: prev.clockMs + dt, ouchMs, delightMs, proudMs, idleMs };
}

/** A small integer hash to 0..1, for the seeded blink and glance rhythm. */
function hash01(seed: number, a: number, b: number): number {
  let h = (seed ^ Math.imul(a + 1, 2654435761) ^ Math.imul(b + 1, 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** True during a blink. Blinks land at a seeded moment inside each `blinkEveryMs` window, sometimes twice. */
export function isBlinking(seed: number, clockMs: number): boolean {
  const T = EXPRESSION_TIMING;
  const window = Math.floor(clockMs / T.blinkEveryMs);
  const within = clockMs - window * T.blinkEveryMs;
  const start = hash01(seed, window, 1) * (T.blinkEveryMs - 4 * T.blinkMs);
  if (within >= start && within < start + T.blinkMs) return true;
  // About one window in four has a quick second blink.
  const double = hash01(seed, window, 2) < 0.25;
  return double && within >= start + 2 * T.blinkMs && within < start + 3 * T.blinkMs;
}

/** While idle: -1, 0 or 1 for a glance to one side, at a seeded moment in each `glanceEveryMs` window. */
export function idleGlance(seed: number, clockMs: number): -1 | 0 | 1 {
  const T = EXPRESSION_TIMING;
  const window = Math.floor(clockMs / T.glanceEveryMs);
  const within = clockMs - window * T.glanceEveryMs;
  const start = hash01(seed, window, 3) * (T.glanceEveryMs - T.glanceMs);
  if (within < start || within >= start + T.glanceMs) return 0;
  return hash01(seed, window, 4) < 0.5 ? -1 : 1;
}

/** The face for the tracker's mood. `seed` is the candle's seed, so each candle blinks in its own rhythm. */
export function faceFor(tracker: ExpressionTracker, input: ExpressionInput, seed: number): CandleFace {
  const still = input.reducedMotion;
  const blink = !still && isBlinking(seed, tracker.clockMs);
  // Moving or aiming sideways turns the face toward the facing side; standing still it looks out at the player.
  const turned = input.pose === 'run' || (input.pose === 'charge' && input.aim !== 0);
  const base = { mood: tracker.mood, gazeX: 0 as -1 | 0 | 1, gazeY: 0 as -1 | 0 | 1, blush: false, sweat: false, turned };
  switch (tracker.mood) {
    case 'fading':
      return { ...base, eyes: 'half', mouth: 'frown', gazeY: 1 };
    case 'ouch':
      return { ...base, eyes: 'closed', mouth: 'wobble' };
    case 'alarmed':
      return { ...base, eyes: 'wide', mouth: 'open', gazeY: 1, sweat: input.fall01 > 0.7 };
    case 'delighted':
      return { ...base, eyes: 'happy', mouth: 'grin', blush: true };
    case 'focused':
      // The brows come down as the charge builds, and the mouth sets hard near full charge.
      return { ...base, eyes: input.charge01 > 0.3 ? 'set' : 'open', mouth: input.charge01 > 0.8 ? 'grit' : 'flat' };
    case 'soaring':
      return { ...base, eyes: blink ? 'closed' : 'open', mouth: 'grin', gazeY: -1 };
    case 'proud':
      return { ...base, eyes: 'happy', mouth: 'smile', blush: true };
    case 'worried': {
      // Glances up at its own flame, with a bead of wax that comes and goes.
      const bead = still ? true : Math.floor(tracker.clockMs / 600) % 2 === 0;
      return { ...base, eyes: blink ? 'closed' : 'open', mouth: 'frown', gazeY: -1, sweat: bead };
    }
    case 'sleepy': {
      // Eyelids droop, with a slow yawn now and then.
      const yawning = !still && tracker.moodMs % 4200 > 3300;
      return { ...base, eyes: yawning ? 'closed' : 'half', mouth: yawning ? 'open' : 'small' };
    }
    case 'content':
      return { ...base, eyes: blink ? 'closed' : 'open', mouth: 'smile',
        gazeX: input.pose === 'idle' && !still ? idleGlance(seed, tracker.clockMs) : 0 };
  }
}
