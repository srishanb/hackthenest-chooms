/**
 * Which higher ledges the player can jump to from the ledge they stand on (LAN-3).
 *
 * Why the real physics: the protected-visibility layer outlines exactly these ledges, so a ledge
 * that lights up must really be reachable. We fire sample jumps through the same `stepPlayer` the
 * game uses. The sampling (three take-off points, three directions, 12 charge levels, no air
 * steering) is duplicated from tools/levels/reach.ts so both agree; it is conservative, so a ledge
 * reachable only with steering may stay dark.
 *
 * Only ledges strictly higher than the current one count: falling is always possible, and lighting
 * every lower ledge would undo the darkness. Platforms and physics only, never the signal.
 */
import type { GameConfig } from '../../shared/contracts/config';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerState } from '../player/types';

const IDLE = { left: false, right: false, jump: false };
const CHARGE_LEVELS = 12;

export interface WorldBounds {
  width: number;
  /** Smallest y in the world (y grows downward). */
  top: number;
  /** Largest y in the world. */
  bottom: number;
}

const topOf = (platform: PlatformBox): number => platform.y - platform.height / 2;

/** Ids of ledges higher than `source` that a sampled jump from `source` lands on, in `platforms` order. */
export function reachableLedges(source: PlatformBox, platforms: readonly PlatformBox[], world: WorldBounds, config: GameConfig): string[] {
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
  for (const x of [minX, (minX + maxX) / 2, maxX]) {
    for (const direction of [-1, 0, 1]) {
      for (let level = 1; level <= CHARGE_LEVELS; level++) {
        let state: PlayerState = { ...createPlayer(x, y), grounded: true, platformId: source.id, jumpLatch: false };
        const chargeSteps = Math.ceil((config.jump.maxChargeMs * level) / CHARGE_LEVELS / stepMs);
        for (let step = 0; step < chargeSteps; step++) {
          state = stepPlayer(state, { ...IDLE, jump: true }, platforms, world.width, config, stepMs).state;
        }
        state = stepPlayer(state, { left: direction < 0, right: direction > 0, jump: false }, platforms, world.width, config, stepMs).state;
        for (let step = 0; step < maxSteps; step++) {
          const result = stepPlayer(state, IDLE, platforms, world.width, config, stepMs);
          state = result.state;
          if (result.events.landed) {
            landed.add(result.events.landed.platformId);
            break;
          }
          if (state.y > world.bottom + bodyH) break;
        }
      }
    }
  }
  return platforms.filter((p) => p.id !== source.id && landed.has(p.id) && topOf(p) < sourceTop).map((p) => p.id);
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
