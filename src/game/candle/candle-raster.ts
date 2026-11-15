/**
 * Turns a candle genome and a pose into pixel-art pixels (body, outline, drips, wick).
 *
 * Coordinates are whole art pixels relative to the candle's feet: x = 0 is the centre, y = 0
 * is the ground line and y grows downward (so the body sits at negative y). The view scales
 * art pixels to world pixels; keeping every pixel on a whole-number cell is what makes it
 * read as pixel art. Pure, so tests can check shapes without Phaser.
 */
import type { CandleGenome } from './candle-genome';
import type { BodyShape } from './candle-pose';

export interface Pixel {
  x: number;
  y: number;
  color: number;
}

export interface CandleRaster {
  pixels: Pixel[];
  /** Top of the wick, where the flame's base sits. */
  wickTip: { x: number; y: number };
}

const WICK_COLOR = 0x2b2118;
const OUTLINE_COLOR = 0x241c24;

/** Body size after wax growth, in whole art pixels (never smaller than the genome). */
export function grownSize(genome: CandleGenome, growth: number): { width: number; height: number } {
  const g = Math.max(1, growth);
  return { width: Math.round(genome.width * g), height: Math.round(genome.height * g) };
}

export function rasterCandle(genome: CandleGenome, shape: BodyShape, growth: number, facingLeft: boolean): CandleRaster {
  const size = grownSize(genome, growth);
  const w = Math.max(5, size.width + shape.dWidth);
  const h = Math.max(6, size.height + shape.dHeight);
  const x0 = -Math.floor(w / 2);
  const pixels: Pixel[] = [];
  // Drip columns follow the body when it squashes or grows.
  const dripAt = new Map(genome.drips.map((d) => [Math.round((d.x * (w - 1)) / Math.max(1, genome.width - 1)), d.length]));

  for (let row = 0; row < h; row++) {
    const y = -(row + 1 + shape.lift);
    const fromTop = h - 1 - row;
    for (let col = 0; col < w; col++) {
      const drip = dripAt.get(col);
      const color = fromTop === 0 ? genome.wax.light
        : drip !== undefined && fromTop <= drip ? genome.wax.light
        : col === 0 ? genome.wax.light : col === w - 1 ? genome.wax.shade : genome.wax.base;
      pixels.push({ x: x0 + col, y, color });
    }
    pixels.push({ x: x0 - 1, y, color: OUTLINE_COLOR }, { x: x0 + w, y, color: OUTLINE_COLOR });
  }
  const topY = -(h + 1 + shape.lift);
  for (let col = -1; col <= w; col++) pixels.push({ x: x0 + col, y: topY, color: OUTLINE_COLOR });
  // Leaning bends only the wick: a body step reads as a broken candle at this size.
  const wickX = shape.lean;
  for (let i = 1; i <= genome.wickHeight; i++) pixels.push({ x: wickX, y: topY - i, color: WICK_COLOR });
  const wickTip = { x: wickX, y: topY - genome.wickHeight };

  if (!facingLeft) return { pixels: dedupe(pixels), wickTip };
  // Mirror cell [x, x+1) to [-x-1, -x).
  return { pixels: dedupe(pixels.map((p) => ({ ...p, x: -p.x - 1 }))), wickTip: { x: -wickTip.x - 1, y: wickTip.y } };
}

/** The first pixel in a cell wins, so nothing drawn later can cover the wax body. */
function dedupe(pixels: Pixel[]): Pixel[] {
  const seen = new Map<string, Pixel>();
  for (const p of pixels) {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}
