/**
 * Draws the desktop app's icon: the candle in its gold-rimmed circle, as the HUD shows it.
 *
 * Why a script: the icon is the game's own candle, drawn by the same code that draws it in play
 * (close-up.ts), so it is art made by the project and can be redrawn if the candle changes. The
 * circle, the halo and the rim copy portrait-view.ts. It writes one 1024 px PNG; the packager
 * makes the Windows and macOS icon formats from it.
 *
 * Run from the repository root:  npx tsx tools/desktop/make-icon.ts [seed] [out.png]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deflateSync } from 'node:zlib';
import { createCandleGenome } from '../../src/game/candle/candle-genome';
import { bodyShape, INITIAL_POSE } from '../../src/game/candle/candle-pose';
import { CLOSE_UP_RADIUS, rasterCloseUp } from '../../src/game/candle/close-up';
import { faceFor, INITIAL_EXPRESSION, type ExpressionInput } from '../../src/game/candle/expression';

/** Icon size in px, and how many px one art pixel of the close-up becomes. */
const SIZE = 1024;
const SCALE = 16;
/** The HUD's panel and gold accent, as in portrait-view.ts. */
const PANEL = 0x101b2b;
const RIM = 0xffda70;
/** Rim thickness in px (one art pixel in the game, a little less here so it stays fine at small sizes). */
const RIM_PX = 14;
/** The candle on the icon. Seed 40 is a cream candle with a gold dipped base and a warm flame. */
const DEFAULT_SEED = 40;

const seed = Number(process.argv[2] ?? DEFAULT_SEED);
const out = process.argv[3] ?? 'desktop/icons/icon.png';

/** RGBA, straight alpha, row by row. */
const image = new Uint8ClampedArray(SIZE * SIZE * 4);
const centre = SIZE / 2;
const radius = CLOSE_UP_RADIUS * SCALE;

/** Paint `color` over one px with `alpha` (0..1). */
function blend(x: number, y: number, color: number, alpha: number): void {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || alpha <= 0) return;
  const i = (y * SIZE + x) * 4;
  const under = image[i + 3]! / 255;
  const a = Math.min(1, alpha);
  const outAlpha = a + under * (1 - a);
  const channel = (shift: number, offset: number): void => {
    const top = (color >> shift) & 0xff;
    image[i + offset] = outAlpha === 0 ? 0 : (top * a + image[i + offset]! * under * (1 - a)) / outAlpha;
  };
  channel(16, 0); channel(8, 1); channel(0, 2);
  image[i + 3] = outAlpha * 255;
}

/** How much of the px at (x, y) lies inside a circle: 1 inside, 0 outside, a soft step at the edge. */
function inside(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.min(1, Math.max(0, r - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + 0.5));
}

function fillCircle(cx: number, cy: number, r: number, color: number, alpha: number, clipToIcon: boolean): void {
  for (let y = Math.max(0, Math.floor(cy - r - 1)); y <= Math.min(SIZE - 1, Math.ceil(cy + r + 1)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r - 1)); x <= Math.min(SIZE - 1, Math.ceil(cx + r + 1)); x++) {
      const clip = clipToIcon ? inside(x, y, centre, centre, radius) : 1;
      blend(x, y, color, alpha * inside(x, y, cx, cy, r) * clip);
    }
  }
}

// The candle, content and looking out, with a strong steady flame.
const genome = createCandleGenome(seed);
const calm: ExpressionInput = { pose: 'idle', charge01: 0, fall01: 0, aim: 0, facingLeft: false, fuel01: 1, lit: true, reducedMotion: true };
const portrait = rasterCloseUp(genome, {
  strength01: 0.85, timeMs: 0, reducedMotion: true, growth: 1,
  shape: bodyShape({ ...INITIAL_POSE, pose: 'idle', elapsedMs: 0 }, 0),
  face: faceFor({ ...INITIAL_EXPRESSION, mood: 'content' }, calm, seed),
});

// 1. The dark disc. 2. The halo round the flame. 3. The candle. 4. The gold rim.
fillCircle(centre, centre, radius, PANEL, 1, false);
for (let ring = 5; ring >= 1; ring--) {
  fillCircle(centre, centre - 16 * SCALE, ring * 4.6 * SCALE * (0.4 + 0.6 * portrait.glow01), genome.flame.colors.outer, 0.05 * portrait.glow01, true);
}
for (const p of portrait.pixels) {
  for (let dy = 0; dy < SCALE; dy++) {
    for (let dx = 0; dx < SCALE; dx++) {
      const x = centre + p.x * SCALE + dx, y = centre + p.y * SCALE + dy;
      blend(x, y, p.color, p.alpha * inside(x, y, centre, centre, radius));
    }
  }
}
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const ring = inside(x, y, centre, centre, radius) - inside(x, y, centre, centre, radius - RIM_PX);
    blend(x, y, RIM, ring);
  }
}

/** A PNG file from RGBA rows: the fixed signature, a header, the compressed rows, an end marker. */
function png(rgba: Uint8ClampedArray, size: number): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer): number => {
    let c = 0xffffffff;
    for (const byte of bytes) c = table[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6; // 8 bits per channel, RGBA
  // Each row starts with a filter byte (0: none).
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(rows, y * (size * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png(image, SIZE));
console.log(`Wrote ${out} (${SIZE} px, candle seed ${seed})`);
