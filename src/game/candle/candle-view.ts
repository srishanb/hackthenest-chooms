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
import { type Aim, flameLean, flightSparks, wickLean } from './direction-cues';
import { fallIntensity, FLAME_FPS, flameSizeFromRadius, flickerRate, rasterFlame } from './flame';

/** The light, the wax growth and the settings the candle draws from this frame. */
export interface CandleLook {
  ember?: boolean;
  corruptedEmber?: boolean;
  radiusPx: number;
  /** The lantern rule's caps, so the flame spans its full range. */
  minRadiusPx: number;
  maxRadiusPx: number;
  /** 1 with no wax; see growth.ts. */
  growth: number;
  /** 0..1 of a full jump charge. */
  charge01: number;
  /** Direction held this step (-1, 0, 1): shows where a charged jump will go. */
  aim: Aim;
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
    /** The current candle's genome, so the portrait draws the same candle. */
    genome: (): CandleGenome => genome,
    update(state: PlayerState, deltaMs: number, paused: boolean, look: CandleLook): void {
      tracker = stepPose(tracker, { ...state, aim: look.aim }, deltaMs, paused);
      // Falling feeds the flame air: its flicker clock runs up to 2.5x faster (flame.ts).
      const fall01 = Math.round(fallIntensity(state.grounded, state.vy) * 10) / 10;
      if (!paused) clockMs += Math.max(0, deltaMs) * flickerRate(fall01);
      graphics.setPosition(state.x, state.y + bodyHeight / 2);

      const size01 = Math.round(flameSizeFromRadius(look.radiusPx, look.minRadiusPx, look.maxRadiusPx) * SIZE_STEPS) / SIZE_STEPS;
      const flameFrame = look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS);
      const cue = { charging: state.charging, charge01: look.charge01, aim: look.aim, grounded: state.grounded, vx: state.vx, vy: state.vy };
      // Direction cues never bend the body: only the wick tilts, the flame leans and sparks trail.
      const shape = { ...bodyShape(tracker, look.charge01), lean: wickLean(cue) };
      const lean = flameLean(cue);
      const sparks = flightSparks(genome, cue, flameFrame, look.reducedMotion);
      const key = `${look.ember}|${look.corruptedEmber}|${tracker.pose}|${poseFrame(tracker)}|${JSON.stringify(shape)}|${tracker.facingLeft}|${look.growth}|${size01}|${flameFrame}|${lean}|${fall01}|${JSON.stringify(sparks)}`;
      if (key === drawnKey) return;
      drawnKey = key;

      const body = rasterCandle(genome, shape, look.growth, tracker.facingLeft);
      // The flame is drawn from the frame's own time so it matches the frame index above.
      const flame = rasterFlame(genome, { size01, timeMs: (flameFrame * 1000) / FLAME_FPS, reducedMotion: look.reducedMotion, lean, fall01 });
      graphics.clear();
      for (const p of body.pixels) {
        graphics.fillStyle(p.color, 1);
        graphics.fillRect(p.x * px, p.y * px, px, px);
      }
      const light = look.ember ? [{ x: 0, y: -1, color: look.corruptedEmber ? 0xb74038 : 0xd58138 }] : [...sparks, ...flame];
      for (const p of light) {
        graphics.fillStyle(p.color, 1);
        graphics.fillRect((body.wickTip.x + p.x) * px, (body.wickTip.y + p.y) * px, px, px);
      }
    },
    destroy(): void { graphics.destroy(); },
  };
}
