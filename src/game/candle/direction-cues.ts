/**
 * Cues that show which way the candle is jumping, without bending its body.
 *
 * Why: a jump's direction is set by the key held while charging, but the body only squashes,
 * so the aim was invisible until launch. Three cues fix that, all outside the body shape:
 *   1. While charging, the candle turns to face the held direction (candle-pose.ts), and the
 *      wick and flame lean that way, more the longer the charge.
 *   2. In the air, the flame streams behind the movement (up to 3 art px at the tip).
 *   3. In the air, a few sparks trail behind along the flight path (none with reduced motion).
 * Pure and visual only: read from player state and held keys, never fed back into movement.
 */
import type { CandleGenome } from './candle-genome';
import type { Pixel } from './candle-raster';

export type Aim = -1 | 0 | 1;

export interface CueInput {
  charging: boolean;
  /** 0..1 of a full jump charge. */
  charge01: number;
  /** Held direction: -1 left, 0 none, 1 right. */
  aim: Aim;
  grounded: boolean;
  vx: number;
  vy: number;
}

/** Below this speed (px/s) a moving candle shows no trail. */
const TRAIL_MIN_SPEED = 40;
/** Sparks appear only in fast flight. */
const SPARK_MIN_SPEED = 150;

/** Signed flame-tip offset in art px (positive is right, screen space). */
export function flameLean(input: CueInput): number {
  if (input.charging) return input.aim * (1 + Math.round(2 * Math.min(Math.max(input.charge01, 0), 1)));
  const speed = Math.abs(input.vx);
  if (speed < TRAIL_MIN_SPEED) return 0;
  const cap = input.grounded ? 2 : 3;
  return -Math.sign(input.vx) * Math.min(cap, Math.round(speed / 110));
}

/** Wick tilt toward the facing side, in art px (0 or 1): aiming, running or flying sideways. */
export function wickLean(input: CueInput): number {
  if (input.charging) return input.aim !== 0 && input.charge01 >= 0.3 ? 1 : 0;
  return Math.abs(input.vx) >= TRAIL_MIN_SPEED ? 1 : 0;
}

function hash01(seed: number, frame: number, k: number): number {
  let h = (seed ^ Math.imul(frame, 2654435761) ^ Math.imul(k, 1597334677)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Up to three sparks behind the flight path, relative to the wick tip (y grows downward). */
export function flightSparks(genome: CandleGenome, input: CueInput, flameFrame: number, reducedMotion: boolean): Pixel[] {
  const speed = Math.hypot(input.vx, input.vy);
  if (reducedMotion || input.grounded || speed < SPARK_MIN_SPEED) return [];
  const bx = -input.vx / speed;
  const by = -input.vy / speed;
  const sparks: Pixel[] = [];
  for (let k = 1; k <= 3; k++) {
    // Farther sparks show less often, so the tail thins out and twinkles.
    if (hash01(genome.seed, flameFrame, k) > 0.85 - k * 0.15) continue;
    const jitter = Math.round(hash01(genome.seed, flameFrame, k + 10) * 2 - 1);
    const distance = 2 + k * 3;
    sparks.push({
      x: Math.round(bx * distance) + (Math.abs(by) > Math.abs(bx) ? jitter : 0),
      y: Math.round(by * distance) - 2 + (Math.abs(bx) >= Math.abs(by) ? jitter : 0),
      color: k === 1 ? genome.flame.colors.outer : genome.flame.colors.edge,
    });
  }
  return sparks;
}
