/**
 * Where the floating islands of a backdrop layer are, and which of them spill a waterfall.
 *
 * Why apart from the painter: the view animates moving water over the painted falls, so it needs
 * the same list of falls the painter drew. Both read it from here, from the seed and the height
 * alone, never from the chunk being painted, so an island or a fall that crosses a chunk's edge is
 * the same in both chunks and the animated strip lands exactly on the painted one.
 * Pure: plain numbers in, plain objects out.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropLayer, type FlavourRecipe } from '../../config/backdrop.config';
import { hash, subSeed } from './pixel-grid';
import type { BackdropBiome, ChunkRequest, Waterfall } from './chunk-types';
import { fallMistRows } from './water';

/** One floating island: its middle, top and size (art pixels), its biome, whether it is a rock crag, and its fall if any. */
export interface IslandPlan {
  seed: number; cx: number; topY: number; width: number; depth: number;
  biome: BackdropBiome; crag: boolean; fall: Waterfall | null;
}

const lerp = (range: readonly [number, number], t: number): number => range[0] + (range[1] - range[0]) * t;

/** The recipe of a biome's flavour. */
export const recipeOf = (biome: BackdropBiome, config: BackdropConfig = BACKDROP_CONFIG): FlavourRecipe => config.recipes[biome.flavour];

/** The longest a fall and its mist can reach below its island's top in `layer`, so painters know how far above to look. */
export function longestFall(layer: BackdropLayer, config: BackdropConfig = BACKDROP_CONFIG): number {
  let longest = config.cold.icefallLength[1];
  let widest = 0;
  for (const recipe of Object.values(config.recipes)) { longest = Math.max(longest, recipe.waterfallLength[1]); widest = Math.max(widest, recipe.waterfallWidth[1]); }
  return (longest + fallMistRows({ length: 0, width: widest })) * layer.scale + 8;
}

/** Every island of the request's layer whose top lies in rows `top`..`bottom`. */
export function islandsBetween(request: ChunkRequest, top: number, bottom: number, config: BackdropConfig = BACKDROP_CONFIG): IslandPlan[] {
  const layer = config.layers[request.layerIndex]!;
  if (layer.kind !== 'forest' || layer.islandsPerCell <= 0) return [];
  const layerSeed = subSeed(request.seed, 2000 + request.layerIndex);
  const cell = Math.max(60, config.islandCellHeight * layer.scale);
  const plans: IslandPlan[] = [];
  for (let index = Math.floor(top / cell) - 1; index <= Math.floor(bottom / cell) + 1; index++) {
    const cellBiome = request.biomeAt((index + 0.5) * cell);
    const perCell = layer.islandsPerCell * recipeOf(cellBiome, config).islands;
    const count = Math.floor(hash(layerSeed, index) * (perCell + 1));
    for (let n = 0; n < count; n++) {
      const seed = subSeed(layerSeed, index * 8 + n + 17);
      const topY = Math.round((index + hash(seed, 1)) * cell);
      if (topY < top || topY > bottom || topY > request.groundY - 14 * layer.scale) continue;
      const width = (50 + 90 * hash(seed, 2)) * layer.scale;
      // In the nearest layer islands keep to the sides, like its trunks.
      const spot = hash(seed, 4);
      const cx = layer.trunksAtEdges ? config.chunkWidth * (spot < 0.5 ? 0.02 + spot * 0.36 : 0.98 - (spot - 0.5) * 0.36) : config.chunkWidth * spot;
      const biome = request.biomeAt(topY), recipe = recipeOf(biome, config);
      const crag = hash(seed, 9) < biome.cold01 * config.cold.crag01;
      const depth = crag ? width * (0.5 + 0.35 * hash(seed, 3)) : width * (0.18 + 0.14 * hash(seed, 3));
      const chance = (crag ? config.cold.icefall01 : recipe.waterfall01) * layer.waterfalls01;
      let fall: Waterfall | null = null;
      if (hash(seed, 50) < chance) {
        const side = hash(seed, 51) < 0.5 ? -1 : 1, spread = 0.2 + 0.2 * hash(seed, 52);
        const fallWidth = Math.max(2, Math.round(lerp(recipe.waterfallWidth, hash(seed, 53)) * layer.scale));
        const wanted = Math.round((crag ? lerp(config.cold.icefallLength, hash(seed, 54)) : lerp(recipe.waterfallLength, hash(seed, 54))) * layer.scale);
        // A fall never runs into the ground: it stops above the highest the floor's ripple can reach (paintGround).
        const length = Math.max(2, Math.min(wanted, request.groundY - Math.ceil(4 * layer.scale) - topY));
        fall = { id: seed, layerIndex: request.layerIndex, x: Math.round(cx + side * spread * width), topY, width: fallWidth, length, cold01: biome.cold01, biome };
      }
      plans.push({ seed, cx, topY, width, depth, biome, crag, fall });
    }
  }
  return plans;
}

/** The falls of a chunk: every waterfall whose water or mist shows in rows `originY`..`originY + chunkHeight`. */
export function chunkWaterfalls(request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): Waterfall[] {
  const layer = config.layers[request.layerIndex]!;
  const originY = request.chunk * config.chunkHeight, end = originY + config.chunkHeight;
  return islandsBetween(request, originY - longestFall(layer, config), end + 4, config)
    .flatMap((plan) => plan.fall ? [plan.fall] : [])
    .filter((fall) => fall.topY - 3 < end && fall.topY + fall.length + fallMistRows(fall) >= originY);
}
