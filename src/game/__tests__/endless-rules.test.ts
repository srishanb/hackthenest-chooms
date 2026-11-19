/** Endless rules that are not the generator: the chunk window, fuel, wax and mood. */
import { describe, expect, it } from 'vitest';
import { ENDLESS_CONFIG as C } from '../../config/endless.config';
import { GAME_CONFIG } from '../../config/game.config';
import { createEventBus } from '../../shared/bus';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import type { GameEvent } from '../../shared/contracts/events';
import { createStore } from '../../shared/store';
import { createChunkStream } from '../endless/chunk-stream';
import { bounceBreaksFlow, burnScale, fallShake, isSteadying, shake, steady, steadyComposure, stepComposure } from '../endless/composure';
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
    // Three chunks of about 17 ledges each (set pieces, D-35), plus the anchor above.
    expect(most).toBeLessThan(100);
  });
  it('reports nothing while the player stays in one chunk, and exact adds and removes when they leave', () => {
    const s = stream();
    expect(s.update(C.baseFloorTopPx)!.added.map((c) => c.index)).toEqual([0, 1]);
    expect(s.update(C.baseFloorTopPx - 300)).toBeNull();
    const up = s.update(C.baseFloorTopPx - 2 * C.chunkHeightPx - 10)!;
    expect(up.added.map((c) => c.index)).toEqual([2, 3]);
    expect(up.removed.map((c) => c.index)).toEqual([0]);
  });
  it('rebuilds a chunk identically after a fall, and includes the anchor above the window', () => {
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
  it('always keeps the chunk below (nothing else catches a fall), and loads down to where a fast fall can reach', () => {
    const s = stream();
    const anchorTop = C.baseFloorTopPx - 3 * C.chunkHeightPx;
    s.update(anchorTop - 10);
    expect(s.chunks().map((c) => c.index)).toEqual([2, 3, 4]);
    // High in the chunk the chunk below stays: a missed jump falls into it.
    expect(s.update(anchorTop - C.chunkHeightPx + 30)).toBeNull();
    expect(s.chunks().map((c) => c.index)).toEqual([2, 3, 4]);
    // A body about to fall further than one chunk in one step has those chunks loaded first.
    s.update(anchorTop - 10, 2.5 * C.chunkHeightPx);
    expect(s.chunks().map((c) => c.index)).toEqual([0, 1, 2, 3, 4]);
    // Bad numbers are ignored.
    s.update(anchorTop - 10, Number.NaN);
    expect(s.chunks().map((c) => c.index)).toEqual([2, 3, 4]);
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
  it('a shaken candle darkens the forest too, and the stronger of the two causes wins', () => {
    expect(moodIntensity(1, C, 0)).toBe(C.mood.calmIntensity);
    expect(moodIntensity(1, C, 1)).toBeCloseTo(C.mood.peakIntensity);
    expect(moodIntensity(1, C, 0.5)).toBeGreaterThan(moodIntensity(1, C, 0.2));
    // Low fuel with a steady candle, and a full candle that is shaken: each alone is enough.
    expect(moodIntensity(0.05, C, 0)).toBeGreaterThan(moodIntensity(1, C, 0.3));
    expect(moodIntensity(0.45, C, 0.8)).toBeCloseTo(moodIntensity(1, C, 0.8));
    for (const shaken of [-1, 0, 0.3, 1, 5, Number.NaN]) for (const fuel of [0, 0.3, 1]) {
      const value = moodIntensity(fuel, C, shaken);
      expect(value).toBeGreaterThanOrEqual(C.mood.calmIntensity);
      expect(value).toBeLessThanOrEqual(C.mood.peakIntensity + 1e-9);
    }
  });
});

describe('composure: falls shake the candle, standing still steadies it', () => {
  const K = C.composure;
  it('a small drop does nothing; a longer fall shakes more, up to a cap', () => {
    expect(fallShake(0, C)).toBe(0);
    expect(fallShake(K.fall.minPx - 1, C)).toBe(0);
    expect(fallShake(K.fall.minPx, C)).toBeCloseTo(K.fall.min01);
    expect(fallShake(K.fall.fullPx, C)).toBeCloseTo(K.fall.max01);
    expect(fallShake(K.fall.fullPx * 10, C)).toBeCloseTo(K.fall.max01);
    // A bounce cap breaks the flow streak only for a real fall, not the small drop onto a cap on the route.
    expect(bounceBreaksFlow(0, C)).toBe(false);
    expect(bounceBreaksFlow(K.fall.minPx - 1, C)).toBe(false);
    expect(bounceBreaksFlow(K.fall.minPx, C)).toBe(true);
    expect(bounceBreaksFlow(K.fall.fullPx, C)).toBe(true);
    expect(fallShake(300, C)).toBeGreaterThan(fallShake(100, C));
    expect(fallShake(Number.NaN, C)).toBe(0);
    expect(shake(steadyComposure(), 20, C)).toEqual(steadyComposure());
  });
  it('falls add up, never past 1, and one long fall is enough to show', () => {
    let state = shake(steadyComposure(), K.fall.fullPx, C);
    expect(state.shaken01).toBeGreaterThanOrEqual(K.shownFrom01);
    for (let i = 0; i < 5; i++) state = shake(state, K.fall.fullPx, C);
    expect(state.shaken01).toBe(1);
  });
  it('standing still steadies it much faster than moving, after a short settle time', () => {
    const run = (still: boolean, ms: number) => {
      let state = steadyComposure(1);
      for (let t = 0; t < ms; t += 10) state = stepComposure(state, 10, still, C);
      return state;
    };
    // Not yet settled: no faster than moving.
    expect(run(true, K.settleMs - 20).shaken01).toBeCloseTo(run(false, K.settleMs - 20).shaken01);
    expect(isSteadying(run(true, K.settleMs - 20), C)).toBe(false);
    expect(isSteadying(run(true, K.settleMs + 20), C)).toBe(true);
    expect(run(true, 2000).shaken01).toBeLessThan(run(false, 2000).shaken01 - 0.4);
    // Fully steady again within a few seconds of standing; moving alone takes far longer but gets there.
    expect(run(true, 3200).shaken01).toBe(0);
    expect(isSteadying(run(true, 3200), C)).toBe(false);
    expect(run(false, 10_000).shaken01).toBeGreaterThan(0.5);
    expect(run(false, 40_000).shaken01).toBe(0);
  });
  it('moving again resets the settle time', () => {
    let state = steadyComposure(1);
    for (let t = 0; t < 1000; t += 10) state = stepComposure(state, 10, true, C);
    state = stepComposure(state, 10, false, C);
    expect(state.stillMs).toBe(0);
    expect(isSteadying(state, C)).toBe(false);
  });
  it('clean landings and wax steady it, never below 0, and bad numbers are ignored', () => {
    expect(steady(steadyComposure(0.5), K.wax01).shaken01).toBeCloseTo(0.5 - K.wax01);
    expect(steady(steadyComposure(0.01), K.cleanLanding01).shaken01).toBe(0);
    expect(steady(steadyComposure(0.5), Number.NaN).shaken01).toBe(0.5);
    expect(stepComposure(steadyComposure(0.5), Number.NaN, true, C).shaken01).toBe(0.5);
    expect(steadyComposure(Number.NaN).shaken01).toBe(0);
  });
  it('a shaken candle burns faster, within the cap, and a steady one burns as before', () => {
    expect(burnScale(0, C)).toBe(1);
    expect(burnScale(K.burnFrom01, C)).toBe(1);
    expect(burnScale(1, C)).toBeCloseTo(K.burnScaleMax);
    expect(burnScale(7, C)).toBeCloseTo(K.burnScaleMax);
    expect(burnScale(0.6, C)).toBeGreaterThan(1);
    const calm = stepFlame(freshFlame(C), 1000, 0, C).fuel01;
    const shaken = stepFlame(freshFlame(C), 1000, 0, C, burnScale(1, C)).fuel01;
    expect(1 - shaken).toBeCloseTo((1 - calm) * K.burnScaleMax);
    // The scale never slows the burn and never touches the glowing wick's grace time.
    expect(stepFlame(freshFlame(C), 1000, 0, C, 0.2).fuel01).toBe(calm);
    const glowing = { fuel01: 0, graceLeftMs: C.fuel.graceMs, out: false };
    expect(stepFlame(glowing, 1000, 0, C, 5).graceLeftMs).toBe(C.fuel.graceMs - 1000);
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

describe('night falls with height', () => {
  it('none low down, rising smoothly to its cap, and never past it', async () => {
    const { nightAt } = await import('../endless/night');
    const at = (chunks: number): number => nightAt(C.baseFloorTopPx - chunks * C.chunkHeightPx, C);
    expect(at(0)).toBe(0);
    expect(at(C.night.fromChunk)).toBe(0);
    expect(at(C.night.fullChunk)).toBeCloseTo(C.night.max01);
    expect(at(C.night.fullChunk * 10)).toBeCloseTo(C.night.max01);
    let previous = 0;
    for (let chunks = 0; chunks < C.night.fullChunk + 2; chunks += 0.05) {
      const value = at(chunks);
      expect(value).toBeGreaterThanOrEqual(previous - 1e-9);
      expect(value - previous).toBeLessThan(0.02);
      previous = value;
    }
    expect(nightAt(Number.NaN, C)).toBe(0);
  });

  it('in the dark you see as far as the candle has fuel; by day night changes nothing', async () => {
    const { candleRadius, nightShadowAlpha, sightRadius } = await import('../endless/night');
    const open = 1100;
    expect(sightRadius(open, 1, 0, C)).toBe(open);
    expect(sightRadius(open, 1, 1, C)).toBeCloseTo(C.night.radiusFullPx);
    expect(sightRadius(open, 0, 1, C)).toBeCloseTo(C.night.radiusEmptyPx);
    expect(sightRadius(open, 0.5, 1, C)).toBeGreaterThan(sightRadius(open, 0.2, 1, C));
    expect(candleRadius(5, C)).toBe(C.night.radiusFullPx);
    // Night never widens a view the daylight rule has already narrowed (low fuel in a darkened forest).
    expect(sightRadius(200, 1, 1, C)).toBe(200);
    // The unlit part gets darker with night, and never lighter than by day.
    expect(nightShadowAlpha(0.6, 0, C)).toBe(0.6);
    expect(nightShadowAlpha(0.6, 1, C)).toBeCloseTo(C.night.shadowAlpha);
    expect(nightShadowAlpha(0.98, 1, C)).toBe(0.98);
  });
});

describe('run score', () => {
  it('counts height only on ledges, keeps the best, and survives blocked storage', async () => {
    const { createRunScore } = await import('../endless/run-score');
    const { createMemoryStorage } = await import('../../shared/safe-storage');
    const storage = createMemoryStorage();
    const score = createRunScore({ seed: 5, originFeetY: 500, storage, key: 'best' });
    expect(score.stand(400)).toBe(true);
    expect(score.stand(450)).toBe(false);
    expect(score.snapshot()).toMatchObject({ mode: 'endless', seed: 5, heightPx: 100, bestPx: 100, newBest: false });
    score.save();
    expect(storage.getItem('best')).toBe('100');
    // A later run starts from the stored best and says so when it is beaten.
    const next = createRunScore({ seed: 6, originFeetY: 500, storage, key: 'best' });
    next.stand(450);
    expect(next.snapshot()).toMatchObject({ heightPx: 50, bestPx: 100, newBest: false });
    next.stand(300);
    expect(next.snapshot()).toMatchObject({ heightPx: 200, bestPx: 200, newBest: true });
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {} };
    const offline = createRunScore({ seed: 1, originFeetY: 500, storage: broken, key: 'best' });
    offline.stand(100);
    expect(() => offline.save()).not.toThrow();
    expect(offline.snapshot().bestPx).toBe(400);
  });

  it('a bot or development run never writes a best', async () => {
    const { createRunScore } = await import('../endless/run-score');
    const { createMemoryStorage } = await import('../../shared/safe-storage');
    const storage = createMemoryStorage();
    const score = createRunScore({ seed: 5, originFeetY: 500, storage, key: 'best', persist: false });
    score.stand(0); score.save();
    expect(storage.getItem('best')).toBeNull();
  });

  it('keeps the bests of the latest seeded climbs and forgets the oldest', async () => {
    const { rememberSeededBest } = await import('../endless/run-score');
    const { createMemoryStorage } = await import('../../shared/safe-storage');
    const storage = createMemoryStorage();
    for (let day = 1; day <= 5; day++) { storage.setItem(`best.${day}`, String(day * 10)); rememberSeededBest(storage, 'index', `best.${day}`, 3); }
    expect(storage.getItem('best.1')).toBeNull();
    expect(storage.getItem('best.2')).toBeNull();
    expect(storage.getItem('best.3')).toBe('30');
    expect(JSON.parse(storage.getItem('index')!)).toEqual(['best.3', 'best.4', 'best.5']);
    // Playing an old climb again moves it to the newest end instead of listing it twice.
    rememberSeededBest(storage, 'index', 'best.3', 3);
    expect(JSON.parse(storage.getItem('index')!)).toEqual(['best.4', 'best.5', 'best.3']);
    // A broken list is replaced, not trusted.
    storage.setItem('index', '{nonsense');
    rememberSeededBest(storage, 'index', 'best.9', 3);
    expect(JSON.parse(storage.getItem('index')!)).toEqual(['best.9']);
  });
});
