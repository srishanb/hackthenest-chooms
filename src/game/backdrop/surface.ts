/**
 * The surface every backdrop painter draws on: a grid of colour slots plus the forest row its first
 * row stands for. Painters work in whole-forest coordinates (art pixels, y grows downward), so a
 * shape that straddles two chunks is painted into both and lines up exactly.
 * Pure: no canvas, no Phaser.
 */
import { put, type PixelGrid } from './pixel-grid';

/** A grid and the forest row its first row stands for. */
export interface Surface { grid: PixelGrid; originY: number }

/** Set the cell at forest position (x, y), rounding to whole pixels. Outside the surface is ignored. */
export const plot = (surface: Surface, x: number, y: number, tone: number): void =>
  put(surface.grid, Math.round(x), Math.round(y) - surface.originY, tone);

/** True when rows `top`..`bottom` miss the surface entirely, so a painter can skip its work. */
export const misses = (surface: Surface, top: number, bottom: number): boolean =>
  bottom < surface.originY || top >= surface.originY + surface.grid.height;

/** The first and last forest rows of the surface that rows `top`..`bottom` cover (empty when last < first). */
export function rowsOf(surface: Surface, top: number, bottom: number): [number, number] {
  return [Math.max(Math.floor(top), surface.originY), Math.min(Math.ceil(bottom), surface.originY + surface.grid.height - 1)];
}
