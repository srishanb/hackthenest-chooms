/**
 * The menu emblem: the player's own candle, small and animated, standing ready with a tall flame.
 *
 * Why here and not in the UI: the candle is game art (genome, poses, flame). main.ts hands this
 * function to the UI as a "draw the emblem into this canvas" callback, so the UI never imports
 * the game. It uses a plain 2D canvas, not Phaser, and stops when the menu unmounts.
 *
 * The loop (5.2 s): the candle waits (breathing, blinking, glancing about), gathers itself (a
 * charge squash, its flame drawn into a thin hot point), hops, lands with a squash and looks
 * pleased with itself, sparkles and all, before it settles again. Reduced motion shows one still
 * frame. Pure maths come from the existing candle modules; nothing feeds gameplay.
 */
import { createCandleGenome, type CandleGenome } from './candle-genome';
import { bodyShape, INITIAL_POSE, type PoseTracker } from './candle-pose';
import { rasterCandle } from './candle-raster';
import { emotePixels } from './emotes';
import { faceFor, INITIAL_EXPRESSION, type CandleMood } from './expression';
import { FLAME_FPS, rasterFlame } from './flame';

/**
 * Drawing box in art pixels, sized so the tallest candle at the top of its hop, with the largest
 * flared flame (and its licks) and the sparkles beside it, always fits: nothing is ever cut off.
 * Screen px per art px.
 */
export const EMBLEM_W = 36;
export const EMBLEM_H = 54;
const PX = 4;
/** The loop: wait, gather, hop, land, look pleased, settle. */
export const EMBLEM_LOOP_MS = 5200;
const CHARGE_FROM_MS = 2000;
const RELEASE_AT_MS = 2900;
const LAND_AT_MS = 3380;
const PLEASED_FROM_MS = 3560;
const SETTLE_AT_MS = 4700;
/** How high the hop goes, in art px. */
const HOP_PX = 6;

export interface EmblemMoment {
  tracker: PoseTracker;
  charge01: number;
  flare01: number;
  /** How far the candle is off the ground, in art px. */
  lift: number;
  mood: CandleMood;
  /** Time in the mood, for the blink rhythm and the sparkles. */
  moodMs: number;
}

/** The pose, hop height, mood and flame flare at a moment in the loop. Exported for tests. */
export function emblemMoment(timeMs: number): EmblemMoment {
  const t = ((timeMs % EMBLEM_LOOP_MS) + EMBLEM_LOOP_MS) % EMBLEM_LOOP_MS;
  const resting = { charge01: 0, flare01: 0, lift: 0 };
  if (t < CHARGE_FROM_MS) return { ...resting, tracker: { ...INITIAL_POSE, pose: 'idle', elapsedMs: t }, mood: 'content', moodMs: t };
  if (t < RELEASE_AT_MS) {
    const charge01 = (t - CHARGE_FROM_MS) / (RELEASE_AT_MS - CHARGE_FROM_MS);
    return { tracker: { ...INITIAL_POSE, pose: 'charge', elapsedMs: t - CHARGE_FROM_MS }, charge01, flare01: charge01, lift: 0, mood: 'focused', moodMs: t - CHARGE_FROM_MS };
  }
  if (t < LAND_AT_MS) {
    // A real little hop: up and down along an arc, rising first and falling after the top.
    const u = (t - RELEASE_AT_MS) / (LAND_AT_MS - RELEASE_AT_MS);
    return { tracker: { ...INITIAL_POSE, pose: u < 0.5 ? 'rise' : 'fall', elapsedMs: t - RELEASE_AT_MS }, charge01: 0, flare01: 1 - u,
      lift: Math.round(HOP_PX * 4 * u * (1 - u)), mood: 'soaring', moodMs: t - RELEASE_AT_MS };
  }
  if (t < PLEASED_FROM_MS) return { ...resting, tracker: { ...INITIAL_POSE, pose: 'land', elapsedMs: t - LAND_AT_MS, impact01: 0.5 }, mood: 'delighted', moodMs: t - LAND_AT_MS };
  // Pleased with itself for a moment (sparkles), then back to waiting.
  if (t < SETTLE_AT_MS) return { ...resting, tracker: { ...INITIAL_POSE, pose: 'idle', elapsedMs: t - PLEASED_FROM_MS }, mood: 'delighted', moodMs: t - LAND_AT_MS };
  return { ...resting, tracker: { ...INITIAL_POSE, pose: 'idle', elapsedMs: t - PLEASED_FROM_MS }, mood: 'content', moodMs: t };
}

export interface EmblemPixel {
  x: number;
  y: number;
  color: number;
}

/** Every pixel of the emblem at `timeMs`, in box coordinates (0..EMBLEM_W-1, 0..EMBLEM_H-1). */
export function emblemPixels(genome: CandleGenome, timeMs: number, still: boolean, eager = false): EmblemPixel[] {
  const { tracker, charge01, flare01, lift, mood, moodMs } = emblemMoment(timeMs);
  // The emblem has a face too: content while it waits (it blinks and glances), set while it gathers, glad as it hops.
  const plain = faceFor({ ...INITIAL_EXPRESSION, mood, clockMs: timeMs, moodMs },
    { pose: tracker.pose, charge01, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: still }, genome.seed);
  // Eager: while Play has the pointer or the focus, a waiting candle grins and looks toward the menu.
  const face = eager && mood === 'content' ? { ...plain, mouth: 'grin' as const, gazeX: 1 as const, gazeY: 0 as const, blush: true } : plain;
  const body = rasterCandle(genome, bodyShape(tracker, charge01), 1, false, { face, glow01: 0.8 });
  const flame = rasterFlame(genome, { size01: 1, timeMs, reducedMotion: still, lean: 0, fall01: 0.55 * flare01, gather01: charge01 });
  const feetX = EMBLEM_W / 2;
  const feetY = EMBLEM_H - 1 - lift;
  const tipX = feetX + body.wickTip.x;
  const tipY = feetY + body.wickTip.y;
  return [
    ...body.pixels.map((p) => ({ x: feetX + p.x, y: feetY + p.y, color: p.color })),
    ...flame.map((p) => ({ x: tipX + p.x, y: tipY + p.y, color: p.color })),
    // The same sparkles the hero shows when it is delighted.
    ...emotePixels(mood, moodMs, still).map((p) => ({ x: tipX + 6 + p.x, y: tipY + p.y, color: p.color })),
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
  /** When the canvas was last asked whether it is on screen, and the answer. */
  let checkedTick = -1;
  let visible = false;
  let lastEager = false;
  let raf = 0;
  const start = performance.now();

  const draw = (now: number): void => {
    const still = reducedMotion();
    const timeMs = still ? 0 : now - start;
    const frame = Math.floor((timeMs / 1000) * FLAME_FPS);
    // The menu marks the canvas while Play has the pointer or the focus (see start-menu.ts); nothing else is shared.
    const eager = canvas.dataset.eager === 'true';
    // The menu is hidden for the whole run: skip the drawing then (measured at 12 redraws a second for
    // nothing). Visibility is looked up once per flame frame (four times a second under reduced motion),
    // so the candle draws again within a moment of the menu coming back.
    const tick = still ? Math.floor(now / 250) : frame;
    if (tick !== checkedTick) {
      checkedTick = tick;
      visible = canvas.getClientRects().length > 0;
    }
    if (visible && (frame !== lastFrame || eager !== lastEager)) {
      lastFrame = frame;
      lastEager = eager;
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of emblemPixels(genome, timeMs, still, eager)) {
        context.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
        context.fillRect(p.x * PX, p.y * PX, PX, PX);
      }
    }
    // The loop keeps ticking under reduced motion too (it draws nothing new), so the candle moves again
    // if the player turns reduced motion off without reloading.
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}
