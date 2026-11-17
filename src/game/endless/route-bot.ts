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
 * than the route was built for. Given the movement in force, the bot holds jump for the number of
 * steps that gives the launch speed the route assumed, as a person adjusts by eye.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlayerInput, PlayerState } from '../player/types';
import type { RouteStep } from './generator';

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

export function createRouteBot() {
  let held = 0;
  let pending: RouteStep | null = null;
  return {
    /**
     * The input for this physics step, given the live route steps and the platforms' edges. `movement`
     * is the movement the route was built for (`base`) and the one in force now (`current`).
     */
    input(state: PlayerState, steps: readonly RouteStep[], ledgeOf: (id: string) => { x: number; width: number } | undefined,
      movement?: { base: GameConfig; current: GameConfig }): PlayerInput {
      if (!state.grounded) { held = 0; pending = null; return IDLE; }
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
      const hold = movement ? heldStepsFor(step.chargeSteps, movement.base, movement.current) : step.chargeSteps;
      if (held < hold) { held++; return { ...IDLE, jump: true }; }
      // Release while holding the stored direction: this is the launch step.
      held = 0; pending = null;
      return { left: step.direction < 0, right: step.direction > 0, jump: false };
    },
  };
}
