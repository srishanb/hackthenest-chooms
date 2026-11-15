/** Exercise refuge entry, persistence and ember ownership using the real bus and snapshot store. */
import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../shared/bus';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createMemorySaveStorage, loadSave, writeSave } from '../save';
import type { SaveStorage } from '../save';
import { createRefugeController } from '../world/refuge';

const sections: SectionData[] = ['lower', 'upper'].map((id, index) => ({
  id, spawn: { x: 50, y: 100 - index * 200 }, platforms: [], finish: null,
  refuge: { id, x: 50, y: 100 - index * 200, width: 100, height: 60 },
}));

function setup(storage: SaveStorage = createMemorySaveStorage()) {
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT, ember: { ...INITIAL_GAME_SNAPSHOT.ember } });
  const bus = createEventBus(() => 0);
  const events: GameEvent[] = [];
  bus.onAny((event) => events.push(event));
  const controller = createRefugeController({ sections, snapshot, bus, storage });
  return { controller, snapshot, events, storage };
}

describe('refuges', () => {
  it('saves immediately on entry, once per entry, without requiring a signal', () => {
    const { controller, snapshot, events, storage } = setup();
    controller.update(sections[0]!.spawn);
    controller.update(sections[0]!.spawn);
    expect(events).toEqual([
      { type: 'refuge_enter', refugeId: 'lower', firstVisit: true },
      { type: 'checkpoint_saved', refugeId: 'lower' },
    ]);
    expect(snapshot.get().inRefuge).toBe(true);
    expect(loadSave(storage)?.refugeId).toBe('lower');
    controller.update({ x: 500, y: 100 });
    expect(snapshot.get().inRefuge).toBe(false);
  });

  it('refills a spent ember at a new refuge but never on a revisit', () => {
    const { controller, snapshot, events } = setup();
    controller.update(sections[0]!.spawn);
    snapshot.set({ ...snapshot.get(), ember: { ...snapshot.get().ember, available: false } });
    controller.update({ x: 500, y: 100 });
    controller.update(sections[0]!.spawn);
    expect(snapshot.get().ember.available).toBe(false);
    expect(events.at(-2)).toEqual({ type: 'refuge_enter', refugeId: 'lower', firstVisit: false });
    controller.update(sections[1]!.spawn);
    expect(snapshot.get().ember.available).toBe(true);
    expect(events.filter((event) => event.type === 'ember_gained')).toHaveLength(1);
  });

  it('reloads at the last refuge with the spent ember and visit history intact', () => {
    const first = setup();
    first.controller.update(sections[0]!.spawn);
    first.controller.update(sections[1]!.spawn);
    first.snapshot.set({ ...first.snapshot.get(), ember: { ...first.snapshot.get().ember, available: false } });
    first.controller.destroy();
    const reloaded = setup(first.storage);
    expect(reloaded.controller.spawn).toEqual(sections[1]!.spawn);
    expect(reloaded.snapshot.get().sectionId).toBe('upper');
    expect(reloaded.snapshot.get().ember.available).toBe(false);
    reloaded.controller.update(reloaded.controller.spawn);
    expect(reloaded.snapshot.get().ember.available).toBe(false);
    expect(reloaded.events[0]).toEqual({ type: 'refuge_enter', refugeId: 'upper', firstVisit: false });
    expect(reloaded.controller.getProgress().visitedRefugeIds).toEqual(['lower', 'upper']);
  });

  it('starts fresh when a checkpoint no longer exists in the level', () => {
    const storage = createMemorySaveStorage();
    writeSave(storage, { v: 1, refugeId: 'old-map', emberAvailable: false, visitedRefugeIds: ['old-map'] });
    const { controller, snapshot } = setup(storage);
    expect(controller.spawn).toEqual(sections[0]!.spawn);
    expect(snapshot.get().ember.available).toBe(true);
    expect(controller.getProgress().visitedRefugeIds).toEqual([]);
  });

  it('keeps in-memory progress when disk writes fail, and removes its subscription on shutdown', () => {
    const blocked: SaveStorage = {
      getItem: () => null,
      setItem() { throw new Error('quota'); },
      removeItem() { throw new Error('blocked'); },
    };
    const { controller, snapshot } = setup(blocked);
    controller.update(sections[1]!.spawn);
    expect(controller.getProgress().refugeId).toBe('upper');
    controller.destroy();
    snapshot.set({ ...snapshot.get(), ember: { ...snapshot.get().ember, available: false } });
    expect(controller.getProgress().emberAvailable).toBe(true);
    expect(() => controller.clear()).not.toThrow();
  });

  it('clears progress for the next run on finish', () => {
    const { controller, storage, snapshot } = setup();
    controller.update(sections[1]!.spawn);
    controller.clear();
    controller.update({ x: 500, y: 100 });
    controller.update(sections[0]!.spawn);
    snapshot.set({ ...snapshot.get(), ember: { ...snapshot.get().ember, available: false } });
    expect(loadSave(storage)).toBeNull();
  });
});
