/**
 * The effects table: how intensity maps to every signal-driven effect. Owner: content and tuning (Neil).
 *
 * Why a table: each effect needs a hard cap, a smoothing time and a written never-rule so a
 * noisy signal can never make the game unfair. To remove an effect, set `enabled: false`.
 * lanternRadius, forestCorruption and musicTenseMix are enabled; the rest are starting guesses.
 */
import type { EffectRule } from '../shared/contracts/effects';

export const EFFECTS_TABLE: EffectRule[] = [
  {
    id: 'forestCorruption', enabled: true,
    atIntensity0: 0, atIntensity1: 1, min: 0, max: 1, unit: '0..1',
    tauMs: 900, neutral: 0.2, holdWhileAirborne: false, reducedMotionScale: 1,
    never: 'Only bounded visual presentation changes; landing edges remain readable, physics/camera follow/recovery unchanged. Screen motion respects reduced motion and pause.',
  },
  {
    id: 'lanternRadius',
    enabled: true,
    atIntensity0: 260,
    atIntensity1: 110,
    min: 90,
    max: 280,
    unit: 'px',
    tauMs: 1200,
    neutral: 190,
    holdWhileAirborne: true,
    reducedMotionScale: 1,
    never: 'The light never goes out, and never changes between takeoff and landing.',
  },
  {
    id: 'fogDensity',
    enabled: false,
    atIntensity0: 0,
    atIntensity1: 0.6,
    min: 0,
    max: 0.6,
    unit: '0..1',
    tauMs: 2500,
    neutral: 0.2,
    holdWhileAirborne: false,
    reducedMotionScale: 1,
    never: 'Fog never hides the platform you stand on or the next landing edge.',
  },
  {
    id: 'shadowDepth',
    enabled: false,
    atIntensity0: 0.2,
    atIntensity1: 0.7,
    min: 0,
    max: 0.7,
    unit: '0..1',
    tauMs: 2500,
    neutral: 0.4,
    holdWhileAirborne: false,
    reducedMotionScale: 1,
    never: 'Shadows never cover hazards.',
  },
  {
    id: 'backgroundMotion',
    enabled: false,
    atIntensity0: 0,
    atIntensity1: 1,
    min: 0,
    max: 1,
    unit: '0..1',
    tauMs: 3000,
    neutral: 0.2,
    holdWhileAirborne: false,
    reducedMotionScale: 0,
    never: 'Only distant scenery moves; the gameplay camera and platforms never do.',
  },
  {
    id: 'musicTenseMix',
    enabled: true,
    atIntensity0: 0,
    atIntensity1: 0.8,
    // 0 is the calm bed alone, 1 the tense loop alone (equal-power crossfade). The cap leaves a little of the
    // calm bed under the tense loop, whose recording has near-silent stretches, so the music never drops out.
    min: 0,
    max: 0.8,
    unit: '0..1',
    tauMs: 4000,
    // With no usable signal the music sits mostly on the calm bed rather than guessing a mood.
    neutral: 0.15,
    holdWhileAirborne: false,
    reducedMotionScale: 1,
    never: 'Music never masks jump and landing sounds.',
  },
  {
    id: 'lanternFlicker',
    enabled: false,
    atIntensity0: 0,
    atIntensity1: 0.5,
    min: 0,
    max: 0.5,
    unit: '0..1',
    tauMs: 1500,
    neutral: 0.1,
    holdWhileAirborne: false,
    reducedMotionScale: 0,
    never: 'Flicker never reduces the light radius below its minimum.',
  },
];
