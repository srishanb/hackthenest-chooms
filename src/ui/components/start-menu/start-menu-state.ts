/**
 * Pure rules for the start menu, kept out of the DOM so they are unit tested.
 *
 * The menu shows only in phase 'menu' and steps aside while the settings panel is open.
 * Enter starts the climb, unless focus is on another control (then that control's own
 * Enter behaviour wins, for example the Settings button).
 */
import type { GamePhase } from '../../../shared/contracts/game-state';

export function startMenuVisible(phase: GamePhase, settingsOpen: boolean): boolean {
  return phase === 'menu' && !settingsOpen;
}

export interface StartKeyInput {
  code: string;
  repeat: boolean;
  phase: GamePhase;
  settingsOpen: boolean;
  /** True when keyboard focus is on a button, input or other control. */
  focusOnControl: boolean;
}

export function startsOnKey(input: StartKeyInput): boolean {
  if (input.repeat || input.focusOnControl) return false;
  if (input.code !== 'Enter' && input.code !== 'NumpadEnter') return false;
  return startMenuVisible(input.phase, input.settingsOpen);
}
