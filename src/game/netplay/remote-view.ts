/**
 * Draws the other player's candle and, when it is off screen, a small marker at the screen edge pointing at it.
 *
 * The candle is the same procedural candle as the player's own (candle-view.ts), drawn from the seed the other
 * player sends, so it looks like their candle; if both happen to have the same seed, the other one is drawn from
 * a scrambled seed, so the two never look alike. It fades out when the other player leaves. The marker is a
 * triangle drawn by code on the 2x art grid (`snapToGrid`), fixed to the screen, pointing toward the other candle.
 * Drawing only: nothing here changes either candle.
 */
import type * as Phaser from 'phaser';
import type { GameConfig } from '../../shared/contracts/config';
import { createCandleView, type CandleLook } from '../candle/candle-view';
import { PIXEL_GRID, snapToGrid } from '../forest/pixel-grid-snap';
import type { PlayerState } from '../player/types';
import type { BodyState } from './protocol';

/** Above the darkness and the ledge outlines, like the player's own candle (210); the marker sits above both. */
const MARKER_DEPTH = 290;
/** The marker's size and how far inside the screen edge it sits (world px; the camera does not zoom). */
const MARKER_PX = 16;
const MARGIN_PX = 14;
const MARKER_COLOR = 0xffd98a;
const MARKER_EDGE = 0x1a1206;
/** XOR'd into a seed that equals the player's own, so the other candle always looks different. */
const SEED_SCRAMBLE = 0x5bd1e995;

export interface RemoteView {
  /** Draw the other candle as `body`, faded to `alpha`, and the marker if it is off the camera's view. */
  update(body: BodyState | null, alpha: number, ownSeed: number, camera: Phaser.Cameras.Scene2D.Camera, deltaMs: number, paused: boolean, reducedMotion: boolean): void;
  destroy(): void;
}

/** The seed to draw the other candle with: its own, unless it equals this player's. */
export const remoteSeed = (theirs: number, mine: number): number => (theirs === mine ? (theirs ^ SEED_SCRAMBLE) >>> 0 : theirs);

/** Where on the screen's edge the marker goes for a candle at screen point (x, y), and which way it points. */
export function edgeMarker(x: number, y: number, width: number, height: number): { x: number; y: number; angle: number } | null {
  if (x >= 0 && x <= width && y >= 0 && y <= height) return null;
  const cx = width / 2, cy = height / 2;
  const dx = x - cx, dy = y - cy;
  // Scale the direction until it touches the inner margin rectangle.
  const sx = dx !== 0 ? (width / 2 - MARGIN_PX) / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const sy = dy !== 0 ? (height / 2 - MARGIN_PX) / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s, angle: Math.atan2(dy, dx) };
}

/**
 * The marker as art pixels: a dark round backing and a bright triangle pointing along `angle`, each pixel a
 * `PIXEL_GRID` square whose corner is on the grid. Pure, so it is tested without a game.
 */
export function markerPixels(spot: { x: number; y: number; angle: number }): { x: number; y: number; fill: boolean }[] {
  const cells: { x: number; y: number; fill: boolean }[] = [];
  const r = MARKER_PX * 0.75;
  const corner = (turn: number, reach: number) => ({ x: Math.cos(spot.angle + turn) * reach, y: Math.sin(spot.angle + turn) * reach });
  const [tip, left, right] = [corner(0, MARKER_PX * 0.7), corner(2.5, MARKER_PX * 0.45), corner(-2.5, MARKER_PX * 0.45)];
  const side = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  const ox = snapToGrid(spot.x), oy = snapToGrid(spot.y);
  for (let gy = -r; gy <= r; gy += PIXEL_GRID) {
    for (let gx = -r; gx <= r; gx += PIXEL_GRID) {
      const x = snapToGrid(gx), y = snapToGrid(gy);
      const centre = { x: x + PIXEL_GRID / 2, y: y + PIXEL_GRID / 2 };
      if (Math.hypot(centre.x, centre.y) > r) continue;
      const d1 = side(centre, tip, left), d2 = side(centre, left, right), d3 = side(centre, right, tip);
      const inside = (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
      cells.push({ x: ox + x, y: oy + y, fill: inside });
    }
  }
  return cells;
}

export function createRemoteView(scene: Phaser.Scene, gameConfig: GameConfig, flame: { minRadiusPx: number; maxRadiusPx: number }): RemoteView {
  const body = gameConfig.player;
  let candle: ReturnType<typeof createCandleView> | null = null;
  let drawnSeed = -1;
  const marker = scene.add.graphics().setScrollFactor(0).setDepth(MARKER_DEPTH).setVisible(false);

  return {
    update(state, alpha, ownSeed, camera, deltaMs, paused, reducedMotion) {
      if (!state || alpha <= 0) { candle?.setAlpha(0); marker.setVisible(false); return; }
      const seed = remoteSeed(state.candleSeed, ownSeed);
      if (!candle) candle = createCandleView(scene, body.height, seed);
      else if (seed !== drawnSeed) candle.reseed(seed);
      drawnSeed = seed;
      const pose: PlayerState = { x: state.x, y: state.y, vx: state.vx, vy: state.vy, grounded: state.grounded, platformId: state.platformId,
        charging: state.charging, chargeMs: state.charge01 * gameConfig.jump.maxChargeMs, jumpLatch: false, launchVx: state.vx,
        takeoffBottomY: state.y + body.height / 2 };
      const look: CandleLook = { radiusPx: flame.minRadiusPx + (flame.maxRadiusPx - flame.minRadiusPx) * state.fuel01,
        minRadiusPx: flame.minRadiusPx, maxRadiusPx: flame.maxRadiusPx, growth: 1, charge01: state.charge01, aim: state.aim,
        reducedMotion, fuel01: state.fuel01, ember: state.fuel01 <= 0, spent01: state.out ? 1 : 0 };
      candle.update(pose, deltaMs, paused, look);
      candle.setAlpha(alpha);
      const spot = edgeMarker(state.x - camera.scrollX, state.y - camera.scrollY, camera.width, camera.height);
      marker.setVisible(spot !== null).setAlpha(alpha);
      if (!spot) return;
      marker.clear();
      for (const cell of markerPixels(spot)) {
        marker.fillStyle(cell.fill ? MARKER_COLOR : MARKER_EDGE, cell.fill ? 1 : 0.85).fillRect(cell.x, cell.y, PIXEL_GRID, PIXEL_GRID);
      }
    },
    destroy() { candle?.destroy(); marker.destroy(); },
  };
}
