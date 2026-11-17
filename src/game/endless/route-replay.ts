/**
 * Replaying the generator's route with the real physics: the proof that a chunk can be climbed.
 *
 * Why its own file: the generator, the set pieces (pieces/) and the tests all ask the same question,
 * "does this stored step land where it says, with these ledges in place?", and must answer it the same
 * way. A step is either a jump (stand at `takeoffX`, hold jump `chargeSteps` physics steps, release
 * holding `direction`) or a drop (stand at `takeoffX`, walk in `direction` until the feet leave the
 * ledge, then let go of the keys and fall). Both run `stepPlayer`, the function the game runs.
 *
 * Moving ledges on the route: a ledge that slides can be anywhere in its travel when the candle
 * arrives, and the candle drifts with it while it charges. `stepsHold` therefore replays every step
 * with each moving ledge at both ends of its travel, and a jump from a moving ledge from takeoff points
 * shifted by the most the ledge can carry the candle during that charge.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import { stepPlayer } from '../player/movement';
import type { PlatformBox } from '../player/types';
import { launch, standOn } from './jump-arcs';

/**
 * One step of the guaranteed path. A jump: stand at `takeoffX` on `fromId`, hold jump `chargeSteps`,
 * release holding `direction`. A drop (`kind: 'drop'`): stand at `takeoffX`, hold `direction` until
 * the candle walks off the edge, then let go and fall onto `toId`; `chargeSteps` is 0.
 */
export interface RouteStep {
  fromId: string;
  toId: string;
  takeoffX: number;
  chargeSteps: number;
  direction: -1 | 0 | 1;
  /** Absent or 'jump' for a charged jump; 'drop' for walking off an edge. */
  kind?: 'jump' | 'drop';
}

const IDLE = { left: false, right: false, jump: false };
/** A walk to the edge never takes longer than this many physics steps (a ledge is under 1000 px wide). */
const MAX_WALK_STEPS = 600;
/** Extra drift allowed for a jump from a moving ledge (px): the bot starts charging within 1.5 px of the takeoff. */
const DRIFT_TOLERANCE_PX = 2;

/**
 * Replay one route step with the real physics. Returns the id of the ledge it lands on, or null if
 * it falls out of `platforms`. `shiftPx` moves the takeoff point (a jump from a moving ledge).
 */
export function replayStep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig,
  shiftPx = 0): string | null {
  const from = platforms.find((platform) => platform.id === step.fromId);
  if (!from) return null;
  const stepMs = 1000 / config.stepHz;
  const start = standOn(from, step.takeoffX + shiftPx, config);
  let state = start;
  if (step.kind === 'drop') {
    const walk = { left: step.direction < 0, right: step.direction > 0, jump: false };
    for (let i = 0; i < MAX_WALK_STEPS && state.grounded; i++) state = stepPlayer(state, walk, platforms, worldWidth, config, stepMs).state;
    if (state.grounded) return null;
  } else {
    state = launch(start, platforms, step.chargeSteps, step.direction, worldWidth, config);
  }
  let lowest = -Infinity;
  for (const platform of platforms) lowest = Math.max(lowest, platform.y);
  lowest += 200;
  for (let i = 0; i < 6000; i++) {
    if (state.grounded) return state.platformId;
    if (state.y > lowest) return null;
    state = stepPlayer(state, IDLE, platforms, worldWidth, config, stepMs).state;
  }
  return null;
}

/**
 * The most a moving ledge can carry the candle sideways while it charges `chargeSteps` (px). The
 * ledge follows a sine of `distance` and `periodMs`, so its speed is at most 2*pi*distance/period.
 */
export function chargeDriftPx(ledge: PlatformData, chargeSteps: number, config: GameConfig): number {
  const motion = ledge.motion;
  if (!motion || motion.axis !== 'x') return 0;
  const chargeMs = chargeSteps * (1000 / config.stepHz);
  return Math.min(2 * motion.distance, (2 * Math.PI * motion.distance / motion.periodMs) * chargeMs) + DRIFT_TOLERANCE_PX;
}

/** One step lands on its target with `ledges` as they are; from a moving ledge, from every shifted takeoff too. */
function stepLands(step: RouteStep, ledges: readonly PlatformData[], worldWidth: number, config: GameConfig): boolean {
  if (replayStep(step, ledges, worldWidth, config) !== step.toId) return false;
  const from = ledges.find((ledge) => ledge.id === step.fromId);
  if (!from?.motion) return true;
  if (step.kind === 'drop') return false;
  const drift = chargeDriftPx(from, step.chargeSteps, config);
  return [-drift, drift].every((shift) => replayStep(step, ledges, worldWidth, config, shift) === step.toId);
}

/**
 * Every step lands where it says with these ledges, and still does with each moving ledge at either
 * end of its travel. Steps are checked in the order given, so put the newest (most likely to fail) first.
 */
export function stepsHold(steps: readonly RouteStep[], ledges: readonly PlatformData[], worldWidth: number, config: GameConfig): boolean {
  if (!steps.every((step) => stepLands(step, ledges, worldWidth, config))) return false;
  for (const mover of ledges) {
    const distance = mover.motion?.axis === 'x' ? mover.motion.distance : 0;
    if (!distance) continue;
    for (const offset of [-distance, distance]) {
      const shifted = ledges.map((ledge) => (ledge === mover ? { ...ledge, x: ledge.x + offset } : ledge));
      if (!steps.every((step) => stepLands(step, shifted, worldWidth, config))) return false;
    }
  }
  return true;
}

/** The region a step's feet pass through, from takeoff to landing (world px). */
export interface StepBox {
  left: number;
  right: number;
  /** Highest feet y (smallest number). */
  top: number;
  /** Lowest feet y. */
  bottom: number;
}

/** Trace one step as `replayStep` does and return the region its feet sweep, or null if it lands nowhere. */
function sweep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig, shiftPx: number): StepBox | null {
  const from = platforms.find((platform) => platform.id === step.fromId);
  if (!from) return null;
  const stepMs = 1000 / config.stepHz;
  const half = config.player.height / 2;
  let state = standOn(from, step.takeoffX + shiftPx, config);
  const box: StepBox = { left: state.x, right: state.x, top: state.y + half, bottom: state.y + half };
  const grow = (): void => {
    box.left = Math.min(box.left, state.x); box.right = Math.max(box.right, state.x);
    box.top = Math.min(box.top, state.y + half); box.bottom = Math.max(box.bottom, state.y + half);
  };
  if (step.kind === 'drop') {
    const walk = { left: step.direction < 0, right: step.direction > 0, jump: false };
    for (let i = 0; i < MAX_WALK_STEPS && state.grounded; i++) { state = stepPlayer(state, walk, platforms, worldWidth, config, stepMs).state; grow(); }
  } else {
    state = launch(state, platforms, step.chargeSteps, step.direction, worldWidth, config);
    grow();
  }
  let lowest = -Infinity;
  for (const platform of platforms) lowest = Math.max(lowest, platform.y);
  lowest += 200;
  for (let i = 0; i < 6000; i++) {
    if (state.grounded) return box;
    if (state.y > lowest) return null;
    state = stepPlayer(state, IDLE, platforms, worldWidth, config, stepMs).state;
    grow();
  }
  return null;
}

/**
 * Remembers the region each step sweeps, so a check after adding one ledge replays only the steps that
 * ledge could catch. Adding a ledge outside a step's swept region cannot change where that step lands
 * (one-way ledges only catch feet coming down through their top), so skipping it gives the same answer
 * as replaying it, much faster. Boxes are computed once per step, with the ledges it was checked against.
 */
export interface RouteChecker {
  /** The steps among `steps` that `ledge` (over its whole travel, if it moves) could catch. */
  affected(steps: readonly RouteStep[], ledge: PlatformData, ledges: readonly PlatformData[]): RouteStep[];
}

export function createRouteChecker(worldWidth: number, config: GameConfig): RouteChecker {
  const boxes = new Map<RouteStep, StepBox | null>();
  const boxOf = (step: RouteStep, ledges: readonly PlatformData[]): StepBox | null => {
    if (boxes.has(step)) return boxes.get(step)!;
    const from = ledges.find((ledge) => ledge.id === step.fromId);
    const drift = from ? chargeDriftPx(from, step.chargeSteps, config) : 0;
    let box = sweep(step, ledges, worldWidth, config, 0);
    // From a moving ledge the takeoff shifts: widen the region by the most it can shift.
    if (box && drift) box = { ...box, left: box.left - drift, right: box.right + drift };
    boxes.set(step, box);
    return box;
  };
  const reach = config.player.width / 2 + (config.falling?.ledgeReachPx ?? 0) + 2;
  return {
    affected(steps, ledge, ledges) {
      const travel = ledge.motion?.distance ?? 0;
      const top = ledge.y - ledge.height / 2;
      return steps.filter((step) => {
        const box = boxOf(step, ledges);
        // No box (the step does not land as things are): always replay it, so the check fails as it should.
        if (!box) return true;
        // A step that starts or ends on a moving ledge is always replayed in full.
        if (ledges.some((other) => (other.id === step.fromId || other.id === step.toId) && other.motion)) return true;
        return top >= box.top - 2 && top <= box.bottom + 2
          && ledge.x + ledge.width / 2 + travel > box.left - reach && ledge.x - ledge.width / 2 - travel < box.right + reach;
      });
    },
  };
}
