/**
 * Shared by the two wall pieces (Decision D-37): making a wall on the 2x pixel grid, and the takeoff span of a
 * ledge. A wall is a platform of type `wall` (player/wall.ts): solid, standable on top, and the only thing that
 * grips for a slide or a kick.
 */
import type { PlatformData } from '../../../shared/contracts/content';
import { WALL_TYPE } from '../../player/wall';
import type { PieceKit } from './types';

const even = (value: number): number => 2 * Math.round(value / 2);

/** A wall with its near face at `faceX` (the side toward `-side`), from `topY` down to `bottomY` (world px). */
export function wallAt(id: string, faceX: number, side: -1 | 1, topY: number, bottomY: number, widthPx: number): PlatformData {
  const top = even(topY), bottom = even(bottomY), face = even(faceX), width = even(widthPx);
  return { id, x: face + side * width / 2, y: (top + bottom) / 2, width, height: bottom - top, type: WALL_TYPE };
}

/** Where the body can stand on `ledge` (centre x), inside the screen; null when there is no room. */
export function standSpan(kit: PieceKit, ledge: PlatformData): [number, number] | null {
  const half = kit.game.player.width / 2;
  const min = Math.max(half + 1, ledge.x - ledge.width / 2 + half + 2);
  const max = Math.min(kit.worldWidth - half - 1, ledge.x + ledge.width / 2 - half - 2);
  return min <= max ? [min, max] : null;
}

/** A wall piece starts only from a firm ledge: not one that slides or crumbles (their timing is not proved here). */
export const firm = (ledge: PlatformData): boolean => !ledge.motion && (ledge.type === undefined || ledge.type === 'static' || ledge.type === 'slippery');
