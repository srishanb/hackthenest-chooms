/**
 * The candle's composure in the game-only climb: how shaken it is, with no signal to read.
 *
 * In the EEG game a tense signal corrupted the forest, narrowed the view, tensed the music and made
 * the candle burn faster, and calming down brought the forest back. Here the same loop is driven by
 * play. A fall shakes the candle, more the further it falls. Standing still for a moment steadies it
 * (the game's "take a breath"), and so do clean landings and wax; on the move it fades slowly by itself.
 * The scene feeds `shaken01` to the effects table (mood.ts) and to the burn rate (`burnScale`).
 *
 * This is the candle's state, a reaction to what happens in the game. It is not a reading of the
 * player. Pure functions; nothing here touches movement.
 */
import type { EndlessConfig } from '../../config/endless.config';

export interface Composure {
  /** 0 (steady) to 1 (badly shaken). */
  shaken01: number;
  /** Time spent standing still in a row, in ms. */
  stillMs: number;
}

const unit = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

/** A steady candle. `shaken01` is only passed by a development run that wants to start shaken. */
export function steadyComposure(shaken01 = 0): Composure {
  return { shaken01: unit(shaken01), stillMs: 0 };
}

/** How much a fall of `fallPx` below takeoff shakes the candle: 0 for a small drop, then `min01`..`max01`. */
export function fallShake(fallPx: number, config: EndlessConfig): number {
  const { minPx, fullPx, min01, max01 } = config.composure.fall;
  if (!Number.isFinite(fallPx) || fallPx < minPx) return 0;
  return min01 + (max01 - min01) * unit((fallPx - minPx) / (fullPx - minPx));
}

/** The candle landed `fallPx` below where it took off. */
export function shake(state: Composure, fallPx: number, config: EndlessConfig): Composure {
  const amount = fallShake(fallPx, config);
  return amount === 0 ? state : { shaken01: unit(state.shaken01 + amount), stillMs: 0 };
}

/** Something steadied the candle by `amount01` (a clean landing, wax). */
export function steady(state: Composure, amount01: number): Composure {
  return { ...state, shaken01: unit(state.shaken01 - Math.max(0, unit(amount01))) };
}

/**
 * One step of time. `still` is true while the candle stands on a ledge without walking or charging:
 * after `settleMs` of that it steadies quickly. Otherwise it steadies slowly.
 */
export function stepComposure(state: Composure, dtMs: number, still: boolean, config: EndlessConfig): Composure {
  const dt = Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0;
  const { settleMs, steadyPerSecond, easePerSecond } = config.composure;
  const stillMs = still ? state.stillMs + dt : 0;
  const rate = stillMs >= settleMs ? steadyPerSecond : easePerSecond;
  return { shaken01: unit(state.shaken01 - (rate * dt) / 1000), stillMs };
}

/** True while standing still is steadying a candle that needs it: it closes its eyes and breathes. */
export function isSteadying(state: Composure, config: EndlessConfig): boolean {
  return state.shaken01 > 0.02 && state.stillMs >= config.composure.settleMs;
}

/** How much faster the candle burns: 1 while steady enough, up to `burnScaleMax` when badly shaken. */
export function burnScale(shaken01: number, config: EndlessConfig): number {
  const { burnFrom01, burnScaleMax } = config.composure;
  const t = unit((unit(shaken01) - burnFrom01) / (1 - burnFrom01));
  return 1 + (burnScaleMax - 1) * t;
}
