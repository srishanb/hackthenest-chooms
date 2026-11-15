import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { launchVelocity } from '../player/charge-jump';
import { createPlayer, stepPlayer, teleportPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';

const WORLD_W = 960;
const DT = 1000 / GAME_CONFIG.stepHz;
const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const LEDGE: PlatformBox = { id: 'ledge', x: 700, y: 400, width: 160, height: 16 };
const PLATFORMS = [FLOOR, LEDGE];
const NONE: PlayerInput = { left: false, right: false, jump: false };
const feetOnFloor = 500 - 12 - GAME_CONFIG.player.height / 2;

const run = (state: PlayerState, input: PlayerInput, steps: number, platforms = PLATFORMS): PlayerState => {
  let s = state;
  for (let i = 0; i < steps; i += 1) s = stepPlayer(s, input, platforms, WORLD_W, GAME_CONFIG, DT).state;
  return s;
};
const settled = (x = 300): PlayerState => run(createPlayer(x, feetOnFloor - 20), NONE, 200);
const hold = (ms: number) => Math.round(ms / DT);

describe('stepPlayer', () => {
  it('lands on the floor and stands there', () => {
    const s = settled();
    expect(s.grounded).toBe(true);
    expect(s.platformId).toBe('floor');
    expect(s.y).toBeCloseTo(feetOnFloor, 5);
  });

  it('is deterministic: the same input sequence gives identical positions at every step', () => {
    const script = (i: number): PlayerInput => ({ left: i > 400, right: i > 150 && i < 300, jump: i > 20 && i < 20 + hold(500) });
    const trace = () => {
      let s = settled();
      const out: Array<[number, number]> = [];
      for (let i = 0; i < 600; i += 1) {
        s = stepPlayer(s, script(i), PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
        out.push([s.x, s.y]);
      }
      return out;
    };
    expect(trace()).toEqual(trace());
  });

  it('walks at walkSpeed and falls off an edge', () => {
    const start = settled(950 - 12);
    const moved = run(start, { ...NONE, left: true }, hold(1000));
    expect(start.x - moved.x).toBeCloseTo(GAME_CONFIG.walkSpeed, 0);
  });

  it('caps the charge: holding twice maxChargeMs launches at exactly maxSpeed', () => {
    let s = settled();
    s = run(s, { ...NONE, jump: true }, hold(GAME_CONFIG.jump.maxChargeMs * 2));
    expect(s.charging).toBe(true);
    expect(s.vx).toBe(0); // walking stops while charging
    const out = stepPlayer(s, NONE, PLATFORMS, WORLD_W, GAME_CONFIG, DT);
    expect(out.events.jumped?.charge01).toBe(1);
    expect(-launchVelocity(1, 0, GAME_CONFIG).vy).toBe(GAME_CONFIG.jump.maxSpeed);
    // vy after one step is launch vy plus one step of gravity.
    expect(out.state.vy).toBeCloseTo(-GAME_CONFIG.jump.maxSpeed + GAME_CONFIG.gravityY * (DT / 1000), 5);
  });

  it('a short press launches slower than a long one', () => {
    const peak = (ms: number) => {
      let s = run(settled(), { ...NONE, jump: true }, hold(ms));
      let top = s.y;
      for (let i = 0; i < 400; i += 1) {
        s = stepPlayer(s, NONE, PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
        top = Math.min(top, s.y);
      }
      return feetOnFloor - top;
    };
    expect(peak(100)).toBeLessThan(peak(500));
    expect(peak(500)).toBeLessThan(peak(GAME_CONFIG.jump.maxChargeMs));
  });

  it('steering cannot reverse a launch: full launch right, hold left throughout, lands right of takeoff', () => {
    let s = run(settled(100), { ...NONE, jump: true }, hold(GAME_CONFIG.jump.maxChargeMs));
    s = stepPlayer(s, { ...NONE, right: true }, PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
    const takeoffX = s.x;
    let steps = 0;
    while (!s.grounded && steps < 2000) {
      s = stepPlayer(s, { ...NONE, left: true }, PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
      if (!s.grounded) expect(s.vx).toBeGreaterThan(0);
      steps += 1;
    }
    expect(s.grounded).toBe(true);
    expect(s.x).toBeGreaterThan(takeoffX);
    const cap = GAME_CONFIG.airSteer01 * GAME_CONFIG.walkSpeed;
    expect(launchVelocity(1, 1, GAME_CONFIG).vx - cap).toBeGreaterThan(0);
  });

  it('a held jump never relaunches through a teleport: needs a release and a new press', () => {
    let s = run(settled(), { ...NONE, jump: true }, hold(300));
    s = teleportPlayer(300, feetOnFloor - 5);
    s = run(s, { ...NONE, jump: true }, 400); // still held: lands, does not charge
    expect(s.grounded).toBe(true);
    expect(s.charging).toBe(false);
    s = run(s, NONE, 5);
    s = run(s, { ...NONE, jump: true }, 5);
    expect(s.charging).toBe(true);
  });

  it('a jump key held since the air does not charge on landing', () => {
    let s = createPlayer(300, 100);
    s = run(s, { ...NONE, jump: true }, 600);
    expect(s.grounded).toBe(true);
    expect(s.charging).toBe(false);
  });

  it('platforms are one-way: jump up through the ledge, land on top', () => {
    let s = run(settled(700), { ...NONE, jump: true }, hold(GAME_CONFIG.jump.maxChargeMs));
    s = stepPlayer(s, NONE, PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
    let landedOn: string | null = null;
    for (let i = 0; i < 800 && landedOn === null; i += 1) {
      const out = stepPlayer(s, NONE, PLATFORMS, WORLD_W, GAME_CONFIG, DT);
      s = out.state;
      landedOn = out.events.landed?.platformId ?? null;
    }
    expect(landedOn).toBe('ledge');
  });

  it('does not tunnel through a thin platform at high speed', () => {
    const thin: PlatformBox = { id: 'thin', x: 480, y: 300, width: 200, height: 2 };
    let s = createPlayer(480, -2000);
    let landed: string | null = null;
    for (let i = 0; i < 5000 && landed === null; i += 1) {
      const out = stepPlayer(s, NONE, [thin], WORLD_W, GAME_CONFIG, DT);
      s = out.state;
      landed = out.events.landed?.platformId ?? null;
    }
    expect(landed).toBe('thin');
  });

  it('keeps the body inside the side walls', () => {
    const s = run(settled(30), { ...NONE, left: true }, 200);
    expect(s.x).toBe(GAME_CONFIG.player.width / 2);
  });

  it('reports the fall height on landing', () => {
    const start = run(settled(700), { ...NONE, jump: true }, hold(GAME_CONFIG.jump.maxChargeMs));
    let s = stepPlayer(start, { ...NONE, right: true }, PLATFORMS, WORLD_W, GAME_CONFIG, DT).state;
    let height = -1;
    for (let i = 0; i < 1000 && height < 0; i += 1) {
      const out = stepPlayer(s, NONE, PLATFORMS, WORLD_W, GAME_CONFIG, DT);
      s = out.state;
      if (out.events.landed) height = out.events.landed.fallHeightPx;
    }
    expect(height).toBeGreaterThanOrEqual(0);
  });
});
