import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT, type GameSnapshot } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { writeSnapshot } from '../scenes/snapshot-writer';
import { altitude01, bodyInArea, findFinish, refugeAt } from '../world/finish';
import { createPhaseController } from '../world/phase-controller';

const plat = (id: string, x: number, y: number) => ({ id, x, y, width: 240, height: 20, type: 'static' });
const low: SectionData = { id: 's1', spawn: { x: 480, y: 460 }, platforms: [plat('floor', 480, 500)], refuge: null, finish: null };
const high: SectionData = { id: 's2', spawn: { x: 350, y: 140 }, platforms: [plat('entry', 350, 185)], refuge: { id: 'r1', x: 350, y: 135, width: 200, height: 100 }, finish: { x: 620, y: -175, width: 160, height: 80 } };
const SECTIONS = [low, high];

function setup() {
  const bus = createEventBus();
  const store = createStore<GameSnapshot>(INITIAL_GAME_SNAPSHOT);
  const events: GameEvent['type'][] = [];
  bus.onAny((event) => events.push(event.type));
  let cleared = 0;
  const controller = createPhaseController(bus, store, () => (cleared += 1));
  return { bus, store, events, controller, cleared: () => cleared };
}

describe('areas and altitude', () => {
  it('finds the finish, refuge and area membership', () => {
    expect(findFinish(SECTIONS)).toEqual(high.finish);
    expect(findFinish([low])).toBeNull();
    expect(bodyInArea(620, -175, high.finish!)).toBe(true);
    expect(bodyInArea(620, -300, high.finish!)).toBe(false);
    expect(refugeAt(SECTIONS, 350, 140)).toBe('r1');
    expect(refugeAt(SECTIONS, 900, 140)).toBeNull();
  });

  it('altitude is 0 at section 1 spawn, 1 at the finish, clamped', () => {
    expect(altitude01(SECTIONS, 460)).toBe(0);
    expect(altitude01(SECTIONS, -175)).toBe(1);
    expect(altitude01(SECTIONS, 1000)).toBe(0);
    expect(altitude01(SECTIONS, -900)).toBe(1);
    expect(altitude01(SECTIONS, 142.5)).toBeCloseTo(0.5, 5);
    expect(altitude01([low], 0)).toBe(0);
  });
});

describe('phase controller', () => {
  it('finish fires once: one finish event, phase finished, save cleared once', () => {
    const { controller, store, events, cleared } = setup();
    controller.finish();
    controller.finish();
    expect(events.filter((e) => e === 'finish')).toHaveLength(1);
    expect(store.get().phase).toBe('finished');
    expect(controller.isRunning()).toBe(false);
    expect(cleared()).toBe(1);
  });

  it('pause freezes and resume restores the earlier phase, including ember', () => {
    const { bus, controller, store } = setup();
    expect(controller.isRunning()).toBe(true);
    bus.emit({ type: 'pause' });
    expect(store.get().phase).toBe('paused');
    expect(controller.isRunning()).toBe(false);
    bus.emit({ type: 'resume' });
    expect(store.get().phase).toBe('playing');
    expect(controller.isRunning()).toBe(true);

    store.set({ ...store.get(), phase: 'ember' });
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'resume' });
    expect(store.get().phase).toBe('ember');
  });

  it('pause and resume do nothing once finished; a second pause keeps the first remembered phase', () => {
    const { bus, controller, store } = setup();
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'resume' });
    expect(store.get().phase).toBe('playing');
    controller.finish();
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'resume' });
    expect(store.get().phase).toBe('finished');
  });

  it('dispose stops listening', () => {
    const { bus, controller, store } = setup();
    controller.dispose();
    bus.emit({ type: 'pause' });
    expect(store.get().phase).toBe('playing');
  });
});

describe('snapshot writer', () => {
  it('writes only changed fields and does not notify for identical values', () => {
    const store = createStore<GameSnapshot>(INITIAL_GAME_SNAPSHOT);
    let notified = 0;
    store.subscribe(() => (notified += 1));
    writeSnapshot(store, { sectionId: 's1', inRefuge: false, altitude01: 0 });
    expect(notified).toBe(1);
    writeSnapshot(store, { sectionId: 's1', inRefuge: false, altitude01: 0.001 });
    expect(notified).toBe(1);
    writeSnapshot(store, { inRefuge: true, altitude01: 0.4 });
    expect(notified).toBe(2);
    expect(store.get()).toMatchObject({ sectionId: 's1', inRefuge: true, altitude01: 0.4, phase: 'playing' });
  });
});
