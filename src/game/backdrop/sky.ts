/**
 * Sky colours for a biome: the colour at the top of the screen and the fog colour (the bottom of
 * the sky, and what every layer's colours fade toward with distance). Each flavour has its own
 * pair in its recipe and the cold has one; a height between them mixes the two by how cold it is,
 * so the sky changes with the climb as smoothly as the forest does. Pure: numbers only.
 */
import { BACKDROP_CONFIG, type BackdropConfig } from '../../config/backdrop.config';
import type { BackdropBiome } from './chunk-types';

/** Mix two 0xRRGGBB colours: `t` 0 is `a`, 1 is `b`. */
export function mixRgb(a: number, b: number, t: number): number {
  const u = Math.max(0, Math.min(1, t));
  let out = 0;
  for (const shift of [16, 8, 0]) out |= Math.round(((a >> shift) & 255) * (1 - u) + ((b >> shift) & 255) * u) << shift;
  return out;
}

export function skyAt(biome: BackdropBiome, config: BackdropConfig = BACKDROP_CONFIG): { top: number; fog: number } {
  const warm = config.recipes[biome.flavour].sky, cold = config.cold.sky;
  return { top: mixRgb(warm.top, cold.top, biome.cold01), fog: mixRgb(warm.fog, cold.fog, biome.cold01) };
}
