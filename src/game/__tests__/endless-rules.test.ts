/** Endless rules that are not the generator: the chunk window, fuel, wax and mood. */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG } from '../../config/game.config';
import { createEventBus } from '../../shared/bus';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import type { GameEvent } from '../../shared/contracts/events';
import { createStore } from '../../shared/store';
import { createChunkStream } from '../endless/chunk-stream';
import { createEndlessWax } from '../endless/endless-wax';
import { addWax, burnPerSecond, freshFlame, isLit, stepFlame } from '../endless/flame-fuel';
import { createEndlessGenerator } from '../endless/generator';
import { moodIntensity } from '../endless/mood';

describe('chunk stream', () => {
  const stream = () => createChunkStream(createEndlessGenerator(11, GAME_CONFIG, C), C);
  it('keeps a small window around the player however high the climb goes', () => {
    const s = stream();
    let most = 0;
    for (let feetY = C.baseFloorTopPx; feetY > -200 * C.chunkHeightPx; feetY -= 137) {
      s.update(feetY);
      most = Math.max(most, s.platforms().length);
      expect(s.chunks().length).toBeLessThanOrEqual(C.keepBelow + C.keepAbove + 1);
    }
    expect(most).toBeLessThan(80);
  });
  it('reports nothing while the player stays in one chunk, and exact adds and removes when they leave', () => {
    const s = stream();
    expect(s.update(C.baseFloorTopPx)!.added.map((c) => c.index)).toEqual([0, 1]);
    expect(s.update(C.baseFloorTopPx - 300)).toBeNull();
    const up = s.update(C.baseFloorTopPx - 2 * C.chunkHeightPx - 10)!;
    expect(up.added.map((c) => c.index)).toEqual([2, 3]);
    expect(up.removed.map((c) => c.index)).toEqual([0]);
  });
  it('rebuilds a chunk identically after a fall, and includes the landing above the window', () => {
    const s = stream();
    s.update(C.baseFloorTopPx);
    const before = structuredClone(s.chunks()[0]);
    s.update(C.baseFloorTopPx - 30 * C.chunkHeightPx);
    s.update(C.baseFloorTopPx);
    expect(s.chunks()[0]).toEqual(before);
    expect(s.platforms().at(-1)!.id).toBe('e2:floor');
    const bounds = s.bounds();
    expect(bounds.bottom).toBeGreaterThan(bounds.top);
  });
  it('never reports a chunk below the first one', () => {
    const s = stream();
    expect(s.indexAt(C.baseFloorTopPx + 5000)).toBe(0);
    expect(s.indexAt(Number.NaN)).toBe(0);
  });
});

describe('flame fuel', () => {
  it('burns down over the configured time, faster when it is harder', () => {
    let flame = freshFlame(C);
    for (let ms = 0; ms < C.fuel.burnSecondsEasy * 1000 / 2; ms += 100) flame = stepFlame(flame, 100, 0, C);
    expect(flame.fuel01).toBeCloseTo(0.5, 2);
    expect(burnPerSecond(Number.NaN, C)).toBe(burnPerSecond(0, C));
    expect(burnPerSecond(-5, C)).toBe(burnPerSecond(0, C));
    // Faster over the ramp, slowly faster after it, then steady: no climb lasts forever.
    expect(1 / burnPerSecond(C.rampChunks, C)).toBeCloseTo(C.fuel.burnSecondsHard);
    expect(1 / burnPerSecond(C.fuel.lateChunks, C)).toBeCloseTo(C.fuel.burnSecondsLate);
    expect(burnPerSecond(C.fuel.lateChunks * 4, C)).toBe(burnPerSecond(C.fuel.lateChunks, C));
    for (let index = 1; index <= C.fuel.lateChunks; index++) expect(burnPerSecond(index, C)).toBeGreaterThan(burnPerSecond(index - 1, C));
  });
  it('glows for the grace time at zero, then goes out for good', () => {
    let flame = stepFlame({ ...freshFlame(C), fuel01: 0.0001 }, 1000, 0, C);
    expect(isLit(flame)).toBe(false);
    expect(flame.out).toBe(false);
    flame = stepFlame(flame, C.fuel.graceMs - 1, 0, C);
    expect(flame.out).toBe(false);
    flame = stepFlame(flame, 1, 0, C);
    expect(flame.out).toBe(true);
    expect(addWax(flame, C)).toBe(flame);
    expect(stepFlame(flame, 1000, 0, C)).toBe(flame);
  });
  it('wax refills, never above full, and relights a glowing wick with a fresh grace time', () => {
    expect(addWax({ ...freshFlame(C), fuel01: 0.95 }, C).fuel01).toBe(1);
    const glowing = stepFlame(stepFlame({ ...freshFlame(C), fuel01: 0.0001 }, 1000, 0, C), C.fuel.graceMs / 2, 0, C);
    const relit = addWax(glowing, C);
    expect(isLit(relit)).toBe(true);
    expect(relit.fuel01).toBeCloseTo(C.fuel.waxRefill01);
    expect(relit.graceLeftMs).toBe(C.fuel.graceMs);
  });
  it('ignores bad time steps', () => {
    const flame = freshFlame(C);
    expect(stepFlame(flame, Number.NaN, 0, C).fuel01).toBe(1);
    expect(stepFlame(flame, -500, 0, C).fuel01).toBe(1);
  });
});

describe('mood follows the flame', () => {
  it('is calm with plenty of fuel and rises smoothly, within bounds, as it runs out', () => {
    expect(moodIntensity(1, C)).toBe(C.mood.calmIntensity);
    expect(moodIntensity(C.mood.calmAboveFuel01, C)).toBe(C.mood.calmIntensity);
    expect(moodIntensity(0, C)).toBeCloseTo(C.mood.peakIntensity);
    let previous = moodIntensity(1, C);
    for (let fuel = 1; fuel >= 0; fuel -= 0.01) {
      const value = moodIntensity(fuel, C);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(moodIntensity(Number.NaN, C)).toBe(C.mood.calmIntensity);
  });
});

describe('endless wax', () => {
  it('hands each drop out once, publishes the count and tells the bus', () => {
    const bus = createEventBus();
    const snapshot = createStore({ ...INITIAL_GAME_SNAPSHOT });
    const events: GameEvent[] = [];
    bus.on('wax_collected', (event) => events.push(event));
    const wax = createEndlessWax({ gameConfig: GAME_CONFIG, bus, snapshot });
    const drops = [{ id: 'a', x: 100, y: 100 }, { id: 'b', x: 400, y: 100 }];
    expect(wax.update({ x: 300, y: 100 }, drops)).toEqual([]);
    expect(wax.update({ x: 104, y: 96 }, drops).map((d) => d.id)).toEqual(['a']);
    expect(wax.update({ x: 104, y: 96 }, drops)).toEqual([]);
    expect(snapshot.get().wax).toEqual({ collected: 1, total: null, boostRemainingMs: 0 });
    expect(events).toHaveLength(1);
    expect(wax.isCollected('a')).toBe(true);
    wax.reset();
    expect(wax.count()).toBe(0);
    expect(snapshot.get().wax?.collected).toBe(0);
  });
});

describe('biomes', () => {
  it('alternate in bands, starting with forest', async () => {
    const { biomeOf, chunkOfPlatform } = await import('../endless/biome');
    const band = C.biome.chunksPerBand;
    expect(biomeOf(0, C)).toBe('forest');
    expect(biomeOf(band - 1, C)).toBe('forest');
    expect(biomeOf(band, C)).toBe('snow');
    expect(biomeOf(2 * band, C)).toBe('forest');
    expect(biomeOf(-4, C)).toBe('forest');
    expect(chunkOfPlatform('e12:p3')).toBe(12);
    expect(chunkOfPlatform('e7:floor')).toBe(7);
    expect(chunkOfPlatform('lower-floor')).toBe(0);
  });

  it('snow fades in before a snowy band, is strongest inside it, and is gone in the forest', async () => {
    const { snowAt } = await import('../endless/biome');
    const bandPx = C.biome.chunksPerBand * C.chunkHeightPx;
    const at = (heightPx: number): number => snowAt(C.baseFloorTopPx - heightPx, C);
    expect(at(0)).toBe(0);
    expect(at(bandPx - C.biome.blendPx - 1)).toBe(0);
    expect(at(bandPx - C.biome.blendPx / 2)).toBeGreaterThan(0);
    expect(at(bandPx + bandPx / 2)).toBeCloseTo(C.biome.firstSnow01);
    expect(at(2 * bandPx + bandPx / 2)).toBe(0);
    // Later snow bands snow harder, never above 1, and the value never jumps.
    expect(at(3 * bandPx + bandPx / 2)).toBeGreaterThan(C.biome.firstSnow01);
    let previous = at(0);
    for (let h = 0; h < 40 * bandPx; h += 16) {
      const value = at(h);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(Math.abs(value - previous)).toBeLessThan(0.08);
      previous = value;
    }
    expect(snowAt(Number.NaN, C)).toBe(0);
  });
});
