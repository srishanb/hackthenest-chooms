/**
 * The candle's "genome": everything that makes one candle different from the next.
 *
 * Why seeded: a new seed is picked with Math.random() when a run starts, and every shape,
 * colour and flame quirk comes from that seed through a small deterministic generator. So
 * each run gets a unique candle, but one seed always gives the same candle (tests, bug
 * reports, `?candleSeed=` in development). Code-drawn pixel art; no image or AI asset.
 */

/** mulberry32: a tiny, well-known 32-bit seeded generator. Returns numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A drip of wax down the side. `x` is a column of the body (0 = left), `length` in art px. */
export interface Drip {
  x: number;
  length: number;
}

export interface CandleGenome {
  seed: number;
  /** Body size in art pixels before growth. */
  width: number;
  height: number;
  /** Wax colours: base, darker shade (right side), lighter highlight (left side and rim). */
  wax: { base: number; shade: number; light: number };
  drips: Drip[];
  wickHeight: number;
  flame: {
    /** Flame width at full size, in art px. */
    width: number;
    /** Phase offsets so each candle flickers in its own rhythm. */
    phaseA: number;
    phaseB: number;
    /** 0..1: how ragged the outer edge is. */
    turbulence: number;
    /** Colours from the core outward. */
    colors: { core: number; inner: number; outer: number; edge: number };
  };
}

/** Pale wax tones that read against the dark forest; each pick shades and lightens itself. */
const WAX_BASES = [0xefe6d2, 0xf2dcc0, 0xe9d4d8, 0xdfe6ef, 0xf0e2b6, 0xe2ead6];
const FLAMES = [
  { core: 0xfffbe8, inner: 0xffe27a, outer: 0xffa23a, edge: 0xd9542b },
  { core: 0xfff8f0, inner: 0xffd36a, outer: 0xff8a3d, edge: 0xc4402c },
  { core: 0xfffde0, inner: 0xfff09a, outer: 0xffb84a, edge: 0xe0702e },
];

/** Multiply each RGB channel by `factor` (darker below 1, lighter above), clamped to 0..255. */
export function scaleColor(color: number, factor: number): number {
  const channel = (shift: number): number => Math.min(255, Math.max(0, Math.round(((color >> shift) & 0xff) * factor)));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

const pick = <T>(random: () => number, list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
const between = (random: () => number, min: number, max: number): number => min + Math.floor(random() * (max - min + 1));

export function createCandleGenome(seed: number): CandleGenome {
  const random = seededRandom(seed);
  const width = between(random, 8, 10);
  const height = between(random, 14, 17);
  const base = pick(random, WAX_BASES);
  const dripCount = between(random, 1, 3);
  const drips: Drip[] = [];
  for (let i = 0; i < dripCount; i++) {
    const x = between(random, 0, width - 1);
    if (drips.some((d) => Math.abs(d.x - x) < 2)) continue;
    drips.push({ x, length: between(random, 2, Math.max(3, Math.floor(height / 2))) });
  }
  return {
    seed,
    width,
    height,
    wax: { base, shade: scaleColor(base, 0.78), light: scaleColor(base, 1.08) },
    drips,
    wickHeight: between(random, 1, 2),
    flame: {
      width: between(random, 5, 7),
      phaseA: random() * Math.PI * 2,
      phaseB: random() * Math.PI * 2,
      turbulence: 0.25 + random() * 0.5,
      colors: pick(random, FLAMES),
    },
  };
}

/** A seed for a new run, or the dev override from `?candleSeed=<integer>`. */
export function pickCandleSeed(search: string, development: boolean, random: () => number = Math.random): number {
  if (development) {
    const raw = new URLSearchParams(search).get('candleSeed');
    if (raw !== null && /^\d{1,10}$/.test(raw)) return Number(raw) >>> 0;
  }
  return Math.floor(random() * 4294967296) >>> 0;
}
