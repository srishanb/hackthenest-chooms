/**
 * Branches growing out of a layer's trunks, each ending in a crown of the style the height's recipe
 * picks (see crowns.ts), with vines trailing from it in the warm forest, petals or falling leaves
 * drifting off it where the recipe has them, and shelf fungi on the trunk itself.
 * Placed from the lane's seed and the height only, so a branch crossing a chunk edge meets exactly.
 * No branches grow where a lane has become a rock cliff. Pure: slots into a grid.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropLayer } from '../../config/backdrop.config';
import { hash, subSeed, TONE } from './pixel-grid';
import { plot, type Surface } from './surface';
import type { ChunkRequest } from './chunk-types';
import type { TrunkLane } from './trunks';
import { paintLimb, paintShelfFungus } from './trees';
import { paintCrown, paintPetals } from './foliage';
import { crownStyleAt } from './crowns';
import { recipeOf } from './layout';

/** A vine of `length` rows hanging from (x, y), with a leaf every few rows. */
export function paintVine(surface: Surface, x: number, y: number, length: number, seed: number): void {
  for (let d = 0; d < length; d++) {
    const sway = Math.round(Math.sin(d / 9 + seed % 7) * 0.8);
    plot(surface, x + sway, y + d, d % 3 === 2 ? TONE.leaf2 : TONE.leaf1);
    if (d % 6 === 4) plot(surface, x + sway + (d % 12 === 4 ? -1 : 1), y + d, TONE.leaf3);
  }
}

export function paintBranches(surface: Surface, lane: TrunkLane, request: ChunkRequest, coldAt: (y: number) => number, config: BackdropConfig = BACKDROP_CONFIG): void {
  const layer: BackdropLayer = config.layers[request.layerIndex]!;
  const segment = config.branchSegmentHeight * layer.scale, margin = 150 * layer.scale;
  const first = Math.floor((surface.originY - margin) / segment), last = Math.floor((surface.originY + surface.grid.height + margin) / segment);
  for (let index = first; index <= last; index++) {
    const seed = subSeed(lane.seed, 5000 + index);
    const y = (index + hash(seed, 2)) * segment;
    if (y > request.groundY - 24 * layer.scale || coldAt(y) > lane.rockFrom) continue;
    const biome = request.biomeAt(y), recipe = recipeOf(biome, config);
    // Shelf fungi stick out of the trunk's sides, more of them in a mushroom stretch.
    if (hash(seed, 30) < recipe.shelfFungus01 * (1 - biome.cold01)) {
      const fungusSide = hash(seed, 31) < 0.5 ? -1 : 1, fy = y + hash(seed, 32) * segment * 0.6;
      for (let k = 0; k < 1 + Math.floor(hash(seed, 33) * 3); k++) {
        paintShelfFungus(surface, lane.centre(fy) + fungusSide * lane.half(fy) * 0.85, fy + k * 5 * layer.scale, (4 + 6 * hash(seed, 34 + k)) * layer.scale, fungusSide as -1 | 1, subSeed(seed, 40 + k));
      }
    }
    if (hash(seed, 1) >= layer.branchChance01) continue;
    // An edge trunk reaches into the screen; others branch either way.
    const side = lane.inward !== 0 ? lane.inward : hash(seed, 3) < 0.5 ? -1 : 1;
    const length = (28 + 60 * hash(seed, 4)) * layer.scale * (lane.inward !== 0 ? 1.5 : 1);
    const rise = length * (0.25 + 0.5 * hash(seed, 5));
    const startX = lane.centre(y) + side * lane.half(y) * 0.8, girth = Math.min(config.branchMaxGirth * layer.scale, Math.max(2, lane.half(y) * 0.35));
    const elbowX = startX + side * length * 0.55, elbowY = y - rise * 0.35, tipX = startX + side * length, tipY = y - rise;
    const cold01 = biome.cold01, leaves = (12 + 16 * hash(seed, 6)) * layer.scale;
    paintLimb(surface, startX, y, elbowX, elbowY, girth, Math.max(1.5, girth * 0.6));
    paintLimb(surface, elbowX, elbowY, tipX, tipY, Math.max(1.5, girth * 0.6), 1);
    // Vines hang from the branch in the warm forest; in the cold there are none.
    if (cold01 < 0.5) for (const [n, fromX, fromY] of [[0, elbowX, elbowY], [1, tipX, tipY]] as const) {
      if (hash(seed, 20 + n) > recipe.vines01) continue;
      paintVine(surface, Math.round(fromX), Math.round(fromY), (10 + recipe.vineLength * hash(seed, 22 + n)) * layer.scale, seed + n);
    }
    const style = crownStyleAt(biome, subSeed(seed, 9), config);
    // A round crown sits on the elbow too; the other styles read better as one shape at the tip.
    if (style === 'clump' || style === 'boughs') paintCrown(surface, style, elbowX, elbowY - leaves * 0.3, leaves * 0.7, subSeed(seed, 7), cold01);
    paintCrown(surface, style, tipX, tipY, leaves, subSeed(seed, 8), cold01);
    paintPetals(surface, tipX, tipY, leaves, seed, Math.round(recipe.petals * (1 - cold01)));
  }
}
