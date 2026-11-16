/**
 * The candle of a finished run, for the end screen: its close-up with the flame out.
 *
 * Why here and not in the UI: the candle is game art. main.ts hands `mountRunCandle` to the UI as
 * a "draw this run's candle into this canvas" callback, like the menu emblem, so the UI never
 * imports the game. It uses a plain 2D canvas and stops when the end screen closes.
 *
 * The picture is the same close-up the portrait shows (close-up.ts) at almost no light: cold wax,
 * the tired face, a glowing wick and smoke. Under reduced motion it is one still frame.
 */
import { createCandleGenome, type CandleGenome } from './candle-genome';
import { CLOSE_UP_RADIUS, rasterCloseUp } from './close-up';
import { faceFor, INITIAL_EXPRESSION } from './expression';
import { FLAME_FPS } from './flame';
import type { Portrait } from './portrait';

/** Screen px per close-up pixel on the end screen. */
const PX = 2;
/** The light left in the picture: low enough that the flame is nearly always out and the wax is dim. */
const SPENT_STRENGTH = 0.03;

/** The spent candle at `timeMs`. Pure, so the look can be tested without a canvas. */
export function spentCandle(genome: CandleGenome, timeMs: number, still: boolean): Portrait {
  const face = faceFor({ ...INITIAL_EXPRESSION, mood: 'fading', clockMs: timeMs },
    { pose: 'idle', charge01: 0, fall01: 0, aim: 0, facingLeft: false, fuel01: 0, lit: false, reducedMotion: still }, genome.seed);
  return rasterCloseUp(genome, { strength01: SPENT_STRENGTH, timeMs, reducedMotion: still, growth: 1, face });
}

/** Draw the spent candle for `seed` into `canvas`. Returns a function that stops the animation. */
export function mountRunCandle(canvas: HTMLCanvasElement, seed: number, reducedMotion: () => boolean): () => void {
  const size = CLOSE_UP_RADIUS * 2 * PX;
  canvas.width = size;
  canvas.height = size;
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
      context.clearRect(0, 0, size, size);
      for (const p of spentCandle(genome, (frame * 1000) / FLAME_FPS, still).pixels) {
        context.globalAlpha = p.alpha;
        context.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
        context.fillRect(size / 2 + p.x * PX, size / 2 + p.y * PX, PX, PX);
      }
      context.globalAlpha = 1;
    }
    if (!still) raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
