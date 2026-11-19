/**
 * How a route step uses walls (Decision D-37): the keys a person presses after takeoff, step by step.
 *
 * Why its own file: the generator's replay (route-replay.ts), the route bot and the night outlines' reach
 * search must press the same keys for a wall step, or a route the generator proves could fail in the bot. It
 * only makes key input, exactly as a person's fingers would; the physics (player/wall.ts) does the rest.
 *
 * The keys: hold the step's direction (toward the first wall). Each time a wall on that side comes within
 * kick reach, wait the step's stored number of physics steps (`kicks[k]`, sliding if pressed flat) and press
 * jump once; when the kick happens, hold the other way (toward the next wall of a chimney, or away from a
 * single wall) and do the same for the next kick. After the last kick keep holding that way until landing.
 * `offsetSteps` presses every kick that many steps later (or earlier, negative): the proof checks a range of
 * press times, as a person's timing varies.
 */
import type { GameConfig } from '../../shared/contracts/config';
import type { PlatformBox, PlayerInput, PlayerState } from '../player/types';
import { wallBeside } from '../player/wall';

export interface KickPolicy {
  /** The keys for the next physics step, given the candle now and the walls in the world. */
  input(state: PlayerState, walls: readonly PlatformBox[]): PlayerInput;
  /** Kicks made so far. */
  done(): number;
}

const hold = (heading: -1 | 0 | 1, jump = false): PlayerInput => ({ left: heading < 0, right: heading > 0, jump });

export function createKickPolicy(kicks: readonly number[], direction: -1 | 0 | 1, config: GameConfig, offsetSteps = 0): KickPolicy {
  const rules = config.wallMoves;
  let heading = direction;
  let made = 0;
  let near = 0;
  let pressed = false;
  return {
    done: () => made,
    input(state, walls) {
      if (!rules || made >= kicks.length || heading === 0) return hold(heading);
      if (pressed) {
        pressed = false;
        // A kick sets the lockout to its full length on the step it happens.
        if (state.wallLockMs === rules.kickLockMs) { made++; heading = -heading as -1 | 1; near = 0; return hold(heading); }
        // The press did nothing (the wall did not grip yet): let go for a step, so the next press is fresh.
        return hold(heading);
      }
      const beside = wallBeside(walls, state.x, state.y, config.player, rules.kickReachPx);
      if (beside && beside.side === heading) {
        near++;
        if (near > Math.max(0, kicks[made]! + offsetSteps)) { pressed = true; return hold(heading, true); }
      }
      return hold(heading);
    },
  };
}
