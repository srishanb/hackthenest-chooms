/**
 * Every game moment that another lane may react to, and the bus that carries them.
 *
 * Why: the narrator, recorder, HUD and captions plug in by listening here, so adding or
 * removing one of them never touches gameplay code.
 *
 * FROZEN after P0. Only the integrator changes this file.
 */

export type GameEvent =
  | { type: 'wax_collected'; id: string; x: number; y: number; collected: number; total: number | null }
  | { type: 'jump'; charge01: number }
  | { type: 'land'; platformId: string; fallHeightPx: number }
  | { type: 'fall'; heightPx: number; big: boolean }
  /** Fell below the active section boundary and was returned to its checkpoint. */
  | { type: 'section_reset'; sectionId: string }
  | { type: 'refuge_enter'; refugeId: string; firstVisit: boolean }
  | { type: 'checkpoint_saved'; refugeId: string }
  | { type: 'ember_gained' }
  | { type: 'ember_requested' }
  /** UI requests; the game owns the resulting state transitions. */
  | { type: 'ember_assist_requested' }
  | { type: 'ember_cancel_request' }
  | { type: 'run_restart' }
  | { type: 'checkpoint_restart_requested' }
  | { type: 'main_menu_requested' }
  /** The start menu's Play: the game leaves phase 'menu' and starts stepping. */
  | { type: 'start' }
  /** Launch menu requests a narrated briefing while the world remains stopped. */
  | { type: 'narrator_intro_requested' }
  | { type: 'ember_returned'; via: 'eeg' | 'assist' }
  | { type: 'ember_cancelled' }
  /** While active, the narrator must not start a new line. */
  | { type: 'precision_window'; active: boolean }
  | { type: 'signal_lost' }
  | { type: 'signal_restored' }
  | { type: 'calibration_result'; ok: boolean; reasonKey?: string }
  | { type: 'pause' }
  | { type: 'resume' }
  /** The narrator started a line. Captions subscribe to this and show `text` for `durationMs`, so they need no content lookup. */
  | { type: 'narrator_line'; lineId: string; text: string; durationMs: number }
  | { type: 'stage_completed'; stageId: string; index: number }
  | { type: 'finish' };

export type GameEventType = GameEvent['type'];

/** The event with a given `type`, for typed listeners. */
export type GameEventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;

export interface EventBus {
  /** Publish an event. The bus stamps it with the current time and passes that to listeners as `tMs`. */
  emit(event: GameEvent): void;
  /** Listen for one event type. `tMs` is on the performance.now() clock. Returns an unsubscribe function. */
  on<T extends GameEventType>(type: T, listener: (event: GameEventOf<T>, tMs: number) => void): () => void;
  /** Listen for every event (recorder, debug). Returns an unsubscribe function. */
  onAny(listener: (event: GameEvent, tMs: number) => void): () => void;
}
