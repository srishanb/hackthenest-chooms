/**
 * The one signal contract the rest of the app consumes.
 *
 * Why: the game, UI and audio must never touch EEG data or a device. The signal lane
 * publishes this small object about 12 times a second and everything else reads it.
 * "Composure" is the player-facing word; in code composure is `1 - intensity`.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */

/** Where the samples come from. Shown to the player at all times (source badge). */
export type InputSourceKind = 'LIVE_EEG' | 'SIMULATED' | 'REPLAY';

/** 'adaptive' follows the signal. 'fixed' is the active-play fallback: intensity stays at neutral. */
export type SignalMode = 'adaptive' | 'fixed';

export interface ComposureState {
  /** Active-play intensity, 0 (settled) to 1 (most intense). Drives lantern, fog, audio. Already smoothed. */
  intensity: number;
  /** Resting feature normalised against the resting calibration, 0 to 1. For display only. */
  resting: number;
  /** True while the resting target is met, after hysteresis. The ember counts time while this and `valid` are true. */
  restingActive: boolean;
  /** Signal quality, 0 to 1. Separate from the feature values. */
  quality: number;
  /** True only if the newest sample is fresh, quality is above the floor and no artifact gate is holding. */
  valid: boolean;
  /** Age of the newest sample in milliseconds. */
  sampleAgeMs: number;
  /** True while an artifact gate holds the previous values. */
  held: boolean;
  mode: SignalMode;
  calibrated: boolean;
  source: InputSourceKind;
  /** Registry id of the active algorithm, for example 'intensity-v1'. */
  algo: string;
  /** Timestamp in ms on the performance.now() clock. */
  t: number;
}

/** The only signal interface the game may hold. */
export interface ComposureReader {
  /** Latest state. Never throws; before any sample it returns a neutral, invalid state. */
  getState(): ComposureState;
  /** Called on every published state (about 12 Hz). Returns an unsubscribe function. */
  subscribe(listener: (state: ComposureState) => void): () => void;
}
