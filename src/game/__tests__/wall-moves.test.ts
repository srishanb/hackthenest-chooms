/**
 * Wall slide and wall jump (Decision D-37, a prototype behind `?walls=1`): the pure physics rules, checked with
 * the same `stepPlayer` the game, the generator's replay and the reach search run.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { WALL_TYPE, kickVelocity, wallBeside } from '../player/wall';

const W = 960;
const DT = 1000 / G.stepHz;
const R = G.wallMoves!;
const IDLE: PlayerInput = { left: false, right: false, jump: false };
const RIGHT: PlayerInput = { left: false, right: true, jump: false };
const LEFT: PlayerInput = { left: true, right: false, jump: false };
const H = G.player.height;
const BW = G.player.width;
const topOf = (p: PlatformBox): number => p.y - p.height / 2;

const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 2010, width: 960, height: 20 };
/** A wall whose left face is at x = 500, from y = 600 to y = 1400. */
const WALL: PlatformBox = { id: 'w1', x: 516, y: 1000, width: 32, height: 800, type: WALL_TYPE };
/** A second wall facing it, right face at x = 400. */
const WALL2: PlatformBox = { id: 'w2', x: 384, y: 1000, width: 32, height: 800, type: WALL_TYPE };

/** In the air at (x, y) moving with (vx, vy), having taken off with its feet at `takeoffFeet`. */
const airborne = (x: number, y: number, vx: number, vy: number, takeoffFeet: number): PlayerState =>
  ({ ...createPlayer(x, y), vx, vy, launchVx: vx, jumpLatch: false, takeoffBottomY: takeoffFeet });

function run(start: PlayerState, platforms: PlatformBox[], steps: number, input: (i: number, s: PlayerState) => PlayerInput) {
  const states: PlayerState[] = [];
  const kicks: string[] = [];
  let s = start;
  for (let i = 0; i < steps; i++) {
    const out = stepPlayer(s, input(i, s), platforms, W, G, DT);
    if (out.events.wallKicked) kicks.push(out.events.wallKicked.wallId);
    s = out.state; states.push(s);
  }
  return { states, kicks, last: s };
}

/** Beside the wall's left face, pressed flat (x so the body's right side is on x = 500). */
const besideX = 500 - BW / 2;

describe('walls are solid', () => {
  it('stop a body moving into their side', () => {
    const { last } = run(airborne(besideX - 20, 1000, 300, 0, 1000 + H / 2), [WALL, FLOOR], 20, () => RIGHT);
    expect(last.x).toBeCloseTo(besideX, 6);
  });
  it('stop a head rising into their underside', () => {
    const { states } = run(airborne(516, 1500, 0, -700, 1500 + H / 2), [WALL, FLOOR], 30, () => IDLE);
    for (const s of states) expect(s.y - H / 2).toBeGreaterThanOrEqual(1400 - 1e-6);
  });
  it('can be stood on, like a ledge', () => {
    const { last } = run(airborne(516, 500, 0, 100, 500 + H / 2), [WALL, FLOOR], 120, () => IDLE);
    expect(last.grounded).toBe(true);
    expect(last.platformId).toBe('w1');
  });
});

describe('wall slide', () => {
  it('a candle pressing into a wall falls no faster than the slide speed', () => {
    const takeoff = 700;
    const { states } = run(airborne(besideX, takeoff - H / 2 + 20, 0, 300, takeoff), [WALL, FLOOR], 60, () => RIGHT);
    expect(states.at(-1)!.vy).toBeLessThanOrEqual(R.slideVy + 1);
    expect(states.at(-1)!.vy).toBeGreaterThan(R.slideVy * 0.9);
  });
  it('does not slide without holding toward the wall', () => {
    const takeoff = 700;
    const { last } = run(airborne(besideX, takeoff - H / 2 + 20, 0, 300, takeoff), [WALL, FLOOR], 30, () => IDLE);
    expect(last.vy).toBeGreaterThan(500);
  });
  it('lets go once the feet are farther than the grip distance below the takeoff', () => {
    const takeoff = 700;
    const { states } = run(airborne(besideX, takeoff - H / 2, 0, 0, takeoff), [WALL, FLOOR], 600, () => RIGHT);
    const gone = states.find((s) => s.y + H / 2 - takeoff > R.gripBelowTakeoffPx + 30)!;
    expect(gone).toBeDefined();
    expect(gone.vy).toBeGreaterThan(R.slideVy * 2);
  });
  it('a long fall is never saved by a wall: it passes at full speed', () => {
    // Took off 400 px above the wall's top, pressing into it all the way down.
    const takeoffFeet = 200;
    const { states } = run(airborne(besideX, takeoffFeet - H / 2, 0, 0, takeoffFeet), [WALL, FLOOR], 240, () => RIGHT);
    const alongside = states.filter((s) => s.y > WALL.y - WALL.height / 2 && s.y < WALL.y + WALL.height / 2);
    expect(alongside.length).toBeGreaterThan(0);
    for (let i = 1; i < alongside.length; i++) expect(alongside[i]!.vy).toBeGreaterThan(alongside[i - 1]!.vy);
    // And a kick press on the way down does nothing either.
    const pressed = run(airborne(besideX, takeoffFeet - H / 2, 0, 0, takeoffFeet), [WALL, FLOOR], 240,
      (i) => ({ ...RIGHT, jump: i % 2 === 0 }));
    expect(pressed.kicks).toEqual([]);
  });
  it('the edges of the world never grip', () => {
    const takeoff = 700;
    const { last } = run(airborne(W - BW / 2, takeoff - H / 2 + 20, 0, 300, takeoff), [FLOOR], 30, () => RIGHT);
    expect(last.vy).toBeGreaterThan(500);
    const kick = run(airborne(W - BW / 2, takeoff - H / 2 + 20, 0, 100, takeoff), [FLOOR], 4, (i) => ({ ...RIGHT, jump: i === 2 }));
    expect(kick.kicks).toEqual([]);
  });
});

describe('wall jump', () => {
  const takeoff = 800;
  const sliding = (): PlayerState => airborne(besideX, takeoff - H / 2 + 10, 0, 80, takeoff);
  it('a fresh press kicks up and away from the wall', () => {
    const { states, kicks } = run(sliding(), [WALL, FLOOR], 3, (i) => ({ ...RIGHT, jump: i === 1 }));
    expect(kicks).toEqual(['w1']);
    const k = kickVelocity(1, R);
    expect(states[1]!.vx).toBeCloseTo(k.vx, 6);
    expect(states[1]!.vx).toBeLessThan(0);
    expect(states[1]!.vy).toBeLessThan(0);
  });
  it('a key held from before does not kick (the jump latch)', () => {
    const { kicks } = run({ ...sliding(), jumpLatch: true }, [WALL, FLOOR], 20, () => ({ ...RIGHT, jump: true }));
    expect(kicks).toEqual([]);
  });
  it('works from a few px away, not only pressed flat', () => {
    const { kicks } = run(airborne(besideX - R.kickReachPx + 1, takeoff - H / 2, 0, 0, takeoff), [WALL, FLOOR], 2,
      (i) => ({ ...IDLE, jump: i === 1 }));
    expect(kicks).toEqual(['w1']);
  });
  it('climbs less than a full charge jump', () => {
    const { states } = run(sliding(), [WALL, FLOOR], 120, (i) => ({ ...IDLE, jump: i === 1 }));
    const kickFeet = states[1]!.y + H / 2;
    const rise = kickFeet - Math.min(...states.map((s) => s.y + H / 2));
    const fullJumpRise = (G.jump.maxSpeed * Math.sin((G.jump.angleDeg * Math.PI) / 180)) ** 2 / 2 / G.gravityY;
    expect(rise).toBeGreaterThan(60);
    expect(rise).toBeLessThan(fullJumpRise * 0.75);
  });
  it('ignores held direction for the lockout, so it cannot steer straight back', () => {
    const { states } = run(sliding(), [WALL, FLOOR], 1 + Math.floor(R.kickLockMs / DT), (i) => ({ ...RIGHT, jump: i === 1 }));
    for (const s of states.slice(2)) expect(s.vx).toBeCloseTo(kickVelocity(1, R).vx, 6);
  });
  it('the same wall cannot be kicked twice in a row', () => {
    // Kick, then steer back onto the same wall and press again and again.
    const { kicks } = run(sliding(), [WALL, FLOOR], 200, (i) => ({ ...RIGHT, jump: i === 1 || (i > 40 && i % 2 === 0) }));
    expect(kicks).toEqual(['w1']);
  });
  it('a chimney of two facing walls is climbed by alternating kicks', () => {
    // Between WALL2 (right face 400) and WALL (left face 500): kick from one to the other, pressing toward the next.
    let heading: -1 | 1 = 1;
    let pressNext = false;
    const start = airborne(besideX, 1300 - H / 2, 0, 0, 1300);
    const { kicks, states } = run(start, [WALL, WALL2, FLOOR], 600, (_, s) => {
      const near = wallBeside([WALL, WALL2], s.x, s.y, G.player, 0.5);
      const input = { left: heading < 0, right: heading > 0, jump: false };
      if (near && near.side === heading && s.vy > -50) {
        if (pressNext) { pressNext = false; heading = -heading as -1 | 1; return { ...input, jump: true }; }
        pressNext = true;
      }
      return input;
    });
    expect(kicks.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < kicks.length; i++) expect(kicks[i]).not.toBe(kicks[i - 1]);
    const highest = Math.min(...states.map((s) => s.y + H / 2));
    expect(1300 - highest).toBeGreaterThan(200);
  });
  it('a landing lets the same wall be kicked again', () => {
    const ledge: PlatformBox = { id: 'l', x: 380, y: 1210, width: 200, height: 20 };
    const after = run(sliding(), [WALL, FLOOR, ledge], 1, () => RIGHT).last;
    const kicked = stepPlayer({ ...after, jumpLatch: false }, { ...RIGHT, jump: true }, [WALL, FLOOR, ledge], W, G, DT);
    expect(kicked.events.wallKicked?.wallId).toBe('w1');
    const landed = run(kicked.state, [WALL, FLOOR, ledge], 300, () => IDLE).last;
    expect(landed.grounded).toBe(true);
    expect(landed.kickWallId).toBeNull();
  });
});

describe('a world without walls', () => {
  it('keeps the old player state exactly (no wall fields appear)', () => {
    const ledge: PlatformBox = { id: 'l', x: 480, y: 1010, width: 200, height: 20 };
    let s: PlayerState = { ...createPlayer(480, topOf(ledge) - H / 2), grounded: true, platformId: 'l', jumpLatch: false };
    for (let i = 0; i < 400; i++) {
      s = stepPlayer(s, { left: false, right: i > 60, jump: i < 50 }, [ledge, FLOOR], W, G, DT).state;
      expect('kickWallId' in s).toBe(false);
      expect('wallLockMs' in s).toBe(false);
      expect('standBottomY' in s).toBe(false);
    }
  });
});

describe('the grip window edge', () => {
  it('a fall that starts inside the grip window slides until the feet pass it, then falls freely', () => {
    // Took off with the feet at 1000, pressed into the wall from there (the window is the 96 px below).
    const takeoff = 1000;
    const { states } = run(airborne(besideX, takeoff - H / 2, 0, 0, takeoff), [WALL, FLOOR], 400, () => RIGHT);
    const below = (s: PlayerState): number => s.y + H / 2 - takeoff;
    for (let i = 1; i < states.length; i++) {
      const before = states[i - 1]!, after = states[i]!;
      if (after.y - H / 2 >= WALL.y + WALL.height / 2) break;
      // Every step that starts with the feet inside the window slides: never faster than the slide speed.
      if (below(before) <= R.gripBelowTakeoffPx) expect(after.vy, `step ${i}`).toBeLessThanOrEqual(R.slideVy + 1e-6);
      // Past it, gravity alone: the speed grows by a full step of gravity.
      else expect(after.vy - before.vy, `step ${i}`).toBeCloseTo(G.gravityY * DT / 1000, 6);
    }
    expect(states.some((s) => below(s) > R.gripBelowTakeoffPx && s.vy > R.slideVy * 1.5)).toBe(true);
  });
  it('a kick press works just inside the window and never just past it', () => {
    const pressAt = (belowPx: number): string[] => run(airborne(besideX, 1000 + belowPx - H / 2, 0, 50, 1000), [WALL, FLOOR], 2,
      (i) => ({ ...RIGHT, jump: i === 1 })).kicks;
    expect(pressAt(R.gripBelowTakeoffPx - 2)).toEqual(['w1']);
    expect(pressAt(R.gripBelowTakeoffPx + 2)).toEqual([]);
  });
});

describe('a landing after wall kicks measures its fall from where the candle stood', () => {
  /** Stand on `ledge`, jump straight up a little into the gap beside WALL, kick off it, land on `target`. */
  const kickAndLand = (ledge: PlatformBox, target: PlatformBox): { fall: number | null; kicks: string[] } => {
    const platforms = [WALL, FLOOR, ledge, target];
    let s: PlayerState = { ...createPlayer(besideX, topOf(ledge) - H / 2), grounded: true, platformId: ledge.id, jumpLatch: false };
    let fall: number | null = null;
    const kicks: string[] = [];
    for (let i = 0; i < 900 && fall === null; i++) {
      // Charge 20 steps, release, then press jump 10 steps after leaving the ground, then drift left.
      const input = i < 20 ? { ...IDLE, jump: true } : i === 32 ? { ...RIGHT, jump: true } : i < 32 ? RIGHT : LEFT;
      const out = stepPlayer(s, input, platforms, W, G, DT);
      if (out.events.wallKicked) kicks.push(out.events.wallKicked.wallId);
      if (out.events.landed && i > 20) fall = out.events.landed.fallHeightPx;
      s = out.state;
    }
    return { fall, kicks };
  };
  const ledge: PlatformBox = { id: 'start', x: 440, y: 1310, width: 120, height: 20 };
  it('landing below the kick but above where it stood is no fall', () => {
    // The ledge it lands on is 20 px above the takeoff ledge, far below where the kick happened.
    const target: PlatformBox = { id: 't', x: 300, y: topOf(ledge) - 20 + 10, width: 200, height: 20 };
    const { fall, kicks } = kickAndLand(ledge, target);
    expect(kicks).toEqual(['w1']);
    expect(fall).toBe(0);
  });
  it('a long fall after a kick still counts, at its full height below where it stood', () => {
    const target: PlatformBox = { id: 't', x: 200, y: topOf(ledge) + 400 + 10, width: 300, height: 20 };
    const { fall, kicks } = kickAndLand({ ...ledge, width: 60, x: besideX }, target);
    expect(kicks).toEqual(['w1']);
    expect(fall).toBeCloseTo(400, 6);
  });
});
