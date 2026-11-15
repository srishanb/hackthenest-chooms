/** Exercise the existing recovery controller against the actual Snow and Snowy/Windy authored ledges. */
import { expect, it } from 'vitest';
import { SECTIONS } from '../../src/content/sections';
import { GAME_CONFIG } from '../../src/config/game.config';
import { EMBER_CONFIG } from '../../src/config/ember.config';
import { createRecoveryEmber } from '../../src/game/ember/recovery';
import { createPlayer, stepPlayer } from '../../src/game/player/movement';
import { createMemorySaveStorage } from '../../src/game/save';
import { createEventBus } from '../../src/shared/bus';
import { INITIAL_GAME_SNAPSHOT } from '../../src/shared/contracts/game-state';
import { createStore } from '../../src/shared/store';

for (const id of ['snow', 'snow-windy']) it(`places, persists, returns and picks up a stationary ember on ${id} ice`, () => {
  const platform = SECTIONS.find((section) => section.id === id)!.platforms.find((ledge) => ledge.type === 'slippery')!;
  const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
  const storage = createMemorySaveStorage();
  const deps = { sections: SECTIONS, gameConfig: GAME_CONFIG, config: EMBER_CONFIG, snapshot, storage, bus: createEventBus(), now: () => 0 };
  const ember = createRecoveryEmber(deps);
  const standing = { ...createPlayer(platform.x, platform.y - platform.height / 2 - GAME_CONFIG.player.height / 2),
    grounded: true, platformId: platform.id, vx: 180 };
  expect(ember.placeOrPickup({ ...standing, charging: true })).toBe(false);
  expect(ember.placeOrPickup({ ...standing, grounded: false })).toBe(false);
  expect(ember.placeOrPickup(standing)).toBe(true);
  const anchor = ember.getAnchor();
  let drifting: ReturnType<typeof createPlayer> = standing;
  for (let step = 0; step < 20; step++) drifting = stepPlayer(drifting, { left: false, right: false, jump: false }, [platform], 960, GAME_CONFIG, 1000 / 120).state;
  expect(drifting.x).toBeGreaterThan(standing.x);
  expect(ember.getAnchor()).toEqual(anchor);
  const reloaded = createRecoveryEmber(deps);
  expect(reloaded.spawn).toEqual({ x: anchor!.x, y: anchor!.y });
  const lower = { ...createPlayer(480, 470), grounded: true, platformId: 'floor' };
  expect(reloaded.request(lower)).toBe(true);
  expect(reloaded.assist()).toEqual(anchor);
  expect(reloaded.getAnchor()).toEqual(anchor);
  expect(reloaded.placeOrPickup(standing)).toBe(true);
  expect(reloaded.getAnchor()).toBeNull();
});
