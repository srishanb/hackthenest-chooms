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
