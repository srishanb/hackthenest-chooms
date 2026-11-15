/**
 * The compass centre: a small ball of flaming wax, drawn from the player's own candle colours.
 *
 * Why here and not in the UI: it reuses the candle's genome and procedural flame, which are game
 * code. main.ts hands the HUD a "draw the wax ball into this canvas" callback, so the UI never
 * imports the game (the same pattern as the menu emblem).
 *
 * The ball is a shaded pixel circle (light from the top left, an outline, one drip). Its flame
 * burns tall while an ember is placed and shrinks to a low flicker when none is, so it also tells
 * the player whether the compass has anything to point at. Reduced motion shows a still frame.
 */
import { createCandleGenome, scaleColor, type CandleGenome } from './candle-genome';
import { FLAME_FPS, rasterFlame } from './flame';

/** Drawing box in art pixels (tall enough for the biggest flame), and screen px per art px. */
export const BALL_W = 16;
export const BALL_H = 26;
const PX = 4;
/** Ball radius in art pixels; its centre sits low in the box so the flame has room above. */
const RADIUS = 5;
const OUTLINE = 0x241c24;

export interface BallPixel {
  x: number;
  y: number;
  color: number;
}

/** Every pixel of the wax ball and its flame at `timeMs`, in box coordinates. */
export function waxBallPixels(genome: CandleGenome, timeMs: number, lit: boolean, still: boolean): BallPixel[] {
  const cx = BALL_W / 2;
  const cy = BALL_H - RADIUS - 3;
  const pixels: BallPixel[] = [];
  for (let y = -RADIUS - 1; y <= RADIUS + 1; y++) {
    for (let x = -RADIUS - 1; x <= RADIUS + 1; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > RADIUS + 0.9) continue;
      // Outline ring, then shading by how far the cell faces the top-left light.
      const light = (-(x + 0.5) - (y + 0.5)) / (RADIUS * 1.4);
      const color = d > RADIUS - 0.1 ? OUTLINE
        : light > 0.45 ? genome.wax.light : light < -0.35 ? genome.wax.shade : genome.wax.base;
      pixels.push({ x: cx + x, y: cy + y, color });
    }
  }
  // A highlight glint and one drip running down the lower right.
  pixels.push({ x: cx - 2, y: cy - 3, color: scaleColor(genome.wax.light, 1.1) });
  for (let i = 0; i < 2; i++) pixels.push({ x: cx + 2, y: cy + RADIUS + 1 + i, color: genome.wax.light });

  const flame = rasterFlame(genome, { size01: lit ? 0.75 : 0.05, timeMs, reducedMotion: still, lean: 0 });
  const topY = cy - RADIUS - 1;
  for (const p of flame) pixels.push({ x: cx - 1 + p.x, y: topY + p.y, color: p.color });
  return pixels;
}

/** Draw the animated wax ball into `canvas`. Returns a function that stops the animation. */
export function mountWaxBall(canvas: HTMLCanvasElement, seed: number, lit: () => boolean, reducedMotion: () => boolean): () => void {
  canvas.width = BALL_W * PX;
  canvas.height = BALL_H * PX;
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const genome = createCandleGenome(seed);
  let drawnKey = '';
  let raf = 0;
  const start = performance.now();
  const draw = (now: number): void => {
    const still = reducedMotion();
    const timeMs = still ? 0 : now - start;
    const isLit = lit();
    const key = `${Math.floor((timeMs / 1000) * FLAME_FPS)}|${isLit}|${still}`;
    if (key !== drawnKey) {
      drawnKey = key;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of waxBallPixels(genome, timeMs, isLit, still)) {
        context.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
        context.fillRect(p.x * PX, p.y * PX, PX, PX);
      }
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
