/** Turns actual game events into sparse narration requests. No game state writes. */
import { HUD_WORLD_PIXELS_PER_METRE } from '../../config/ui.config';
import { NARRATOR_MOMENTS } from '../../config/audio.config';
import type { NarratorMoment } from '../../shared/contracts/content';
import type { EventBus } from '../../shared/contracts/events';
import type { GameSnapshot } from '../../shared/contracts/game-state';
import type { Store } from '../../shared/store';

export function watchNarratorMoments(bus: EventBus, snapshot: Store<GameSnapshot>,
  request: (moment: NarratorMoment) => void, initialBestPx = 0) {
  let bestPx = Math.max(0, initialBestPx), nextHeightPx = bestPx + NARRATOR_MOMENTS.heightStepPx;
  let lowFuelArmed = true;
  const cleanups = [
    bus.on('run_restart', () => { lowFuelArmed = true; }),
    bus.on('finish', () => request('finish')),
    bus.on('fall', event => {
      const metres = event.heightPx / HUD_WORLD_PIXELS_PER_METRE;
      if (Number.isFinite(metres) && metres > NARRATOR_MOMENTS.fallMinMetres && snapshot.get().phase === 'playing') request('fall');
    }),
    bus.on('stage_completed', event => {
      // Stage 0 is the actual playable tutorial, not the skippable controls guide.
      // Final stage has no next stage; don't promise one on the finish screen.
      if (event.index === 0) request('tutorial');
      else if (event.index < (snapshot.get().stage?.total ?? Infinity) - 1) request('stage');
    }),
    snapshot.subscribe(state => {
      if (state.phase !== 'playing') return;
      const fuel = state.lanternFuel01;
      if (fuel !== undefined && Number.isFinite(fuel) && fuel >= 0 && fuel <= 1) {
        if (fuel > NARRATOR_MOMENTS.lowFuelRearm01) lowFuelArmed = true;
        if (fuel > 0 && fuel < NARRATOR_MOMENTS.lowFuel01 && lowFuelArmed) {
          lowFuelArmed = false;
          request('low-fuel');
        }
      }
      if (!state.navigation) return;
      const heightPx = state.navigation.originY - state.navigation.player.y;
      if (!Number.isFinite(heightPx)) return;
      bestPx = Math.max(bestPx, heightPx);
      if (heightPx < nextHeightPx) return;
      nextHeightPx = bestPx + NARRATOR_MOMENTS.heightStepPx;
      request('height');
    }),
  ];
  return () => { for (const cleanup of cleanups) cleanup(); };
}
