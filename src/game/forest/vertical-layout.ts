/** Stable section identities work in either camera direction, including negative world heights. */
import { ATMOSPHERE_CONFIG as C } from '../../config/atmosphere.config';
import { stableUnit } from './presentation';
export const wrap = (value: number, period: number): number => ((value % period) + period) % period;
export function visibleChunks(scroll: number, height: number, factor: number): number[] {
  const first = Math.floor(scroll * factor / C.chunkPx) - 1;
  const last = Math.ceil((scroll * factor + height) / C.chunkPx) + 1;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
export function crownLayout(layer: number, chunk: number, width: number) {
  const seed = `${C.seed}:${layer}:${chunk}`;
  return { x: stableUnit(`${seed}:x`) * width, y: chunk * C.chunkPx + stableUnit(`${seed}:y`) * 160,
    flip: stableUnit(`${seed}:flip`) > 0.5, alpha: 0.55 + stableUnit(`${seed}:alpha`) * 0.25 };
}
