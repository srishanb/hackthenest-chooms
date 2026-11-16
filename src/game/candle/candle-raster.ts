/**
 * Turns a candle genome and a pose into pixel-art pixels (body, outline, drips, wick, face).
 *
 * Coordinates are whole art pixels relative to the candle's feet: x = 0 is the centre, y = 0
 * is the ground line and y grows downward (so the body sits at negative y). The view scales
 * art pixels to world pixels; keeping every pixel on a whole-number cell is what makes it
 * read as pixel art. Pure, so tests can check shapes without Phaser.
 *
 * What gives the body its detail, from the top down: rounded shoulders, a rim around a pool of
 * melted wax where the wick stands, warm light from the flame on the upper rows, a face
 * (face.ts), drips that end in a bead, four tones across the width so it reads as round, and a
 * darker row where it meets the ground.
 */
import { scaleColor, type CandleGenome } from './candle-genome';
import type { BodyShape } from './candle-pose';
import type { CandleFace } from './expression';
import { facePixels } from './face';

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

/** Optional extras drawn on the body. Without them the candle is a plain, faceless one. */
export interface BodyLook {
  face?: CandleFace;
  /** 0..1 how strongly the flame lights the top of the body. */
  glow01?: number;
}

const WICK_COLOR = 0x2b2118;
const OUTLINE_COLOR = 0x241c24;
/** How far down the body the flame's warm light reaches, and how strong it is on each row. */
const GLOW_ROWS = [0.42, 0.26, 0.12];

/** Blend two RGB colours; `t` = 0 gives `a`, 1 gives `b`. */
function mix(a: number, b: number, t: number): number {
  const k = Math.min(Math.max(t, 0), 1);
  const channel = (shift: number): number => Math.round(((a >> shift) & 0xff) * (1 - k) + ((b >> shift) & 0xff) * k);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** Body size after wax growth, in whole art pixels (never smaller than the genome). */
export function grownSize(genome: CandleGenome, growth: number): { width: number; height: number } {
  const g = Math.max(1, growth);
  return { width: Math.round(genome.width * g), height: Math.round(genome.height * g) };
}

export function rasterCandle(genome: CandleGenome, shape: BodyShape, growth: number, facingLeft: boolean, look: BodyLook = {}): CandleRaster {
  const size = grownSize(genome, growth);
  const w = Math.max(5, size.width + shape.dWidth);
  const h = Math.max(6, size.height + shape.dHeight);
  const x0 = -Math.floor(w / 2);
  const topY = -(h + shape.lift);
  const glow = Math.min(Math.max(look.glow01 ?? 0, 0), 1);
  const { base, shade, light } = genome.wax;
  const midShade = scaleColor(base, 0.9);
  const pool = mix(scaleColor(base, 0.92), genome.flame.colors.inner, 0.3 + 0.25 * glow);
  const pixels: Pixel[] = [];
  // Drip columns follow the body when it squashes or grows.
  const dripAt = new Map(genome.drips.map((d) => [Math.round((d.x * (w - 1)) / Math.max(1, genome.width - 1)), d.length]));
  // The two top corners are cut off, so the shoulders read as rounded.
  const inside = (col: number, fromTop: number): boolean =>
    col >= 0 && col < w && fromTop >= 0 && fromTop < h && !(fromTop === 0 && (col === 0 || col === w - 1));

  // The face goes in first: the first pixel in a cell wins (see dedupe), so wax never covers it.
  if (look.face) pixels.push(...facePixels(genome, look.face, { x0, width: w, topY, height: h }));

  for (let fromTop = 0; fromTop < h; fromTop++) {
    const y = topY + fromTop;
    for (let col = 0; col < w; col++) {
      if (!inside(col, fromTop)) continue;
      const drip = dripAt.get(col);
      let color = col === 0 ? light : col === w - 1 ? shade : col === w - 2 ? midShade : base;
      if (fromTop === 0) color = col >= 2 && col <= w - 3 ? pool : light;
      else if (drip !== undefined && fromTop <= drip) color = light;
      // A bead at the end of each drip: one darker pixel under the pale streak.
      else if (drip !== undefined && fromTop === drip + 1) color = scaleColor(base, 0.84);
      const glowRow = GLOW_ROWS[fromTop - 1];
      if (glowRow !== undefined && glow > 0) color = mix(color, genome.flame.colors.inner, glowRow * glow);
      // Where the candle meets the ground it is a little darker.
      if (fromTop === h - 1) color = scaleColor(color, 0.88);
      pixels.push({ x: x0 + col, y, color });
    }
  }
  // Outline: every empty cell beside or above the body.
  for (let fromTop = 0; fromTop < h; fromTop++) {
    for (let col = 0; col < w; col++) {
      if (!inside(col, fromTop)) continue;
      for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1]] as const) {
        if (!inside(col + dc, fromTop + dr)) pixels.push({ x: x0 + col + dc, y: topY + fromTop + dr, color: OUTLINE_COLOR });
      }
    }
  }
  // Leaning bends only the wick: a body step reads as a broken candle at this size.
  const wickX = shape.lean;
  const outlineTop = topY - 1;
  for (let i = 1; i <= genome.wickHeight; i++) pixels.push({ x: wickX, y: outlineTop - i, color: WICK_COLOR });
  const wickTip = { x: wickX, y: outlineTop - genome.wickHeight };

  if (!facingLeft) return { pixels: dedupe(pixels), wickTip };
  // Mirror cell [x, x+1) to [-x-1, -x).
  return { pixels: dedupe(pixels.map((p) => ({ ...p, x: -p.x - 1 }))), wickTip: { x: -wickTip.x - 1, y: wickTip.y } };
}

/** The first pixel in a cell wins, so nothing drawn later can cover what is already there. */
function dedupe(pixels: Pixel[]): Pixel[] {
  const seen = new Map<string, Pixel>();
  for (const p of pixels) {
    const key = `${p.x},${p.y}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}
