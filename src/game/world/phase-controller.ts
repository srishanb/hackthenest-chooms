/**
 * Game phase handling: pause, resume and finish.
 *
 * Why: the pause menu (UI) only emits `pause` and `resume`; the game decides what that means.
 * Gameplay steps only while the phase is `'playing'`. `pause` remembers the phase it interrupted
 * (for example `'ember'`) and `resume` restores it. `finish` happens once, ends input for good,
 * and tells the caller so it can clear the save.
 */
import type { Store } from '../../shared/store';
import type { EventBus } from '../../shared/contracts/events';
import type { GamePhase, GameSnapshot } from '../../shared/contracts/game-state';

export interface PhaseController {
  /** True while the player may move. */
  isRunning(): boolean;
  /** Ends the climb: emits `finish` once, sets phase `'finished'`, calls `onFinish`. Later calls do nothing. */
  finish(): void;
  dispose(): void;
}

export function createPhaseController(bus: EventBus, snapshot: Store<GameSnapshot>, onFinish: () => void): PhaseController {
  let before: GamePhase = 'playing';
  const setPhase = (phase: GamePhase): void => {
    if (snapshot.get().phase !== phase) snapshot.set({ ...snapshot.get(), phase });
  };

  const offPause = bus.on('pause', () => {
    const phase = snapshot.get().phase;
    if (phase === 'paused' || phase === 'finished') return;
    before = phase;
    setPhase('paused');
  });
  const offResume = bus.on('resume', () => {
    if (snapshot.get().phase === 'paused') setPhase(before);
  });

  return {
    isRunning: () => snapshot.get().phase === 'playing',
    finish() {
      if (snapshot.get().phase === 'finished') return;
      setPhase('finished');
      bus.emit({ type: 'finish' });
      onFinish();
    },
    dispose() {
      offPause();
      offResume();
    },
  };
}
