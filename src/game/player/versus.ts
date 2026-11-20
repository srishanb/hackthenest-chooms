/**
 * Two candles in one world (the two-player climb, Decision D-38): the rules that make the other candle solid.
 *
 * Each player's game runs only its own candle; the other candle is a body drawn from what the other game sends
 * (src/game/netplay/). These pure functions say what that body does to this candle:
 *   - solid sides: this candle cannot walk or fly through it (`resolveSides`, built on wall.ts `blockX`); a body
 *     that already overlaps (a late update) is moved apart sideways, gently, never through a wall or the edge;
 *   - a standable head: a standing candle's head is a thin ledge (`withHeads`), so landing on it is a landing,
 *     the rider is carried as it moves (like a moving ledge, through `dx`/`dy`), a charge jump from it works, and
 *     if it moves away the rider falls; rising into a standing candle's feet stops the head (`bumpBodies`);
 *   - a shove: walking into a standing candle pushes it (`shoveDirection` says when; the pushed player's own game
 *     moves its candle with `StepEnvironment.pushVx`);
 *   - a knock: bodies that meet fast, one of them in the air, both change speed by the relative velocity along the
 *     contact (`knockBetween`, `applyKnock`). A rider and the candle it stands on never knock each other: the carrier
 *     may jump with a rider on its head (the head is gone, the rider falls) and the rider's jump owes nothing to it.
 * With no other body, none of this is called and `stepPlayer` gives exactly what it gave before. Fixed rules from
 * GameConfig `versus`; never the signal (binding rule 2).
 */
import type { VersusConfig } from '../../shared/contracts/config';
import { clampToWalls } from './collide';
import type { PlatformBox, PlayerState } from './types';
import { blockX, bumpHead } from './wall';

/** The other candle as this candle's physics sees it. Centre and size in world px, speeds in px/s. */
export interface OtherBody {
  /** The other player's id ('host' or 'guest'). Its head ledge is `headId(id)`. */
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  /** True while it stands on something: only then can its head be stood on. */
  grounded: boolean;
  /** How far it moved since the previous physics step (px), so a rider is carried. */
  dx?: number;
  dy?: number;
  /** True while it stands on this candle's head: then it is neither a ledge nor a ceiling for this candle. */
  ridesMe?: boolean;
  /** Which way this candle moves apart when the two are exactly level (the two games pick opposite sides). */
  tieSide?: -1 | 1;
}

/** Platform type of a candle's head. */
export const HEAD_TYPE = 'head';
/** A head is a ledge this thick (px), with its top on the top of the body. */
const HEAD_THICKNESS_PX = 2;
/** Bodies this close (px) count as touching. */
const TOUCH_PX = 0.5;
const EDGE_EPSILON = 1e-6;

/** Platform id of the head of the candle with this id. */
export const headId = (bodyId: string): string => `head:${bodyId}`;
/** True when a platform id is a candle's head. */
export const isHeadId = (platformId: string | null): boolean => platformId !== null && platformId.startsWith('head:');

interface Body { width: number; height: number }

const boxOf = (other: OtherBody): PlatformBox => ({ id: other.id, x: other.x, y: other.y, width: other.width, height: other.height });
/** Others that can be stood on or bumped into from below: standing, and not standing on this candle. */
const standing = (others: readonly OtherBody[]): OtherBody[] => others.filter((other) => other.grounded && !other.ridesMe);

/** The platforms plus a thin, standable head on every standing other candle (the same list when there is none). */
export function withHeads(platforms: readonly PlatformBox[], others: readonly OtherBody[]): readonly PlatformBox[] {
  const heads = standing(others).map((other): PlatformBox => ({
    id: headId(other.id), type: HEAD_TYPE, x: other.x, y: other.y - other.height / 2 + HEAD_THICKNESS_PX / 2,
    width: other.width, height: HEAD_THICKNESS_PX, dx: other.dx ?? 0, dy: other.dy ?? 0,
  }));
  return heads.length > 0 ? [...platforms, ...heads] : platforms;
}

/**
 * The body moved sideways from `prevX` to `x` at height `y`. Other candles stop it at their sides (`hit`), and a
 * body that overlaps one is moved apart by at most `separateSpeed x dt`, then kept inside the world and outside
 * the walls (`walls`, wall.ts), so a separation never carries it through anything.
 */
export function resolveSides(others: readonly OtherBody[], prevX: number, x: number, y: number, body: Body, worldWidth: number,
  walls: readonly PlatformBox[], separateSpeed: number, dt: number): { x: number; hit: boolean } {
  let next = x;
  let hit = false;
  const blocked = blockX(others.map(boxOf), prevX, next, y, body);
  if (blocked) { next = blocked.x; hit = true; }
  for (const other of others) {
    const overlapX = (body.width + other.width) / 2 - Math.abs(next - other.x);
    const overlapY = (body.height + other.height) / 2 - Math.abs(y - other.y);
    if (overlapX <= EDGE_EPSILON || overlapY <= EDGE_EPSILON) continue;
    const side = next > other.x ? 1 : next < other.x ? -1 : other.tieSide ?? 1;
    const before = next;
    next = clampToWalls(next + side * Math.min(overlapX, separateSpeed * dt), body.width, worldWidth).x;
    const wall = blockX(walls, before, next, y, body);
    if (wall) next = wall.x;
  }
  return { x: next, hit };
}

/** Rising from head top `prevTop` to `newTop`: the underside (feet) of a standing other candle it hits, or null. */
export function bumpBodies(others: readonly OtherBody[], x: number, prevTop: number, newTop: number, body: Body): number | null {
  return bumpHead(standing(others).map(boxOf), x, prevTop, newTop, body);
}

/** The ceiling met first when rising (the lower one, a larger y) of two, either of which may be null. */
export const firstCeiling = (a: number | null, b: number | null): number | null => (a === null ? b : b === null ? a : Math.max(a, b));

/**
 * Walking into a standing other candle: the direction (-1 or 1) it is pushed, or 0 when this is no shove (not
 * both standing, not walking, charging, or not touching it on the side walked toward).
 */
export function shoveDirection(me: PlayerState, dir: -1 | 0 | 1, other: OtherBody, body: Body): -1 | 0 | 1 {
  if (dir === 0 || !me.grounded || me.charging || !other.grounded || other.ridesMe) return 0;
  const gap = dir > 0 ? other.x - other.width / 2 - (me.x + body.width / 2) : me.x - body.width / 2 - (other.x + other.width / 2);
  const overlapY = (body.height + other.height) / 2 - Math.abs(me.y - other.y);
  return gap <= TOUCH_PX && gap > -body.width / 2 && overlapY > 1 ? dir : 0;
}

/**
 * The most a head may move between two physics steps and still carry its rider (px): twice the fastest a candle
 * moves on its own (walking, a launch, steering in a fall) for one step. More than that is a teleport of the other
 * player (a restart, a snapped correction, updates resuming after a gap): the rider is not carried, and falls.
 */
export function carryLimitPx(config: { walkSpeed: number; stepHz: number; jump: { maxSpeed: number }; falling?: { speedX: number } }): number {
  return (2 * Math.max(config.walkSpeed, config.jump.maxSpeed, config.falling?.speedX ?? 0)) / config.stepHz;
}

/** True when this candle stands on the other one's head, or the other stands on this one's. */
export const riding = (me: { platformId: string | null }, other: OtherBody): boolean => other.ridesMe === true || me.platformId === headId(other.id);

/** A change of speed (px/s) for one candle. */
export interface Knock { dvx: number; dvy: number }

/**
 * Do this candle (`me`) and the other meet in the next `dt` seconds fast enough to knock each other? Only when at
 * least one is in the air: two standing candles shove instead. A drop onto a standing candle's head is a landing,
 * not a knock. The contact's direction is the axis on which the boxes overlap least; each candle changes speed
 * by `(1 + restitution) / 2` of the approach speed along it (equal masses), at most `maxImpulse`.
 * Returns both candles' changes, or null.
 */
export function knockBetween(me: { x: number; y: number; vx: number; vy: number; grounded: boolean; platformId?: string | null }, other: OtherBody,
  body: Body, rules: VersusConfig, dt: number): { mine: Knock; theirs: Knock } | null {
  if (me.grounded && other.grounded) return null;
  // A rider and the candle it stands on never knock each other (contact-arbiter.ts keeps this until they part).
  if (other.ridesMe || me.platformId === headId(other.id)) return null;
  const ax = me.x + me.vx * dt, ay = me.y + me.vy * dt;
  const bx = other.x + other.vx * dt, by = other.y + other.vy * dt;
  const overlapX = (body.width + other.width) / 2 - Math.abs(ax - bx);
  const overlapY = (body.height + other.height) / 2 - Math.abs(ay - by);
  if (overlapX < -TOUCH_PX || overlapY < -TOUCH_PX) return null;
  const sideways = overlapX < overlapY;
  // The normal points from the other candle to this one.
  const nx = sideways ? Math.sign(ax - bx) || (other.tieSide ?? 1) : 0;
  const ny = sideways ? 0 : Math.sign(ay - by) || -1;
  // Coming down on a standing candle's head, or being landed on while standing: a landing.
  if (!sideways && ny < 0 && other.grounded) return null;
  if (!sideways && ny > 0 && me.grounded) return null;
  const approach = (me.vx - other.vx) * nx + (me.vy - other.vy) * ny;
  if (approach > -rules.knock.minRelativeSpeed) return null;
  const size = Math.min(rules.knock.maxImpulse, ((1 + rules.knock.restitution) / 2) * -approach);
  return { mine: { dvx: size * nx, dvy: size * ny }, theirs: { dvx: -size * nx, dvy: -size * ny } };
}

/**
 * Apply a knock to this candle. In the air it changes the speed (and the launch speed air steering works from).
 * A standing candle knocked upward leaves the ground (a charge is lost; the fall is measured from here); knocked
 * sideways it stays standing and slides at `slideVx` px/s for the caller's `groundSlideMs`.
 * A knock is not a takeoff from a ledge, so it leaves `standBottomY` (the wall prototype's fall rule) as it is: a
 * candle knocked off a wall climb still has its fall measured from where it last stood. A standing candle has none.
 */
export function applyKnock(state: PlayerState, knock: Knock, bodyHeight: number): { state: PlayerState; slideVx: number } {
  if (state.grounded) {
    if (knock.dvy >= -EDGE_EPSILON) return { state, slideVx: knock.dvx };
    const vx = state.vx + knock.dvx;
    return { state: { ...state, grounded: false, platformId: null, charging: false, chargeMs: 0, jumpLatch: state.jumpLatch || state.charging,
      vx, vy: Math.min(0, state.vy) + knock.dvy, launchVx: vx, windVx: 0, takeoffBottomY: state.y + bodyHeight / 2 }, slideVx: 0 };
  }
  const vx = state.vx + knock.dvx;
  return { state: { ...state, vx, vy: state.vy + knock.dvy, launchVx: vx - (state.windVx ?? 0) }, slideVx: 0 };
}
