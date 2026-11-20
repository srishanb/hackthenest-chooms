/**
 * Two candles in one world (Decision D-38): the pure rules of versus.ts, run through the real `stepPlayer`.
 * Solid sides, a standable head that carries, a jump from a head, a head that leaves, a shove (off a ledge too),
 * a head-on knock in the air, and an overlap that is separated without passing through a ledge or a wall.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createPlayer, stepPlayer, type StepEnvironment } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { applyKnock, headId, knockBetween, shoveDirection, type OtherBody } from '../player/versus';
import { WALL_TYPE } from '../player/wall';

const W = 960;
const DT = 1000 / G.stepHz;
const V = G.versus!;
const H = G.player.height;
const BW = G.player.width;
const IDLE: PlayerInput = { left: false, right: false, jump: false };
const RIGHT: PlayerInput = { left: false, right: true, jump: false };
const JUMP: PlayerInput = { left: false, right: false, jump: true };
const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const FLOOR_TOP = 488;
/** A ledge 100 px above the floor, from x = 200 to x = 360. */
const LEDGE: PlatformBox = { id: 'ledge', x: 280, y: 396, width: 160, height: 16 };
const LEDGE_TOP = 388;
const standY = (top: number): number => top - H / 2;

const other = (x: number, y: number, extra: Partial<OtherBody> = {}): OtherBody =>
  ({ id: 'guest', x, y, vx: 0, vy: 0, width: BW, height: H, grounded: true, ...extra });
const step = (s: PlayerState, input: PlayerInput, env: StepEnvironment, platforms: readonly PlatformBox[] = [FLOOR, LEDGE]) =>
  stepPlayer(s, input, platforms, W, G, DT, env);
const settle = (s: PlayerState, env: StepEnvironment, platforms: readonly PlatformBox[] = [FLOOR, LEDGE]): PlayerState => {
  let state = s;
  for (let i = 0; i < 240; i++) state = step(state, IDLE, env, platforms).state;
  return state;
};

describe('a standable head', () => {
  it('a drop onto a standing candle is a landing on its head, counted as a fall like any landing', () => {
    const below = other(600, standY(FLOOR_TOP));
    let s: PlayerState = { ...createPlayer(600, 300), jumpLatch: false, takeoffBottomY: 300 + H / 2 };
    let landed = null;
    for (let i = 0; i < 240 && !landed; i++) { const out = step(s, IDLE, { others: [below] }); s = out.state; landed = out.events.landed; }
    expect(landed?.platformId).toBe(headId('guest'));
    expect(s.grounded).toBe(true);
    expect(s.y + H / 2).toBeCloseTo(FLOOR_TOP - H, 6);
    // Feet went from 318 down to the head at 452: a fall of 134 px.
    expect(landed?.fallHeightPx).toBeCloseTo(FLOOR_TOP - H - (300 + H / 2), 6);
  });

  it('carries the rider as the candle below walks, and a charge jump from the head works', () => {
    let below = other(600, standY(FLOOR_TOP));
    let s = settle(createPlayer(600, 380), { others: [below] });
    expect(s.platformId).toBe(headId('guest'));
    for (let i = 0; i < 60; i++) {
      below = { ...below, x: below.x + 1.5, dx: 1.5 };
      s = step(s, IDLE, { others: [below] }).state;
    }
    expect(s.grounded).toBe(true);
    expect(s.x).toBeCloseTo(690, 6);
    below = { ...below, dx: 0 };
    let jumped = null;
    for (let i = 0; i < 40; i++) s = step(s, JUMP, { others: [below] }).state;
    for (let i = 0; i < 3 && !jumped; i++) { const out = step(s, IDLE, { others: [below] }); s = out.state; jumped = out.events.jumped; }
    expect(jumped?.charge01).toBeGreaterThan(0.5);
    expect(s.grounded).toBe(false);
    expect(s.vy).toBeLessThan(-500);
  });

  it('when the head goes out from under the rider (moved without carrying, or it jumped), the rider falls', () => {
    const below = other(600, standY(FLOOR_TOP));
    const s = settle(createPlayer(600, 380), { others: [below] });
    const slid = step(s, IDLE, { others: [{ ...below, x: 640 }] }).state;
    expect(slid.grounded).toBe(false);
    const jumpedAway = step(s, IDLE, { others: [{ ...below, grounded: false, vy: -600 }] }).state;
    expect(jumpedAway.grounded).toBe(false);
    // And it lands on the floor in the end.
    expect(settle(slid, {}).platformId).toBe('floor');
  });

  it('rising into the feet of a candle standing above stops the head there', () => {
    const above = other(300, standY(LEDGE_TOP));
    let s: PlayerState = { ...createPlayer(300, standY(FLOOR_TOP)), grounded: false, vy: -700, jumpLatch: false };
    let bumped = false;
    for (let i = 0; i < 20 && !bumped; i++) { s = step(s, IDLE, { others: [above] }, [FLOOR]).state; bumped = s.vy === 0; }
    expect(bumped).toBe(true);
    expect(s.y - H / 2).toBeGreaterThanOrEqual(above.y + H / 2 - 1e-6);
    expect(s.vy).toBeGreaterThanOrEqual(0);
  });
});

describe('solid sides and the shove', () => {
  it('walking into a standing candle stops flush against it, and that is a shove to the right', () => {
    const wall = other(400, standY(FLOOR_TOP));
    let s = settle(createPlayer(300, 400), { others: [wall] });
    for (let i = 0; i < 120; i++) s = step(s, RIGHT, { others: [wall] }).state;
    expect(s.x).toBeCloseTo(400 - BW, 6);
    expect(shoveDirection(s, 1, wall, G.player)).toBe(1);
    expect(shoveDirection(s, -1, wall, G.player)).toBe(0);
    expect(shoveDirection(s, 1, { ...wall, grounded: false }, G.player)).toBe(0);
  });

  it('a shoved candle slides at the shove speed and is pushed off its ledge, landing on the floor below', () => {
    let s = settle(createPlayer(330, 300), {});
    expect(s.platformId).toBe('ledge');
    const push = V.shoveSpeed01 * G.walkSpeed;
    const start = s.x;
    for (let i = 0; i < 12; i++) s = step(s, IDLE, { pushVx: push }).state;
    expect(s.x - start).toBeCloseTo(push * 12 * DT / 1000, 6);
    let fell = false;
    for (let i = 0; i < 120; i++) { s = step(s, IDLE, { pushVx: push }).state; if (!s.grounded) fell = true; }
    s = settle(s, {});
    expect(fell).toBe(true);
    expect(s.platformId).toBe('floor');
    expect(s.y).toBeCloseTo(standY(FLOOR_TOP), 6);
  });

  it('a push does nothing in the air', () => {
    const s: PlayerState = { ...createPlayer(300, 200), jumpLatch: false };
    expect(step(s, IDLE, { pushVx: 300 }).state).toEqual(step(s, IDLE, {}).state);
  });
});

describe('the knock in the air', () => {
  it('a head-on hit gives each candle the same change of speed, apart, from the approach speed', () => {
    const me = { x: 400, y: 300, vx: 300, vy: 0, grounded: false };
    const them = other(400 + BW + 1, 300, { vx: -300, grounded: false });
    const knock = knockBetween(me, them, G.player, V, DT / 1000)!;
    expect(knock).not.toBeNull();
    const size = Math.min(V.knock.maxImpulse, ((1 + V.knock.restitution) / 2) * 600);
    expect(knock.mine.dvx).toBeCloseTo(-size, 6);
    expect(knock.theirs.dvx).toBeCloseTo(size, 6);
    expect(knock.mine.dvy).toBe(0);
    const after = applyKnock({ ...createPlayer(400, 300), vx: 300, launchVx: 300 }, knock.mine, H);
    expect(after.state.vx).toBeCloseTo(300 - size, 6);
    expect(after.state.launchVx).toBeCloseTo(300 - size, 6);
  });

  it('no knock when slow, when both stand, or when one lands on a standing head', () => {
    const slow = knockBetween({ x: 400, y: 300, vx: 60, vy: 0, grounded: false }, other(425, 300, { vx: -60, grounded: false }), G.player, V, DT / 1000);
    expect(slow).toBeNull();
    expect(knockBetween({ x: 400, y: 300, vx: 400, vy: 0, grounded: true }, other(425, 300, { vx: -400 }), G.player, V, DT / 1000)).toBeNull();
    expect(knockBetween({ x: 400, y: 263, vx: 0, vy: 600, grounded: false }, other(400, 300), G.player, V, DT / 1000)).toBeNull();
    // Both in the air, one falling onto the other: a vertical knock.
    const air = knockBetween({ x: 400, y: 263, vx: 0, vy: 600, grounded: false }, other(400, 300, { grounded: false, vy: -200 }), G.player, V, DT / 1000);
    expect(air?.mine.dvy).toBeLessThan(0);
    expect(air?.theirs.dvy).toBeGreaterThan(0);
  });

  it('a standing candle knocked sideways slides; knocked upward it leaves the ground', () => {
    const standing = settle(createPlayer(300, 400), {});
    expect(applyKnock(standing, { dvx: 200, dvy: 0 }, H)).toEqual({ state: standing, slideVx: 200 });
    const popped = applyKnock({ ...standing, charging: true, chargeMs: 200 }, { dvx: 0, dvy: -300 }, H).state;
    expect(popped.grounded).toBe(false);
    expect(popped.charging).toBe(false);
    expect(popped.vy).toBe(-300);
    expect(popped.takeoffBottomY).toBeCloseTo(FLOOR_TOP, 6);
  });
});

describe('an overlap is separated gently', () => {
  it('moves apart at the separation speed, never faster, on the ledge it stands on', () => {
    let s = settle(createPlayer(280, 300), {});
    const inside = other(290, s.y);
    const before = s.x;
    s = step(s, IDLE, { others: [inside] }).state;
    expect(before - s.x).toBeCloseTo(V.separateSpeed * DT / 1000, 6);
    for (let i = 0; i < 120; i++) s = step(s, IDLE, { others: [inside] }).state;
    expect(290 - s.x).toBeGreaterThanOrEqual(BW - 1e-6);
    expect(s.platformId).toBe('ledge');
  });

  it('never carries the body through a wall or a ledge: it stops at the wall face, and a falling body still lands', () => {
    const wall: PlatformBox = { id: 'w', x: 216, y: 300, width: 32, height: 400, type: WALL_TYPE };
    // Body's left side at the wall's right face (232); the other overlaps it from the right.
    let s: PlayerState = { ...createPlayer(232 + BW / 2, 200), jumpLatch: false };
    const inside = other(232 + BW / 2 + 8, 200, { grounded: false });
    for (let i = 0; i < 30; i++) s = step(s, IDLE, { others: [{ ...inside, y: s.y }] }, [FLOOR, LEDGE, wall]).state;
    expect(s.x - BW / 2).toBeGreaterThanOrEqual(232 - 1e-6);
    // It fell the whole time it was being separated, and landed on the ledge below, never through it.
    s = settle(s, { others: [inside] }, [FLOOR, LEDGE, wall]);
    expect(s.platformId).toBe('ledge');
    expect(s.y).toBeCloseTo(standY(LEDGE_TOP), 6);
  });
});
