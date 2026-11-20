/**
 * Where the two-player rules (versus.ts) meet the wall prototype's fall rule (`standBottomY`, D-37 QA fixes):
 * a landing on the other candle's head after a wall kick measures its fall from where the candle last stood and
 * clears it like any landing; a knock in the air keeps it (a knock is not a takeoff from a ledge); and with no wall
 * and no other candle the state has no wall keys.
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { applyKnock, headId, type OtherBody } from '../player/versus';
import { WALL_TYPE } from '../player/wall';

const W = 960;
const DT = 1000 / G.stepHz;
const H = G.player.height;
const BW = G.player.width;
const IDLE: PlayerInput = { left: false, right: false, jump: false };
const PRESS: PlayerInput = { left: false, right: false, jump: true };
const FLOOR: PlatformBox = { id: 'floor', x: 480, y: 1010, width: 960, height: 20 };
const FLOOR_TOP = 1000;
/** A wall whose left face is at x = 500, from y = 600 to y = 1000. */
const WALL: PlatformBox = { id: 'w1', x: 516, y: 800, width: 32, height: 400, type: WALL_TYPE };
/** Took off from a ledge whose top was 50 px above the floor, now in the air touching the wall's left face. */
const STOOD = FLOOR_TOP - 50;
const start = (): PlayerState => ({ ...createPlayer(500 - BW / 2, STOOD - H / 2 - 20), vy: -50, launchVx: 0, jumpLatch: false, takeoffBottomY: STOOD });

/** Kick off the wall, then fall; returns the trace of (x, feet) until a landing, with the landing event. */
function flight(others: OtherBody[]) {
  let s = stepPlayer(start(), PRESS, [FLOOR, WALL], W, G, DT, others.length ? { others } : {}).state;
  const trace: { x: number; feet: number; vy: number }[] = [];
  for (let i = 0; i < 400; i++) {
    const out = stepPlayer(s, IDLE, [FLOOR, WALL], W, G, DT, others.length ? { others } : {});
    s = out.state;
    trace.push({ x: s.x, feet: s.y + H / 2, vy: s.vy });
    if (out.events.landed) return { state: s, landed: out.events.landed, trace };
  }
  return { state: s, landed: null, trace };
}

describe('two candles and the wall fall rule', () => {
  it('a landing on a head after a wall kick measures the fall from where the candle stood, and clears it', () => {
    const kicked = stepPlayer(start(), PRESS, [FLOOR, WALL], W, G, DT).state;
    expect(kicked.standBottomY).toBe(STOOD);
    // Where the solo flight comes down through the height of a head standing on the floor.
    const solo = flight([]);
    const headTop = FLOOR_TOP - H;
    const crossing = solo.trace.find((p) => p.vy > 0 && p.feet >= headTop)!;
    const below: OtherBody = { id: 'guest', x: crossing.x - 4, y: FLOOR_TOP - H / 2, vx: 0, vy: 0, width: BW, height: H, grounded: true };
    const withHead = flight([below]);
    expect(withHead.landed?.platformId).toBe(headId('guest'));
    // Feet on the head top (964), stood at 950: a 14 px fall, not measured from the kick (which was higher still).
    expect(withHead.landed?.fallHeightPx).toBeCloseTo(headTop - STOOD, 6);
    expect(withHead.state.standBottomY).toBeNull();
  });

  it('a knock in the air keeps where the candle last stood; a knocked standing candle has none to keep', () => {
    const kicked = stepPlayer(start(), PRESS, [FLOOR, WALL], W, G, DT).state;
    expect(applyKnock(kicked, { dvx: -200, dvy: 100 }, H).state.standBottomY).toBe(STOOD);
    const standing = { ...createPlayer(300, FLOOR_TOP - H / 2), grounded: true, platformId: 'floor' };
    expect(applyKnock(standing, { dvx: 0, dvy: -300 }, H).state.standBottomY).toBeUndefined();
  });

  it('with another candle but no wall, the state still has no wall keys', () => {
    const other: OtherBody = { id: 'guest', x: 600, y: FLOOR_TOP - H / 2, vx: 0, vy: 0, width: BW, height: H, grounded: true };
    let s = createPlayer(300, 900);
    for (let i = 0; i < 200; i++) s = stepPlayer(s, { left: false, right: true, jump: false }, [FLOOR], W, G, DT, { others: [other], pushVx: 0 }).state;
    expect(Object.keys(s)).not.toContain('standBottomY');
    expect(Object.keys(s)).not.toContain('kickWallId');
  });
});
