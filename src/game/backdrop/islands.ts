/**
 * Paints the floating islands of one chunk from their plans (layout.ts): the ground or rock crag,
 * the trees the flavour's recipe calls for and small plants and mushrooms on top. The waterfalls
 * are painted apart (paintFalls), after the layer's branches and crowns, so the water falls in
 * front of the foliage and the moving strips of the view agree with the picture.
 * Pure: slots into a grid, no canvas, no Phaser.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropLayer, type IslandTreeKind } from '../../config/backdrop.config';
import { hash, pickWeighted, subSeed } from './pixel-grid';
import type { Surface } from './surface';
import type { ChunkRequest } from './chunk-types';
import { islandsBetween, longestFall, recipeOf, type IslandPlan } from './layout';
import { paintCrag, paintIsland } from './terrain';
import { paintBroadleaf, paintFern, paintMushroom, paintPalm, paintPine, paintSmallMushroom } from './trees';
import { paintClump, paintPetals } from './foliage';
import { crownStyleAt } from './crowns';
import { paintWaterfalls } from './water';

function paintTree(surface: Surface, plan: IslandPlan, layer: BackdropLayer, t: number, config: BackdropConfig): void {
  const treeSeed = subSeed(plan.seed, 40 + t), recipe = recipeOf(plan.biome, config);
  const x = plan.cx + (hash(treeSeed, 1) - 0.5) * plan.width * 0.76, size = hash(treeSeed, 3), cold = plan.biome.cold01;
  const kind: IslandTreeKind = plan.crag || hash(treeSeed, 2) < cold ? 'pine' : pickWeighted<IslandTreeKind>(recipe.trees, hash(treeSeed, 4), 'broadleaf');
  const s = layer.scale;
  if (kind === 'pine') paintPine(surface, x, plan.topY, (plan.crag ? 35 + 70 * size : 55 + 90 * size) * s, treeSeed, cold);
  else if (kind === 'mushroom') paintMushroom(surface, x, plan.topY, (34 + 76 * size) * s, treeSeed);
  else if (kind === 'palm') paintPalm(surface, x, plan.topY, (55 + 60 * size) * s, treeSeed);
  else {
    const height = (45 + 85 * size) * s;
    paintBroadleaf(surface, x, plan.topY, height, treeSeed, cold, crownStyleAt(plan.biome, subSeed(treeSeed, 9), config));
    paintPetals(surface, x, plan.topY - height, height * 0.35, treeSeed, Math.round(recipe.petals * (1 - cold)));
  }
}

/** Small things on an island's top: bushes, ferns and, in a mushroom stretch, a scatter of small mushrooms. */
function paintIslandLife(surface: Surface, plan: IslandPlan, layer: BackdropLayer, config: BackdropConfig): void {
  const recipe = recipeOf(plan.biome, config), s = layer.scale, cold = plan.biome.cold01, seed = plan.seed;
  const spot = (n: number): number => plan.cx + (hash(seed, 300 + n) - 0.5) * plan.width * 0.85;
  for (let b = 0; b < 2; b++) if (hash(seed, 60 + b) < 0.6) {
    paintClump(surface, spot(b), plan.topY - 2 * s, (4 + 3 * hash(seed, 64 + b)) * s, subSeed(seed, 66 + b), cold);
  }
  if (plan.crag) return;
  const ferns = 1 + Math.floor(hash(seed, 70) * 3);
  for (let f = 0; f < ferns; f++) paintFern(surface, spot(10 + f), plan.topY, (5 + 5 * hash(seed, 72 + f)) * s, subSeed(seed, 74 + f), cold);
  if (cold > 0.6) return;
  const mushrooms = Math.floor(hash(seed, 80) * (recipe.smallMushrooms + 1));
  for (let m = 0; m < mushrooms; m++) paintSmallMushroom(surface, Math.round(spot(20 + m)), plan.topY, (3 + 5 * hash(seed, 82 + m)) * s, subSeed(seed, 84 + m));
}

/** Paint every island that shows in the surface: islands above it hang roots and falls into it, islands below grow trees up into it. */
export function paintIslands(surface: Surface, request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): IslandPlan[] {
  const layer = config.layers[request.layerIndex]!;
  const above = Math.max(longestFall(layer, config), 160 * layer.scale), below = 290 * layer.scale;
  const plans = islandsBetween(request, surface.originY - above, surface.originY + surface.grid.height + below, config);
  for (const plan of plans) {
    if (plan.crag) paintCrag(surface, plan.cx, plan.topY, plan.width, plan.depth, plan.seed, plan.biome.cold01);
    else paintIsland(surface, plan.cx, plan.topY, plan.width, plan.depth, plan.seed, plan.biome.cold01, recipeOf(plan.biome, config).vines01);
    const trees = 1 + Math.floor(hash(plan.seed, 5) * Math.min(3, plan.width / (34 * layer.scale)));
    for (let t = 0; t < trees; t++) paintTree(surface, plan, layer, t, config);
    paintIslandLife(surface, plan, layer, config);
  }
  return plans;
}

/** Paint the falls of the islands `paintIslands` returned, in front of everything else in the layer but the ground. */
export function paintFalls(surface: Surface, plans: readonly IslandPlan[]): void {
  paintWaterfalls(surface, plans.flatMap((plan) => plan.fall ? [plan.fall] : []));
}
