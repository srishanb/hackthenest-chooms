/**
 * The procedural pixel-art flame. It grows and shrinks with the lantern light and flickers.
 *
 * How: each row of the flame has a half-width from a teardrop profile (wide low, pointed at
 * the tip). The centre line sways with two slow sines in the candle's own rhythm and bends
 * by `lean` (the aim while charging, a trail in motion). Colours band from a pale core to a red edge. The outer edge is ragged
 * from a hash of (flame frame, cell), so one frame always looks the same (testable) and the
 * flicker runs at FLAME_FPS like hand-drawn pixel animation. Visual only: nothing here feeds
 * movement. With reduced motion the size still changes but there is no flicker or sway.
 */
import type { CandleGenome } from './candle-genome';
import type { Pixel } from './candle-raster';

export const FLAME_FPS = 12;
/** Flame height in art px at the smallest and the largest light. */
export const FLAME_MIN_HEIGHT = 3;
export const FLAME_MAX_HEIGHT = 11;

export interface FlameInput {
  /** 0 (smallest light) to 1 (largest light). */
  size01: number;
  timeMs: number;
  reducedMotion: boolean;
  /** Signed flame-tip offset in art px (positive is right): aim or trail, see direction-cues.ts. */
  lean: number;
}

/** A small integer hash to 0..1, deterministic per (seed, frame, i, j). */
function hash01(seed: number, frame: number, i: number, j: number): number {
  let h = (seed ^ Math.imul(frame, 374761393) ^ Math.imul(i, 668265263) ^ Math.imul(j, 2246822519)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function flameHeight(size01: number): number {
  const s = Math.min(Math.max(size01, 0), 1);
  return Math.round(FLAME_MIN_HEIGHT + (FLAME_MAX_HEIGHT - FLAME_MIN_HEIGHT) * s);
}

/** Flame pixels relative to its base (the wick tip); y grows downward, so the flame is at y < 0. */
export function rasterFlame(genome: CandleGenome, input: FlameInput): Pixel[] {
  const s = Math.min(Math.max(input.size01, 0), 1);
  const frame = input.reducedMotion ? 0 : Math.floor((input.timeMs / 1000) * FLAME_FPS);
  const { phaseA, phaseB, turbulence, colors } = genome.flame;
  const tipJitter = input.reducedMotion ? 0 : (hash01(genome.seed, frame, 7, 7) < 0.35 ? 1 : 0);
  const height = flameHeight(s) + tipJitter;
  const width = Math.max(2, genome.flame.width * (0.55 + 0.45 * s));
  const t = input.timeMs / 1000;
  const sway = input.reducedMotion ? 0 : Math.sin(t * 5.1 + phaseA) * 0.8 + Math.sin(t * 8.3 + phaseB) * 0.5;
  const pixels: Pixel[] = [];

  for (let j = 0; j < height; j++) {
    const v = (j + 0.5) / height;
    const half = (width / 2) * (v < 0.3 ? Math.sqrt(v / 0.3) : Math.pow(1 - (v - 0.3) / 0.7, 0.9));
    const cx = 0.5 + (sway + input.lean) * v * v;
    const left = Math.floor(cx - half);
    const right = Math.ceil(cx + half);
    let drawn = 0;
    for (let i = left; i < right; i++) {
      const d = Math.abs(i + 0.5 - cx) / Math.max(half, 0.5);
      if (d > 1 && !(drawn === 0 && i === right - 1)) continue;
      // Ragged rim: some outer cells drop out each frame, never the core.
      if (d > 0.7 && hash01(genome.seed, frame, i, j) < turbulence * 0.45) continue;
      const color = d < 0.35 && v < 0.55 ? colors.core : d < 0.65 && v < 0.8 ? colors.inner : d < 0.95 ? colors.outer : colors.edge;
      pixels.push({ x: i, y: -(j + 1), color });
      drawn++;
    }
    if (drawn === 0) pixels.push({ x: Math.floor(cx), y: -(j + 1), color: colors.edge });
  }
  return pixels;
}

/** Light radius in px to a 0..1 flame size, using the lantern rule's own caps. */
export function flameSizeFromRadius(radiusPx: number, minPx: number, maxPx: number): number {
  if (!(maxPx > minPx)) return 0.5;
  return Math.min(Math.max((radiusPx - minPx) / (maxPx - minPx), 0), 1);
}
