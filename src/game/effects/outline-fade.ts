/**
 * Fades the protected-visibility outlines out at the edge of the lantern light.
 *
 * Why: outlines that reach into the dark point the way for you ("too much handholding"). Here an
 * outline is fully visible inside the light radius and fades to nothing a little past it, so it
 * only sharpens what the lantern already shows. The darkness texture fades from 1x to 2x the
 * radius; outlines are gone by FADE_END_FACTOR x the radius, before the ledge itself disappears.
 *
 * Pure maths, no Phaser: each outline segment is cut into short pieces, and each piece gets an
 * alpha from its distance to the lantern.
 */
import type { Segment } from '../world/reachable-ledges';

/** Fully visible up to this multiple of the light radius. */
export const FADE_START_FACTOR = 1;
/** Invisible from this multiple of the light radius. */
export const FADE_END_FACTOR = 1.5;
/** Length of one faded piece, in px. Shorter is smoother and costs more draw calls. */
export const PIECE_PX = 8;

export interface FadedPiece {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  current: boolean;
  /** 0..1, multiplied with the outline's own alpha. */
  alpha: number;
}

/** 1 within FADE_START_FACTOR x radius, 0 beyond FADE_END_FACTOR x radius, linear in between. */
export function fadeAlpha(distancePx: number, radiusPx: number): number {
  const start = radiusPx * FADE_START_FACTOR;
  const end = radiusPx * FADE_END_FACTOR;
  if (!(end > start)) return distancePx <= start ? 1 : 0;
  return Math.min(Math.max((end - distancePx) / (end - start), 0), 1);
}

/** Cut segments into pieces and keep only the ones with some light on them. */
export function fadeSegments(segments: readonly Segment[], lanternX: number, lanternY: number, radiusPx: number): FadedPiece[] {
  const pieces: FadedPiece[] = [];
  const reach = radiusPx * FADE_END_FACTOR;
  for (const s of segments) {
    const length = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    const count = Math.max(1, Math.ceil(length / PIECE_PX));
    for (let i = 0; i < count; i++) {
      const t0 = i / count;
      const t1 = (i + 1) / count;
      const x1 = s.x1 + (s.x2 - s.x1) * t0;
      const y1 = s.y1 + (s.y2 - s.y1) * t0;
      const x2 = s.x1 + (s.x2 - s.x1) * t1;
      const y2 = s.y1 + (s.y2 - s.y1) * t1;
      const distance = Math.hypot((x1 + x2) / 2 - lanternX, (y1 + y2) / 2 - lanternY);
      if (distance >= reach) continue;
      const alpha = fadeAlpha(distance, radiusPx);
      if (alpha > 0) pieces.push({ x1, y1, x2, y2, current: s.current, alpha });
    }
  }
  return pieces;
}
