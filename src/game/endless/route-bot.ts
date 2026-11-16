/**
 * A development-only player that climbs by following the generator's own route.
 *
 * Why: it lets an automated browser check (and a person watching) see the endless climb really
 * work from end to end: it walks to each takeoff point, holds jump for the stored number of
 * physics steps and releases in the stored direction. It only produces the same key input a
 * person would; it has no special access to movement. Turned on with `?bot=1` in development
 * builds only, and a bot run never saves a best height.
 */
import type { PlayerInput, PlayerState } from '../player/types';
import type { RouteStep } from './generator';

const IDLE: PlayerInput = { left: false, right: false, jump: false };
/** Close enough to the takeoff point to start charging (px). One walking step is under 2 px. */
const TAKEOFF_TOLERANCE_PX = 1.5;

export function createRouteBot() {
  let held = 0;
  let pending: RouteStep | null = null;
  return {
    /** The input for this physics step, given the live route steps and the platforms' edges. */
    input(state: PlayerState, steps: readonly RouteStep[], ledgeOf: (id: string) => { x: number; width: number } | undefined): PlayerInput {
      if (!state.grounded) { held = 0; pending = null; return IDLE; }
      const step = steps.find((candidate) => candidate.fromId === state.platformId);
      if (!step) {
        // Off the route (a side ledge): walk off the nearer edge and drop back onto it.
        const ledge = state.platformId ? ledgeOf(state.platformId) : undefined;
        const goLeft = ledge ? state.x < ledge.x : true;
        return { left: goLeft, right: !goLeft, jump: false };
      }
      if (pending !== step) { pending = step; held = 0; }
      if (held === 0 && Math.abs(state.x - step.takeoffX) > TAKEOFF_TOLERANCE_PX) {
        return { left: state.x > step.takeoffX, right: state.x < step.takeoffX, jump: false };
      }
      if (held < step.chargeSteps) { held++; return { ...IDLE, jump: true }; }
      // Release while holding the stored direction: this is the launch step.
      held = 0; pending = null;
      return { left: step.direction < 0, right: step.direction > 0, jump: false };
    },
  };
}
