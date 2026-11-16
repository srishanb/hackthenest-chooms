/** The procedural candle: unique per seed, same poses as Ruby, flame follows the light, wax growth is tiny. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { createCandleGenome, pickCandleSeed, scaleColor as scale, seededRandom } from '../candle/candle-genome';
import { bodyShape, INITIAL_POSE, poseFrame, stepPose, type PoseInput } from '../candle/candle-pose';
import { grownSize, rasterCandle } from '../candle/candle-raster';
import { FLAME_MAX_HEIGHT, FLAME_MIN_HEIGHT, flameHeight, flameSizeFromRadius, rasterFlame } from '../candle/flame';
import { grownMovement, waxGrowth } from '../candle/growth';

const still: PoseInput = { vx: 0, vy: 0, grounded: true, charging: false };

describe('genome', () => {
  it('one seed always gives the same candle; different seeds differ', () => {
    expect(createCandleGenome(42)).toEqual(createCandleGenome(42));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(createCandleGenome(i * 7919 + 1))));
    expect(seen.size).toBe(40);
  });

  it('stays within readable bounds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const g = createCandleGenome(seed);
      expect(g.width).toBeGreaterThanOrEqual(8); expect(g.width).toBeLessThanOrEqual(10);
      expect(g.height).toBeGreaterThanOrEqual(14); expect(g.height).toBeLessThanOrEqual(17);
      for (const d of g.drips) { expect(d.x).toBeGreaterThanOrEqual(0); expect(d.x).toBeLessThan(g.width); }
    }
  });

  it('seededRandom stays in [0, 1)', () => {
    const r = seededRandom(9);
    for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });

  it('?candleSeed is honoured only in development', () => {
    expect(pickCandleSeed('?candleSeed=123', true)).toBe(123);
    expect(pickCandleSeed('?candleSeed=123', false, () => 0.5)).toBe(2147483648);
    expect(pickCandleSeed('?candleSeed=abc', true, () => 0)).toBe(0);
  });
});

describe('poses mirror the Ruby sprite', () => {
  // Start already standing: like Ruby, the very first grounded frame after boot plays a landing.
  const standing = { ...INITIAL_POSE, wasGrounded: true };
  const run = (inputs: PoseInput[], dt = 16) => inputs.reduce((p, s) => stepPose(p, s, dt, false), standing);

  it('picks charge, rise, fall, land, run and idle in that priority', () => {
    expect(run([{ ...still, charging: true }]).pose).toBe('charge');
    expect(run([{ ...still, grounded: false, vy: -100 }]).pose).toBe('rise');
    expect(run([{ ...still, grounded: false, vy: 100 }]).pose).toBe('fall');
    expect(run([{ ...still, grounded: false, vy: 100 }, still]).pose).toBe('land');
    expect(run([{ ...still, vx: 200 }]).pose).toBe('run');
    expect(run([still]).pose).toBe('idle');
  });

  it('a landing lasts 180 ms, then idles', () => {
    let p = stepPose(stepPose(INITIAL_POSE, { ...still, grounded: false, vy: 50 }, 16, false), still, 16, false);
    for (let t = 0; t < 200; t += 16) p = stepPose(p, still, 16, false);
    expect(p.pose).toBe('idle');
  });

  it('frames advance at the Ruby rates and the landing holds its last frame', () => {
    expect(poseFrame({ ...INITIAL_POSE, pose: 'run', elapsedMs: 1000 })).toBe(14 % 10);
    expect(poseFrame({ ...INITIAL_POSE, pose: 'idle', elapsedMs: 1000 })).toBe(9);
    expect(poseFrame({ ...INITIAL_POSE, pose: 'land', elapsedMs: 5000 })).toBe(2);
  });

  it('pausing freezes the animation; facing follows the walking direction', () => {
    const moving = stepPose(INITIAL_POSE, { ...still, vx: 200 }, 100, false);
    expect(stepPose(moving, { ...still, vx: 200 }, 500, true).elapsedMs).toBe(moving.elapsedMs);
    expect(stepPose(INITIAL_POSE, { ...still, vx: -200 }, 16, false).facingLeft).toBe(true);
  });

  it('charging squashes the body more the longer it is held', () => {
    const p = { ...INITIAL_POSE, pose: 'charge' as const };
    expect(bodyShape(p, 1).dHeight).toBeLessThan(bodyShape(p, 0.2).dHeight);
  });
});

describe('raster', () => {
  const genome = createCandleGenome(5);

  it('the body stands on the ground line and the wick is on top', () => {
    const { pixels, wickTip } = rasterCandle(genome, bodyShape(INITIAL_POSE, 0), 1, false);
    expect(Math.max(...pixels.map((p) => p.y))).toBe(-1);
    expect(wickTip.y).toBe(Math.min(...pixels.map((p) => p.y)));
    expect(new Set(pixels.map((p) => `${p.x},${p.y}`)).size).toBe(pixels.length);
  });

  it('facing left mirrors the candle', () => {
    const shape = bodyShape(INITIAL_POSE, 0);
    const right = rasterCandle(genome, shape, 1, false).pixels.map((p) => `${-p.x - 1},${p.y},${p.color}`).sort();
    const left = rasterCandle(genome, shape, 1, true).pixels.map((p) => `${p.x},${p.y},${p.color}`).sort();
    expect(left).toEqual(right);
  });

  it('three wax make the candle at most a pixel or so bigger', () => {
    const base = grownSize(genome, 1);
    const grown = grownSize(genome, waxGrowth(3, 0.02, 3));
    expect(grown.height - base.height).toBeGreaterThanOrEqual(0);
    expect(grown.height - base.height).toBeLessThanOrEqual(1);
  });
});

describe('flame', () => {
  const genome = createCandleGenome(11);
  const flame = (size01: number, timeMs = 0, reducedMotion = false) => rasterFlame(genome, { size01, timeMs, reducedMotion, lean: 0 });

  it('a bigger light gives a taller, larger flame', () => {
    expect(flameHeight(0)).toBe(FLAME_MIN_HEIGHT);
    expect(flameHeight(1)).toBe(FLAME_MAX_HEIGHT);
    expect(flame(1, 0, true).length).toBeGreaterThan(flame(0, 0, true).length * 2);
  });

  it('one flame frame always looks the same, and the flicker changes it over time', () => {
    expect(flame(0.6, 1000)).toEqual(flame(0.6, 1010));
    const frames = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(flame(0.6, i * 90))));
    expect(frames.size).toBeGreaterThan(1);
  });

  it('reduced motion stops the flicker but keeps the size change', () => {
    expect(flame(0.6, 0, true)).toEqual(flame(0.6, 5000, true));
    expect(flame(1, 0, true).length).toBeGreaterThan(flame(0.2, 0, true).length);
  });

  it('every row has at least one pixel and the flame sits above its base', () => {
    for (const size of [0, 0.5, 1]) {
      const pixels = flame(size, 333);
      expect(Math.max(...pixels.map((p) => p.y))).toBe(-1);
      const rows = new Set(pixels.map((p) => p.y));
      expect(rows.size).toBe(-Math.min(...pixels.map((p) => p.y)));
    }
  });

  it('maps the lantern radius onto 0..1 within its caps', () => {
    expect(flameSizeFromRadius(90, 90, 280)).toBe(0);
    expect(flameSizeFromRadius(280, 90, 280)).toBe(1);
    expect(flameSizeFromRadius(1000, 90, 280)).toBe(1);
  });
});

describe('wax growth is a very small buff', () => {
  it('+2% per wax, capped at the run maximum', () => {
    expect(waxGrowth(0, 0.02, 3)).toBe(1);
    expect(waxGrowth(3, 0.02, 3)).toBeCloseTo(1.06);
    expect(waxGrowth(10, 0.02, 3)).toBeCloseTo(1.06);
    expect(waxGrowth(Number.NaN, 0.02, 3)).toBe(1);
  });

  it('jump height and walking speed grow by the same 6%, not more', () => {
    const grown = grownMovement(GAME_CONFIG, 1.06);
    const height = (speed: number) => speed * speed / (2 * GAME_CONFIG.gravityY);
    expect(height(grown.jump.maxSpeed) / height(GAME_CONFIG.jump.maxSpeed)).toBeCloseTo(1.06);
    expect(grown.walkSpeed / GAME_CONFIG.walkSpeed).toBeCloseTo(1.06);
    expect(grown.gravityY).toBe(GAME_CONFIG.gravityY);
    expect(grown.player).toEqual(GAME_CONFIG.player);
  });

  it('no wax leaves the movement config untouched', () => {
    expect(grownMovement(GAME_CONFIG, 1)).toBe(GAME_CONFIG);
  });
});

describe('one trait of its own', () => {
  const withTrait = (kind: string) => {
    for (let seed = 1; seed < 400; seed++) { const g = createCandleGenome(seed); if (g.trait.kind === kind) return g; }
    throw new Error(`no ${kind} candle in the first 400 seeds`);
  };
  const raster = (g: ReturnType<typeof createCandleGenome>) => rasterCandle(g, bodyShape(INITIAL_POSE, 0), 1, false);

  it('every kind turns up, and about two candles in five are plain', () => {
    const kinds = Array.from({ length: 400 }, (_, i) => createCandleGenome(i + 1).trait.kind);
    expect(new Set(kinds)).toEqual(new Set(['plain', 'band', 'dipped', 'tuft', 'swirl']));
    // The swirl is rare: a few in four hundred.
    const swirls = kinds.filter((k) => k === 'swirl').length;
    expect(swirls).toBeGreaterThan(2);
    expect(swirls).toBeLessThan(30);
    const plain = kinds.filter((k) => k === 'plain').length / kinds.length;
    expect(plain).toBeGreaterThan(0.3);
    expect(plain).toBeLessThan(0.5);
  });

  it('a band and a dipped base show the accent colour; a plain candle never does', () => {
    const tones = (g: ReturnType<typeof createCandleGenome>) => new Set([1.12, 0.76, 0.88, 1].flatMap((f) => [scale(g.trait.accent, f), scale(scale(g.trait.accent, f), 0.88)]));
    const accentPixels = (g: ReturnType<typeof createCandleGenome>) => raster(g).pixels.filter((p) => tones(g).has(p.color)).length;
    expect(accentPixels(withTrait('band'))).toBeGreaterThanOrEqual(12);
    expect(accentPixels(withTrait('dipped'))).toBeGreaterThan(accentPixels(withTrait('band')));
    expect(accentPixels(withTrait('plain'))).toBe(0);
  });

  it('a swirl stripes the body softly and leaves the outline alone', () => {
    const g = withTrait('swirl');
    const plain = raster({ ...g, trait: { ...g.trait, kind: 'plain' } });
    const swirled = raster(g);
    const changed = swirled.pixels.filter((p, i) => p.color !== plain.pixels[i]!.color).length;
    expect(changed).toBeGreaterThan(15);
    expect(changed).toBeLessThan(swirled.pixels.length / 2);
    expect(swirled.pixels.map((p) => `${p.x},${p.y}`)).toEqual(plain.pixels.map((p) => `${p.x},${p.y}`));
  });

  it('a tuft adds two pixels above one shoulder and keeps the wick on top', () => {
    const g = withTrait('tuft');
    const plain = raster({ ...g, trait: { ...g.trait, kind: 'plain' } });
    const tufted = raster(g);
    expect(tufted.pixels.length).toBeGreaterThan(plain.pixels.length);
    expect(tufted.wickTip).toEqual(plain.wickTip);
    expect(tufted.wickTip.y).toBe(Math.min(...tufted.pixels.map((p) => p.y)));
  });
});
