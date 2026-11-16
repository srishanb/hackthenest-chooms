/**
 * The close-up: the player's candle drawn large and in detail for the portrait circle.
 *
 * Why a second drawing: the hero candle is only eight to ten pixels wide, so its face is a few
 * dots. The portrait is where the player looks to read the candle, so here the same candle (same
 * genome, same mood, same squash and stretch) is drawn at three times the resolution as a bust:
 * rounded shoulders, a pool of melted wax with a glint, drips with a highlight and a shadow, eyes
 * with a glint and lids and brows, a mouth with teeth or a tongue, cheeks, a bead of wax.
 *
 * It keeps every rule of the earlier portrait (portrait.ts): the flame shrinks and the wax dims
 * as the light weakens, it smokes below SMOKE_BELOW, gutters below GUTTER_BELOW and burns blue
 * below BLUE_BELOW. Pure and visual only. Coordinates are close-up pixels from the circle's
 * centre, y growing downward.
 */
import { scaleColor, type CandleGenome } from './candle-genome';
import type { BodyShape } from './candle-pose';
import type { CandleFace } from './expression';
import { FLAME_FPS, OXIDISED, rasterFlame } from './flame';
import { BLUE_BELOW, isGuttered, SMOKE_BELOW, type Portrait, type PortraitPixel } from './portrait';

/** Circle radius in close-up pixels. */
export const CLOSE_UP_RADIUS = 30;
/** Close-up pixels per hero art pixel. */
const K = 3;
/** Where the top of the wax sits below the circle's centre when the body is at rest. */
const BODY_TOP = -3;
/** The flame is drawn this much larger than the hero's, so it fits above the bust. */
const FLAME_SCALE = 1.7;
/** The lowest row (from the top of the wax) at which a band or a dipped base may start: just below the mouth. */
const TRAIT_ROW_MAX = 26;
const OUTLINE = 0x241c24;
const WICK = 0x2b2118;
const WICK_GLOW = 0xff9a3c;
const EMBER = 0xff4a1f;
const SMOKE_COLOR = 0x8a8f99;
const TOOTH = 0xfff4e0;
const TONGUE = 0xe8857a;
const GLINT = 0xffffff;
const BEAD = 0xbfe6ff;
const BLUSH = 0xff8a82;

export interface CloseUpInput {
  /** 0..1 how strong the light is (the same value the earlier portrait used). */
  strength01: number;
  timeMs: number;
  reducedMotion: boolean;
  growth: number;
  /** The hero's body shape this frame. At rest without it. */
  shape?: BodyShape;
  /** The hero's face this frame. Faceless without it. */
  face?: CandleFace;
  /** The hero flame's reactions this frame (see flame.ts), so the close-up flame leaps, ducks and gathers with it. */
  flame?: { flare01?: number; duck01?: number; gather01?: number };
  /** 0..1 how much the candle has melted over the run: the drips are longer. */
  melt01?: number;
  /** 0..1 along the longest drip: a bright bead of wax running down it. Leave out for no bead. */
  bead01?: number;
}

function hash01(seed: number, frame: number, k: number): number {
  let h = (seed ^ Math.imul(frame, 2246822519) ^ Math.imul(k, 3266489917)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 668265263) >>> 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

const clamp01 = (value: number): number => Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 1);

function mix(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const channel = (shift: number): number => Math.round(((a >> shift) & 0xff) * (1 - k) + ((b >> shift) & 0xff) * k);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/** A tiny drawing surface: later pixels cover earlier ones, and nothing leaves the circle. */
function createCanvas() {
  const cells = new Map<number, PortraitPixel>();
  const limit = (CLOSE_UP_RADIUS - 1) * (CLOSE_UP_RADIUS - 1);
  const key = (x: number, y: number): number => (y + 64) * 256 + (x + 64);
  return {
    put(x: number, y: number, color: number, alpha = 1): void {
      if (x * x + y * y > limit) return;
      cells.set(key(x, y), { x, y, color, alpha });
    },
    /** Blend `color` over whatever is already there (cheeks, sheen). Does nothing on an empty cell. */
    tint(x: number, y: number, color: number, amount: number): void {
      const under = cells.get(key(x, y));
      if (under) cells.set(key(x, y), { ...under, color: mix(under.color, color, amount) });
    },
    has: (x: number, y: number): boolean => cells.has(key(x, y)),
    pixels: (): PortraitPixel[] => [...cells.values()],
  };
}
type Canvas = ReturnType<typeof createCanvas>;

/** Eyes, mouth, cheeks and bead. `cx` is the column just right of the face's centre line; `eyeY` the top row of the eyes. */
function drawFace(canvas: Canvas, genome: CandleGenome, face: CandleFace, cx: number, eyeY: number, lidBase: number, dim: number): void {
  const eye = scaleColor(genome.face.eyeColor, dim);
  const sheen = scaleColor(genome.face.eyeColor, 2.4 * dim);
  const mouth = scaleColor(genome.face.mouthColor, dim);
  const lid = scaleColor(lidBase, 0.8);
  const lidEdge = scaleColor(lidBase, 0.58);
  const glance = face.gazeX;
  const y0 = eyeY + face.gazeY;
  // Each eye is a 3x5 box; `ex` is its left column. The pair is symmetric about the centre line.
  for (const side of [-1, 1] as const) {
    const ex = (side < 0 ? cx - 6 : cx + 3) + glance;
    const outer = side < 0 ? ex - 1 : ex + 3;
    const inner = side < 0 ? ex + 3 : ex - 1;
    const box = (rows: number[], cols = [0, 1, 2]): void => { for (const r of rows) for (const c of cols) canvas.put(ex + c, y0 + r, eye); };
    switch (face.eyes) {
      case 'open':
        box([1, 2, 3]); canvas.put(ex + 1, y0, eye); canvas.put(ex + 1, y0 + 4, eye);
        canvas.put(ex, y0 + 1, GLINT, 0.95); canvas.put(ex + 2, y0 + 3, sheen);
        break;
      case 'wide':
        box([0, 1, 2, 3, 4], [0, 1, 2]); canvas.put(ex + 1, y0 - 1, eye); canvas.put(ex + 1, y0 + 5, eye);
        canvas.put(outer, y0 + 1, eye); canvas.put(outer, y0 + 2, eye); canvas.put(outer, y0 + 3, eye);
        canvas.put(ex, y0, GLINT, 0.95); canvas.put(ex + 1, y0, GLINT, 0.95); canvas.put(ex, y0 + 1, GLINT, 0.95); canvas.put(ex + 2, y0 + 3, sheen);
        break;
      case 'closed':
        canvas.put(ex - 1, y0 + 2, eye); canvas.put(ex, y0 + 3, eye); canvas.put(ex + 1, y0 + 3, eye); canvas.put(ex + 2, y0 + 3, eye); canvas.put(ex + 3, y0 + 2, eye);
        break;
      case 'happy':
        canvas.put(ex - 1, y0 + 3, eye); canvas.put(ex, y0 + 2, eye); canvas.put(ex + 1, y0 + 1, eye); canvas.put(ex + 2, y0 + 2, eye); canvas.put(ex + 3, y0 + 3, eye);
        canvas.put(ex, y0 + 1, eye); canvas.put(ex + 2, y0 + 1, eye);
        break;
      case 'set': {
        // An open eye with its top pressed flat, under a brow that slants down toward the nose.
        box([1, 2, 3]); canvas.put(ex + 1, y0 + 4, eye);
        canvas.put(ex, y0 + 1, GLINT, 0.9); canvas.put(ex + 2, y0 + 3, sheen);
        const step = inner > outer ? 1 : -1;
        const brow = [[outer, -3], [outer + step, -3], [outer + 2 * step, -2], [outer + 3 * step, -2], [outer + 4 * step, -1]] as const;
        for (const [bx, by] of brow) canvas.put(bx, y0 + by, eye);
        break;
      }
      case 'half':
        // A heavy lid covers the top of the eye.
        for (let c = -1; c <= 3; c++) { canvas.put(ex + c, y0, lid); canvas.put(ex + c, y0 + 1, lid); canvas.put(ex + c, y0 + 2, lidEdge); }
        box([3]); canvas.put(ex + 1, y0 + 4, eye);
        break;
    }
  }

  // The mouth is eight columns wide at most, centred on the same line as the eyes.
  const my = eyeY + 9;
  const at = (dx: number, dy: number, color = mouth): void => canvas.put(cx + dx, my + dy, color);
  const curve = (ys: number[]): void => ys.forEach((dy, i) => at(i - 4, dy));
  switch (face.mouth) {
    case 'smile': curve([0, 1, 2, 2, 2, 2, 1, 0]); break;
    case 'frown': curve([2, 1, 0, 0, 0, 0, 1, 2]); break;
    case 'wobble': curve([1, 0, 1, 2, 1, 0, 1, 2]); break;
    case 'flat': for (let dx = -2; dx <= 1; dx++) at(dx, 1); break;
    case 'small': at(-1, 1); at(0, 1); break;
    case 'grit':
      for (let dx = -4; dx <= 3; dx++) { at(dx, 0); at(dx, 2); at(dx, 1, (dx & 1) === 0 ? TOOTH : mouth); }
      break;
    case 'grin':
      for (let dx = -4; dx <= 3; dx++) at(dx, 0, dx === -4 || dx === 3 ? mouth : scaleColor(TOOTH, dim));
      for (let dx = -3; dx <= 2; dx++) at(dx, 1);
      for (let dx = -2; dx <= 1; dx++) at(dx, 2, dx === -1 || dx === 0 ? scaleColor(TONGUE, dim) : mouth);
      break;
    case 'open':
      at(-1, 0); at(0, 0);
      for (let dy = 1; dy <= 3; dy++) for (let dx = -2; dx <= 1; dx++) at(dx, dy);
      at(-1, 3, scaleColor(TONGUE, dim)); at(0, 3, scaleColor(TONGUE, dim));
      at(-1, 4); at(0, 4);
      break;
  }

  if (face.blush || genome.face.rosy) {
    const amount = face.blush ? 0.5 : 0.3;
    for (const left of [cx - 9, cx + 5]) {
      for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 2; dy++) canvas.tint(left + dx + glance, eyeY + 6 + dy, BLUSH, amount);
    }
  }
  if (face.sweat) {
    // A bead at the temple: pointed on top, round below, with a glint.
    const bx = cx + 8, by = eyeY - 3;
    canvas.put(bx, by, BEAD);
    for (let dy = 1; dy <= 2; dy++) { canvas.put(bx - 1, by + dy, scaleColor(BEAD, 0.85)); canvas.put(bx, by + dy, BEAD); }
    canvas.put(bx - 1, by + 1, GLINT, 0.9);
  }
}

export function rasterCloseUp(genome: CandleGenome, input: CloseUpInput): Portrait {
  const s = clamp01(input.strength01);
  const motion = input.reducedMotion ? 0 : 1;
  const frame = Math.floor((input.timeMs / 1000) * FLAME_FPS) * motion;
  const shape = input.shape ?? { dWidth: 0, dHeight: 0, lean: 0, lift: 0 };
  const canvas = createCanvas();
  // The wax dims as the light leaves it, exactly like the earlier portrait.
  const dim = 0.45 + 0.55 * s;
  const { base, shade, light } = genome.wax;
  const midShade = scaleColor(base, 0.9);

  // Body: the hero's squash and stretch, doubled so it reads at this size.
  const width = Math.max(14, Math.round(genome.width * K * Math.max(1, input.growth)) + shape.dWidth * 2);
  const top = BODY_TOP - shape.dHeight * 2 - shape.lift;
  const left = -Math.floor(width / 2);
  const inset = (row: number): number => (row === 0 ? 2 : row === 1 ? 1 : 0);
  const bottom = CLOSE_UP_RADIUS;
  // Outline first: the body shape grown by one pixel. The body then covers its inside.
  for (let row = -1; top + row < bottom; row++) {
    const cut = row < 0 ? 3 : Math.max(0, inset(row) - 1);
    for (let col = cut - 1; col <= width - cut; col++) canvas.put(left + col, top + row, OUTLINE);
  }
  const pool = mix(scaleColor(base, 0.9), genome.flame.colors.inner, 0.3 + 0.3 * s);
  // The candle's own trait, at this scale: a band, a dipped base or a tuft on one shoulder.
  const { kind, accent, onLeft } = genome.trait;
  const heroHeight = Math.round(genome.height * Math.max(1, input.growth));
  // The bust shows only the top of a tall candle, so a band or a dip is drawn no lower than just under the face.
  const bandTop = Math.min(TRAIT_ROW_MAX, (heroHeight - 5) * K);
  const dipTop = Math.min(TRAIT_ROW_MAX, (heroHeight - Math.max(3, Math.round(heroHeight * 0.3))) * K);
  const accentAt = (col: number): number => scaleColor(accent, col < 2 ? 1.12 : col >= width - 2 ? 0.76 : col >= width - 5 ? 0.88 : 1);
  const tuftLeft = left + (onLeft ? 3 : width - 9);
  if (kind === 'tuft') {
    // Its outline first; the wax goes on after the body.
    for (let col = 0; col < 6; col++) canvas.put(tuftLeft + col, top - 4, OUTLINE);
    for (let row = -3; row <= -1; row++) for (let col = -1; col <= 6; col++) canvas.put(tuftLeft + col, top + row, OUTLINE);
  }
  for (let row = 0; top + row < bottom; row++) {
    const cut = inset(row);
    for (let col = cut; col < width - cut; col++) {
      let color = col < 2 ? light : col === 2 ? mix(light, base, 0.5) : col >= width - 2 ? shade : col >= width - 5 ? midShade : base;
      if (kind === 'band' && row >= bandTop && row < bandTop + 2 * K) color = accentAt(col);
      // The dipped edge wanders by a pixel or two, like wax that ran before it set.
      if (kind === 'dipped' && row >= dipTop + Math.round(Math.sin(col * 0.9) * 1.5)) color = accentAt(col);
      // The rare swirl: soft diagonal stripes three pixels wide.
      if (kind === 'swirl' && row >= 4 && (col + row) % 12 < 3) color = mix(color, accentAt(col), 0.5);
      // The top surface: a pale rim round a pool of melted wax.
      if (row === 0) color = light;
      else if (row === 1) color = col >= 4 && col < width - 4 ? pool : light;
      else if (row === 2 && col >= 5 && col < width - 5) color = mix(pool, base, 0.55);
      // Warm light from the flame falls on the upper rows and fades by the tenth.
      if (row >= 1 && row <= 10) color = mix(color, genome.flame.colors.inner, 0.4 * s * (1 - (row - 1) / 10));
      canvas.put(left + col, top + row, scaleColor(color, dim));
    }
  }
  if (kind === 'tuft') {
    for (let row = -3; row <= -1; row++) for (let col = row === -3 ? 1 : 0; col < (row === -3 ? 5 : 6); col++) {
      canvas.put(tuftLeft + col, top + row, scaleColor(col < 2 ? scaleColor(light, 1.05) : col >= 4 ? base : light, dim));
    }
  }
  // A glint on the melted wax while the flame burns.
  if (s > 0.2) { canvas.put(left + 6, top + 1, scaleColor(GLINT, 0.6 + 0.4 * s), 0.9); canvas.put(left + 7, top + 1, scaleColor(GLINT, 0.6 + 0.4 * s), 0.6); }

  // Drips: a pale streak two pixels wide with a highlight, a rounded end and a shadow under it.
  const melt = clamp01(input.melt01 ?? 0);
  let longest: { x: number; length: number } | null = null;
  for (const drip of genome.drips) {
    const x = left + Math.min(width - 4, Math.max(1, Math.round((drip.x * (width - 1)) / Math.max(1, genome.width - 1))));
    // Melting adds up to three hero pixels to each drip, as on the hero candle.
    const length = (drip.length + Math.round(3 * melt)) * K - 1;
    if (!longest || length > longest.length) longest = { x, length };
    for (let row = 1; row <= length; row++) {
      canvas.put(x, top + row, scaleColor(scaleColor(light, 1.05), dim));
      canvas.put(x + 1, top + row, scaleColor(light, dim));
      canvas.tint(x + 2, top + row, shade, 0.25);
    }
    canvas.put(x, top + length + 1, scaleColor(light, dim)); canvas.put(x + 1, top + length + 1, scaleColor(light, dim));
    canvas.tint(x, top + length + 2, shade, 0.55); canvas.tint(x + 1, top + length + 2, shade, 0.55);
  }

  // A bead of wax running down the longest drip: two bright pixels with a glint.
  if (input.bead01 !== undefined && longest) {
    const row = 2 + Math.round(clamp01(input.bead01) * (longest.length - 2));
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) canvas.put(longest.x + dx, top + row + dy, scaleColor(scaleColor(light, 1.12), dim));
    canvas.put(longest.x, top + row, scaleColor(GLINT, dim), 0.9);
  }

  if (input.face) {
    const cx = left + Math.floor(width / 2) + (input.face.turned ? 2 : 0);
    drawFace(canvas, genome, input.face, cx, top + genome.face.eyeRow * K - 2, base, dim);
  }

  // Wick: two pixels wide, leaning with the hero's wick, its tip glowing while lit.
  const wickHeight = genome.wickHeight * K;
  const wickX = -1 + shape.lean;
  for (let i = 1; i <= wickHeight; i++) {
    const bend = i > wickHeight / 2 ? shape.lean : 0;
    canvas.put(wickX + bend, top - 1 - i, WICK); canvas.put(wickX + 1 + bend, top - 1 - i, WICK);
  }
  const tipX = wickX + shape.lean;
  const tipY = top - 1 - wickHeight;

  const guttered = isGuttered(genome, s, frame, input.reducedMotion);
  if (guttered) {
    canvas.put(tipX, tipY, EMBER); canvas.put(tipX + 1, tipY, EMBER);
  } else {
    canvas.put(tipX, tipY, WICK_GLOW); canvas.put(tipX + 1, tipY, WICK_GLOW);
    // A weak flame staggers: its lean jumps around more the closer it is to going out.
    const stagger = motion * (1 - s) * (hash01(genome.seed, frame, 2) * 6 - 3);
    const flame = rasterFlame(genome, { size01: Math.pow(s, 0.8), timeMs: input.timeMs, reducedMotion: input.reducedMotion, lean: stagger, scale: FLAME_SCALE, ...input.flame });
    // A starving flame loses its yellow: the last of it burns a dim blue.
    const starving = s < BLUE_BELOW ? (BLUE_BELOW - s) / BLUE_BELOW : 0;
    const starved = new Map<number, number>([[genome.flame.colors.core, OXIDISED.core], [genome.flame.colors.inner, OXIDISED.inner],
      [genome.flame.colors.outer, OXIDISED.outer], [genome.flame.colors.edge, OXIDISED.outer]]);
    for (const p of flame) {
      const blue = starving > 0 && p.y > -1 - Math.ceil(starving * 8);
      canvas.put(tipX + p.x, tipY + p.y, blue ? starved.get(p.color) ?? p.color : p.color, 1 - 0.35 * starving);
    }
  }

  // Smoke: wisps rise from the wick and fade, more and thicker as the candle weakens.
  if (motion && s < SMOKE_BELOW) {
    const weakness = (SMOKE_BELOW - s) / SMOKE_BELOW;
    const wisps = 1 + Math.round(weakness * 3) + (guttered ? 1 : 0);
    const t = input.timeMs / 1000;
    for (let i = 0; i < wisps; i++) {
      const age = (t * 0.55 + i / wisps + genome.flame.phaseA / (Math.PI * 2)) % 1;
      const y = tipY - 3 - Math.round(age * 22);
      const x = tipX + Math.round(Math.sin(age * 7 + i * 2.1 + genome.flame.phaseB) * 3 * age);
      const alpha = (1 - age) * (0.35 + 0.55 * weakness);
      for (const [dx, dy] of [[0, 0], [1, 0], [0, -1]] as const) if (!canvas.has(x + dx, y + dy)) canvas.put(x + dx, y + dy, SMOKE_COLOR, alpha);
      // Thicker smoke as the candle weakens: the wisp widens as it rises.
      if (weakness > 0.35 && !canvas.has(x + 1, y - 1)) canvas.put(x + 1, y - 1, SMOKE_COLOR, alpha * 0.7);
      if (weakness > 0.7 && age > 0.3 && !canvas.has(x - 1, y - 1)) canvas.put(x - 1, y - 1, SMOKE_COLOR, alpha * 0.5);
    }
  }

  return { pixels: canvas.pixels(), glow01: guttered ? 0.08 : 0.12 + 0.88 * s, guttered };
}
