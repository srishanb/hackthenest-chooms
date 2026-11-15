/** Replenishing wax stays single-active, preserves saves and never compounds light or candle growth. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { WAX_CONFIG } from '../../config/wax.config';
import { createEventBus } from '../../shared/bus';
import type { PlatformData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createMemorySaveStorage } from '../save';
import type { SaveStorage } from '../save';
import { waxGrowth } from '../candle/growth';
import { createWaxRewards, makeWaxDrops, WAX_STORAGE_KEY } from '../wax/rewards';

const platforms: PlatformData[] = [
  { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
  { id: 'ledge', x: 350, y: 380, width: 240, height: 20, type: 'static' },
  { id: 'upper', x: 620, y: 260, width: 240, height: 20, type: 'static' },
];
const start = { x: 480, y: 470 };
function setup(storage: SaveStorage = createMemorySaveStorage(), random = () => 0, course = platforms) {
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
  const bus = createEventBus(() => 0); const events: GameEvent[] = [];
  bus.onAny((event) => events.push(event));
  const wax = createWaxRewards({ platforms: course, gameConfig: GAME_CONFIG, snapshot, bus, storage, random });
  wax.update(start, 0);
  const active = () => wax.drops.find((drop) => wax.isActive(drop.id))!;
  return { wax, snapshot, events, storage, active };
}

describe('replenishing wax', () => {
  it('keeps suppressed wax available without rewards', () => {
    const { wax, active, snapshot, events } = setup();
    const drop = active();
    wax.update(drop, 0, 0);
    expect(snapshot.get().wax?.collected).toBe(0);
    expect(wax.isActive(drop.id)).toBe(true);
    expect(events).toHaveLength(0);
    expect(snapshot.get().wax?.boostRemainingMs).toBe(0);
    expect(wax.lightRadius(110, false, 0)).toBe(110);
    wax.update(drop, 0, 1);
    expect(snapshot.get().wax?.collected).toBe(1);
  });
  it('collects well beyond both the old cap and the number of ledges, always with at most one active', () => {
    const { wax, snapshot, events, active, storage } = setup();
    for (let count = 1; count <= 100; count++) {
      expect(wax.drops.filter((drop) => wax.isActive(drop.id))).toHaveLength(1);
      const drop = active(); wax.update(drop, 0); wax.update(drop, 0);
      expect(snapshot.get().wax?.collected).toBe(count);
      expect(snapshot.get().wax?.total).toBeNull();
      expect(wax.drops.filter((candidate) => wax.isActive(candidate.id))).toHaveLength(0);
      wax.update(start, WAX_CONFIG.respawnMaxMs);
    }
    expect(events).toHaveLength(100);
    expect(new Set(events.map((event) => event.type === 'wax_collected' ? event.id : '')) .size).toBe(100);
    expect(storage.getItem(WAX_STORAGE_KEY)!.length).toBeLessThan(150);
    expect(waxGrowth(100, WAX_CONFIG.growthPerWax, WAX_CONFIG.growthCapWax)).toBeCloseTo(1.06);
  });

  it('randomizes delays and waits before replenishing; standing on the spawn cannot farm it', () => {
    for (const random of [0, 0.5, 0.99]) {
      const { wax, active, snapshot } = setup(createMemorySaveStorage(), () => random);
      const drop = active(); wax.update(drop, 0);
      const delay = WAX_CONFIG.respawnMinMs + random * (WAX_CONFIG.respawnMaxMs - WAX_CONFIG.respawnMinMs);
      wax.update(start, delay - 1); expect(wax.drops.some((candidate) => wax.isActive(candidate.id))).toBe(false);
      wax.update(drop, 1);
      expect(wax.isActive(drop.id)).toBe(false);
      expect(snapshot.get().wax?.collected).toBe(1);
    }
  });

  it('only collects the active drop, never another eligible location', () => {
    const { wax, active, snapshot } = setup();
    wax.update(wax.drops.find((drop) => drop.id !== active().id)!, 0);
    expect(snapshot.get().wax?.collected).toBe(0);
  });

  it('allows slippery ledges while excluding duplicates, floor and moving ledges', () => {
    const drops = makeWaxDrops([...platforms, { ...platforms[1]!, id: 'alias' },
      { ...platforms[1]!, x: 500, id: 'ice', type: 'slippery' }, { ...platforms[2]!, id: 'shuttle', type: 'moving' }], GAME_CONFIG);
    expect(drops.map((drop) => drop.id)).toEqual(['wax:ledge', 'wax:upper', 'wax:ice']);
  });

  it('uses current feet height for every spawn, including equality, without consuming wax on rejection', () => {
    const { wax, snapshot, events, active } = setup();
    wax.reset();
    wax.update({ x: 100, y: 100 }, WAX_CONFIG.respawnMaxMs);
    expect(active()).toBeUndefined();
    expect(snapshot.get().wax?.collected).toBe(0);
    expect(events).toEqual([]);
    const highest = wax.drops.find((drop) => drop.id === 'wax:upper')!;
    const feetHeight = highest.y - GAME_CONFIG.player.height / 2;
    wax.update({ x: 100, y: feetHeight - 0.01 }, 0);
    expect(active()).toBeUndefined();
    wax.update({ x: 100, y: feetHeight }, 0);
    expect(active()).toEqual(highest);
    wax.reset(); wax.update(start, 0);
    expect(active().id).toBe('wax:ledge');
  });

  it('rejects a restored drop below current feet and allows a valid slippery spawn and pickup', () => {
    const storage = createMemorySaveStorage();
    storage.setItem(WAX_STORAGE_KEY, JSON.stringify({ collected: 5, activeId: 'wax:ledge', waitMs: 0 }));
    const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
    const wax = createWaxRewards({ platforms, gameConfig: GAME_CONFIG, snapshot, storage, bus: createEventBus() });
    wax.update({ x: 100, y: 100 }, 0);
    expect(wax.drops.some((drop) => wax.isActive(drop.id))).toBe(false);
    expect(snapshot.get().wax?.collected).toBe(5);
    const ice = setup(createMemorySaveStorage(), () => 0, [platforms[0]!, { ...platforms[1]!, type: 'slippery' }]);
    expect(ice.active().id).toBe('wax:ledge');
    ice.wax.update(ice.active(), 0);
    expect(ice.snapshot.get().wax?.collected).toBe(1);
  });

  it('persists the active choice and running count; reload cannot renew the boost or bypass the delay', () => {
    const first = setup(); const original = first.active();
    const uncollectedReload = setup(first.storage, () => 0.99);
    expect(uncollectedReload.active()).toEqual(original);
    first.wax.update(original, 0);
    const reload = setup(first.storage); reload.wax.update(original, 0);
    expect(reload.events).toHaveLength(0);
    expect(reload.snapshot.get().wax).toEqual({ collected: 1, total: null, boostRemainingMs: 0 });
    expect(reload.active()).toBeUndefined();
    reload.wax.update(start, WAX_CONFIG.respawnMaxMs); expect(reload.active()).toBeDefined();
  });

  it('migrates an old finite run without losing collected wax or preserving the limit', () => {
    const storage = createMemorySaveStorage();
    storage.setItem('lighten.wax.v2', JSON.stringify({ selected: ['wax:ledge', 'wax:upper'], collected: ['wax:ledge'] }));
    const { wax, snapshot, active } = setup(storage);
    expect(snapshot.get().wax?.collected).toBe(1); expect(active().id).toBe('wax:upper');
    wax.update(active(), 0); wax.update(start, WAX_CONFIG.respawnMaxMs); wax.update(active(), 0);
    expect(snapshot.get().wax?.collected).toBe(3); expect(snapshot.get().wax?.total).toBeNull();
    expect(storage.getItem('lighten.wax.v2')).toBeNull();
  });

  it('freezes both replenishment and boost timers during pause, recovery and victory', () => {
    const { wax, active, snapshot } = setup(); wax.update(active(), 0);
    for (const phase of ['paused', 'ember', 'finished'] as const) {
      snapshot.set({ ...snapshot.get(), phase }); wax.update(start, 60000);
      expect(snapshot.get().wax?.boostRemainingMs).toBe(10000);
      expect(active()).toBeUndefined();
    }
    snapshot.set({ ...snapshot.get(), phase: 'playing' });
    wax.update(start, WAX_CONFIG.respawnMinMs - 1); expect(active()).toBeUndefined();
    wax.update(start, 1); expect(active()).toBeDefined();
  });

  it('retires a missed distant drop instead of blocking all later-stage spawns', () => {
    const { wax, active } = setup(); const previous = active();
    wax.update({ x: 480, y: -1000 }, 0); expect(wax.isActive(previous.id)).toBe(false);
    wax.update(start, WAX_CONFIG.respawnMaxMs); expect(active()).toBeDefined();
  });

  it('refreshes rather than stacks the bonus and holds light changes through flight', () => {
    const { wax, active } = setup(); expect(wax.lightRadius(200, false)).toBe(200);
    wax.update(active(), 0); expect(wax.lightRadius(200, true)).toBe(200);
    expect(wax.lightRadius(200, false)).toBe(300);
    wax.update(start, WAX_CONFIG.respawnMaxMs); wax.update(active(), 0);
    expect(wax.lightRadius(200, false)).toBe(300);
    expect(wax.lightRadius(400, false)).toBe(420); expect(wax.lightRadius(500, false)).toBe(500);
    wax.lightRadius(200, false); wax.update(start, 10001);
    expect(wax.lightRadius(200, true)).toBe(300); expect(wax.lightRadius(200, false)).toBe(200);
  });

  it('resets the count for a new run and clears only wax persistence on finish', () => {
    const { wax, active, storage, snapshot } = setup(); storage.setItem('manual-marker', 'keep');
    wax.update(active(), 0); wax.finish(); expect(storage.getItem(WAX_STORAGE_KEY)).toBeNull();
    expect(snapshot.get().wax?.collected).toBe(1);
    wax.reset(); expect(snapshot.get().wax?.collected).toBe(0);
    expect(storage.getItem('manual-marker')).toBe('keep');
  });

  it('handles corrupt/blocked storage and a course without eligible locations', () => {
    const storage = createMemorySaveStorage(); storage.setItem(WAX_STORAGE_KEY, '{oops');
    expect(setup(storage).snapshot.get().wax?.collected).toBe(0);
    const blocked: SaveStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } };
    const { wax, active, snapshot } = setup(blocked); wax.update(active(), 0); expect(snapshot.get().wax?.collected).toBe(1);
    const emptySnapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
    const empty = createWaxRewards({ platforms: [], gameConfig: GAME_CONFIG, snapshot: emptySnapshot, bus: createEventBus() });
    empty.update(start, 60000); expect(empty.drops).toEqual([]);
  });
});
