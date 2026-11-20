/**
 * Sample jump arcs for the endless generator, traced with the game's own `stepPlayer`.
 *
 * Why trace instead of using a formula: the generator must only place a ledge where a real jump
 * lands. Running the same fixed-step physics the player uses means charge time, launch angle,
 * gravity and step size are all exactly right, and a change in game.config.ts moves the ledges
 * with it. An arc is the path of the body's centre after one charge level and one held direction,
 * with no steering in the air (the hardest, most repeatable version of the jump).
 */
import type { GameConfig } from '../../shared/contracts/config';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox, PlayerState, UpdraftBox } from '../player/types';

export interface ArcPoint {
  /** Offset from the takeoff position in px. `dy` is negative above the takeoff. */
  dx: number;
  dy: number;
  /** Vertical speed in px/s after this step (positive is falling). */
  vy: number;
}

export interface JumpArc {
  /** 1..levels: how long the jump key is held. */
  level: number;
  /** Physics steps the jump key is held before release. */
  chargeSteps: number;
  direction: -1 | 0 | 1;
  /** One point per physics step after the launch step. */
  points: ArcPoint[];
  /** Highest rise above the takeoff, as a positive number of px. */
  apexPx: number;
}

const IDLE = { left: false, right: false, jump: false };
/** Arcs are followed this far below the takeoff (px): enough for any ledge the generator places. */
const TRACE_DROP_PX = 80;
/** A wall-free space for tracing; the real walls are checked by the generator. */
const OPEN_WIDTH = 1_000_000;

/** Physics steps of holding jump for `level` of `levels`. */
export function chargeStepsFor(level: number, levels: number, config: GameConfig): number {
  return Math.ceil((config.jump.maxChargeMs * level) / levels / (1000 / config.stepHz));
}

/**
 * Charge on `ground` for `chargeSteps`, then release while holding `direction`. Returns the
 * airborne state right after the launch step. Shared by the tracer and the route replay.
 */
export function launch(start: PlayerState, ground: readonly PlatformBox[], chargeSteps: number, direction: -1 | 0 | 1,
  worldWidth: number, config: GameConfig, updrafts: readonly UpdraftBox[] = []): PlayerState {
  const stepMs = 1000 / config.stepHz;
  const environment = { updrafts };
  let state = start;
  for (let step = 0; step < chargeSteps; step++) {
    state = stepPlayer(state, { ...IDLE, jump: true }, ground, worldWidth, config, stepMs, environment).state;
  }
  return stepPlayer(state, { left: direction < 0, right: direction > 0, jump: false }, ground, worldWidth, config, stepMs, environment).state;
}

/** A player standing still on `platform` at `x`, ready to charge. */
export function standOn(platform: PlatformBox, x: number, config: GameConfig): PlayerState {
  const y = platform.y - platform.height / 2 - config.player.height / 2;
  return { ...createPlayer(x, y), grounded: true, platformId: platform.id, jumpLatch: false, takeoffBottomY: y + config.player.height / 2 };
}

export function traceArc(config: GameConfig, level: number, levels: number, direction: -1 | 0 | 1): JumpArc {
  const stepMs = 1000 / config.stepHz;
  const ground: PlatformBox = { id: 'trace', x: OPEN_WIDTH / 2, y: 0, width: 200, height: 20 };
  const start = standOn(ground, ground.x, config);
  const chargeSteps = chargeStepsFor(level, levels, config);
  let state = launch(start, [ground], chargeSteps, direction, OPEN_WIDTH, config);
  const points: ArcPoint[] = [];
  let apexPx = 0;
  // Free flight: no platforms, so the arc is the pure path a ledge can be placed under.
  for (let step = 0; step < 4000; step++) {
    points.push({ dx: state.x - start.x, dy: state.y - start.y, vy: state.vy });
    apexPx = Math.max(apexPx, start.y - state.y);
    if (state.vy > 0 && state.y - start.y > TRACE_DROP_PX) break;
    state = stepPlayer(state, IDLE, [], OPEN_WIDTH, config, stepMs).state;
  }
  return { level, chargeSteps, direction, points, apexPx };
}

/** Every arc the generator may use: each charge level, to the right and straight up (left mirrors right). */
export function buildArcTable(config: GameConfig, levels: number): { side: JumpArc[]; up: JumpArc[] } {
  const side: JumpArc[] = [];
  const up: JumpArc[] = [];
  for (let level = 1; level <= levels; level++) {
    side.push(traceArc(config, level, levels, 1));
    up.push(traceArc(config, level, levels, 0));
  }
  return { side, up };
}

/**
 * Where the arc comes down through a height `risePx` above the takeoff: the two points either
 * side of that height while falling, or null when the arc never gets that high with room to spare.
 */
export function descentAt(arc: JumpArc, risePx: number, clearancePx: number): { before: ArcPoint; after: ArcPoint } | null {
  if (arc.apexPx < risePx + clearancePx) return null;
  for (let i = 1; i < arc.points.length; i++) {
    const before = arc.points[i - 1]!;
    const after = arc.points[i]!;
    if (after.vy > 0 && before.dy <= -risePx && after.dy > -risePx) return { before, after };
  }
  return null;
}
