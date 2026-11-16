/**
 * Waterfalls in the painted backdrop: a pool and a mossy lip where the water leaves the island,
 * a still picture of the falling water, and a soft mist where it thins out at the foot, so it never
 * ends in a hard edge in mid-air. Where it is cold the fall is frozen: a pale column of ice with
 * icicles at the bottom. backdrop-view.ts animates moving water over the same rectangle.
 * Pure: slots into a grid, no canvas, no Phaser.
 */
import { hash, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';
import type { Waterfall } from './chunk-types';

/** Rows of mist below a fall of `length` rows, where it thins out. */
export const fallMistRows = (fall: Pick<Waterfall, 'length' | 'width'>): number => Math.round(8 + fall.width * 1.5);

/** A fall this cold is frozen, here and in the view, which stops animating it. */
export const isFrozen = (cold01: number): boolean => cold01 >= 0.6;

/** Paint one fall from the list in layout.ts: pool and lip, the water (or ice), and the mist at its foot. */
export function paintWaterfall(surface: Surface, fall: Waterfall): void {
  const mist = fallMistRows(fall), bottom = fall.topY + fall.length + mist;
  if (misses(surface, fall.topY - 3, bottom + 2)) return;
  const half = fall.width / 2, left = Math.round(fall.x - half), right = left + Math.max(2, Math.round(fall.width)) - 1;
  const frozen = isFrozen(fall.cold01);
  // The pool on the island's top and a mossy lip on each side of where it spills.
  for (let x = left - 3; x <= right + 3; x++) {
    const edge = x < left || x > right;
    plot(surface, x, fall.topY - 1, edge ? (frozen ? TONE.snow0 : TONE.leaf3) : frozen ? TONE.snow1 : TONE.water1);
    if (!edge) plot(surface, x, fall.topY, frozen ? TONE.snow0 : TONE.foam);
  }
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
  if (frozen) return;
  // Mist at the foot: wider than the fall, see-through, thinning with a checker dither.
  for (let d = 0; d < mist; d++) {
    const share = d / mist, reach = half + 2 + share * fall.width * 0.8, y = fall.topY + fall.length + d;
    for (let x = Math.floor(fall.x - reach); x <= fall.x + reach; x++) {
      if ((x + y) % 2 === 1 && share > 0.35) continue;
      if (hash(fall.id, x, y) < share * 0.9) continue;
      plot(surface, x, y, share < 0.3 && Math.abs(x - fall.x) <= half ? TONE.foam : share < 0.55 ? TONE.mist1 : TONE.mist0);
    }
  }
}
