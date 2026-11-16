/**
 * Pixels that have left the candle stay where they were let go.
 *
 * Why: the candle's body, flame and signs are drawn in one object that follows the candle. Wax
 * droplets, breath, smoke and flight sparks used to be drawn in it too, so after they were shed they
 * kept following the candle (jump right after a hard landing and the droplets flew up with you).
 * Now each shed thing records the world point it was shed at (`Anchor`, on the art grid) and is
 * drawn relative to that fixed point, so it falls, drifts and fades in place while the candle moves on.
 *
 * Pure numbers in, numbers out, so it is tested without Phaser. Visual only.
 */
import { snapToGrid } from '../forest/pixel-grid-snap';
import type { Pixel } from './candle-raster';

/** A fixed world point (world px, on the art grid) that shed pixels are drawn relative to. */
export interface Anchor { x: number; y: number }

/** A pixel in world px (top-left corner of one art pixel). */
export interface WorldPixel { x: number; y: number; color: number }

/** An anchor at a world point, snapped to the art grid. */
export function makeAnchor(worldX: number, worldY: number): Anchor {
  return { x: snapToGrid(worldX), y: snapToGrid(worldY) };
}

/** Art pixels relative to `anchor` as world pixels; `px` is the world px of one art pixel. */
export function toWorld(anchor: Anchor, pixels: readonly Pixel[], px: number): WorldPixel[] {
  return pixels.map((p) => ({ x: anchor.x + p.x * px, y: anchor.y + p.y * px, color: p.color }));
}

/** What was shed, where, and how old it is (ms). */
export interface Shed<T> { anchor: Anchor; ageMs: number; data: T }

/** Adds a new shed thing and ages the rest by `dtMs`; the ones older than `lifeMs` are dropped. Each keeps its own anchor. */
export function stepShed<T>(list: readonly Shed<T>[], dtMs: number, lifeMs: number, fresh?: { anchor: Anchor; data: T }): Shed<T>[] {
  const aged = list.map((s) => ({ ...s, ageMs: s.ageMs + dtMs })).filter((s) => s.ageMs < lifeMs);
  return fresh ? [...aged, { anchor: fresh.anchor, ageMs: 0, data: fresh.data }] : aged;
}

/** A continuing emission (smoke): the anchor stays the one from when this `cycle` began, and a new cycle takes `current`. */
export interface Pinned { cycle: number; anchor: Anchor }
export function pinPerCycle(store: Map<number, Pinned>, id: number, cycle: number, current: Anchor): Anchor {
  const held = store.get(id);
  if (held && held.cycle === cycle) return held.anchor;
  store.set(id, { cycle, anchor: current });
  return current;
}
