/** The start menu's Play: the game waits in 'menu' and only `start` moves it to 'playing'. */
import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import { INITIAL_GAME_SNAPSHOT, type GameSnapshot } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createPhaseController } from '../world/phase-controller';

function setup(phase: GameSnapshot['phase']) {
  const bus = createEventBus();
  const store = createStore<GameSnapshot>({ ...INITIAL_GAME_SNAPSHOT, phase });
  const controller = createPhaseController(bus, store, () => {});
  return { bus, store, controller };
}

describe('start from the menu', () => {
  it('does not run in the menu and runs after start', () => {
    const { bus, store, controller } = setup('menu');
    expect(controller.isRunning()).toBe(false);
    bus.emit({ type: 'start' });
    expect(store.get().phase).toBe('playing');
    expect(controller.isRunning()).toBe(true);
  });

  it('ignores start once the climb is under way', () => {
    const { bus, store } = setup('playing');
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'start' });
    expect(store.get().phase).toBe('paused');
  });

  it('ignores pause while in the menu', () => {
    const { bus, store } = setup('menu');
    bus.emit({ type: 'pause' });
    expect(store.get().phase).toBe('menu');
  });

  it('stops listening after dispose', () => {
    const { bus, store, controller } = setup('menu');
    controller.dispose();
    bus.emit({ type: 'start' });
    expect(store.get().phase).toBe('menu');
  });
});
