/** Wax goals reward exploration once per run without changing physics or airborne visibility. */
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
import { createWaxRewards, makeWaxDrops, WAX_STORAGE_KEY } from '../wax/rewards';

const platforms: PlatformData[] = [
  { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
  { id: 'ledge', x: 350, y: 380, width: 240, height: 20, type: 'static' },
  { id: 'upper', x: 620, y: 260, width: 240, height: 20, type: 'static' },
];
const away = { x: -1000, y: 0 };
function setup(storage: SaveStorage = createMemorySaveStorage()) {
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
  const bus = createEventBus(() => 0); const events: GameEvent[] = [];
  bus.onAny((event) => events.push(event));
  const wax = createWaxRewards({ platforms, gameConfig: GAME_CONFIG, snapshot, bus, storage, random: () => 0.5 });
  return { wax, snapshot, events, storage };
}

describe('wax collectibles', () => {
  it('randomizes a sparse set while exposing only one active collectible', () => {
    for (const randomValue of [0, 0.5, 0.99]) {
      const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
      const wax = createWaxRewards({ platforms, gameConfig: GAME_CONFIG, snapshot, bus: createEventBus(() => 0), random: () => randomValue });
      expect(snapshot.get().wax?.total).toBe(Math.min(2, 1 + Math.floor(randomValue * 3)));
      expect(wax.drops.filter((drop) => wax.isActive(drop.id))).toHaveLength(1);
      const inactive = wax.drops.find((drop) => !wax.isActive(drop.id));
      if (inactive) { wax.update(inactive, 0); expect(snapshot.get().wax?.collected).toBe(0); }
      while (wax.drops.some((drop) => wax.isActive(drop.id))) {
        wax.update(wax.drops.find((drop) => wax.isActive(drop.id))!, 0);
        expect(wax.drops.filter((drop) => wax.isActive(drop.id)).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('persists the random set before the first pickup so reloading cannot reroll it', () => {
    const first = setup();
    const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
    const reload = createWaxRewards({ platforms, gameConfig: GAME_CONFIG, snapshot, bus: createEventBus(() => 0), storage: first.storage, random: () => 0 });
    expect(snapshot.get().wax?.total).toBe(2);
    expect(reload.drops.filter((drop) => reload.isActive(drop.id))).toEqual(first.wax.drops.filter((drop) => first.wax.isActive(drop.id)));
  });

  it('caps longer courses at three rewards, on safe stationary ledges only', () => {
    const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
    const more = Array.from({ length: 8 }, (_, index) => ({ ...platforms[1]!, id: `extra-${index}`, y: 100 - index * 100 }));
    const wax = createWaxRewards({ platforms: [...platforms, ...more], gameConfig: GAME_CONFIG, snapshot, bus: createEventBus(() => 0), random: () => 0.99 });
    expect(snapshot.get().wax?.total).toBe(3);
    const unsafe = makeWaxDrops([{ ...platforms[1]!, type: 'slippery' }, { ...platforms[2]!, type: 'moving' }], GAME_CONFIG);
    expect(unsafe).toEqual([]);
    expect(wax.drops.filter((drop) => wax.isActive(drop.id))).toHaveLength(1);
  });
  it('places an optional goal on safe ledges, not the starting floor or duplicate surfaces', () => {
    const drops = makeWaxDrops([...platforms, { ...platforms[1]!, id: 'alias' },
      { ...platforms[2]!, id: 'wind', type: 'wind' }], GAME_CONFIG);
    expect(drops.map((drop) => drop.id)).toEqual(['wax:ledge', 'wax:upper']);
    expect(drops[0]!.x).toBe(350);
  });

  it('awards each droplet only once and publishes pickup feedback', () => {
    const { wax, snapshot, events } = setup();
    wax.update(wax.drops[0]!, 0); wax.update(wax.drops[0]!, 0);
    expect(snapshot.get().wax).toEqual({ collected: 1, total: 2, boostRemainingMs: 10000 });
    expect(events).toHaveLength(1); expect(events[0]?.type).toBe('wax_collected');
    expect(wax.isCollected(wax.drops[0]!.id)).toBe(true);
  });

  it('refreshes the short bonus rather than stacking time or strength', () => {
    const { wax, snapshot } = setup();
    wax.update(wax.drops[0]!, 0); expect(wax.lightRadius(200, false)).toBe(300);
    wax.update(away, 9000); wax.update(wax.drops[1]!, 0);
    expect(snapshot.get().wax?.boostRemainingMs).toBe(10000);
    expect(wax.lightRadius(200, false)).toBe(300);
    wax.update(away, WAX_CONFIG.boostMs + 1);
    expect(wax.lightRadius(200, false)).toBe(200);
    expect(snapshot.get().wax?.collected).toBe(2);
  });

  it('freezes collection and boost timers while paused or recovering', () => {
    const { wax, snapshot } = setup(); wax.update(wax.drops[0]!, 0);
    snapshot.set({ ...snapshot.get(), phase: 'paused' }); wax.update(wax.drops[1]!, 9000);
    expect(snapshot.get().wax).toEqual({ collected: 1, total: 2, boostRemainingMs: 10000 });
    snapshot.set({ ...snapshot.get(), phase: 'ember' }); wax.update(away, 9000);
    expect(snapshot.get().wax?.boostRemainingMs).toBe(10000);
  });

  it('holds the light through takeoff, pickup and expiration until landing', () => {
    const { wax } = setup(); expect(wax.lightRadius(200, false)).toBe(200);
    wax.update(wax.drops[0]!, 0);
    expect(wax.lightRadius(200, true)).toBe(200);
    expect(wax.lightRadius(200, false)).toBe(300);
    wax.update(away, WAX_CONFIG.boostMs + 1);
    expect(wax.lightRadius(200, true)).toBe(300);
    expect(wax.lightRadius(200, false)).toBe(200);
  });

  it('never shrinks an already-wide light and caps the extra radius', () => {
    const { wax } = setup(); wax.update(wax.drops[0]!, 0);
    expect(wax.lightRadius(400, false)).toBe(WAX_CONFIG.maxLightRadiusPx);
    expect(wax.lightRadius(500, false)).toBe(500);
  });

  it('prevents reload farming without restoring an old temporary boost', () => {
    const first = setup(); first.wax.update(first.wax.drops[0]!, 0);
    const reload = setup(first.storage); reload.wax.update(reload.wax.drops[0]!, 0);
    expect(reload.events).toHaveLength(0);
    expect(reload.snapshot.get().wax).toEqual({ collected: 1, total: 2, boostRemainingMs: 0 });
  });

  it('resets on a new run and clears run persistence on finish, leaving other data alone', () => {
    const { wax, storage, snapshot } = setup(); storage.setItem('manual-marker', 'keep');
    wax.update(wax.drops[0]!, 0); wax.finish();
    expect(storage.getItem(WAX_STORAGE_KEY)).toBeNull();
    expect(snapshot.get().wax?.collected).toBe(1);
    wax.reset(); expect(snapshot.get().wax?.collected).toBe(0);
    expect(storage.getItem('manual-marker')).toBe('keep');
  });

  it('ignores corrupt saves and still rewards pickups when storage is blocked', () => {
    const storage = createMemorySaveStorage(); storage.setItem(WAX_STORAGE_KEY, '{oops');
    expect(setup(storage).snapshot.get().wax?.collected).toBe(0);
    const blocked: SaveStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } };
    const { wax, snapshot } = setup(blocked); wax.update(wax.drops[0]!, 0);
    expect(snapshot.get().wax?.collected).toBe(1);
  });
});
