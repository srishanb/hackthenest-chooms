/**
 * Effects are data: one rule per signal-driven effect, and one frame of current values.
 *
 * Why: every effect needs a cap, a smoothing time and a written "never" rule (so a noisy
 * signal can never make the game unfair). Keeping them as rows in one table means the
 * game reads numbers instead of hard-coding them, and an effect is removed by deleting a row.
 *
 * FROZEN after P0. Only the integrator changes this file. Values live in src/config/effects.config.ts.
 */

export type EffectId =
  | 'lanternRadius'
  | 'fogDensity'
  | 'shadowDepth'
  | 'backgroundMotion'
  | 'musicTenseMix'
  | 'lanternFlicker';

export const EFFECT_IDS: readonly EffectId[] = [
  'lanternRadius',
  'fogDensity',
  'shadowDepth',
  'backgroundMotion',
  'musicTenseMix',
  'lanternFlicker',
];

export interface EffectRule {
  id: EffectId;
  /** A disabled effect always outputs `neutral`. */
  enabled: boolean;
  /** Output when intensity is 0. */
  atIntensity0: number;
  /** Output when intensity is 1. */
  atIntensity1: number;
  /** Hard caps, applied last. The output can never leave [min, max]. */
  min: number;
  max: number;
  /** Unit of the output, for the debug overlay and for humans (for example 'px' or '0..1'). */
  unit: string;
  /** Smoothing time constant in milliseconds. Larger is slower. */
  tauMs: number;
  /** Target when the signal is invalid, the mode is 'fixed', or the effect is disabled. */
  neutral: number;
  /** If true the value does not change while the player is in the air (lantern radius). */
  holdWhileAirborne: boolean;
  /** Multiplier on the effect's swing away from neutral when reduced motion is on (0 turns it off). */
  reducedMotionScale: number;
  /** The documented never-rule, in plain words. */
  never: string;
}

/** The current value of every effect. Published by the game about 60 times a second. */
export type EffectsFrame = Record<EffectId, number>;
