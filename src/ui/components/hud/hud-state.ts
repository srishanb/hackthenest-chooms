/** Present shared state without confusing signal quality with the composure feature. */
import type { ComposureState } from '../../../shared/contracts/composure';
import type { GameSnapshot } from '../../../shared/contracts/game-state';
import { STRINGS, type StringKey } from '../../strings';

export function percent(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 100) : 0;
}

/** Display bands describe feature magnitude, never a percentage of a player's composure. */
export function intensityLabel(value: number): StringKey {
  if (value < 1 / 3) return 'hud.intensityLower';
  if (value < 2 / 3) return 'hud.intensityMidrange';
  return 'hud.intensityHigher';
}

export function hudState(snapshot: GameSnapshot, signal: ComposureState, staleAfterMs: number) {
  const fresh = Number.isFinite(signal.sampleAgeMs) && signal.sampleAgeMs <= staleAfterMs;
  const statusKey: StringKey = !fresh ? 'hud.signalWaiting'
    : !signal.calibrated ? 'hud.calibrationNeeded'
    : !signal.valid ? 'hud.signalCheck' : 'hud.signalReady';
  const promptKey = snapshot.promptKey;
  const prompt = promptKey && Object.hasOwn(STRINGS, promptKey) ? STRINGS[promptKey as StringKey] : null;
  return {
    statusKey,
    qualityPercent: percent(signal.quality),
    intensityKey: signal.valid && fresh && Number.isFinite(signal.intensity) ? intensityLabel(signal.intensity) : null,
    emberKey: (snapshot.ember.active ? 'hud.emberRecovering' : snapshot.ember.available
      ? 'hud.emberReady' : 'hud.emberEmpty') as StringKey,
    progressPercent: percent(snapshot.ember.progress01),
    prompt,
  };
}
