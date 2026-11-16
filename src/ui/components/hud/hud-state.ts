/** Present shared state without confusing signal quality with the composure feature. */
import type { ComposureState } from '../../../shared/contracts/composure';
import type { GameSnapshot } from '../../../shared/contracts/game-state';
import { STRINGS, type StringKey } from '../../strings';
import { unit } from '../../../config/atmosphere.config';
import { LANTERN_FUEL_CONFIG } from '../../../config/lantern-fuel.config';

export function percent(value: number): number {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(1, value)) * 100) : 0;
}

/** Display bands describe feature magnitude, never a percentage of a player's composure. */
export function intensityLabel(value: number): StringKey {
  if (value < 1 / 3) return 'hud.intensityLower';
  if (value < 2 / 3) return 'hud.intensityMidrange';
  return 'hud.intensityHigher';
}

/** Prompts that repeat the R recovery hint; the ember panel shows it permanently, so the stage card skips them. */
const RECOVERY_PROMPT_KEYS: readonly string[] = ['ember.placedHint', 'ember.returnHint'];

/** The R hint lives in the always-visible ember panel and shows whenever an ember is placed to recover to. */
export function recoveryHintKey(hasCheckpoint: boolean): StringKey | null {
  return hasCheckpoint ? 'hud.recoverCheckpoint' : null;
}

/** Lessons that explain why the final ledge does not finish the stage. */
const ESSENTIAL_LESSON_KEYS: readonly string[] = ['stage.relightRequired', 'stage.finishBlocked', 'endless.relight', 'endless.steady'];

/** Context rows shown even with stage details off (PR #108 default), because nothing else shows them. */
export function hudEssentials(snapshot: Pick<GameSnapshot, 'phase' | 'ember' | 'lessonKey'>) {
  const progress = snapshot.phase === 'ember';
  const ember = progress || (snapshot.ember.cooldownRemainingMs ?? 0) > 0;
  const lesson = !!snapshot.lessonKey && ESSENTIAL_LESSON_KEYS.includes(snapshot.lessonKey);
  return { any: progress || ember || lesson, progress, ember, lesson };
}

/** Stage-editor test runs (`?editorTest`) start from later spawns, so their heights are not real bests. */
export function persistsBest(search: string): boolean {
  return !new URLSearchParams(search).has('editorTest');
}

/** Matches the lantern fuel refill: wax adds nothing above the normal-world corruption limit. */
export function waxToastKey(corruption: number): StringKey {
  return unit(corruption, 0.2) > LANTERN_FUEL_CONFIG.normalWorldMax01 ? 'wax.suppressed' : 'wax.pickup';
}

export function hudState(snapshot: GameSnapshot, signal: ComposureState, staleAfterMs: number) {
  const fresh = Number.isFinite(signal.sampleAgeMs) && signal.sampleAgeMs <= staleAfterMs;
  const statusKey: StringKey = !fresh ? 'hud.signalWaiting'
    : !signal.calibrated ? 'hud.calibrationNeeded'
    : !signal.valid ? 'hud.signalCheck' : 'hud.signalReady';
  const promptKey = snapshot.promptKey;
  const prompt = promptKey && !RECOVERY_PROMPT_KEYS.includes(promptKey) && Object.hasOwn(STRINGS, promptKey) ? STRINGS[promptKey as StringKey] : null;
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
