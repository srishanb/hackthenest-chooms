/**
 * The menu emblem: the player's own candle, small and animated, standing ready with a tall flame.
 *
 * Why here and not in the UI: the candle is game art (genome, poses, flame). main.ts hands this
 * function to the UI as a "draw the emblem into this canvas" callback, so the UI never imports
 * the game. It uses a plain 2D canvas, not Phaser, and stops when the menu unmounts.
 *
 * The loop (3.2 s): the candle breathes with a full flame, then gathers itself (a charge squash)
 * while its flame flares up and burns blue at the base, then springs back. Reduced motion shows
 * one still frame. Pure maths come from the existing candle modules; nothing feeds gameplay.
 */
import { createCandleGenome, type CandleGenome } from './candle-genome';
import { bodyShape, INITIAL_POSE, type PoseTracker } from './candle-pose';
import { rasterCandle } from './candle-raster';
import { faceFor, INITIAL_EXPRESSION, type CandleMood } from './expression';
import { FLAME_FPS, rasterFlame } from './flame';

/**
 * Drawing box in art pixels, sized so the tallest candle in its tallest pose plus the largest
 * flared flame (and its licks) always fit: nothing is ever cut off. Screen px per art px.
 */
export const EMBLEM_W = 28;
export const EMBLEM_H = 46;
const PX = 4;
const LOOP_MS = 3200;
const CHARGE_FROM_MS = 2000;
const RELEASE_AT_MS = 2900;

/** The pose and flame flare at a moment in the loop. Exported for tests. */
export function emblemMoment(timeMs: number): { tracker: PoseTracker; charge01: number; flare01: number } {
  const t = ((timeMs % LOOP_MS) + LOOP_MS) % LOOP_MS;
  if (t < CHARGE_FROM_MS) return { tracker: { ...INITIAL_POSE, pose: 'idle', elapsedMs: t }, charge01: 0, flare01: 0 };
  if (t < RELEASE_AT_MS) {
    const charge01 = (t - CHARGE_FROM_MS) / (RELEASE_AT_MS - CHARGE_FROM_MS);
    return { tracker: { ...INITIAL_POSE, pose: 'charge', elapsedMs: t - CHARGE_FROM_MS }, charge01, flare01: charge01 };
  }
  return { tracker: { ...INITIAL_POSE, pose: 'rise', elapsedMs: t - RELEASE_AT_MS }, charge01: 0, flare01: 1 - (t - RELEASE_AT_MS) / (LOOP_MS - RELEASE_AT_MS) };
}

export interface EmblemPixel {
  x: number;
  y: number;
  color: number;
}

/** Every pixel of the emblem at `timeMs`, in box coordinates (0..EMBLEM_W-1, 0..EMBLEM_H-1). */
export function emblemPixels(genome: CandleGenome, timeMs: number, still: boolean): EmblemPixel[] {
  const { tracker, charge01, flare01 } = emblemMoment(timeMs);
  // The emblem has a face too: content while it waits (it blinks and glances), set while it gathers, glad as it springs.
  const mood: CandleMood = tracker.pose === 'charge' ? 'focused' : tracker.pose === 'rise' ? 'soaring' : 'content';
  const face = faceFor({ ...INITIAL_EXPRESSION, mood, clockMs: timeMs, moodMs: tracker.elapsedMs },
    { pose: tracker.pose, charge01, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: still }, genome.seed);
  const body = rasterCandle(genome, bodyShape(tracker, charge01), 1, false, { face, glow01: 0.8 });
  const flame = rasterFlame(genome, { size01: 1, timeMs, reducedMotion: still, lean: 0, fall01: 0.55 * flare01 });
  const feetX = EMBLEM_W / 2;
  const feetY = EMBLEM_H - 1;
  return [
    ...body.pixels.map((p) => ({ x: feetX + p.x, y: feetY + p.y, color: p.color })),
    ...flame.map((p) => ({ x: feetX + body.wickTip.x + p.x, y: feetY + body.wickTip.y + p.y, color: p.color })),
  ];
}

/** Draw the animated candle into `canvas`. Returns a function that stops the animation. */
export function mountCandleEmblem(canvas: HTMLCanvasElement, seed: number, reducedMotion: () => boolean): () => void {
  canvas.width = EMBLEM_W * PX;
  canvas.height = EMBLEM_H * PX;
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const genome = createCandleGenome(seed);
  let lastFrame = -1;
  let raf = 0;
  const start = performance.now();

  const draw = (now: number): void => {
    const still = reducedMotion();
    const timeMs = still ? 0 : now - start;
    const frame = Math.floor((timeMs / 1000) * FLAME_FPS);
    if (frame !== lastFrame) {
      lastFrame = frame;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of emblemPixels(genome, timeMs, still)) {
        context.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
        context.fillRect(p.x * PX, p.y * PX, PX, PX);
      }
    }
    if (!still) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
