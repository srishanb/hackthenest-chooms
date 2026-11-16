/**
 * The candle's fuel in endless mode: it burns with playing time and wax tops it up.
 *
 * Why its own rule: in the EEG game the burn rate followed the signal. Here it follows the clock,
 * the height reached, and how shaken the candle is (composure.ts). When the fuel hits zero the wick keeps glowing for a short grace
 * time; wax picked up in that time relights the flame, otherwise the run is over. Pure functions,
 * so the rule is easy to test and to explain. Fuel never changes how the candle moves.
 */
import type { EndlessConfig } from '../../config/endless.config';

export interface FlameState {
  /** 0 (empty) to 1 (full). */
  fuel01: number;
  /** Time left on the glowing wick after the fuel ran out, in ms. Only counts down while fuel is 0. */
  graceLeftMs: number;
  /** True once the wick has gone cold: the run is over. */
  out: boolean;
}

export function freshFlame(config: EndlessConfig): FlameState {
  return { fuel01: 1, graceLeftMs: config.fuel.graceMs, out: false };
}

/**
 * Fuel burned per second in chunk `chunkIndex`. The candle burns faster the higher it is: quickly
 * over the difficulty ramp, then slowly on, so no climb lasts forever.
 */
export function burnPerSecond(chunkIndex: number, config: EndlessConfig): number {
  const { burnSecondsEasy, burnSecondsHard, burnSecondsLate, lateChunks } = config.fuel;
  const index = Math.max(0, Number.isFinite(chunkIndex) ? chunkIndex : 0);
  const ramp = Math.min(1, index / config.rampChunks);
  const late = Math.min(1, Math.max(0, (index - config.rampChunks) / Math.max(1, lateChunks - config.rampChunks)));
  const seconds = burnSecondsEasy + (burnSecondsHard - burnSecondsEasy) * ramp + (burnSecondsLate - burnSecondsHard) * late;
  return 1 / seconds;
}

/**
 * `burnScale` multiplies the burn while there is fuel (a shaken candle burns faster, see composure.ts).
 * It never shortens the grace time of a glowing wick.
 */
export function stepFlame(state: FlameState, dtMs: number, chunkIndex: number, config: EndlessConfig, burnScale = 1): FlameState {
  if (state.out) return state;
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  if (state.fuel01 > 0) {
    const scale = Number.isFinite(burnScale) ? Math.max(1, burnScale) : 1;
    const fuel01 = Math.max(0, state.fuel01 - burnPerSecond(chunkIndex, config) * scale * dt / 1000);
    return { fuel01, graceLeftMs: config.fuel.graceMs, out: false };
  }
  const graceLeftMs = Math.max(0, state.graceLeftMs - dt);
  return { fuel01: 0, graceLeftMs, out: graceLeftMs === 0 };
}

/** Wax: adds fuel and, during the grace time, relights the flame. Does nothing once the wick is cold. */
export function addWax(state: FlameState, config: EndlessConfig): FlameState {
  if (state.out) return state;
  return { fuel01: Math.min(1, state.fuel01 + config.fuel.waxRefill01), graceLeftMs: config.fuel.graceMs, out: false };
}

/** True while there is fuel: the flame is burning, not just glowing. */
export const isLit = (state: FlameState): boolean => state.fuel01 > 0;
