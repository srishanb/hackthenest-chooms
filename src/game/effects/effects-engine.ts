/**
 * The effects engine: turns the composure signal into bounded, smoothed effect values.
 *
 * Why pure functions: no Phaser, no clock, no globals, so every rule (cap, smoothing,
 * hold-while-airborne, ease-to-neutral) is unit tested and easy to explain. Renderers and
 * audio only ever read the resulting `EffectsFrame`.
 */
import type { SignalMode } from '../../shared/contracts/composure';
import type { EffectRule, EffectsFrame } from '../../shared/contracts/effects';
import { EFFECT_IDS } from '../../shared/contracts/effects';

export interface EffectInput {
  /** 0..1 from ComposureState. */
  intensity: number;
  /** False when the signal is stale or poor: effects ease to neutral. */
  valid: boolean;
  mode: SignalMode;
  /** True from takeoff to landing. */
  airborne: boolean;
  /** Player setting, 0..1. */
  effectStrength: number;
  reducedMotion: boolean;
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

/** Where this effect is heading right now, before smoothing. Always inside [min, max]. */
export function targetFor(rule: EffectRule, input: EffectInput): number {
  if (!rule.enabled || !input.valid || input.mode === 'fixed') return clamp(rule.neutral, rule.min, rule.max);

  const intensity = clamp(input.intensity, 0, 1);
  const mapped = rule.atIntensity0 + (rule.atIntensity1 - rule.atIntensity0) * intensity;
  const scale = clamp(input.effectStrength, 0, 1) * (input.reducedMotion ? rule.reducedMotionScale : 1);
  // Scale the swing away from neutral, so strength 0 means "no signal effect", not "no light".
  return clamp(rule.neutral + (mapped - rule.neutral) * scale, rule.min, rule.max);
}

/** One smoothing step for one effect. `dtMs` is the time since the previous step. */
export function stepEffect(previous: number, rule: EffectRule, input: EffectInput, dtMs: number): number {
  if (rule.holdWhileAirborne && input.airborne) return previous;
  const target = targetFor(rule, input);
  // Time-based exponential smoothing: the same feel at 30, 60 or 144 frames per second.
  const blend = rule.tauMs <= 0 ? 1 : 1 - Math.exp(-Math.max(dtMs, 0) / rule.tauMs);
  return clamp(previous + (target - previous) * blend, rule.min, rule.max);
}

/** Step every effect in the table. An effect with no row keeps its previous value. */
export function stepEffects(previous: EffectsFrame, table: readonly EffectRule[], input: EffectInput, dtMs: number): EffectsFrame {
  const next: EffectsFrame = { ...previous };
  for (const rule of table) next[rule.id] = stepEffect(previous[rule.id], rule, input, dtMs);
  return next;
}

/** The frame to start from: every effect at its neutral value (0 if it has no row). */
export function neutralFrame(table: readonly EffectRule[]): EffectsFrame {
  const frame = Object.fromEntries(EFFECT_IDS.map((id) => [id, 0])) as EffectsFrame;
  for (const rule of table) frame[rule.id] = clamp(rule.neutral, rule.min, rule.max);
  return frame;
}
