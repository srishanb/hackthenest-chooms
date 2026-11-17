/**
 * Types for every tunable config file in src/config/.
 *
 * Why split types from values: a value file belongs to a lane (so tuning never waits on the
 * integrator), but its shape is a contract that other lanes rely on.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */
import type { InputSourceKind } from './composure';

export interface SignalConfig {
  defaultSource: InputSourceKind;
  /** Registry id used when the URL has no `?algo=`. */
  defaultAlgo: string;
  /** How often ComposureState is published, in Hz. */
  updateHz: number;
  filter: {
    bandpassLowHz: number;
    bandpassHighHz: number;
    bandpassOrder: number;
    /** Mains notch frequency in Hz (60 in the US), or null for off. */
    notchHz: number | null;
  };
  /** A sample older than this is stale and makes the state invalid. */
  staleAfterMs: number;
  /** Below this quality (0..1) the state is invalid. */
  qualityFloor: number;
  smoothing: { intensityTauMs: number; restingTauMs: number };
  /** Hysteresis for `restingActive`: turns on at or above `on`, off at or below `off` (off < on). */
  restingThreshold: { on: number; off: number };
  /** Intensity used when the signal is invalid or the mode is 'fixed'. */
  neutralIntensity: number;
  calibration: { activeMs: number; restingMs: number };
  /** Simulator keys as KeyboardEvent.code values. Must not collide with the game keys. */
  simKeys: { alpha: string; clench: string; blink: string; noisyPin: string };
}

export interface GameConfig {
  /** Fixed environment rules: acceleration in px/s², drag/decay in 1/s, wind cap in px/s. Never signal-driven. */
  surfaces?: { iceAcceleration: number; iceDrag: number; maxWindSpeed: number; windDecay: number };
  /** Logical canvas size in pixels; the canvas scales to fit the window. */
  view: { width: number; height: number };
  /** Downward acceleration in px/s^2. EEG never changes this. */
  gravityY: number;
  /** Player body size in px. Movement and the level checker use the same box. */
  player: { width: number; height: number };
  /** Fixed physics steps per second (the same maths runs in the level checker). */
  stepHz: number;
  walkSpeed: number;
  jump: {
    /** Holding longer than this adds nothing. */
    maxChargeMs: number;
    /** Launch speed in px/s at zero and at full charge. */
    minSpeed: number;
    maxSpeed: number;
    /** Launch angle from horizontal, in degrees, when a direction is held. */
    angleDeg: number;
  };
  /** Horizontal air control as a fraction of walk speed, 0 (none) to 1. */
  airSteer01: number;
  /** Optional steering cap while strictly descending; ascent/apex retain airSteer01. */
  fallSteer01?: number;
  /** Descent-only horizontal control after activationDelayMs from the apex; px/s² toward a px/s target. */
  falling?: { accelerationX: number; speedX: number; ledgeReachPx: number; activationDelayMs: number };
  /** Bounce caps, crumbling ledges and updraft columns (game mechanics of the endless climb; never signal-driven). */
  ledgeKinds?: LedgeKindsConfig;
}

/**
 * Rules of the special ledges and zones. Speeds in px/s (y grows downward), times in ms, rates in 1/s.
 * Absent from a config: those kinds behave as plain ledges and the columns do nothing.
 */
export interface LedgeKindsConfig {
  /** Landing on a bounce cap launches upward at `launchSpeed + impactGain x landing speed`, at most `maxLaunchSpeed`. */
  bounce: { launchSpeed: number; impactGain: number; maxLaunchSpeed: number };
  /**
   * A crumbling ledge holds `holdMs` after the candle first stands on it, then is gone. It grows back
   * `regrowMs` after it fell, once the candle's body is at least `clearancePx` from where it was.
   */
  crumble: { holdMs: number; regrowMs: number; clearancePx: number };
  /**
   * Inside an updraft column, while rising faster than the column's terminal speed, gravity is scaled by
   * `gravity01`; slower than it, vertical speed eases toward it at `brakePerS`. Terminal speed: `driftVy`
   * (a gentle sink, positive) or `riseVy` (a rise, negative).
   */
  updraft: { gravity01: number; brakePerS: number; driftVy: number; riseVy: number };
}

export interface EmberConfig {
  /** Minimum delay between completed returns; placement and pickup remain available. */
  cooldownMs?: number;
  /** Valid resting-active time needed to activate the ember, in ms. */
  targetValidMs: number;
  /** A fall at least this high counts as "big" for events and narration. */
  bigFallPx: number;
  /** The ember is offered only after a fall of at least this height. */
  minFallPxToOffer: number;
}

export type UiComponentId =
  | 'world-tutorial'
  | 'main-menu'
  | 'start-menu'
  | 'pause-menu'
  | 'settings-panel'
  | 'hud'
  | 'source-badge'
  | 'captions'
  | 'calibration'
  | 'ember-prompt'
  | 'finish-screen'
  | 'debug-overlay';

/** Named areas of the UI grid over the canvas. */
export type UiSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-center' | 'center' | 'full';

export interface UiConfig {
  components: Record<UiComponentId, { enabled: boolean; slot: UiSlot }>;
}

export interface AudioConfig {
  /** Ceiling on music gain, 0..1, so music never masks jump and landing sounds. */
  maxMusicGain: number;
  musicCrossfadeMs: number;
  narrator: {
    /** Minimum gap between any two lines. */
    cooldownMs: number;
    /** Minimum gap before the same line may repeat. */
    repeatCooldownMs: number;
  };
}
