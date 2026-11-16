/**
 * The procedural pixel-art flame. It grows and shrinks with the lantern light and flickers.
 *
 * How: each row of the flame has a half-width from a teardrop profile (wide low, pointed at
 * the tip). The centre line sways with two slow sines in the candle's own rhythm and bends
 * by `lean` (the aim while charging, a trail in motion). Colours band from a pale core to a red edge. The outer edge is ragged
 * from a hash of (flame frame, cell), so one frame always looks the same (testable) and the
 * flicker runs at FLAME_FPS like hand-drawn pixel animation. Visual only: nothing here feeds
 * movement. With reduced motion the size still changes but there is no flicker or sway.
 *
 * Falling (`fall01`, see fallIntensity): air rushes up past the wick, so the flame burns
 * hotter, like a fanned fire. It stretches up and narrows, its base turns blue (the colour
 * of a flame with plenty of air), its rim tears more, and small licks break off above the
 * tip. The view also runs the flicker clock faster (flickerRate). Reduced motion keeps the
 * stretch and the blue base but drops the tearing, licks and faster flicker.
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
  /** 0 when not falling, up to 1 in a fast fall (fallIntensity). Optional: 0 by default. */
  fall01?: number;
  /** 0..1 a burst of joy (wax picked up, a new best): the flame leaps taller and wider for a moment. */
  flare01?: number;
  /** 0..1 a jolt (a landing): the flame is pressed down and spreads, then springs back. */
  duck01?: number;
  /** 0..1 of a jump charge: the flame gathers into a thin, tall, hot point as the candle winds up. */
  gather01?: number;
}

/** The blue of a flame with plenty of air, from the hot centre outward. */
export const OXIDISED = { core: 0xe6f1ff, inner: 0x9cc4ff, outer: 0x5a8ae8 } as const;
/** Falling slower than this (px/s, downward) looks like a normal flame. */
const FALL_START_PX_S = 150;
/** At this downward speed the effect is at its strongest. */
const FALL_FULL_PX_S = 800;

/** 0..1 how hard the air is rushing past the flame: only while airborne and moving down. */
export function fallIntensity(grounded: boolean, vy: number): number {
  if (grounded || !(vy > FALL_START_PX_S)) return 0;
  return Math.min((vy - FALL_START_PX_S) / (FALL_FULL_PX_S - FALL_START_PX_S), 1);
}

/** How much faster the flicker runs while falling: 1x at rest, 2.5x in a fast fall. */
export function flickerRate(fall01: number): number {
  return 1 + 1.5 * Math.min(Math.max(fall01, 0), 1);
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
  const fall = Math.min(Math.max(input.fall01 ?? 0, 0), 1);
  const { phaseA, phaseB, colors } = genome.flame;
  const motion = input.reducedMotion ? 0 : 1;
  const turbulence = genome.flame.turbulence + (0.95 - genome.flame.turbulence) * fall * motion;
  // At rest the tip jumps 1 px about a third of the time; falling, more often and up to 2 px.
  const tipJitter = input.reducedMotion ? 0 : hash01(genome.seed, frame, 7, 7) < 0.35 + 0.4 * fall ? 1 + Math.round(fall) : 0;
  // A missing or broken value means "no reaction", never a broken flame.
  const unit = (value: number | undefined): number => (Number.isFinite(value) ? Math.min(Math.max(value!, 0), 1) : 0);
  const flare = unit(input.flare01);
  const duck = unit(input.duck01);
  const gather = unit(input.gather01);
  const height = Math.max(2, Math.round((flameHeight(s) + Math.round(3 * fall) + 2 * gather + 4 * flare) * (1 - 0.55 * duck)) + tipJitter);
  const width = Math.max(2, genome.flame.width * (0.55 + 0.45 * s) * (1 - 0.3 * fall) * (1 - 0.28 * gather) * (1 + 0.35 * flare + 0.4 * duck));
  const t = input.timeMs / 1000;
  const sway = motion * (1 + 1.5 * fall) * (Math.sin(t * 5.1 + phaseA) * 0.8 + Math.sin(t * 8.3 + phaseB) * 0.5);
  // The blue band at the base grows with the fall.
  // A nearly full charge burns hot at the base too.
  const blueBelow = fall > 0.15 ? 0.12 + 0.25 * fall : gather > 0.7 ? 0.1 + 0.12 * gather : 0;
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
      const color = v < blueBelow ? (d < 0.4 ? OXIDISED.core : d < 0.8 ? OXIDISED.inner : OXIDISED.outer)
        : d < 0.35 && v < 0.55 ? colors.core : d < 0.65 && v < 0.8 ? colors.inner : d < 0.95 ? colors.outer : colors.edge;
      pixels.push({ x: i, y: -(j + 1), color });
      drawn++;
    }
    if (drawn === 0) pixels.push({ x: Math.floor(cx), y: -(j + 1), color: colors.edge });
  }
  // Licks: in a hard fall, bits of flame tear off and float a gap above the tip.
  if (motion && fall > 0.3) {
    const tipX = Math.floor(0.5 + (sway + input.lean));
    for (let k = 0; k < 2; k++) {
      if (hash01(genome.seed, frame, 31 + k, 5) >= fall * 0.6) continue;
      const gap = 2 + k * 2 + Math.floor(hash01(genome.seed, frame, 41 + k, 5) * 2);
      const dx = Math.round(hash01(genome.seed, frame, 51 + k, 5) * 2 - 1);
      pixels.push({ x: tipX + dx, y: -(height + gap), color: k === 0 ? colors.outer : colors.edge });
    }
  }
  return pixels;
}

const SMOKE = [0x9aa0aa, 0x7d838d, 0x60656e] as const;

/**
 * Smoke curling off a wick whose flame has gone out, relative to the wick tip. A few grey pixels
 * that rise, drift and thin out. One still wisp under reduced motion.
 */
export function wickSmoke(genome: CandleGenome, timeMs: number, reducedMotion: boolean): Pixel[] {
  if (reducedMotion) return [{ x: 0, y: -3, color: SMOKE[1] }, { x: 1, y: -5, color: SMOKE[2] }];
  const pixels: Pixel[] = [];
  const t = timeMs / 1000;
  for (let i = 0; i < 4; i++) {
    const age = (t * 0.5 + i / 4 + genome.flame.phaseA / (Math.PI * 2)) % 1;
    const x = Math.round(Math.sin(age * 6 + i * 2.1 + genome.flame.phaseB) * 2.5 * age);
    pixels.push({ x, y: -2 - Math.round(age * 11), color: SMOKE[Math.min(2, Math.floor(age * 3))]! });
  }
  return pixels;
}

/** Light radius in px to a 0..1 flame size, using the lantern rule's own caps. */
export function flameSizeFromRadius(radiusPx: number, minPx: number, maxPx: number): number {
  if (!(maxPx > minPx)) return 0.5;
  return Math.min(Math.max((radiusPx - minPx) / (maxPx - minPx), 0), 1);
}
