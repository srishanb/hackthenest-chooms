/**
 * Draws the candle's face as art pixels on its wax body.
 *
 * The face is tiny on purpose: two eyes one pixel wide and a mouth three pixels wide are all that
 * fits on a body eight to ten pixels across, and at that size the shape of the eyes and mouth has
 * to carry the whole expression. Eye and mouth shapes are fixed little patterns chosen by
 * expression.ts. Pure: the caller (candle-raster.ts) places these pixels over the wax.
 */
import { scaleColor, type CandleGenome } from './candle-genome';
import type { Pixel } from './candle-raster';
import type { CandleFace } from './expression';

/** Blush is the wax colour pulled toward a warm pink. */
function blushColor(wax: number): number {
  const mix = (shift: number, target: number): number => Math.round(((wax >> shift) & 0xff) * 0.55 + target * 0.45);
  return (mix(16, 0xff) << 16) | (mix(8, 0x8a) << 8) | mix(0, 0x82);
}

/** A cool, pale bead: reads as a drop against warm wax. */
const SWEAT_COLOR = 0xbfe6ff;

export interface FaceBox {
  /** Left column of the body and its width, in art px. */
  x0: number;
  width: number;
  /** y of the body's top row (y grows downward, so the body is below this). */
  topY: number;
  /** Rows of body below the top row, so the face never falls off a squashed candle. */
  height: number;
}

/**
 * Face pixels for a candle facing right (the raster mirrors the whole candle when it faces left).
 * Returns nothing when the body is too squashed to hold a face.
 */
export function facePixels(genome: CandleGenome, face: CandleFace, box: FaceBox): Pixel[] {
  const { eyeRow, eyeColor, mouthColor } = genome.face;
  if (box.height < eyeRow + 6 || box.width < 7) return [];
  const pixels: Pixel[] = [];
  const put = (x: number, y: number, color: number): void => {
    if (x < box.x0 || x >= box.x0 + box.width) return;
    pixels.push({ x, y, color });
  };
  // The eye pair is 4 columns wide and centred; a turned face sits one column toward the facing side.
  const turn = face.turned ? 1 : 0;
  const centre = box.x0 + Math.floor((box.width - 4) / 2) + turn;
  // A glance moves only the eyes, and never onto the body's edge columns.
  const left = Math.min(box.x0 + box.width - 5, Math.max(box.x0 + 1, centre + face.gazeX));
  const right = left + 3;
  const eyeY = box.topY + eyeRow + face.gazeY;
  const lid = scaleColor(genome.wax.base, 0.66);

  for (const x of [left, right]) {
    switch (face.eyes) {
      case 'open': put(x, eyeY, eyeColor); put(x, eyeY + 1, eyeColor); break;
      // Wide: one pixel taller, with a pale ring above so the eye pops.
      case 'wide': put(x, eyeY - 1, eyeColor); put(x, eyeY, eyeColor); put(x, eyeY + 1, eyeColor); break;
      case 'closed': put(x, eyeY + 1, eyeColor); break;
      // Happy: a caret, like an eye smiling shut.
      case 'happy': put(x - 1, eyeY + 1, eyeColor); put(x, eyeY, eyeColor); put(x + 1, eyeY + 1, eyeColor); break;
      // Set: an open eye under a brow that slants down toward the middle of the face.
      case 'set': put(x, eyeY, eyeColor); put(x, eyeY + 1, eyeColor); put(x === left ? x - 1 : x + 1, eyeY - 1, eyeColor); break;
      // Half: a heavy lid, two pixels wide, over a one-pixel eye.
      case 'half': put(x, eyeY, lid); put(x === left ? x - 1 : x + 1, eyeY, lid); put(x, eyeY + 1, eyeColor); break;
    }
  }

  // The mouth is centred under the eyes, two rows below them.
  const mouthX = centre + 1;
  const mouthY = box.topY + eyeRow + 4;
  switch (face.mouth) {
    case 'smile': put(mouthX - 1, mouthY - 1, mouthColor); put(mouthX, mouthY, mouthColor); put(mouthX + 1, mouthY, mouthColor); put(mouthX + 2, mouthY - 1, mouthColor); break;
    case 'grin': for (let i = -1; i <= 2; i++) put(mouthX + i, mouthY - 1, mouthColor); put(mouthX, mouthY, mouthColor); put(mouthX + 1, mouthY, mouthColor); break;
    case 'flat': put(mouthX, mouthY, mouthColor); put(mouthX + 1, mouthY, mouthColor); break;
    case 'grit': for (let i = -1; i <= 2; i++) put(mouthX + i, mouthY, mouthColor); break;
    case 'open': put(mouthX, mouthY - 1, mouthColor); put(mouthX + 1, mouthY - 1, mouthColor); put(mouthX, mouthY, mouthColor); put(mouthX + 1, mouthY, mouthColor); break;
    case 'frown': put(mouthX - 1, mouthY, mouthColor); put(mouthX, mouthY - 1, mouthColor); put(mouthX + 1, mouthY - 1, mouthColor); put(mouthX + 2, mouthY, mouthColor); break;
    case 'small': put(mouthX, mouthY, mouthColor); break;
    case 'wobble': put(mouthX - 1, mouthY, mouthColor); put(mouthX, mouthY - 1, mouthColor); put(mouthX + 1, mouthY, mouthColor); put(mouthX + 2, mouthY - 1, mouthColor); break;
  }

  if (face.blush || genome.face.rosy) {
    const cheek = blushColor(genome.wax.base);
    put(left - 1, eyeY + 2, cheek);
    put(right + 1, eyeY + 2, cheek);
  }
  if (face.sweat) {
    put(right + 1, eyeY - 1, SWEAT_COLOR);
    put(right + 1, eyeY, scaleColor(SWEAT_COLOR, 0.82));
  }
  return pixels;
}
