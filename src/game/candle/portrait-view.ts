/**
 * Draws the candle portrait in a gold-rimmed circle, fixed to the bottom-left corner of the
 * screen, in place of the old lantern strength bar.
 *
 * Why inside the game canvas: the portrait draws the player's own procedural candle, and the
 * UI lane may not import game code. It sits above the darkness and the world (depth 300) and
 * ignores the camera (scroll factor 0). It redraws only when the picture changes.
 *
 * The picture is the detailed close-up (close-up.ts): the same candle as the hero, drawn at three
 * times the resolution so its face can be read. It is painted into a small canvas texture only
 * when the picture changes (about 12 times a second at most) and shown as one image, so it costs
 * almost nothing per frame however detailed it gets.
 */
import type * as Phaser from 'phaser';
import type { CandleGenome } from './candle-genome';
import type { BodyShape } from './candle-pose';
import type { CandleFace } from './expression';
import { FLAME_FPS } from './flame';
import { CLOSE_UP_RADIUS, rasterCloseUp } from './close-up';

/** World pixels per close-up pixel: the same size as a hero art pixel, with three times as many of them. */
const PX = 2;
/** 2u from the frame edges (1u = 10 game px), matching the HUD's --hud-corner. 120 px across = 12u. */
const MARGIN = 20;
const DEPTH = 300;
/** Match the HUD's panel and gold accent (src/ui/theme/tokens.css). */
const PANEL = 0x101b2b;
const RIM = 0xffda70;
const STEPS = 24;

export interface PortraitLook {
  strength01: number;
  growth: number;
  reducedMotion: boolean;
  /** Hidden before Play and when the HUD status is switched off in settings. */
  visible: boolean;
  paused: boolean;
  /** The hero candle's current body shape (see candle-view.ts). */
  shape?: BodyShape;
  /** The hero candle's current face (see candle-view.ts). */
  face?: CandleFace;
  /** The hero flame's current reactions (see candle-view.ts). */
  flame?: { flare01: number; duck01: number; gather01: number };
  /** How melted the hero looks and where its running bead is (see candle-view.ts). */
  melting?: { melt01: number; bead01: number | undefined };
}

const TEXTURE_KEY = 'candle-portrait';
/** Room around the circle for the rim line, in px. */
const PAD = 4;
const hex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

export function createPortraitView(scene: Phaser.Scene, viewHeight: number) {
  const radius = CLOSE_UP_RADIUS * PX;
  const size = radius * 2 + PAD * 2;
  // A scene restart must not fail on a texture that already exists.
  if (scene.textures.exists(TEXTURE_KEY)) scene.textures.remove(TEXTURE_KEY);
  const texture = scene.textures.createCanvas(TEXTURE_KEY, size, size);
  const image = scene.add.image(MARGIN + radius, viewHeight - MARGIN - radius, TEXTURE_KEY).setDepth(DEPTH).setScrollFactor(0);
  const centre = size / 2;
  let clockMs = 0;
  let drawnKey = '';

  return {
    update(genome: CandleGenome, deltaMs: number, look: PortraitLook): void {
      image.setVisible(look.visible);
      if (!look.visible || !texture) return;
      if (!look.paused) clockMs += Math.max(0, deltaMs);
      const strength = Math.round(Math.min(Math.max(look.strength01, 0), 1) * STEPS) / STEPS;
      // The smoke drifts smoothly, so redraw at the flame's frame rate rather than every frame.
      const frame = look.reducedMotion ? 0 : Math.floor((clockMs / 1000) * FLAME_FPS);
      const key = `${genome.seed}|${strength}|${frame}|${look.growth}|${look.reducedMotion}|${JSON.stringify(look.shape ?? null)}|${JSON.stringify(look.face ?? null)}|${JSON.stringify(look.flame ?? null)}|${look.melting?.melt01}|${look.melting?.bead01}`;
      if (key === drawnKey) return;
      drawnKey = key;

      const portrait = rasterCloseUp(genome, { strength01: strength, timeMs: (frame * 1000) / FLAME_FPS, reducedMotion: look.reducedMotion, growth: look.growth, shape: look.shape, face: look.face, flame: look.flame,
        melt01: look.melting?.melt01, bead01: look.melting?.bead01 });
      const context = texture.context;
      context.clearRect(0, 0, size, size);
      context.globalAlpha = 0.94;
      context.fillStyle = hex(PANEL);
      context.beginPath(); context.arc(centre, centre, radius, 0, Math.PI * 2); context.fill();
      // The halo: soft rings around the flame, brighter and wider while the candle is strong.
      context.save();
      context.beginPath(); context.arc(centre, centre, radius, 0, Math.PI * 2); context.clip();
      // The halo takes the colour of this candle's own flame (warm for most, cool for the rare ones).
      context.fillStyle = hex(genome.flame.colors.outer);
      for (let ring = 5; ring >= 1; ring--) {
        context.globalAlpha = 0.05 * portrait.glow01;
        context.beginPath(); context.arc(centre, centre - 16 * PX, ring * 4.6 * PX * (0.4 + 0.6 * portrait.glow01), 0, Math.PI * 2); context.fill();
      }
      for (const p of portrait.pixels) {
        context.globalAlpha = p.alpha;
        context.fillStyle = hex(p.color);
        context.fillRect(centre + p.x * PX, centre + p.y * PX, PX, PX);
      }
      context.restore();
      context.globalAlpha = 1;
      context.strokeStyle = hex(RIM);
      context.lineWidth = 2;
      context.beginPath(); context.arc(centre, centre, radius, 0, Math.PI * 2); context.stroke();
      texture.refresh();
    },
  };
}
