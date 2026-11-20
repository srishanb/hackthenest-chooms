/**
 * Where the moving strip of a waterfall goes on screen, and how fast it runs.
 *
 * Why apart from the view: this is the arithmetic that must agree with the painter (water.ts), so it
 * is a pure function that a test can check. Every position is a whole multiple of the art pixel
 * (`pixelScale` screen pixels), and is rounded the same way as the chunk pictures (backdrop-view.ts),
 * so a strip lies exactly on the water the painter drew and never on half an art pixel.
 * Pure: plain numbers in, plain numbers out, no Phaser.
 */
import { BACKDROP_CONFIG, type BackdropConfig } from '../../config/backdrop.config';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';
import type { Waterfall } from './chunk-types';

/** Round a screen position to a whole art pixel. */
export const snapToArt = (screenPx: number, config: BackdropConfig = BACKDROP_CONFIG): number =>
  Math.round(screenPx / config.pixelScale) * config.pixelScale;

/** How fast a fall's water runs: 1 when warm, slowing toward a standstill, 0 at and above the freeze cold. */
export function fallPace(cold01: number, config: BackdropConfig = BACKDROP_CONFIG): number {
  return Math.max(0, Math.min(1, 1 - cold01 / config.cold.freezeAt01));
}

/** The sheet frame to show `clockMs` into the run at `pace` (0 stands on frame 0). */
export function fallFrame(clockMs: number, pace: number, config: BackdropConfig = BACKDROP_CONFIG): number {
  return Math.floor(clockMs * pace / config.waterfallView.frameMs) % WILDLIFE_CONFIG.waterfall.frames;
}

/** A strip's place in screen pixels: its middle `x`, top `y`, size, and sheet frame. */
export interface StripRect { x: number; y: number; width: number; length: number; frame: number }

/**
 * The rectangle of `fall`'s strip when its layer is scrolled `scroll` screen pixels: the same columns
 * water.ts paints (`cells` wide from the rounded left edge) and the rows below the lip.
 */
export function stripRect(fall: Waterfall, scroll: number, clockMs: number, out: StripRect, config: BackdropConfig = BACKDROP_CONFIG): StripRect {
  const ps = config.pixelScale;
  const cells = Math.max(2, Math.round(fall.width)), left = Math.round(fall.x - fall.width / 2);
  out.x = (left + cells / 2) * ps;
  out.y = snapToArt(fall.topY * ps - scroll, config) + ps;
  out.width = cells * ps;
  out.length = fall.length * ps - ps;
  out.frame = fallFrame(clockMs, fallPace(fall.cold01, config), config);
  return out;
}
