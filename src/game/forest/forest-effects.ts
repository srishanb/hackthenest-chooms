/** Reuse the existing engine. An explicit dev preview overrides only the forest's visual row. */
import type { EffectRule, EffectsFrame } from '../../shared/contracts/effects';
import { stepEffect, stepEffects, type EffectInput } from '../effects/effects-engine';

export function stepForestEffects(previous: EffectsFrame, table: readonly EffectRule[], input: EffectInput,
  deltaMs: number, preview: number | null): EffectsFrame {
  const frame = stepEffects(previous, table, input, deltaMs);
  const rule = table.find((row) => row.id === 'forestCorruption');
  if (rule && preview !== null && Number.isFinite(preview)) {
    frame.forestCorruption = stepEffect(previous.forestCorruption, rule,
      { ...input, intensity: Math.max(0, Math.min(1, preview)), valid: true, mode: 'adaptive' }, deltaMs);
  }
  return frame;
}
