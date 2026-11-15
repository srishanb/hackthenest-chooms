/**
 * Draws the candle portrait in a gold-rimmed circle, fixed to the bottom-left corner of the
 * screen, in place of the old lantern strength bar.
 *
 * Why inside the game canvas: the portrait draws the player's own procedural candle, and the
 * UI lane may not import game code. It sits above the darkness and the world (depth 300) and
 * ignores the camera (scroll factor 0). It redraws only when the picture changes.
 */
import type * as Phaser from 'phaser';
import type { CandleGenome } from './candle-genome';
import { FLAME_FPS } from './flame';
import { PORTRAIT_RADIUS, rasterPortrait } from './portrait';

/** World pixels per art pixel in the portrait (larger than the hero, so it reads as a close-up). */
const PX = 3;
const MARGIN = 14;
const DEPTH = 300;
/** Match the HUD's panel and gold accent (src/ui/theme/tokens.css). */
const PANEL = 0x101b2b;
const RIM = 0xffda70;
const GLOW = 0xffb347;
const STEPS = 24;

export interface PortraitLook {
  strength01: number;
  growth: number;
  reducedMotion: boolean;
  /** Hidden before Play and when the HUD status is switched off in settings. */
  visible: boolean;
  paused: boolean;
}

export function createPortraitView(scene: Phaser.Scene, viewHeight: number) {
  const graphics = scene.add.graphics().setDepth(DEPTH).setScrollFactor(0);
  const radius = PORTRAIT_RADIUS * PX;
  const cx = MARGIN + radius;
  const cy = viewHeight - MARGIN - radius;
  let clockMs = 0;
  let drawnKey = '';

  return {
    update(genome: CandleGenome, deltaMs: number, look: PortraitLook): void {
      graphics.setVisible(look.visible);
      if (!look.visible) return;
      if (!look.paused) clockMs += Math.max(0, deltaMs);
      const strength = Math.round(Math.min(Math.max(look.strength01, 0), 1) * STEPS) / STEPS;
      // The smoke drifts smoothly, so redraw at the flame's frame rate rather than every frame.
      const frame = look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS);
      const key = `${genome.seed}|${strength}|${frame}|${look.growth}|${look.reducedMotion}`;
      if (key === drawnKey) return;
      drawnKey = key;

      const portrait = rasterPortrait(genome, { strength01: strength, timeMs: (frame * 1000) / FLAME_FPS, reducedMotion: look.reducedMotion, growth: look.growth });
      graphics.clear();
      graphics.fillStyle(PANEL, 0.94);
      graphics.fillCircle(cx, cy, radius);
      // The halo: soft rings around the flame, brighter and wider while the candle is strong.
      for (let ring = 5; ring >= 1; ring--) {
        graphics.fillStyle(GLOW, 0.05 * portrait.glow01);
        graphics.fillCircle(cx, cy - 6 * PX, ring * 3.2 * PX * (0.4 + 0.6 * portrait.glow01));
      }
      for (const p of portrait.pixels) {
        graphics.fillStyle(p.color, p.alpha);
        graphics.fillRect(cx + p.x * PX, cy + p.y * PX, PX, PX);
      }
      graphics.lineStyle(2, RIM, 1);
      graphics.strokeCircle(cx, cy, radius);
    },
  };
}
