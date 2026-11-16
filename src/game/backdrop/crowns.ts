/**
 * Which crown style a tree or branch gets: the flavour's recipe picks among its styles, and the
 * colder it is the more often the cold's styles (snowy boughs, narrow spruces) are picked instead,
 * so the change into the snow is gradual. Pure: a seed and a biome in, a style out.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type CrownStyle } from '../../config/backdrop.config';
import { hash, pickWeighted } from './pixel-grid';
import type { BackdropBiome } from './chunk-types';

export function crownStyleAt(biome: BackdropBiome, seed: number, config: BackdropConfig = BACKDROP_CONFIG): CrownStyle {
  const cold = hash(seed, 1) < biome.cold01;
  return pickWeighted<CrownStyle>(cold ? config.cold.crowns : config.recipes[biome.flavour].crowns, hash(seed, 2), 'clump');
}
