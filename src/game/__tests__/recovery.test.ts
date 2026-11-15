/** Real bus/store tests for placement, pickup, unlimited recovery and stale-signal protection. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { EMBER_CONFIG } from '../../config/ember.config';
import { createEventBus } from '../../shared/bus';
import type { ComposureState } from '../../shared/contracts/composure';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { createStore } from '../../shared/store';
import { createRecoveryEmber } from '../ember/recovery';
import { createPlayer } from '../player/movement';
import { createMemorySaveStorage, loadSave, writeSave } from '../save';

const sections: SectionData[] = [{
  id: 'climb', spawn: { x: 480, y: 460 }, refuge: null, finish: null,
  platforms: [
    { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
    { id: 'upper', x: 480, y: 200, width: 240, height: 20, type: 'static' },
  ],
}];
const upper = { ...createPlayer(480, 172), grounded: true, platformId: 'upper' };
const lower = { ...createPlayer(480, 470), grounded: true, platformId: 'floor' };
function signal(t: number, valid = true): ComposureState {
  return { t, valid, restingActive: true, sampleAgeMs: 0, resting: 1, intensity: 0, quality: 1,
    held: false, calibrated: true, mode: 'adaptive', source: 'SIMULATED', algo: 'test' };
}
function setup(storage = createMemorySaveStorage(), targetValidMs = 4000) {
  let wallTime = 0;
  const bus = createEventBus(() => 0); const events: GameEvent[] = [];
  bus.onAny((event) => events.push(event));
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT, ember: { ...INITIAL_GAME_SNAPSHOT.ember } });
  const ember = createRecoveryEmber({ sections, gameConfig: GAME_CONFIG,
    config: { ...EMBER_CONFIG, targetValidMs }, bus, snapshot, storage, now: () => wallTime });
  return { ember, snapshot, events, storage, setTime: (value: number) => { wallTime = value; } };
}

describe('one reusable manually placed ember', () => {
  it('does not create an anchor automatically and rejects airborne placement', () => {
    const { ember, storage } = setup();
    expect(ember.getAnchor()).toBeNull(); expect(loadSave(storage)).toBeNull();
    expect(ember.placeOrPickup({ ...upper, grounded: false })).toBe(false);
    expect(ember.request(lower)).toBe(false);
  });

  it('places one marker, requires nearby pickup, and lets the player place it elsewhere', () => {
    const { ember } = setup();
    expect(ember.placeOrPickup(upper)).toBe(true);
    expect(ember.placeOrPickup(lower)).toBe(false);
    expect(ember.getAnchor()?.platformId).toBe('upper');
    expect(ember.placeOrPickup(upper)).toBe(true);
    expect(ember.getAnchor()).toBeNull();
    expect(ember.placeOrPickup(lower)).toBe(true);
    expect(ember.getAnchor()?.platformId).toBe('floor');
  });

  it('supports repeated returns without consuming or relocating the ember', () => {
    const { ember, snapshot, events, setTime } = setup(); ember.placeOrPickup(upper);
    for (let repeat = 0; repeat < 3; repeat++) {
      setTime(repeat * 5001);
      expect(ember.request(lower)).toBe(true);
      expect(snapshot.get().phase).toBe('ember');
      expect(ember.assist()).toEqual({ platformId: 'upper', x: 480, y: 172 });
      expect(snapshot.get().phase).toBe('playing');
      expect(snapshot.get().ember.available).toBe(true);
      expect(ember.getAnchor()?.platformId).toBe('upper');
    }
    expect(events.filter((event) => event.type === 'ember_returned')).toHaveLength(3);
  });

  it('blocks repeated returns for five seconds, even across pickup, replacement and reload', () => {
    const first = setup(); first.ember.placeOrPickup(upper); first.ember.request(lower); first.ember.assist();
    expect(first.ember.request(lower)).toBe(false);
    first.ember.placeOrPickup(upper); first.ember.placeOrPickup(upper);
    expect(first.ember.request(lower)).toBe(false);
    const reloaded = setup(first.storage);
    expect(reloaded.ember.request(lower)).toBe(false);
    reloaded.setTime(4999); expect(reloaded.ember.request(lower)).toBe(false);
    reloaded.setTime(5000); expect(reloaded.ember.request(lower)).toBe(true);
    expect(reloaded.ember.assist()?.platformId).toBe('upper');
  });

  it('exposes cooldown seconds to the HUD and makes recovery ready again when it expires', () => {
    const { ember, snapshot, setTime } = setup();
    ember.placeOrPickup(upper); ember.request(lower); ember.assist();
    expect(snapshot.get().ember.cooldownRemainingMs).toBe(5000);
    setTime(1500); ember.refreshPrompt(lower);
    expect(snapshot.get().ember.cooldownRemainingMs).toBe(4000);
    expect(snapshot.get().promptKey).toBe('ember.cooldownHint');
    setTime(5000); ember.refreshPrompt(lower);
    expect(snapshot.get().ember.cooldownRemainingMs).toBe(0);
    expect(snapshot.get().promptKey).toBe('ember.returnHint');
  });

  it('persists only a deliberate marker; pickup removes the reload destination', () => {
    const first = setup(); first.ember.placeOrPickup(upper);
    expect(setup(first.storage).ember.spawn).toEqual({ x: 480, y: 172 });
    first.ember.placeOrPickup(upper);
    expect(setup(first.storage).ember.spawn).toEqual(sections[0]!.spawn);
  });

  it('ignores legacy automatic checkpoints and invalid manual locations', () => {
    const storage = createMemorySaveStorage();
    storage.setItem('lighten.save.v1', JSON.stringify({ v: 1, refugeId: 'upper' }));
    expect(setup(storage).ember.spawn).toEqual(sections[0]!.spawn);
    writeSave(storage, { v: 2, anchor: { platformId: 'upper', x: 480, y: -900 } });
    expect(setup(storage).ember.getAnchor()).toBeNull();
  });

  it('requires a safe supported position and a lower grounded return origin', () => {
    const { ember } = setup();
    expect(ember.placeOrPickup({ ...upper, x: 0 })).toBe(false);
    ember.placeOrPickup(upper);
    expect(ember.request(upper)).toBe(false);
    expect(ember.request({ ...lower, grounded: false })).toBe(false);
    expect(ember.request(lower)).toBe(true);
  });

  it('cancels without moving the player or changing the placed marker', () => {
    const { ember, snapshot } = setup(); ember.placeOrPickup(upper); ember.request(lower);
    ember.cancel();
    expect(snapshot.get().phase).toBe('playing'); expect(snapshot.get().ember.active).toBe(false);
    expect(ember.getAnchor()?.platformId).toBe('upper'); expect(ember.assist()).toBeNull();
  });

  it('accumulates only fresh valid target time, pauses invalid periods and then returns', () => {
    const { ember, snapshot, events } = setup(undefined, 300);
    ember.placeOrPickup(upper); ember.request(lower);
    ember.advance(signal(0), 0); ember.advance(signal(100), 100);
    const before = snapshot.get().ember.progress01;
    ember.advance(signal(200, false), 200);
    expect(snapshot.get().ember.progress01).toBe(before);
    ember.advance(signal(300), 300);
    expect(ember.advance(signal(400), 400)?.platformId).toBe('upper');
    expect(events.at(-1)).toEqual({ type: 'ember_returned', via: 'eeg' });
  });

  it('cannot complete on a frozen signal or while paused', () => {
    const { ember, snapshot } = setup(undefined, 1000);
    ember.placeOrPickup(upper); ember.request(lower);
    for (let now = 0; now <= 3000; now += 100) expect(ember.advance(signal(0), now)).toBeNull();
    expect(snapshot.get().ember.progress01).toBeLessThan(1);
    snapshot.set({ ...snapshot.get(), phase: 'paused' });
    const before = snapshot.get().ember.progress01;
    ember.advance(signal(4000), 4000);
    expect(snapshot.get().ember.progress01).toBe(before);
  });

  it('continues in memory if storage is blocked and starts a new run with the ember carried', () => {
    const blocked = { getItem(): string | null { throw Error('blocked'); }, setItem() { throw Error('quota'); }, removeItem() { throw Error('blocked'); } };
    const { ember } = setup(blocked);
    expect(ember.placeOrPickup(upper)).toBe(true);
    expect(ember.restart()).toEqual(sections[0]!.spawn);
    expect(ember.getAnchor()).toBeNull();
  });
});

describe('pause checkpoint actions', () => {
  it('returns only to a real safe anchor and preserves wax and cooldown', () => {
    const { ember, snapshot, setTime } = setup();
    snapshot.set({...snapshot.get(), phase:'paused'});
    expect(ember.restartAtAnchor()).toBeNull();
    snapshot.set({...snapshot.get(), phase:'playing',wax:{collected:2,total:5,boostRemainingMs:1000}});
    ember.placeOrPickup(upper); ember.request(lower); ember.assist();
    snapshot.set({...snapshot.get(),phase:'paused'}); ember.advance(signal(0),0);
    setTime(20000); ember.advance(signal(20000),20000);
    expect(ember.restartAtAnchor()).toEqual({platformId:'upper',x:480,y:172});
    expect(snapshot.get().phase).toBe('playing');
    expect(snapshot.get().ember.cooldownRemainingMs).toBe(5000);
    expect(snapshot.get().wax?.collected).toBe(2);
    expect(ember.getAnchor()?.platformId).toBe('upper');
  });
  it('does not allow checkpoint restart during live gameplay', () => {
    const {ember}=setup(); ember.placeOrPickup(upper); expect(ember.restartAtAnchor()).toBeNull();
  });
});
