/** Present shared state without confusing signal quality with the composure feature. */
import type { ComposureState } from '../../../shared/contracts/composure';
import type { GameSnapshot } from '../../../shared/contracts/game-state';
import { STRINGS, type StringKey } from '../../strings';

export function percent(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 100) : 0;
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
    composurePercent: signal.valid && fresh && Number.isFinite(signal.intensity) ? percent(1 - signal.intensity) : null,
    emberKey: (snapshot.ember.active ? 'hud.emberRecovering' : snapshot.ember.available
      ? 'hud.emberReady' : 'hud.emberEmpty') as StringKey,
    progressPercent: percent(snapshot.ember.progress01),
    prompt,
  };
}
