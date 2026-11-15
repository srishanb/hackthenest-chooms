/**
 * Pure rules for the finish screen, kept out of the DOM so they are unit tested.
 *
 * The screen shows only in phase 'finished'. Enter plays again, unless focus is on another
 * control (then that control's own Enter wins, for example the focused Play again button,
 * so one key press never restarts twice).
 */
import type { GamePhase } from '../../../shared/contracts/game-state';

export function finishScreenVisible(phase: GamePhase): boolean {
  return phase === 'finished';
}

export interface RestartKeyInput {
  code: string;
  repeat: boolean;
  phase: GamePhase;
  /** True when keyboard focus is on a button, input or other control. */
  focusOnControl: boolean;
}

export function restartsOnKey(input: RestartKeyInput): boolean {
  if (input.repeat || input.focusOnControl) return false;
  if (input.code !== 'Enter' && input.code !== 'NumpadEnter') return false;
  return finishScreenVisible(input.phase);
}
