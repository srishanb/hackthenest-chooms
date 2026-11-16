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
  /** Remaining return cooldown; zero when ready. */
  cooldownRemainingMs?: number;
  /** The player owns an ember. */
  available: boolean;
  /** Recovery is in progress (gameplay frozen). */
  active: boolean;
  /** Accumulated valid time toward activation, 0 to 1. */
  progress01: number;
  /** The labelled ordinary-input rescue is currently offered. */
  canAssist: boolean;
}

/** Read-only world coordinates. Presentation chooses the distance unit. */
export interface NavigationSnapshot {
  player: { x: number; y: number };
  originY: number;
  lanternRadiusPx: number;
  checkpoints: readonly { id: string; x: number; y: number }[];
}

/** One endless run, for the HUD and the end screen. Heights are world px climbed above the start. */
export interface RunSnapshot {
  mode: 'endless';
  /** The seed the platforms were generated from; the same seed gives the same climb. */
  seed: number;
  /** Highest point reached in this run. */
  heightPx: number;
  /** Best height on this device, including this run. A personal record, never a ranking. */
  bestPx: number;
  /** True once this run has passed the best height it started with. */
  newBest: boolean;
}

export interface GameSnapshot {
  /** Present only in endless mode (hands-only variant). The authored climb leaves it out. */
  run?: RunSnapshot;
  /** Actual candle resource, not a composure score. Optional for older snapshot writers. */
  lanternFuel01?: number;
  navigation?: NavigationSnapshot;
  /** Ordered stage progress is monotonic until an explicit new run. */
  stage?: { id: string; index: number; total: number; completed: number };
  /** Current tutorial lesson string key; presentation resolves it in the UI lane. */
  lessonKey?: string;
  /** Wax count/bonus; total null means replenishing supply without a collection target. */
  wax?: { collected: number; total: number | null; boostRemainingMs: number };
  phase: GamePhase;
  sectionId: string | null;
  /** True while the player stands inside a refuge (audio quiets, the refuge is lit). */
  inRefuge: boolean;
  /** Height climbed, 0 (bottom) to 1 (finish). */
  altitude01: number;
  ember: EmberSnapshot;
  /** A key into src/ui/strings.ts, never display text. Null when there is no prompt. */
  promptKey: string | null;
}

export const INITIAL_GAME_SNAPSHOT: GameSnapshot = {
  phase: 'playing',
  sectionId: null,
  inRefuge: false,
  altitude01: 0,
  ember: { available: true, active: false, progress01: 0, canAssist: false },
  promptKey: null,
};
