/**
 * Which higher ledges the player can jump to from the ledge they stand on (LAN-3).
 *
 * Why the real physics: the protected-visibility layer outlines exactly these ledges, so a ledge
 * that lights up must really be reachable. We fire sample jumps through the same `stepPlayer` the
 * game uses. The sampling (three take-off points, three directions, 12 charge levels, no air
 * steering) is duplicated from tools/levels/reach.ts so both agree; it is conservative, so a ledge
 * reachable only with steering may stay dark.
 *
 * Only ledges strictly higher than the current one count by default (the authored climb): falling is
 * always possible, and lighting every lower ledge would undo the darkness. The endless climb's set
 * pieces put the next route ledge level with or a little below the takeoff (detour drops, big leaps,
 * pillars, traverses), so it passes `lowerPx`: a ledge that much lower still counts, and nothing
 * deeper does, so the ledges already climbed past stay dark. Platforms and physics only, never the signal.
 *
 * Walls (Decision D-37, only with `?walls=1`): when walls are among the platforms, the same samples are fired
 * again pressing the keys of a wall step (endless/wall-kicks.ts: hold the way of the jump, press jump a little
 * after reaching a wall, then hold the other way, up to four kicks), and the route's own wall steps from this
 * ledge (`kickSteps`, proved by the generator) are fired too, so a ledge reached only by kicking is outlined.
 */
import type { GameConfig } from '../../shared/contracts/config';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerInput, PlayerState, UpdraftBox } from '../player/types';
import { wallsIn } from '../player/wall';
import { createKickPolicy } from '../endless/wall-kicks';

const IDLE = { left: false, right: false, jump: false };
const CHARGE_LEVELS = 12;
/** A sampled wall flight presses each kick this many physics steps after reaching the wall, for up to four kicks. */
const SAMPLE_KICKS = [8, 8, 8, 8];

/** A wall step the route takes from a ledge: where it takes off, how long it charges, its way and its kicks. */
export interface KickSample {
  takeoffX: number;
  chargeSteps: number;
  direction: -1 | 0 | 1;
  kicks: readonly number[];
}

export interface WorldBounds {
  width: number;
  /** Smallest y in the world (y grows downward). */
  top: number;
  /** Largest y in the world. */
  bottom: number;
}

const topOf = (platform: PlatformBox): number => platform.y - platform.height / 2;

/**
 * Ids of ledges higher than `source` (or at most `lowerPx` lower, default 0: strictly higher only) that a
 * sampled jump from `source` lands on, in `platforms` order. `updrafts` are the updraft columns in reach
 * (the endless climb, D-36), so a ledge reached only through a column is found too; the authored climb has none.
 */
export function reachableLedges(source: PlatformBox, platforms: readonly PlatformBox[], world: WorldBounds, config: GameConfig,
  lowerPx = 0, updrafts: readonly UpdraftBox[] = [], kickSteps: readonly KickSample[] = []): string[] {
  const environment = { updrafts };
  const { width: bodyW, height: bodyH } = config.player;
  const stepMs = 1000 / config.stepHz;
  // Long enough to rise and then fall to the world floor, even from the top ledge.
  const flightMs = (2 * config.jump.maxSpeed / config.gravityY) * 1000 +
    Math.sqrt((2 * (world.bottom - world.top)) / config.gravityY) * 1000 + 1000;
  const maxSteps = Math.ceil(flightMs / stepMs);
  const minX = Math.max(bodyW / 2, source.x - source.width / 2 + bodyW / 2);
  const maxX = Math.min(world.width - bodyW / 2, source.x + source.width / 2 - bodyW / 2);
  if (minX > maxX) return [];

  const sourceTop = topOf(source);
  const landed = new Set<string>();
  const y = sourceTop - bodyH / 2;
  const walls = wallsIn(platforms);
  /** Charge at `x`, release holding `direction`, then fly with `keys` (none, or a wall step's) until it lands. */
  const fire = (x: number, chargeSteps: number, direction: -1 | 0 | 1, keys: ((state: PlayerState) => PlayerInput) | null): void => {
    let state: PlayerState = { ...createPlayer(x, y), grounded: true, platformId: source.id, jumpLatch: false };
    for (let step = 0; step < chargeSteps; step++) {
      state = stepPlayer(state, { ...IDLE, jump: true }, platforms, world.width, config, stepMs, environment).state;
    }
    state = stepPlayer(state, { left: direction < 0, right: direction > 0, jump: false }, platforms, world.width, config, stepMs, environment).state;
    for (let step = 0; step < maxSteps; step++) {
      const result = stepPlayer(state, keys ? keys(state) : IDLE, platforms, world.width, config, stepMs, environment);
      state = result.state;
      if (result.events.landed) {
        landed.add(result.events.landed.platformId);
        break;
      }
      if (state.y > world.bottom + bodyH) break;
    }
  };
  for (const x of [minX, (minX + maxX) / 2, maxX]) {
    for (const direction of [-1, 0, 1] as const) {
      for (let level = 1; level <= CHARGE_LEVELS; level++) {
        const chargeSteps = Math.ceil((config.jump.maxChargeMs * level) / CHARGE_LEVELS / stepMs);
        fire(x, chargeSteps, direction, null);
        if (walls.length && direction !== 0) {
          const policy = createKickPolicy(SAMPLE_KICKS, direction, config);
          fire(x, chargeSteps, direction, (state) => policy.input(state, walls));
        }
      }
    }
  }
  if (walls.length) {
    for (const sample of kickSteps) {
      const policy = createKickPolicy(sample.kicks, sample.direction, config);
      fire(sample.takeoffX, sample.chargeSteps, sample.direction, (state) => policy.input(state, walls));
    }
  }
  return platforms.filter((p) => p.id !== source.id && landed.has(p.id) && topOf(p) < sourceTop + lowerPx).map((p) => p.id);
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** True for the platform under the feet, false for a reachable ledge's top edge. */
  current: boolean;
}

/**
 * What the protected layer draws: the four sides of the current platform, and only the top edge of
 * each reachable ledge. Outlines and edges, never fills, so the darkness still hides the rest.
 */
export function outlineSegments(platforms: readonly PlatformBox[], currentId: string | null, reachableIds: readonly string[]): Segment[] {
  const segments: Segment[] = [];
  for (const p of platforms) {
    const left = p.x - p.width / 2;
    const right = p.x + p.width / 2;
    const top = topOf(p);
    if (p.id === currentId) {
      const bottom = p.y + p.height / 2;
      segments.push(
        { x1: left, y1: top, x2: right, y2: top, current: true },
        { x1: right, y1: top, x2: right, y2: bottom, current: true },
        { x1: right, y1: bottom, x2: left, y2: bottom, current: true },
        { x1: left, y1: bottom, x2: left, y2: top, current: true },
      );
    } else if (reachableIds.includes(p.id)) {
      segments.push({ x1: left, y1: top, x2: right, y2: top, current: false });
    }
  }
  return segments;
}
