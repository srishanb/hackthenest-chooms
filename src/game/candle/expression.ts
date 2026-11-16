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
  | 'relieved'   // wax just relit a wick that was only glowing
  | 'delighted'  // just picked up wax
  | 'proud'      // just beat the best height
  | 'uneasy'     // sliding on ice
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
  /** True in the last moment of a run, once the wick has gone cold: the eyes close. */
  spent?: boolean;
  /** True while sliding on ice. */
  sliding?: boolean;
  /** True while the candle is in flow (several clean jumps in a row): a contented, rosy look. */
  flow?: boolean;
  /** Something nearby worth a look (wax, the edge of the ledge), as a world direction: see awareness.ts. */
  look?: { x: -1 | 0 | 1; y: -1 | 0 | 1; peek: boolean } | null;
}

/** One-off moments the scene reports; each starts a short reaction. */
export interface ExpressionEvents {
  wax?: boolean;
  /** Wax relit a wick whose flame had gone out. */
  relit?: boolean;
  hardLanding?: boolean;
  /** With `hardLanding`: 0..1 how far beyond a hard landing the fall was. A very long fall leaves the candle dazed for longer. */
  daze01?: number;
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
  /** Optional so trackers written before this reaction existed still type-check; treated as 0. */
  relievedMs?: number;
  /** Time standing still with nothing happening, ms. */
  idleMs: number;
}

export const INITIAL_EXPRESSION: ExpressionTracker = { mood: 'content', moodMs: 0, clockMs: 0, ouchMs: 0, delightMs: 0, proudMs: 0, idleMs: 0 };

/** How long each reaction lasts, and the thresholds between moods. */
export const EXPRESSION_TIMING = {
  ouchMs: 520,
  /** A very long fall adds up to this much to the wince: the candle stays dazed, stars circling. It can still move. */
  dazeExtraMs: 1100,
  delightMs: 1100,
  /** Relief after a relight: a long breath out (`exhaleMs`), then a smile. */
  relievedMs: 1500,
  exhaleMs: 450,
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
  /** While idle the candle also looks up at its own flame for `lookUpMs` about every `lookUpEveryMs`. */
  lookUpMs: 800,
  lookUpEveryMs: 7300,
} as const;

export function stepExpression(prev: ExpressionTracker, input: ExpressionInput, events: ExpressionEvents, deltaMs: number, paused: boolean): ExpressionTracker {
  const dt = paused ? 0 : Math.max(0, Number.isFinite(deltaMs) ? deltaMs : 0);
  const T = EXPRESSION_TIMING;
  const daze = Math.min(1, Math.max(0, Number.isFinite(events.daze01) ? events.daze01! : 0));
  const ouchMs = events.hardLanding ? T.ouchMs + T.dazeExtraMs * daze : Math.max(0, prev.ouchMs - dt);
  const delightMs = events.wax ? T.delightMs : Math.max(0, prev.delightMs - dt);
  const proudMs = events.newBest ? T.proudMs : Math.max(0, prev.proudMs - dt);
  const relievedMs = events.relit ? T.relievedMs : Math.max(0, (prev.relievedMs ?? 0) - dt);
  const idleMs = input.pose === 'idle' ? prev.idleMs + dt : 0;

  // One mood at a time. Order matters: what is happening to the body right now beats a lingering reaction.
  const mood: CandleMood = !input.lit ? 'fading'
    : ouchMs > 0 ? 'ouch'
    : input.fall01 >= T.alarmedFromFall01 ? 'alarmed'
    : relievedMs > 0 ? 'relieved'
    : delightMs > 0 ? 'delighted'
    : input.pose === 'charge' ? 'focused'
    : input.pose === 'rise' ? 'soaring'
    : input.sliding ? 'uneasy'
    : proudMs > 0 ? 'proud'
    : input.fuel01 <= T.worriedBelowFuel01 ? 'worried'
    : idleMs >= T.sleepyAfterMs ? 'sleepy'
    : 'content';
  return { mood, moodMs: mood === prev.mood ? prev.moodMs + dt : 0, clockMs: prev.clockMs + dt, ouchMs, delightMs, proudMs, relievedMs, idleMs };
}

const T_EXHALE_MS = EXPRESSION_TIMING.exhaleMs;

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

/** While idle: true for a moment in each `lookUpEveryMs` window, when the candle looks up at its own flame. */
export function idleLookUp(seed: number, clockMs: number): boolean {
  const T = EXPRESSION_TIMING;
  const window = Math.floor(clockMs / T.lookUpEveryMs);
  const within = clockMs - window * T.lookUpEveryMs;
  const start = hash01(seed, window, 5) * (T.lookUpEveryMs - T.lookUpMs);
  return within >= start && within < start + T.lookUpMs;
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
      // Heavy lids while the wick still glows; eyes shut once it has gone cold.
      return input.spent ? { ...base, eyes: 'closed', mouth: 'small' } : { ...base, eyes: 'half', mouth: 'frown', gazeY: 1 };
    case 'ouch':
      // A wince first; if the daze goes on (a very long fall), the eyes half open and the mouth still wavers.
      return tracker.moodMs < EXPRESSION_TIMING.ouchMs ? { ...base, eyes: 'closed', mouth: 'wobble' } : { ...base, eyes: 'half', mouth: 'wobble', sweat: true };
    case 'alarmed':
      return { ...base, eyes: 'wide', mouth: 'open', gazeY: 1, sweat: input.fall01 > 0.7 };
    case 'relieved':
      // A long breath out with the eyes shut, then a grateful smile. The bead of wax stays a moment longer.
      return tracker.moodMs < T_EXHALE_MS ? { ...base, eyes: 'closed', mouth: 'open', sweat: true }
        : { ...base, eyes: 'happy', mouth: 'smile', blush: true, sweat: tracker.moodMs < T_EXHALE_MS * 2 };
    case 'delighted':
      return { ...base, eyes: 'happy', mouth: 'grin', blush: true };
    case 'focused':
      // The brows come down as the charge builds, and the mouth sets hard near full charge.
      return { ...base, eyes: input.charge01 > 0.3 ? 'set' : 'open', mouth: input.charge01 > 0.8 ? 'grit' : 'flat' };
    case 'soaring':
      return { ...base, eyes: blink ? 'closed' : 'open', mouth: 'grin', gazeY: -1 };
    case 'proud':
      return { ...base, eyes: 'happy', mouth: 'smile', blush: true };
    case 'uneasy':
      // Wide eyes fixed on the ground ahead, a wavering mouth and a bead of wax: this ledge is ice.
      return { ...base, eyes: 'wide', mouth: 'wobble', gazeY: 1, sweat: true, turned: true };
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
    case 'content': {
      // Something nearby wins the eyes: wax in reach, or the drop beside the ledge. World left and right
      // become back and ahead here, because the body is mirrored when it faces left.
      if (input.look && (input.pose === 'idle' || input.pose === 'run')) {
        const ahead = (input.facingLeft ? -input.look.x : input.look.x) as -1 | 0 | 1;
        return { ...base, eyes: blink ? 'closed' : 'open', mouth: input.look.peek ? 'small' : 'smile', gazeX: ahead, gazeY: input.look.y };
      }
      // Standing about, it glances to the side and now and then looks up at its own flame.
      const fidget = input.pose === 'idle' && !still;
      const up = fidget && idleLookUp(seed, tracker.clockMs);
      return { ...base, eyes: blink ? 'closed' : 'open', mouth: 'smile', blush: input.flow === true,
        gazeX: fidget && !up ? idleGlance(seed, tracker.clockMs) : 0, gazeY: up ? -1 : 0 };
    }
  }
}
