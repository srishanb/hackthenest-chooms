/**
 * Waterfalls in the painted backdrop: a pool and a mossy lip where the water leaves the island,
 * a still picture of the falling water, and a soft mist where it thins out at the foot, so it never
 * ends in a hard edge in mid-air. Where it is cold the fall is frozen: a pale column of ice with
 * icicles at the bottom. backdrop-view.ts animates moving water over the same rectangle.
 * Pure: slots into a grid, no canvas, no Phaser.
 */
import { BACKDROP_CONFIG } from '../../config/backdrop.config';
import { hash, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';
import type { Waterfall } from './chunk-types';

/** Rows of mist below a fall of `length` rows, where it thins out. */
export const fallMistRows = (fall: Pick<Waterfall, 'length' | 'width'>): number => Math.round(8 + fall.width * 1.5);

/** A fall this cold is frozen, here and in the view, which stops animating it. */
export const isFrozen = (cold01: number, freezeAt01: number = BACKDROP_CONFIG.cold.freezeAt01): boolean => cold01 >= freezeAt01;

/** The columns of a fall: the rounded left edge and the last column (the view lays its strip over the same ones). */
const columnsOf = (fall: Waterfall): { left: number; right: number } => {
  const left = Math.round(fall.x - fall.width / 2);
  return { left, right: left + Math.max(2, Math.round(fall.width)) - 1 };
};

/** Pass 1: the pool on the island's top and a mossy lip on each side of where it spills. */
function paintPool(surface: Surface, fall: Waterfall): void {
  const { left, right } = columnsOf(fall), frozen = isFrozen(fall.cold01);
  for (let x = left - 3; x <= right + 3; x++) {
    const edge = x < left || x > right;
    plot(surface, x, fall.topY - 1, edge ? (frozen ? TONE.snow0 : TONE.leaf3) : frozen ? TONE.snow1 : TONE.water1);
    if (!edge) plot(surface, x, fall.topY, frozen ? TONE.snow0 : TONE.foam);
  }
}

/** Pass 2: mist at the foot, wider than the fall, see-through, thinning with a checker dither. */
function paintMistFoot(surface: Surface, fall: Waterfall): void {
  if (isFrozen(fall.cold01)) return;
  const mist = fallMistRows(fall), half = fall.width / 2;
  for (let d = 0; d < mist; d++) {
    const share = d / mist, reach = half + 2 + share * fall.width * 0.8, y = fall.topY + fall.length + d;
    for (let x = Math.floor(fall.x - reach); x <= fall.x + reach; x++) {
      if ((x + y) % 2 === 1 && share > 0.35) continue;
      if (hash(fall.id, x, y) < share * 0.9) continue;
      plot(surface, x, y, share < 0.3 && Math.abs(x - fall.x) <= half ? TONE.foam : share < 0.55 ? TONE.mist1 : TONE.mist0);
    }
  }
}

/** Pass 3: the water (or ice) itself, rows `topY + 1` to `topY + length - 1`: exactly where the view's strip goes. */
function paintBody(surface: Surface, fall: Waterfall): void {
  const { left, right } = columnsOf(fall), frozen = isFrozen(fall.cold01);
  for (let x = left; x <= right; x++) {
    const across = (x - left) / Math.max(1, right - left) * 2 - 1;
    // Icicles: a frozen fall is ragged at its foot; running water fades into mist with a dither.
    const end = frozen ? fall.length - Math.floor(hash(fall.id, x, 5) * fall.length * 0.35) : fall.length;
    for (let d = 1; d < end; d++) {
      const y = fall.topY + d;
      let tone: number;
      if (frozen) tone = across < -0.3 ? TONE.snow1 : across > 0.5 ? TONE.rock2 : TONE.snow0;
      else {
        // Long streaks: each column keeps its tone for a while, like water sheeting down.
        const streak = hash(fall.id, x, Math.floor((d + x * 7) / 9));
        tone = Math.abs(across) > 0.8 ? TONE.water0 : streak > 0.7 ? TONE.foam : streak > 0.3 ? TONE.water1 : TONE.water0;
      }
      plot(surface, x, y, tone);
    }
  }
}

/**
 * Paint all the falls of a layer from the list in layout.ts. Pools first, then mists, then the water,
 * so where two falls overlap one fall's lip or mist never covers another's water.
 */
export function paintWaterfalls(surface: Surface, falls: readonly Waterfall[]): void {
  const shown = falls.filter((fall) => !misses(surface, fall.topY - 3, fall.topY + fall.length + fallMistRows(fall) + 2));
  for (const fall of shown) paintPool(surface, fall);
  for (const fall of shown) paintMistFoot(surface, fall);
  for (const fall of shown) paintBody(surface, fall);
}
