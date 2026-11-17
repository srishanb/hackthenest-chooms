/**
 * Walls: solid upright pieces of the world (a stone pillar or a cliff face) that the candle can slide down
 * and kick off. A prototype behind `?walls=1` (Decision D-37).
 *
 * A wall is a platform of type `wall`, so every replay, reach search and drawing that is handed the platforms
 * sees it. Its top can be stood on like a ledge (collide.ts lands on it); its sides stop the body (`blockX`) and
 * its underside stops a head (`bumpHead`). Only walls grip; the edges of the world never do, or every fall
 * could be saved.
 *
 * The rules, all in GameConfig `wallMoves`, each per physics step in the air:
 *   - grip: a wall grips only while the feet are at most `gripBelowTakeoffPx` below the last takeoff or kick
 *     (`gripHolds`). A long fall is farther below than that, so it slides straight past: no safety net (D-33);
 *   - slide: touching a gripping wall and holding toward it, the fall eases to `slideVy` (`slideVy`);
 *   - kick: a fresh jump press within `kickReachPx` of a gripping wall throws the candle up and away from it
 *     (`kickVelocity`); held direction is ignored for `kickLockMs`, and (unless `sameWallTwice`) the same wall
 *     cannot be kicked again before a landing or another wall.
 * Pure numbers, the same in the game, the generator's replay and the reach search; never the signal.
 */
import type { WallMovesConfig } from '../../shared/contracts/config';
import type { PlatformBox } from './types';

/** Platform type id of a wall. */
export const WALL_TYPE = 'wall';

const EDGE_EPSILON = 1e-6;
const NO_WALLS: readonly PlatformBox[] = [];

/**
 * The last list scanned and its walls. A replay or the game passes the same platform list for many steps in a
 * row, so it is scanned once, not every physics step (a list is never changed in place while it is in use; the
 * length and the end entries are compared as well, to be safe).
 */
let lastList: readonly PlatformBox[] | null = null;
let lastLength = -1;
let lastFirst: PlatformBox | undefined;
let lastEnd: PlatformBox | undefined;
let lastWalls: readonly PlatformBox[] = NO_WALLS;

/** The walls among `platforms` (the same empty list when there are none, which is every world without the switch). */
export function wallsIn(platforms: readonly PlatformBox[]): readonly PlatformBox[] {
  if (platforms === lastList && platforms.length === lastLength && platforms[0] === lastFirst && platforms[platforms.length - 1] === lastEnd) return lastWalls;
  let walls: PlatformBox[] | null = null;
  for (const platform of platforms) if (platform.type === WALL_TYPE) (walls ??= []).push(platform);
  lastList = platforms; lastLength = platforms.length; lastFirst = platforms[0]; lastEnd = platforms[platforms.length - 1];
  lastWalls = walls ?? NO_WALLS;
  return lastWalls;
}

interface Body { width: number; height: number }

/** Does the body centred at `y` overlap the wall's height (touching edges do not count)? */
const overlapsY = (y: number, body: Body, wall: PlatformBox): boolean =>
  Math.abs(y - wall.y) < (body.height + wall.height) / 2 - EDGE_EPSILON;

/**
 * The nearest wall face beside the body (centre `x`, `y`) no farther than `reachPx` from its side, or null.
 * `side` is where the wall is: 1 to the right, -1 to the left. `gapPx` is the air between body and face.
 */
export function wallBeside(walls: readonly PlatformBox[], x: number, y: number, body: Body, reachPx: number):
  { wall: PlatformBox; side: -1 | 1; gapPx: number } | null {
  let best: { wall: PlatformBox; side: -1 | 1; gapPx: number } | null = null;
  for (const wall of walls) {
    if (!overlapsY(y, body, wall)) continue;
    const right = wall.x - wall.width / 2 - (x + body.width / 2);
    const left = x - body.width / 2 - (wall.x + wall.width / 2);
    for (const [gapPx, side] of [[right, 1], [left, -1]] as const) {
      if (gapPx < -EDGE_EPSILON * 10 || gapPx > reachPx) continue;
      if (!best || gapPx < best.gapPx) best = { wall, side, gapPx: Math.max(0, gapPx) };
    }
  }
  return best;
}

/** True when the body is pressed flat against a wall face on `side` (what a slide needs). */
export function touchingWall(walls: readonly PlatformBox[], x: number, y: number, body: Body, side: -1 | 1): PlatformBox | null {
  const near = wallBeside(walls, x, y, body, 0.01);
  return near && near.side === side ? near.wall : null;
}

/**
 * The body moved sideways from `prevX` to `x` at height `y`: if that took it into a wall's side, the x where it
 * stops against the face and the side it hit, else null. Only a body that started clear of the wall is stopped.
 */
export function blockX(walls: readonly PlatformBox[], prevX: number, x: number, y: number, body: Body): { x: number; side: -1 | 1 } | null {
  let hit: { x: number; side: -1 | 1 } | null = null;
  const half = body.width / 2;
  for (const wall of walls) {
    if (!overlapsY(y, body, wall)) continue;
    const left = wall.x - wall.width / 2, right = wall.x + wall.width / 2;
    if (x > prevX && prevX + half <= left + EDGE_EPSILON * 10 && x + half > left) {
      const stop = left - half;
      if (!hit || stop < hit.x) hit = { x: stop, side: 1 };
    } else if (x < prevX && prevX - half >= right - EDGE_EPSILON * 10 && x - half < right) {
      const stop = right + half;
      if (!hit || stop > hit.x) hit = { x: stop, side: -1 };
    }
  }
  return hit;
}

/** Rising from head top `prevTop` to `newTop` at `x`: the underside of the wall it hits (world y), or null. */
export function bumpHead(walls: readonly PlatformBox[], x: number, prevTop: number, newTop: number, body: Body): number | null {
  let hit: number | null = null;
  for (const wall of walls) {
    if (Math.abs(x - wall.x) >= (body.width + wall.width) / 2 - EDGE_EPSILON) continue;
    const bottom = wall.y + wall.height / 2;
    if (bottom <= prevTop + EDGE_EPSILON && bottom > newTop && (hit === null || bottom > hit)) hit = bottom;
  }
  return hit;
}

/** Does a wall grip the candle? Only while its feet are at most `gripBelowTakeoffPx` below its last takeoff or kick. */
export function gripHolds(feetY: number, takeoffBottomY: number, rules: WallMovesConfig): boolean {
  return feetY - takeoffBottomY <= rules.gripBelowTakeoffPx;
}

/** Vertical speed after one sliding step of `dt` s from `vy`: never faster than `slideVy`, eased down to it. */
export function slideVy(vy: number, rules: WallMovesConfig, gravityY: number, dt: number): number {
  if (vy > rules.slideVy) return rules.slideVy + (vy - rules.slideVy) * Math.exp(-rules.slideBrakePerS * dt);
  return Math.min(rules.slideVy, vy + gravityY * dt);
}

/** The kick off a wall on `side` (1: the wall is to the right): up and away from it. */
export function kickVelocity(side: -1 | 1, rules: WallMovesConfig): { vx: number; vy: number } {
  const angle = (rules.kickAngleDeg * Math.PI) / 180;
  return { vx: -side * rules.kickSpeed * Math.cos(angle), vy: -rules.kickSpeed * Math.sin(angle) };
}

/**
 * Is the candle sliding now: in the air, pressed against a gripping wall and holding toward it? The same test
 * `stepPlayer` makes, for the drawing and the dev readout (they never change movement).
 */
export function isSliding(state: { x: number; y: number; grounded: boolean; takeoffBottomY: number },
  input: { left: boolean; right: boolean }, platforms: readonly PlatformBox[], config: { player: Body; wallMoves?: WallMovesConfig }): boolean {
  const rules = config.wallMoves;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (!rules || state.grounded || dir === 0) return false;
  const walls = wallsIn(platforms);
  return walls.length > 0 && touchingWall(walls, state.x, state.y, config.player, dir as -1 | 1) !== null
    && gripHolds(state.y + config.player.height / 2, state.takeoffBottomY, rules);
}
