/**
 * A development-only player that climbs by following the generator's own route.
 *
 * Why: it lets an automated browser check (and a person watching) see the endless climb really
 * work from end to end: it walks to each takeoff point, holds jump for the stored number of
 * physics steps and releases in the stored direction. A drop step (a detour down) is simpler: it
 * walks in the stored direction until it walks off the edge, then lets go and falls. It only produces the same key input a
 * person would; it has no special access to movement. Turned on with `?bot=1` in development
 * builds only, and a bot run never saves a best height.
 *
 * Wax grows the candle a little (candle/growth.ts), which makes the same hold jump slightly farther
 * than the route was built for. Given the movement in force, the bot first holds jump for the number
 * of steps that gives the launch speed the route assumed (whole steps only, so it can be a hair off),
 * then checks that hold by replaying the jump with the real player step (`flyStep`, the replay the
 * generator proves routes with) under the candle's current growth, and tries neighbouring holds until
 * one lands on the route's target, as a person adjusts by eye. A jump that still lands somewhere else
 * is remembered, and the same hold is never tried again for that step until it succeeds, so the bot
 * cannot repeat one failing jump for ever.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformBox, PlayerInput, PlayerState, UpdraftBox } from '../player/types';
import type { RouteStep } from './generator';
import { flyStep } from './route-replay';

const IDLE: PlayerInput = { left: false, right: false, jump: false };
/** Close enough to the takeoff point to start charging (px). One walking step is under 2 px. */
const TAKEOFF_TOLERANCE_PX = 1.5;

/**
 * Physics steps to hold jump under `current` movement for the launch speed that `steps` gives under
 * `base` (the movement the route was generated with). The same number when nothing has grown.
 */
export function heldStepsFor(steps: number, base: GameConfig, current: GameConfig): number {
  if (current.jump === base.jump) return steps;
  const stepMs = 1000 / base.stepHz;
  const charge = Math.min(1, (steps * stepMs) / base.jump.maxChargeMs);
  const speed = base.jump.minSpeed + (base.jump.maxSpeed - base.jump.minSpeed) * charge;
  const wanted = (speed - current.jump.minSpeed) / (current.jump.maxSpeed - current.jump.minSpeed);
  return Math.max(1, Math.round((Math.min(1, Math.max(0, wanted)) * current.jump.maxChargeMs) / stepMs));
}

/** How far from the first choice the hold may move when searching for one that lands (physics steps, two charge levels). */
const MAX_HOLD_SHIFT_STEPS = 12;

/** The movement the route was built for and the one in force now, and (optional) the world to check a jump in. */
export interface BotWorld {
  base: GameConfig;
  current: GameConfig;
  /** The platforms as they are now. With them the bot checks its hold by replaying the jump. */
  platforms?: readonly PlatformBox[];
  updrafts?: readonly UpdraftBox[];
}

const keyOf = (step: RouteStep): string => `${step.fromId}>${step.toId}`;

/** The step starts or ends on a ledge that slides (the platforms carry their `motion` at run time). */
function movesOnStep(step: RouteStep, platforms: readonly PlatformBox[] | undefined): boolean {
  return !!platforms?.some((platform) => (platform.id === step.fromId || platform.id === step.toId) && 'motion' in platform && !!platform.motion);
}

/**
 * The hold to use: the first of `nominal`, `nominal`+1, `nominal`-1, +2, -2... (never one in `tried`)
 * that a replay from `fromX` under `current` lands on the step's target. With no world to replay in, or
 * `verify` false, the first untried one. If none lands, the first untried one anyway.
 */
export function chooseHold(step: RouteStep, nominal: number, fromX: number, tried: ReadonlySet<number>, world: BotWorld | undefined, verify: boolean): number {
  const order: number[] = [];
  for (let shift = 0; shift <= MAX_HOLD_SHIFT_STEPS; shift++) {
    for (const hold of shift === 0 ? [nominal] : [nominal + shift, nominal - shift]) if (hold >= 1 && !tried.has(hold)) order.push(hold);
  }
  if (order.length === 0) return nominal;
  if (!verify || !world?.platforms) return order[0]!;
  for (const hold of order) {
    const flight = flyStep({ ...step, chargeSteps: hold, takeoffX: fromX }, world.platforms, world.current.view.width, world.current,
      { stopPastTarget: true, updrafts: world.updrafts });
    if (flight.landedId === step.toId && (!step.via || flight.bounces.includes(step.via))) return hold;
  }
  return order[0]!;
}

export function createRouteBot() {
  let held = 0;
  let hold = 0;
  let pending: RouteStep | null = null;
  /** The jump just released, until the candle lands again: which step, and the hold it used. */
  let launched: { step: RouteStep; hold: number } | null = null;
  /** Holds that landed somewhere other than the target, by step: never tried again until that step succeeds. */
  const failed = new Map<string, Set<number>>();
  return {
    /**
     * The input for this physics step, given the live route steps and the platforms' edges. `movement`
     * is the movement the route was built for (`base`) and the one in force now (`current`).
     */
    input(state: PlayerState, steps: readonly RouteStep[], ledgeOf: (id: string) => { x: number; width: number } | undefined,
      movement?: BotWorld): PlayerInput {
      if (!state.grounded) { held = 0; pending = null; return IDLE; }
      if (launched) {
        // Landed again: a jump that reached its target forgets its failures; one that did not remembers its hold.
        const key = keyOf(launched.step);
        if (state.platformId === launched.step.toId) failed.delete(key);
        else failed.set(key, new Set(failed.get(key) ?? []).add(launched.hold));
        launched = null;
      }
      const step = steps.find((candidate) => candidate.fromId === state.platformId);
      if (!step) {
        // Off the route (a side ledge): walk off the nearer edge and drop back onto it.
        const ledge = state.platformId ? ledgeOf(state.platformId) : undefined;
        const goLeft = ledge ? state.x < ledge.x : true;
        return { left: goLeft, right: !goLeft, jump: false };
      }
      // A drop: walk off the edge in the stored direction; once in the air the bot lets go (above).
      if (step.kind === 'drop') { held = 0; pending = null; return { left: step.direction < 0, right: step.direction > 0, jump: false }; }
      if (pending !== step) { pending = step; held = 0; }
      if (held === 0 && Math.abs(state.x - step.takeoffX) > TAKEOFF_TOLERANCE_PX) {
        return { left: state.x > step.takeoffX, right: state.x < step.takeoffX, jump: false };
      }
      if (held === 0) {
        // About to charge: pick the hold now, checking it by replay from where the candle really stands. A step
        // that starts or ends on a moving ledge is replayed only when growth changed the movement or a hold has
        // already failed (a replay cannot know where the ledge will be); every other step is always replayed,
        // because a flight through an updraft column or off a bounce cap can miss from a takeoff 1 px off.
        const tried = failed.get(keyOf(step)) ?? new Set<number>();
        const nominal = movement ? heldStepsFor(step.chargeSteps, movement.base, movement.current) : step.chargeSteps;
        const changed = !!movement && (movement.current.jump !== movement.base.jump || tried.size > 0);
        hold = chooseHold(step, nominal, state.x, tried, movement, changed || !!movement && !movesOnStep(step, movement.platforms));
      }
      if (held < hold) { held++; return { ...IDLE, jump: true }; }
      // Release while holding the stored direction: this is the launch step.
      launched = { step, hold };
      held = 0; pending = null;
      return { left: step.direction < 0, right: step.direction > 0, jump: false };
    },
  };
}
