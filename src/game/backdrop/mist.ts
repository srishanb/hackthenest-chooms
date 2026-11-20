/**
 * Mist bands: soft horizontal bands of see-through fog painted into a layer's empty air, every few
 * hundred rows. They veil the layers behind, which is what makes the depths read as separate
 * planes (the way far ridges fade into haze in a painted landscape). Each band's edge wobbles along
 * its length and thins out with an ordered dither, so it stays crisp pixel art.
 * Pure: slots into a grid; only cells nothing else was painted into are touched.
 */
import { BACKDROP_CONFIG, type BackdropConfig } from '../../config/backdrop.config';
import { hash, noise1, subSeed, TONE } from './pixel-grid';
import type { Surface } from './surface';
import type { ChunkRequest } from './chunk-types';

/** A 4 by 4 ordered dither: the threshold (0..1) for a cell, so densities between tones become an even pattern. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const ditherAt = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;

const bottomOf = (centre: number, thick: number): number => centre + thick * 1.2;

export function paintMist(surface: Surface, request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): void {
  const layer = config.layers[request.layerIndex]!;
  if (!layer.mist) return;
  const { grid, originY } = surface, seed = subSeed(request.seed, 4000 + request.layerIndex);
  const spacing = config.mistBands.spacing * Math.max(0.6, layer.scale), thick = config.mistBands.thickness * Math.max(0.6, layer.scale);
  for (let index = Math.floor((originY - thick * 2) / spacing); index <= Math.ceil((originY + grid.height + thick * 2) / spacing); index++) {
    if (hash(seed, index) < 0.25) continue;
    const centre = (index + 0.5 + (hash(seed, index, 1) - 0.5) * 0.4) * spacing, bandSeed = subSeed(seed, index);
    if (bottomOf(centre, thick) < originY || centre - thick * 1.2 > originY + grid.height) continue;
    // The band's middle drifts up and down along its length; it is densest there.
    const middles = new Float32Array(grid.width);
    for (let x = 0; x < grid.width; x++) middles[x] = centre + (noise1(bandSeed, x / 60) - 0.5) * thick * 0.9;
    const top = Math.max(0, Math.floor(centre - thick * 1.2) - originY), bottom = Math.min(grid.height - 1, Math.ceil(centre + thick * 1.2) - originY);
    for (let row = top; row <= bottom; row++) {
      const y = originY + row;
      for (let x = 0; x < grid.width; x++) {
        const at = row * grid.width + x;
        if (grid.cells[at] !== TONE.none) continue;
        const density = 1 - Math.abs(y - middles[x]!) / (thick * 0.6);
        if (density <= 0) continue;
        const threshold = ditherAt(x, y);
        if (density * 1.3 > threshold + 0.75) grid.cells[at] = TONE.mist1;
        else if (density * 1.3 > threshold) grid.cells[at] = TONE.mist0;
      }
    }
  }
}
