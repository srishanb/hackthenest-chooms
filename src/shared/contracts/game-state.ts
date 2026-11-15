/**
 * The game's public state, written by the game lane and read by UI and audio.
 *
 * Why: UI components show or hide themselves from `phase` and render the ember and prompts
 * from this snapshot, so the game never calls into the UI.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */

export type GamePhase = 'menu' | 'calibrating' | 'playing' | 'paused' | 'ember' | 'finished';

export interface EmberSnapshot {
  /** The player owns an ember. */
  available: boolean;
  /** Recovery is in progress (gameplay frozen). */
  active: boolean;
  /** Accumulated valid time toward activation, 0 to 1. */
  progress01: number;
  /** The labelled ordinary-input rescue is currently offered. */
  canAssist: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  sectionId: string | null;
  /** Height climbed, 0 (bottom) to 1 (finish). */
  altitude01: number;
  ember: EmberSnapshot;
  /** A key into src/ui/strings.ts, never display text. Null when there is no prompt. */
  promptKey: string | null;
}

export const INITIAL_GAME_SNAPSHOT: GameSnapshot = {
  phase: 'playing',
  sectionId: null,
  altitude01: 0,
  ember: { available: true, active: false, progress01: 0, canAssist: false },
  promptKey: null,
};
