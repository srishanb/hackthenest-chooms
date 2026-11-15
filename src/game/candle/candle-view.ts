/**
 * Draws the procedural candle in the scene: same poses, timing, depth and feet line as the
 * Ruby sprite it replaces (ruby-view.ts), so the scene swaps one for the other in one line.
 *
 * How: one Graphics object at depth 210 holds the candle as filled squares, one per art
 * pixel (FOREST_CONFIG.pixelScale world px each). It moves with setPosition every frame and
 * redraws only when the picture changes (pose frame, flame frame, facing, size or growth).
 * Reads only player state, the light radius and the wax growth: it never feeds movement.
 */
import type * as Phaser from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';
import type { PlayerState } from '../player/types';
import { createCandleGenome, type CandleGenome } from './candle-genome';
import { bodyShape, INITIAL_POSE, poseFrame, stepPose, type PoseTracker } from './candle-pose';
import { rasterCandle } from './candle-raster';
import { FLAME_FPS, flameSizeFromRadius, rasterFlame } from './flame';

/** The light, the wax growth and the settings the candle draws from this frame. */
export interface CandleLook {
  radiusPx: number;
  /** The lantern rule's caps, so the flame spans its full range. */
  minRadiusPx: number;
  maxRadiusPx: number;
  /** 1 with no wax; see growth.ts. */
  growth: number;
  /** 0..1 of a full jump charge. */
  charge01: number;
  reducedMotion: boolean;
}

/** Size steps for the flame: enough to look smooth in pixel art, few enough to redraw rarely. */
const SIZE_STEPS = 24;
const DEPTH = 210;

export function createCandleView(scene: Phaser.Scene, bodyHeight: number, seed: number) {
  const graphics = scene.add.graphics().setDepth(DEPTH);
  const px = FOREST_CONFIG.pixelScale;
  let genome: CandleGenome = createCandleGenome(seed);
  let tracker: PoseTracker = INITIAL_POSE;
  let clockMs = 0;
  let drawnKey = '';

  return {
    /** A new candle (a new run). */
    reseed(next: number): void {
      genome = createCandleGenome(next);
      tracker = INITIAL_POSE;
      drawnKey = '';
    },
    seed: (): number => genome.seed,
    update(state: PlayerState, deltaMs: number, paused: boolean, look: CandleLook): void {
      tracker = stepPose(tracker, state, deltaMs, paused);
      if (!paused) clockMs += Math.max(0, deltaMs);
      graphics.setPosition(state.x, state.y + bodyHeight / 2);

      const size01 = Math.round(flameSizeFromRadius(look.radiusPx, look.minRadiusPx, look.maxRadiusPx) * SIZE_STEPS) / SIZE_STEPS;
      const flameFrame = look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS);
      const shape = bodyShape(tracker, look.charge01);
      const trail = Math.sign(state.vx) * Math.min(2, Math.round(Math.abs(state.vx) / 110));
      const key = `${tracker.pose}|${poseFrame(tracker)}|${JSON.stringify(shape)}|${tracker.facingLeft}|${look.growth}|${size01}|${flameFrame}|${trail}`;
      if (key === drawnKey) return;
      drawnKey = key;

      const body = rasterCandle(genome, shape, look.growth, tracker.facingLeft);
      // The flame is drawn from the frame's own time so it matches the frame index above.
      const flame = rasterFlame(genome, { size01, timeMs: (flameFrame * 1000) / FLAME_FPS, reducedMotion: look.reducedMotion, vx: trail * 110 });
      graphics.clear();
      for (const p of body.pixels) {
        graphics.fillStyle(p.color, 1);
        graphics.fillRect(p.x * px, p.y * px, px, px);
      }
      for (const p of flame) {
        graphics.fillStyle(p.color, 1);
        graphics.fillRect((body.wickTip.x + p.x) * px, (body.wickTip.y + p.y) * px, px, px);
      }
    },
    destroy(): void { graphics.destroy(); },
  };
}
