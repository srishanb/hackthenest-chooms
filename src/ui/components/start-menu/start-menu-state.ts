/**
 * Pure rules for the start menu, kept out of the DOM so they are unit tested.
 *
 * The menu shows only in phase 'menu' and steps aside while the settings panel is open.
 * Enter starts the climb, unless focus is on another control (then that control's own
 * Enter behaviour wins, for example the Settings button).
 */
import type { GamePhase } from '../../../shared/contracts/game-state';
import type { GameSnapshot } from '../../../shared/contracts/game-state';

/** Game-validated anchor/navigation already exists; the menu never parses or creates saves. */
export function canContinue(snapshot: GameSnapshot, playedThisSession: boolean): boolean {
  return playedThisSession || !!snapshot.navigation?.checkpoints.length || snapshot.promptKey === 'ember.placedHint';
}

/** Arrow navigation wraps the enabled visible menu buttons. */
export function menuSelection(index: number, count: number, code: string): number {
  if (!count) return -1;
  if (code === 'Home') return 0;
  if (code === 'End') return count - 1;
  const reverse = code === 'ArrowUp' || code === 'ArrowLeft';
  const current = index < 0 ? reverse ? 0 : -1 : index;
  return (current + (reverse ? -1 : 1) + count) % count;
}

/** A start emitted before the game subscribed is dropped; the menu must not stay locked then. */
export function startStalled(phase: GamePhase): boolean {
  return phase === 'menu';
}

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
