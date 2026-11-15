/**
 * The candle portrait: a close-up of the player's own candle in a circle (bottom left), in
 * place of the old lantern strength bar. It shows how strong the light is by how alive the
 * candle looks.
 *
 * Strength (0..1) is the same light radius the darkness uses, mapped through the lantern's
 * caps (flameSizeFromRadius), so wax bonuses brighten it too. From strong to weak:
 *   - the flame shrinks and its glow fades; the wax dims as the light leaves it;
 *   - the flame staggers sideways more and more;
 *   - below 45% thin smoke starts curling off the wick, thicker the weaker it gets (the
 *     neutral light is about 53%, so a calm candle never smokes);
 *   - below 30% the flame gutters: in some frames it goes out, leaving a red ember on the
 *     wick and more smoke, the way a candle looks just before it dies;
 *   - below 25% what is left of the flame burns a dim blue, starved and about to go out.
 * With reduced motion there is no guttering, stagger or drifting smoke; size, dimming and
 * glow still show the strength. Pure and visual only; same genome as the hero candle.
 */
import { scaleColor, type CandleGenome } from './candle-genome';
import { bodyShape, INITIAL_POSE, type BodyShape } from './candle-pose';
import { rasterCandle } from './candle-raster';
import { FLAME_FPS, OXIDISED, rasterFlame } from './flame';

/** Circle radius in art pixels. */
export const PORTRAIT_RADIUS = 20;
/** Where the candle's feet sit below the circle's centre, in art pixels. */
const FEET_Y = 15;
const SMOKE_COLOR = 0x8a8f99;
const EMBER_COLOR = 0xff4a1f;
const EMBER_DARK = 0x9a2414;
/** Below this strength smoke appears; below GUTTER_BELOW the flame can go out for a frame. */
export const SMOKE_BELOW = 0.45;
export const GUTTER_BELOW = 0.3;
export const BLUE_BELOW = 0.25;

export interface PortraitPixel {
  /** Art pixels from the circle's centre; y grows downward. */
  x: number;
  y: number;
  color: number;
  alpha: number;
}

export interface PortraitInput {
  strength01: number;
  timeMs: number;
  reducedMotion: boolean;
  growth: number;
  /** The hero candle's body shape this frame, so the close-up squashes and stretches with every jump. Idle breathing without it. */
  shape?: BodyShape;
}

export interface Portrait {
  pixels: PortraitPixel[];
  /** 0..1 how bright the halo behind the candle is. */
  glow01: number;
  /** True in a frame where the flame has guttered out (only an ember shows). */
  guttered: boolean;
}

function hash01(seed: number, frame: number, k: number): number {
  let h = (seed ^ Math.imul(frame, 2246822519) ^ Math.imul(k, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 668265263) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const clamp01 = (value: number): number => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);

/** Whether the flame is out in this flame frame: never above GUTTER_BELOW, more often as it weakens. */
export function isGuttered(genome: CandleGenome, strength01: number, frame: number, reducedMotion: boolean): boolean {
  const s = clamp01(strength01);
  if (reducedMotion || s >= GUTTER_BELOW) return false;
  const closeness = (GUTTER_BELOW - s) / GUTTER_BELOW;
  return hash01(genome.seed, frame, 1) < closeness * 0.7;
}

export function rasterPortrait(genome: CandleGenome, input: PortraitInput): Portrait {
  const s = clamp01(input.strength01);
  const motion = input.reducedMotion ? 0 : 1;
  const frame = Math.floor((input.timeMs / 1000) * FLAME_FPS) * motion;
  const pixels: PortraitPixel[] = [];
  const keep = (x: number, y: number): boolean => x * x + y * y <= (PORTRAIT_RADIUS - 1) * (PORTRAIT_RADIUS - 1);
  const push = (x: number, y: number, color: number, alpha = 1): void => {
    if (keep(x, y)) pixels.push({ x, y, color, alpha });
  };

  // The body copies the hero's squash and stretch (charge, launch, landing), or breathes like the
  // idle pose when no shape is given, and dims as the light leaves it. The wick stays upright.
  const idle = { ...INITIAL_POSE, elapsedMs: input.timeMs * motion };
  const shape = input.shape ? { ...input.shape, lean: 0 } : bodyShape(idle, 0);
  const body = rasterCandle(genome, shape, input.growth, false);
  const dim = 0.45 + 0.55 * s;
  for (const p of body.pixels) push(p.x, p.y + FEET_Y, scaleColor(p.color, dim));
  const tipX = body.wickTip.x;
  const tipY = body.wickTip.y + FEET_Y;

  const guttered = isGuttered(genome, s, frame, input.reducedMotion);
  if (guttered) {
    push(tipX, tipY, EMBER_COLOR);
    push(tipX, tipY + 1, EMBER_DARK);
  } else {
    // A weak flame staggers: its lean jumps around more the closer it is to going out.
    const stagger = motion * (1 - s) * (hash01(genome.seed, frame, 2) * 4 - 2);
    const flame = rasterFlame(genome, { size01: Math.pow(s, 0.8), timeMs: input.timeMs, reducedMotion: input.reducedMotion, lean: stagger });
    // A starving flame loses its yellow: the last of it burns a dim blue.
    const starving = s < BLUE_BELOW ? (BLUE_BELOW - s) / BLUE_BELOW : 0;
    const starved = new Map<number, number>([[genome.flame.colors.core, OXIDISED.core], [genome.flame.colors.inner, OXIDISED.inner],
      [genome.flame.colors.outer, OXIDISED.outer], [genome.flame.colors.edge, OXIDISED.outer]]);
    for (const p of flame) {
      const blue = starving > 0 && p.y > -1 - Math.ceil(starving * 4);
      push(tipX + p.x, tipY + p.y, blue ? starved.get(p.color) ?? p.color : p.color, 1 - 0.35 * starving);
    }
  }

  // Smoke: wisps rise from the wick and fade, more and thicker as the candle weakens.
  if (motion && s < SMOKE_BELOW) {
    const weakness = (SMOKE_BELOW - s) / SMOKE_BELOW;
    const wisps = 1 + Math.round(weakness * 3) + (guttered ? 1 : 0);
    const t = input.timeMs / 1000;
    for (let i = 0; i < wisps; i++) {
      const age = (t * 0.55 + i / wisps + (genome.flame.phaseA / (Math.PI * 2))) % 1;
      const y = tipY - 2 - Math.round(age * 15);
      const x = tipX + Math.round(Math.sin(age * 7 + i * 2.1 + genome.flame.phaseB) * 2 * age);
      const alpha = (1 - age) * (0.35 + 0.55 * weakness);
      push(x, y, SMOKE_COLOR, alpha);
      // Thicker smoke as the candle weakens: the wisp widens as it rises.
      if (weakness > 0.35) push(x + 1, y - 1, SMOKE_COLOR, alpha * 0.7);
      if (weakness > 0.7 && age > 0.3) push(x - 1, y - 1, SMOKE_COLOR, alpha * 0.5);
    }
  }

  return { pixels, glow01: guttered ? 0.08 : 0.12 + 0.88 * s, guttered };
}
