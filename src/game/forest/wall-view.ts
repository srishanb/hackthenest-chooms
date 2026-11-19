/**
 * Draws a wall (Decision D-37, only with `?walls=1`): a stone pillar the candle can slide down and kick off.
 *
 * Why it looks like this: a wall must read at a glance as different from a ledge, by day and at night. A ledge
 * is a flat earthy island with plants; a wall is an upright grey pillar of stone blocks, lit on one face and
 * shaded on the other, with moss (or snow) only on its top. Above the darkness its two faces carry a dashed
 * upright line in their own colour (where ledges get a level top edge), faded with the candle's light like the
 * ledge outlines, so at night you see where you can grip. Code-drawn rectangles in whole art pixels on the one
 * grid (Decision D-34); no image assets. Decorative only: the physics never reads anything here.
 */
import type * as Phaser from 'phaser';
import { LEDGE_KINDS_VIEW_CONFIG as V } from '../../config/ledge-kinds-view.config';
import type { PlatformBox } from '../player/types';
import { snapToGrid } from './pixel-grid-snap';
import { stableUnit } from './presentation';

type Rect = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: number, alpha?: number) => void;

/** Draw `wall` into `world` (its stone) and `readable` (its night accents, at `fade` 0..1). */
export function drawWall(rect: Rect, world: Phaser.GameObjects.Graphics, readable: Phaser.GameObjects.Graphics,
  wall: PlatformBox, fade: number, snowy: boolean, view: { top: number; bottom: number }): void {
  const w = V.wall;
  const left = snapToGrid(wall.x - wall.width / 2), width = snapToGrid(wall.width);
  const top = snapToGrid(wall.y - wall.height / 2), bottom = snapToGrid(wall.y + wall.height / 2);
  // Only the part on screen (a wall can be taller than the view).
  const from = Math.max(top, snapToGrid(view.top) - 32), to = Math.min(bottom, snapToGrid(view.bottom) + 32);
  if (to <= from) return;
  rect(world, left, from, width, to - from, w.stone);
  rect(world, left, from, 2, to - from, w.light);
  rect(world, left + width - 4, from, 4, to - from, w.shade);
  // Courses of blocks, each row's upright joint offset from the row above.
  const firstRow = Math.max(0, Math.floor((from - top) / w.coursePx));
  for (let row = firstRow, y = top + row * w.coursePx; y < to; row++, y += w.coursePx) {
    if (y > from) rect(world, left + 2, y, width - 6, 2, w.seam);
    const joint = left + snapToGrid(width * (row % 2 === 0 ? 0.35 : 0.7));
    rect(world, joint, Math.max(from, y + 2), 2, Math.min(w.coursePx - 2, to - y - 2), w.seam);
  }
  // Its top: a mossy cap (snow in the snow bands), and a few tufts hanging down the faces.
  if (top >= from) {
    rect(world, left - 2, top - 2, width + 4, 6, snowy ? w.snow : w.moss);
    rect(world, left, top + 4, width, 2, snowy ? w.light : w.mossDark);
    for (let i = 0; i < w.mossTufts; i++) {
      const onLeft = stableUnit(`wall-tuft-side:${wall.id}:${i}`) < 0.5;
      const length = 4 + snapToGrid(stableUnit(`wall-tuft:${wall.id}:${i}`) * 10);
      rect(world, onLeft ? left : left + width - 2, top + 6 + i * 6, 2, length, snowy ? w.snow : w.mossDark);
    }
  }
  // Above the darkness: dashed upright lines on both faces, the wall's own colour.
  for (let y = snapToGrid(Math.max(top, from) + 2); y < to - 6; y += 14) {
    rect(readable, left, y, 2, 8, V.night.wall, V.night.alpha * fade);
    rect(readable, left + width - 2, y, 2, 8, V.night.wall, V.night.alpha * fade);
  }
  if (top >= from) rect(readable, left, top - 2, width, 2, V.night.wall, V.night.alpha * fade * 0.6);
}
