/**
 * The one pixel grid that all gameplay art is drawn on.
 *
 * Why: the art is drawn at one size, `FOREST_CONFIG.pixelScale` world px per art pixel (2, so the
 * 960x540 canvas is a 480x270 art grid). If a sprite, the camera or a moving thing sits on an odd
 * world pixel, its art pixels straddle the grid and look half-sized or blurred against the rest.
 * Rounding every *drawn* position to a multiple of `pixelScale` keeps one grid, the way Celeste
 * draws at one low resolution. Physics positions are never snapped: only where things are drawn.
 *
 * Pure numbers in, numbers out, so it is tested without a game.
 */
import { FOREST_CONFIG } from '../../config/forest.config';

/** World px per art pixel: the grid step. */
export const PIXEL_GRID = FOREST_CONFIG.pixelScale;

/** `value` rounded to the nearest multiple of `step` (default: one art pixel). Non-finite values pass through. */
export function snapToGrid(value: number, step: number = PIXEL_GRID): number {
  if (!Number.isFinite(value) || !(step > 0)) return value;
  // `+ 0` turns -0 into 0, so a snapped value never prints or compares as negative zero.
  return Math.round(value / step) * step + 0;
}

/**
 * `value` snapped to the grid but kept inside `min..max`: when the nearest grid line falls outside,
 * the nearest grid line inside is used instead. A range narrower than one step returns `min`.
 */
export function snapInside(value: number, min: number, max: number, step: number = PIXEL_GRID): number {
  if (!(max >= min)) return snapToGrid(value, step);
  const snapped = snapToGrid(Math.min(max, Math.max(min, value)), step);
  if (snapped > max) { const inside = Math.floor(max / step) * step; return inside >= min ? inside + 0 : min; }
  if (snapped < min) { const inside = Math.ceil(min / step) * step; return inside <= max ? inside + 0 : min; }
  return snapped;
}
