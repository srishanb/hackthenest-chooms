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
 *
 * The special ledges (Decision D-36) need nothing extra here but the world they live in:
 *   - a bounce is part of the jump that comes down on the cap: the step's `toId` is the ledge it finally
 *     lands on and `via` names the cap; `stepPlayer` does the bouncing;
 *   - an updraft changes the arc: every replay takes the updraft columns in reach and passes them to
 *     `stepPlayer`, so any step that crosses a column is replayed through it (`ride` names the column a
 *     step is meant to use);
 *   - a crumbling ledge limits how long the route may stand on it: a step from one is replayed with the
 *     world stepper (player/world-step.ts, the game's own) starting from the time the candle has already
 *     stood there, walking from where the step before it landed (`arriveX`) to `takeoffX`, and charging
 *     step by step; if the ledge falls first, the step misses.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformData } from '../../shared/contracts/content';
import { CRUMBLING_TYPE, type CrumbleState } from '../player/crumble';
import { stepPlayer } from '../player/movement';
import { updraftAt } from '../player/updraft';
import type { PlatformBox, PlayerInput, PlayerState, UpdraftBox } from '../player/types';
import { stepWorld } from '../player/world-step';
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
  /** The bounce cap this jump comes down on before it lands on `toId` (a mushroom launch). */
  via?: string;
  /** The updraft column this step is meant to ride. */
  ride?: string;
  /** From a crumbling ledge: where the step onto it landed (world x), so the walk to `takeoffX` is counted. */
  arriveX?: number;
}

const IDLE = { left: false, right: false, jump: false };
/** A walk to the edge never takes longer than this many physics steps (a ledge is under 1000 px wide). */
const MAX_WALK_STEPS = 600;
/** Extra drift allowed for a jump from a moving ledge (px): the bot starts charging within 1.5 px of the takeoff. */
const DRIFT_TOLERANCE_PX = 2;
/** The longest flight followed (physics steps, 50 s): a slow sink in a drift column is long, but never this long. */
const MAX_FLIGHT_STEPS = 6000;

/**
 * How long the route stands on a crumbling ledge before this step leaves it (ms): the walk from
 * `arriveX` to the takeoff at walking speed, the charge, and the release step. 0 for any other step.
 */
export function standMsBefore(step: RouteStep, config: GameConfig): number {
  if (step.kind === 'drop') return Number.POSITIVE_INFINITY;
  const stepMs = 1000 / config.stepHz;
  const walkSteps = step.arriveX === undefined ? 0 : Math.ceil(Math.abs(step.takeoffX - step.arriveX) / (config.walkSpeed * stepMs / 1000));
  return (walkSteps + step.chargeSteps + 1) * stepMs;
}

/**
 * Charge on `from` and launch: the same result as `launch` (jump-arcs.ts) step for step, but on a ledge
 * that does not move charging only counts time (the body stays put, speed 0), so the held steps are
 * added up the way `stepPlayer` adds them and only the release step is simulated. A moving ledge, or a
 * takeoff not over the ledge, goes through `launch` itself.
 */
function launchFrom(start: PlayerState, from: PlatformBox & { motion?: unknown }, platforms: readonly PlatformBox[], step: RouteStep,
  worldWidth: number, config: GameConfig, updrafts: readonly UpdraftBox[]): PlayerState {
  const onLedge = Math.abs(start.x - from.x) < (config.player.width + from.width) / 2 - 1e-6;
  if (from.motion || (from.dx ?? 0) !== 0 || !onLedge || step.chargeSteps < 1) {
    return launch(start, platforms, step.chargeSteps, step.direction, worldWidth, config, updrafts);
  }
  const stepMs = 1000 / config.stepHz;
  let chargeMs = Math.min(stepMs, config.jump.maxChargeMs);
  for (let i = 1; i < step.chargeSteps; i++) chargeMs = Math.min(chargeMs + stepMs, config.jump.maxChargeMs);
  const charged: PlayerState = { ...start, vx: 0, charging: true, chargeMs };
  return stepPlayer(charged, { left: step.direction < 0, right: step.direction > 0, jump: false }, platforms, worldWidth, config, stepMs, { updrafts }).state;
}

/** Where a replayed step ended: the ledge it landed on (or null), the candle then, and what it did on the way. */
export interface Flight {
  landedId: string | null;
  state: PlayerState;
  /** Bounce caps it came down on, in order. */
  bounces: string[];
  /** Highest feet y reached (smallest number). */
  topFeetY: number;
  /** True when the body was inside an updraft column at some point of the flight. */
  inColumn: boolean;
}

/**
 * Replay one step and report the whole flight. `onState` sees the candle after every physics step (for
 * the swept region). A step from a crumbling ledge is run with the world stepper (see the header).
 */
export function flyStep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig,
  options: { shiftPx?: number; stopPastTarget?: boolean; updrafts?: readonly UpdraftBox[]; onState?: (state: PlayerState) => void;
    /** Give up after this many physics steps in the air (default 6000, 50 s). */
    maxSteps?: number } = {}): Flight {
  const updrafts = options.updrafts ?? [];
  const environment = { updrafts };
  const from = platforms.find((platform) => platform.id === step.fromId);
  const half = config.player.height / 2;
  let inColumn = false;
  const missed = (state: PlayerState, bounces: string[]): Flight => ({ landedId: null, state, bounces, topFeetY: state.y + half, inColumn });
  if (!from) return missed(standOn({ id: '', x: 0, y: 0, width: 0, height: 0 }, 0, config), []);
  const stepMs = 1000 / config.stepHz;
  let state = standOn(from, step.takeoffX + (options.shiftPx ?? 0), config);
  let topFeetY = state.y + half;
  const bounces: string[] = [];
  const seen = (next: PlayerState): void => {
    state = next; topFeetY = Math.min(topFeetY, next.y + half);
    if (!inColumn && updrafts.length && !next.grounded && updraftAt(updrafts, next.x, next.y)) inColumn = true;
    options.onState?.(next);
  };
  // A crumbling ledge: the world stepper runs the walk-in time, the charge and the flight, as the game does.
  let crumble: CrumbleState | null = null;
  const advance = (input: PlayerInput): void => {
    if (crumble) {
      const out = stepWorld(state, crumble, input, platforms, updrafts, worldWidth, config, stepMs);
      crumble = out.crumble;
      if (out.events.bounced) bounces.push(out.events.bounced.platformId);
      seen(out.player);
      return;
    }
    const out = stepPlayer(state, input, platforms, worldWidth, config, stepMs, environment);
    if (out.events.bounced) bounces.push(out.events.bounced.platformId);
    seen(out.state);
  };
  if (step.kind === 'drop') {
    const walk = { left: step.direction < 0, right: step.direction > 0, jump: false };
    for (let i = 0; i < MAX_WALK_STEPS && state.grounded; i++) advance(walk);
    if (state.grounded) return missed(state, bounces);
  } else if (from.type === CRUMBLING_TYPE && config.ledgeKinds) {
    const walkMs = standMsBefore(step, config) - (step.chargeSteps + 1) * stepMs;
    crumble = new Map([[from.id, { heldMs: walkMs, goneMs: null }]]);
    for (let i = 0; i < step.chargeSteps; i++) advance({ ...IDLE, jump: true });
    advance({ left: step.direction < 0, right: step.direction > 0, jump: false });
    // The ledge fell during the charge: the jump never left it.
    if (state.grounded || state.vy >= 0) return missed(state, bounces);
  } else {
    seen(launchFrom(state, from, platforms, step, worldWidth, config, updrafts));
  }
  let lowest = -Infinity;
  for (const platform of platforms) lowest = Math.max(lowest, platform.y);
  lowest += 200;
  // Once the feet are falling below the target's top without having landed, the step has missed it. Not
  // for a step that bounces (it may come down below its target on the way, onto the cap) until it has
  // bounced, nor for a step riding a column (a fall into a rise column comes back up).
  const target = options.stopPastTarget && !step.ride ? platforms.find((platform) => platform.id === step.toId) : undefined;
  const pastPx = target ? target.y - target.height / 2 + 1 : Infinity;
  for (let i = 0; i < (options.maxSteps ?? MAX_FLIGHT_STEPS); i++) {
    if (state.grounded) return { landedId: state.platformId, state, bounces, topFeetY, inColumn };
    const past = state.vy > 0 && state.y + half > pastPx && (!step.via || bounces.includes(step.via));
    if (state.y > lowest || past) return missed(state, bounces);
    advance(IDLE);
  }
  return missed(state, bounces);
}

/**
 * Replay one route step with the real physics. Returns the id of the ledge it lands on, or null if
 * it falls out of `platforms`. `shiftPx` moves the takeoff point (a jump from a moving ledge).
 */
export function replayStep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig,
  shiftPx = 0, stopPastTarget = false, updrafts: readonly UpdraftBox[] = []): string | null {
  const flight = flyStep(step, platforms, worldWidth, config, { shiftPx, stopPastTarget, updrafts });
  // A step meant to bounce must really bounce on its cap.
  if (step.via && !flight.bounces.includes(step.via)) return null;
  return flight.landedId;
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

/**
 * One step lands on its target with `ledges` as they are; from a moving ledge, from every shifted takeoff
 * too. A flight that bounces or passes through a column is sensitive to where it starts (a column's edge
 * is sharp, and a bounce doubles any error), so a jump must also land from takeoffs `DRIFT_TOLERANCE_PX`
 * either side (the bot starts charging within 1.5 px of the takeoff, and a person is never exact), and a
 * drop may not do either at all.
 */
function stepLands(step: RouteStep, ledges: readonly PlatformData[], worldWidth: number, config: GameConfig, updrafts: readonly UpdraftBox[]): boolean {
  const flight = flyStep(step, ledges, worldWidth, config, { stopPastTarget: true, updrafts });
  if (flight.landedId !== step.toId || (step.via && !flight.bounces.includes(step.via))) return false;
  // A walk-off starts its fall wherever the walk's last step happens to end, so it may not cross a column or a cap.
  if (step.kind === 'drop' && (flight.bounces.length || flight.inColumn)) return false;
  if ((flight.bounces.length || flight.inColumn) && step.kind !== 'drop'
    && ![-DRIFT_TOLERANCE_PX, DRIFT_TOLERANCE_PX].every((shift) => replayStep(step, ledges, worldWidth, config, shift, true, updrafts) === step.toId)) return false;
  const from = ledges.find((ledge) => ledge.id === step.fromId);
  if (!from?.motion) return true;
  if (step.kind === 'drop') return false;
  const drift = chargeDriftPx(from, step.chargeSteps, config);
  return [-drift, drift].every((shift) => replayStep(step, ledges, worldWidth, config, shift, true, updrafts) === step.toId);
}

/**
 * Every step lands where it says with these ledges (and updraft columns), and still does with each
 * moving ledge at either end of its travel. Steps are checked in the order given, so put the newest (most
 * likely to fail) first.
 */
export function stepsHold(steps: readonly RouteStep[], ledges: readonly PlatformData[], worldWidth: number, config: GameConfig,
  updrafts: readonly UpdraftBox[] = []): boolean {
  if (!steps.every((step) => stepLands(step, ledges, worldWidth, config, updrafts))) return false;
  for (const mover of ledges) {
    const distance = mover.motion?.axis === 'x' ? mover.motion.distance : 0;
    if (!distance) continue;
    for (const offset of [-distance, distance]) {
      const shifted = ledges.map((ledge) => (ledge === mover ? { ...ledge, x: ledge.x + offset } : ledge));
      if (!steps.every((step) => stepLands(step, shifted, worldWidth, config, updrafts))) return false;
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

/**
 * Trace one step as `replayStep` does and return the region its feet sweep, or null if it lands nowhere.
 * A flight that bounces or crosses a column is also traced from the shifted takeoffs `stepLands` checks,
 * and the region covers all of them (their paths can part widely after the column or the cap).
 */
function sweep(step: RouteStep, platforms: readonly PlatformBox[], worldWidth: number, config: GameConfig, updrafts: readonly UpdraftBox[]): StepBox | null {
  const from = platforms.find((platform) => platform.id === step.fromId);
  if (!from) return null;
  const half = config.player.height / 2;
  const startX = step.takeoffX, startFeet = from.y - from.height / 2;
  const box: StepBox = { left: startX, right: startX, top: startFeet, bottom: startFeet };
  const onState = (state: PlayerState): void => {
    box.left = Math.min(box.left, state.x); box.right = Math.max(box.right, state.x);
    box.top = Math.min(box.top, state.y + half); box.bottom = Math.max(box.bottom, state.y + half);
  };
  const flight = flyStep(step, platforms, worldWidth, config, { updrafts, onState });
  if (flight.landedId === null) return null;
  if ((flight.bounces.length || flight.inColumn) && step.kind !== 'drop') {
    for (const shiftPx of [-DRIFT_TOLERANCE_PX, DRIFT_TOLERANCE_PX]) flyStep(step, platforms, worldWidth, config, { updrafts, onState, shiftPx });
  }
  return box;
}

/**
 * Remembers the region each step sweeps, so a check after adding one ledge replays only the steps that
 * ledge could catch. Adding a ledge outside a step's swept region cannot change where that step lands
 * (one-way ledges only catch feet coming down through their top), so skipping it gives the same answer
 * as replaying it, much faster. Boxes are computed once per step, with the ledges it was checked against.
 * A bounce cap or an updraft column can change a step's path and still let it land where it says, so
 * the boxes of the steps they touched are forgotten (`forget`) and measured again when next needed.
 */
export interface RouteChecker {
  /** The steps among `steps` that `ledge` (over its whole travel, if it moves) could catch. */
  affected(steps: readonly RouteStep[], ledge: PlatformData, ledges: readonly PlatformData[], updrafts?: readonly UpdraftBox[]): RouteStep[];
  /** The steps among `steps` whose swept region reaches into `column`. */
  affectedByColumn(steps: readonly RouteStep[], column: UpdraftBox, ledges: readonly PlatformData[], updrafts?: readonly UpdraftBox[]): RouteStep[];
  /** Drop the remembered regions of `steps` (their paths may have changed). */
  forget(steps: readonly RouteStep[]): void;
}

export function createRouteChecker(worldWidth: number, config: GameConfig): RouteChecker {
  const boxes = new Map<RouteStep, StepBox | null>();
  const boxOf = (step: RouteStep, ledges: readonly PlatformData[], updrafts: readonly UpdraftBox[]): StepBox | null => {
    if (boxes.has(step)) return boxes.get(step)!;
    const from = ledges.find((ledge) => ledge.id === step.fromId);
    const drift = from ? chargeDriftPx(from, step.chargeSteps, config) : 0;
    let box = sweep(step, ledges, worldWidth, config, updrafts);
    // From a moving ledge the takeoff shifts: widen the region by the most it can shift.
    if (box && drift) box = { ...box, left: box.left - drift, right: box.right + drift };
    boxes.set(step, box);
    return box;
  };
  const reach = config.player.width / 2 + (config.falling?.ledgeReachPx ?? 0) + 2;
  const onMover = (step: RouteStep, ledges: readonly PlatformData[]): boolean =>
    ledges.some((other) => (other.id === step.fromId || other.id === step.toId) && other.motion);
  return {
    affected(steps, ledge, ledges, updrafts = []) {
      const travel = ledge.motion?.distance ?? 0;
      const top = ledge.y - ledge.height / 2;
      return steps.filter((step) => {
        const box = boxOf(step, ledges, updrafts);
        // No box (the step does not land as things are): always replay it, so the check fails as it should.
        if (!box) return true;
        // A step that starts or ends on a moving ledge is always replayed in full.
        if (onMover(step, ledges)) return true;
        return top >= box.top - 2 && top <= box.bottom + 2
          && ledge.x + ledge.width / 2 + travel > box.left - reach && ledge.x - ledge.width / 2 - travel < box.right + reach;
      });
    },
    affectedByColumn(steps, column, ledges, updrafts = []) {
      const { width, height } = config.player;
      return steps.filter((step) => {
        const box = boxOf(step, ledges, updrafts);
        if (!box || onMover(step, ledges)) return true;
        // The body's centre is half a body above the feet; the column acts on the centre.
        return box.right + width / 2 >= column.x - column.width / 2 && box.left - width / 2 <= column.x + column.width / 2
          && box.bottom - height / 2 + 2 >= column.y - column.height / 2 && box.top - height / 2 - 2 <= column.y + column.height / 2;
      });
    },
    forget(steps) { for (const step of steps) boxes.delete(step); },
  };
}
