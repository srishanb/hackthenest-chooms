/** What leaves the candle (landing droplets, breath, smoke, flight sparks) stays in the world; the candle's own pixels follow it. */
import { describe, expect, it } from 'vitest';
import type * as Phaser from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';
import { makeAnchor, pinPerCycle, stepShed, toWorld, type Pinned } from '../candle/detached';
import { createCandleView, type CandleLook } from '../candle/candle-view';
import type { PlayerState } from '../player/types';

const px = FOREST_CONFIG.pixelScale;

describe('detached helpers', () => {
  it('pins pixels to a fixed grid point, whatever the candle does afterwards', () => {
    const anchor = makeAnchor(101.3, 55.9);
    expect(anchor.x % px).toBe(0);
    expect(toWorld(anchor, [{ x: 3, y: -4, color: 1 }], px)).toEqual([{ x: anchor.x + 3 * px, y: anchor.y - 4 * px, color: 1 }]);
  });
  it('keeps one anchor per emission and drops old ones', () => {
    let list = stepShed<number>([], 0, 100, { anchor: { x: 0, y: 0 }, data: 1 });
    list = stepShed(list, 60, 100, { anchor: { x: 50, y: 0 }, data: 2 });
    expect(list.map((s) => [s.anchor.x, s.ageMs])).toEqual([[0, 60], [50, 0]]);
    expect(stepShed(list, 60, 100).map((s) => s.data)).toEqual([2]);
  });
  it('pins a smoke puff where its cycle began and re-pins on the next cycle', () => {
    const store = new Map<number, Pinned>();
    expect(pinPerCycle(store, 0, 3, { x: 10, y: 10 })).toEqual({ x: 10, y: 10 });
    expect(pinPerCycle(store, 0, 3, { x: 90, y: 10 })).toEqual({ x: 10, y: 10 });
    expect(pinPerCycle(store, 0, 4, { x: 90, y: 10 })).toEqual({ x: 90, y: 10 });
  });
});

/** A stand-in Graphics that remembers where it sits and the squares drawn into it. */
class FakeGraphics {
  x = 0; y = 0; depth = 0; rects: { x: number; y: number }[] = [];
  setDepth(d: number): this { this.depth = d; return this; }
  setPosition(x: number, y: number): this { this.x = x; this.y = y; return this; }
  clear(): this { this.rects = []; return this; }
  fillStyle(): this { return this; }
  fillRect(x: number, y: number): this { this.rects.push({ x, y }); return this; }
  destroy(): void { /* nothing to free */ }
  /** Drawn squares in world px. */
  world(): string[] { return this.rects.map((r) => `${this.x + r.x},${this.y + r.y}`).sort(); }
}

function setup() {
  const made: FakeGraphics[] = [];
  const scene = { add: { graphics: () => { const g = new FakeGraphics(); made.push(g); return g; } } } as unknown as Phaser.Scene;
  const view = createCandleView(scene, 28, 42);
  return { view, candle: made[0]!, shed: made[1]! };
}
const look = (over: Partial<CandleLook> = {}): CandleLook => ({
  radiusPx: 150, minRadiusPx: 60, maxRadiusPx: 240, growth: 1, charge01: 0, aim: 0, reducedMotion: false, ...over,
});
const player = (over: Partial<PlayerState>): PlayerState => ({
  x: 400, y: 300, vx: 0, vy: 0, grounded: true, platformId: 'a', charging: false, chargeMs: 0, jumpLatch: false, launchVx: 0, takeoffBottomY: 0, ...over,
});

/** Falls hard, lands, then rises straight away: returns the shed squares just after landing and a moment into the jump. */
function landThenJump() {
  const { view, candle, shed } = setup();
  for (let i = 0; i < 6; i++) view.update(player({ y: 100 + i * 20, vy: 1400, grounded: false, platformId: null }), 16, false, look());
  view.update(player({ y: 300, vy: 0 }), 16, false, look()); // lands
  view.update(player({ y: 300, vy: 0 }), 16, false, look());
  const afterLanding = shed.world();
  for (let i = 0; i < 3; i++) view.update(player({ y: 300 - (i + 1) * 12, vy: -700, grounded: false, platformId: null }), 16, false, look());
  return { afterLanding, afterJump: shed.world(), candle, shed };
}

describe('candle view: shed pixels stay in the world', () => {
  it('a hard landing sheds droplets, and they do not move when the candle jumps away', () => {
    const { afterLanding, afterJump, candle, shed } = landThenJump();
    expect(afterLanding.length).toBeGreaterThan(0);
    expect(shed.x).toBe(0);
    expect(shed.y).toBe(0);
    // The candle itself did rise by 36 px; the droplets were not drawn relative to it.
    expect(candle.y).toBeLessThan(300);
    // Every droplet still showing is one that was already there, only lower (it falls); none rose with the jump.
    const ys = (list: string[]) => list.map((s) => Number(s.split(',')[1]));
    expect(Math.min(...ys(afterJump))).toBeGreaterThanOrEqual(Math.min(...ys(afterLanding)) - 14);
  });
  it('the candle keeps its own pixels and moves them with it', () => {
    const { view, candle } = setup();
    view.update(player({ x: 400 }), 16, false, look());
    const before = candle.world();
    view.update(player({ x: 500 }), 16, false, look());
    const after = candle.world();
    expect(after.length).toBe(before.length);
    expect(after).not.toEqual(before);
    expect(candle.x).toBe(500);
  });
  it('wick smoke is let go at the wick and stays', () => {
    const { view, shed } = setup();
    view.update(player({ x: 400 }), 16, false, look({ ember: true }));
    const first = shed.world();
    expect(first.length).toBe(4);
    view.update(player({ x: 800 }), 16, false, look({ ember: true }));
    // Moving the candle 400 px does not drag the smoke: it is still within a few px of where it was shed.
    for (const s of shed.world()) expect(Math.abs(Number(s.split(',')[0]) - 400)).toBeLessThan(60);
  });
});
