/** Play again: after the finish, a restart puts the climb back at the start and it can be won again. */
import { expect, it } from 'vitest';
import { EMBER_CONFIG } from '../../config/ember.config';
import { GAME_CONFIG } from '../../config/game.config';
import { createEventBus } from '../../shared/bus';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT, type GameSnapshot } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createRecoveryEmber } from '../ember/recovery';
import { createPlayer } from '../player/movement';
import { createMemorySaveStorage, loadSave } from '../save';
import { createPhaseController } from '../world/phase-controller';

const sections: SectionData[] = [{
  id: 'climb', spawn: { x: 480, y: 460 }, refuge: null, finish: { x: 480, y: 150, width: 200, height: 80 },
  platforms: [
    { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
    { id: 'upper', x: 480, y: 200, width: 240, height: 20, type: 'static' },
  ],
}];

it('restarting from the finish resets the run and allows a second finish', () => {
  const bus = createEventBus(() => 0);
  const events: GameEvent['type'][] = [];
  bus.onAny((event) => events.push(event.type));
  const snapshot = createStore<GameSnapshot>({ ...INITIAL_GAME_SNAPSHOT, phase: 'playing' });
  const storage = createMemorySaveStorage();
  const ember = createRecoveryEmber({ sections, gameConfig: GAME_CONFIG, config: EMBER_CONFIG, bus, snapshot, storage });
  const phase = createPhaseController(bus, snapshot, () => {});

  expect(ember.placeOrPickup({ ...createPlayer(480, 172), grounded: true, platformId: 'upper' })).toBe(true);
  expect(loadSave(storage)?.anchor).not.toBeNull();

  phase.finish();
  expect(snapshot.get().phase).toBe('finished');
  expect(phase.isRunning()).toBe(false);

  // What the scene does on `run_restart` (the finish screen's Play again).
  expect(ember.restart()).toEqual(sections[0]!.spawn);
  expect(snapshot.get().phase).toBe('playing');
  expect(phase.isRunning()).toBe(true);
  expect(ember.getAnchor()).toBeNull();
  expect(loadSave(storage)).toBeNull();

  phase.finish();
  expect(events.filter((type) => type === 'finish')).toHaveLength(2);
});
