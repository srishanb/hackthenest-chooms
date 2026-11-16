/**
 * A small grid of colour slots to paint pixel art into, and the seeded numbers the painter uses.
 *
 * Why slots and not colours: the painter only says "dark bark", "light leaf", "snow". The colour
 * for each slot is chosen afterwards, row by row, from the height's own palette, which is what
 * lets one painted picture fade from green forest into snow without a seam. Pure: no canvas here.
 */

/** Colour slots. 0 is "nothing here" (see-through). Each family runs from dark to light. */
export const TONE = {
  none: 0,
  bark0: 1, bark1: 2, bark2: 3, bark3: 4,
  leaf0: 5, leaf1: 6, leaf2: 7, leaf3: 8, leaf4: 9,
  rock0: 10, rock1: 11, rock2: 12,
  snow0: 13, snow1: 14,
  cap0: 15, cap1: 16, cap2: 17,
  stem0: 18, stem1: 19,
} as const;
export const TONE_COUNT = 20;

export interface PixelGrid { width: number; height: number; cells: Uint8Array }

export function createGrid(width: number, height: number): PixelGrid {
  return { width, height, cells: new Uint8Array(width * height) };
}

/** Set one cell. Anything outside the grid is ignored, so painters need not clip. */
export function put(grid: PixelGrid, x: number, y: number, tone: number): void {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return;
  grid.cells[y * grid.width + x] = tone;
}

/** A repeatable number from 0 up to (not including) 1 for a seed and one or two whole numbers. */
export function hash(seed: number, a: number, b = 0): number {
  let h = (seed ^ Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth repeatable wobble from 0 to 1 along `t`: equal at equal `t`, gently changing between whole numbers. */
export function noise1(seed: number, t: number): number {
  const whole = Math.floor(t), part = t - whole, ease = part * part * (3 - 2 * part);
  return hash(seed, whole) * (1 - ease) + hash(seed, whole + 1) * ease;
}

/** A new seed for a named part of the same thing, so its numbers do not echo the parent's. */
export function subSeed(seed: number, part: number): number {
  return (Math.imul(seed ^ 0x9e3779b9, 2654435761) + Math.imul(part | 0, 40503)) >>> 0;
}
