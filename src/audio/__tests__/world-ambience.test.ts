/** Environmental cues remain bounded and paused play cannot trigger sounds. */
import { expect, it, vi } from 'vitest';
import { createWorldAmbience } from '../world-ambience';
import { createStore } from '../../shared/store';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { DEFAULT_SETTINGS } from '../../shared/contracts/settings';
import type { Stores } from '../../shared/contracts/app';
import type { EffectsFrame } from '../../shared/contracts/effects';
it('limits entry/sputter cues, silences ambience in pause and cleans up loop sources', async () => {
  const sources: Array<{ stop: ReturnType<typeof vi.fn> }> = [], gains: Array<{ gain: { setTargetAtTime: ReturnType<typeof vi.fn> } }> = [];
  const raw = { currentTime: 0, state: 'running', createGain() { const node = { gain: { value: 0, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() }; gains.push(node); return node; },
    createBufferSource() { const source = { buffer: null, loop: false, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }; sources.push(source); return source; } };
  const stores: Stores = { snapshot: createStore({ ...INITIAL_GAME_SNAPSHOT, phase: 'playing', lanternFuel01: 0.1 }),
    settings: createStore(structuredClone(DEFAULT_SETTINGS)), effects: createStore({} as EffectsFrame) };
  const play = vi.fn((_id: import('../sfx-map').SfxId) => true);
  const ambience = createWorldAmbience(raw as unknown as AudioContext, {} as GainNode, stores, async () => ({} as AudioBuffer), play);
  await ambience.ready; ambience.update(0.7);
  expect(play.mock.calls.map(args => args[0])).toEqual(['corruptionEntry', 'lowFuel']);
  for (let i = 0; i < 20; i++) ambience.update(0.7);
  expect(play).toHaveBeenCalledTimes(2);
  raw.currentTime = 10; ambience.update(0.7); expect(play).toHaveBeenCalledTimes(3);
  stores.snapshot.set({ ...stores.snapshot.get(), phase: 'paused' }); raw.currentTime = 30; ambience.update(1);
  expect(play).toHaveBeenCalledTimes(3);
  expect(gains[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 30, expect.any(Number));
  ambience.dispose(); for (const source of sources) expect(source.stop).toHaveBeenCalledOnce();
});
