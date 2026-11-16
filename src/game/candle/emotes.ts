/**
 * Emotes: small pixel symbols that pop up beside the candle's flame for strong moments.
 *
 * Why: the face is only a few pixels, so a reaction that matters (a pickup, a fright, a hard
 * landing) also gets a bigger, cartoon-style sign: sparkles, an exclamation mark, spinning
 * stars, flying beads of wax, floating z's. Each is a tiny fixed glyph moved by the time spent in
 * the mood. Pure and visual only. Under reduced motion each emote is one still picture.
 *
 * Coordinates are art pixels relative to an anchor just above and beside the wick (y grows
 * downward). The view picks the side, so glyphs are never mirrored.
 */
import type { Pixel } from './candle-raster';
import type { CandleMood } from './expression';

const GOLD = 0xffe27a;
const PALE = 0xfff8e0;
const ALERT = 0xff6b5a;
const BEAD = 0xbfe6ff;
const DREAM = 0xcfd6ff;

/** A four-point sparkle: one pixel, or a plus when `big`. */
function sparkle(x: number, y: number, big: boolean, color: number): Pixel[] {
  const centre = [{ x, y, color: PALE }];
  return big ? [...centre, { x: x - 1, y, color }, { x: x + 1, y, color }, { x, y: y - 1, color }, { x, y: y + 1, color }] : centre;
}

/** A 3x3 letter z. */
function zed(x: number, y: number, color: number): Pixel[] {
  return [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]].map(([dx, dy]) => ({ x: x + dx!, y: y + dy!, color }));
}

/** How long a one-shot emote stays after its mood begins (ms). Looping emotes ignore this. */
export const EMOTE_MS = 900;

export function emotePixels(mood: CandleMood, moodMs: number, reducedMotion: boolean): Pixel[] {
  const t = reducedMotion ? 300 : Math.max(0, moodMs);
  switch (mood) {
    case 'delighted': {
      // Three sparkles pop one after another, each swelling then shrinking.
      const spots = [[1, -3], [5, -7], [-2, -8]] as const;
      return spots.flatMap(([x, y], i) => {
        const age = t - i * 140;
        if (age < 0 || age > 520) return [];
        return sparkle(x, y, age > 90 && age < 400, GOLD);
      });
    }
    case 'proud': {
      // One star rises and holds.
      const rise = Math.min(6, Math.floor(t / 70));
      return t > EMOTE_MS * 1.6 ? [] : sparkle(3, -2 - rise, true, GOLD);
    }
    case 'alarmed': {
      // An exclamation mark that jolts up and down.
      const jolt = reducedMotion ? 0 : Math.floor(t / 110) % 2;
      const x = 4, y = -9 + jolt;
      return [0, 1, 2, 3].map((i) => ({ x, y: y + i, color: ALERT })).concat([{ x, y: y + 5, color: ALERT }]);
    }
    case 'ouch': {
      // Two stars circle the head.
      const angle = t / 110;
      return [0, Math.PI].flatMap((offset) => {
        const x = Math.round(Math.cos(angle + offset) * 5) - 6;
        const y = Math.round(Math.sin(angle + offset) * 2) - 3;
        return sparkle(x, y, false, PALE).concat([{ x: x + 1, y, color: GOLD }]);
      });
    }
    case 'worried': {
      // A bead of wax flies off to the side now and then.
      const cycle = reducedMotion ? 200 : t % 1300;
      if (cycle > 420) return [];
      const step = Math.floor(cycle / 70);
      return [{ x: 2 + step, y: 1 + Math.floor((step * step) / 6), color: BEAD }];
    }
    case 'sleepy': {
      // z's drift up and away, small then larger.
      const phase = reducedMotion ? 0.5 : (t % 2600) / 2600;
      const drift = Math.round(phase * 6);
      const near = [{ x: 2 + Math.round(drift / 2), y: -2 - drift, color: DREAM }, { x: 3 + Math.round(drift / 2), y: -2 - drift, color: DREAM }];
      return phase > 0.35 ? [...near, ...zed(5 + Math.round(drift / 2), -6 - drift, DREAM)] : near;
    }
    default:
      return [];
  }
}
