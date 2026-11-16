/**
 * Paints one chunk of one backdrop layer from the run's seed.
 *
 * A layer is an endless strip of forest, cut into chunks so only what is near the screen is ever
 * painted. Everything is placed from the seed and its own height, never from the chunk it happens
 * to fall in, so a trunk or a tree that crosses a chunk's edge is painted into both chunks and
 * meets exactly. The same seed always gives the same forest.
 *
 * What a layer holds, back to front: trunks that run the whole height (they wander, thicken and
 * carry moss), floating islands with trees on them, branches with leaves and hanging vines, and
 * the forest floor at the very bottom. What grows depends on the height's biome: pines as it
 * gets cold, tall mushrooms in a mushroom stretch, leafy trees otherwise.
 * Pure: slots into a grid (pixel-grid.ts); palette.ts turns the slots into colours.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropFlavour, type BackdropLayer } from '../../config/backdrop.config';
import { createGrid, hash, noise1, put, subSeed, TONE, type PixelGrid } from './pixel-grid';
import { paintBroadleaf, paintClump, paintIsland, paintLimb, paintMushroom, paintPine, type Surface } from './shapes';

/** What grows at a height: how cold it is (0 forest .. 1 deep snow) and the forest's flavour there. */
export interface BackdropBiome { cold01: number; flavour: BackdropFlavour }

export interface ChunkRequest {
  seed: number;
  /** Which layer (0 is the farthest) and which chunk of it; chunk 0 starts at height 0 and chunks above are negative. */
  layerIndex: number; chunk: number;
  /** The biome at a height of this layer, in art pixels. */
  biomeAt(y: number): BackdropBiome;
  /** Height of the forest floor in this layer, in art pixels. Everything below it is ground. */
  groundY: number;
}

/** One full-height trunk of a layer: where its middle is and how wide it is, at any height. */
export interface TrunkLane { seed: number; centre(y: number): number; half(y: number): number; inward: -1 | 0 | 1 }

/** The full-height trunks of a layer. The same for every chunk, which is what makes them continuous. */
export function trunkLanes(seed: number, layerIndex: number, groundY: number, config: BackdropConfig = BACKDROP_CONFIG): TrunkLane[] {
  const layer: BackdropLayer = config.layers[layerIndex]!;
  const layerSeed = subSeed(seed, 1000 + layerIndex);
  return Array.from({ length: layer.trunks }, (_, i) => {
    const laneSeed = subSeed(layerSeed, i);
    const left = i % 2 === 0;
    const baseX = layer.trunksAtEdges
      ? config.chunkWidth * (left ? 0.005 + 0.03 * hash(laneSeed, 1) : 0.995 - 0.03 * hash(laneSeed, 1))
      : config.chunkWidth * (i + 0.2 + 0.6 * hash(laneSeed, 1)) / layer.trunks;
    // Most trunks are thick (the upper 60% of the range); now and then one is slender, for variety.
    const slender = hash(laneSeed, 3) < config.slenderTrunkChance01;
    const width = slender ? layer.trunkMinWidth * config.slenderTrunkWidth01
      : layer.trunkMinWidth + (0.4 + 0.6 * hash(laneSeed, 2)) * (layer.trunkMaxWidth - layer.trunkMinWidth);
    const flareFrom = groundY - 60 * layer.scale;
    return {
      seed: laneSeed,
      inward: layer.trunksAtEdges ? (left ? 1 : -1) : 0,
      centre: (y) => baseX + (noise1(laneSeed, y / (config.trunkWanderHeight * layer.scale)) - 0.5) * 2 * config.trunkWanderPx * layer.scale,
      half: (y) => {
        // Roots: the trunk spreads over its last stretch above the ground.
        const flare = y > flareFrom ? ((y - flareFrom) / (60 * layer.scale)) ** 2 * width * 0.6 : 0;
        return width / 2 * (0.82 + 0.36 * noise1(subSeed(laneSeed, 2), y / 170)) + flare;
      },
    };
  });
}

function paintTrunk(surface: Surface, lane: TrunkLane, cold: Float32Array): void {
  const { grid, originY } = surface;
  const anchor = Math.round(lane.centre(0));
  for (let row = 0; row < grid.height; row++) {
    const y = originY + row, centre = lane.centre(y), half = lane.half(y);
    const mossy = noise1(subSeed(lane.seed, 3), y / 55) > 0.66;
    for (let x = Math.floor(centre - half); x <= centre + half; x++) {
      const across = (x - centre) / half;
      if (across < -1 || across > 1) continue;
      // Each column of bark keeps its own slowly changing brightness, which reads as long vertical grooves.
      const groove = noise1(subSeed(lane.seed, 100 + x - anchor), y / 46);
      const shade = -across * 0.55 + (groove - 0.5);
      let tone: number = Math.abs(across) > 0.9 ? TONE.bark0 : shade > 0.4 ? TONE.bark3 : shade > 0.05 ? TONE.bark2 : shade > -0.45 ? TONE.bark1 : TONE.bark0;
      const speck = hash(lane.seed, x, y);
      if (mossy && across < -0.1 && speck > 0.45) tone = speck > 0.75 ? TONE.leaf2 : TONE.leaf1;
      // Snow clings to the lit side of a cold trunk.
      if (across < -0.7 && speck < cold[row]! * 0.75) tone = TONE.snow0;
      put(grid, x, row, tone);
    }
  }
}

function paintBranches(surface: Surface, lane: TrunkLane, request: ChunkRequest, layer: BackdropLayer, config: BackdropConfig): void {
  const segment = config.branchSegmentHeight * layer.scale, margin = 130 * layer.scale;
  const first = Math.floor((surface.originY - margin) / segment), last = Math.floor((surface.originY + surface.grid.height + margin) / segment);
  for (let index = first; index <= last; index++) {
    const seed = subSeed(lane.seed, 5000 + index);
    if (hash(seed, 1) >= layer.branchChance01) continue;
    const y = (index + hash(seed, 2)) * segment;
    if (y > request.groundY - 24 * layer.scale) continue;
    // An edge trunk reaches into the screen; others branch either way.
    const side = lane.inward !== 0 ? lane.inward : hash(seed, 3) < 0.5 ? -1 : 1;
    const length = (28 + 60 * hash(seed, 4)) * layer.scale * (lane.inward !== 0 ? 1.5 : 1);
    const rise = length * (0.25 + 0.5 * hash(seed, 5));
    const startX = lane.centre(y) + side * lane.half(y) * 0.8, girth = Math.min(config.branchMaxGirth * layer.scale, Math.max(2, lane.half(y) * 0.35));
    const elbowX = startX + side * length * 0.55, elbowY = y - rise * 0.35, tipX = startX + side * length, tipY = y - rise;
    const cold01 = request.biomeAt(y).cold01, leaves = (12 + 16 * hash(seed, 6)) * layer.scale;
    paintLimb(surface, startX, y, elbowX, elbowY, girth, Math.max(1.5, girth * 0.6));
    paintLimb(surface, elbowX, elbowY, tipX, tipY, Math.max(1.5, girth * 0.6), 1);
    // Vines hang from the branch in the warm forest; in the cold there are none.
    if (cold01 < 0.5) for (const [n, fromX, fromY] of [[0, elbowX, elbowY], [1, tipX, tipY]] as const) {
      if (hash(seed, 20 + n) > 0.6) continue;
      const hang = (10 + 30 * hash(seed, 22 + n)) * layer.scale;
      for (let d = 0; d < hang; d++) put(surface.grid, Math.round(fromX), Math.round(fromY) + d - surface.originY, d % 3 === 2 ? TONE.leaf2 : TONE.leaf1);
    }
    paintClump(surface, elbowX, elbowY - leaves * 0.3, leaves * 0.7, subSeed(seed, 7), cold01);
    paintClump(surface, tipX, tipY, leaves, subSeed(seed, 8), cold01);
  }
}

function paintIslands(surface: Surface, request: ChunkRequest, layer: BackdropLayer, config: BackdropConfig): void {
  const layerSeed = subSeed(request.seed, 2000 + request.layerIndex);
  const cell = Math.max(60, config.islandCellHeight * layer.scale);
  // Trees reach up from an island and its roots hang down, so islands a little outside the chunk still show in it.
  const above = 60 * layer.scale, below = 240 * layer.scale;
  const first = Math.floor((surface.originY - above) / cell), last = Math.floor((surface.originY + surface.grid.height + below) / cell);
  for (let index = first; index <= last; index++) {
    const count = Math.floor(hash(layerSeed, index) * (layer.islandsPerCell + 1));
    for (let n = 0; n < count; n++) {
      const seed = subSeed(layerSeed, index * 8 + n + 17);
      const topY = Math.round((index + hash(seed, 1)) * cell);
      if (topY > request.groundY - 14 * layer.scale) continue;
      const width = (50 + 90 * hash(seed, 2)) * layer.scale, depth = width * (0.18 + 0.14 * hash(seed, 3));
      // In the nearest layer islands keep to the sides, like its trunks.
      const spot = hash(seed, 4);
      const cx = layer.trunksAtEdges ? config.chunkWidth * (spot < 0.5 ? 0.02 + spot * 0.36 : 0.98 - (spot - 0.5) * 0.36) : config.chunkWidth * spot;
      const biome = request.biomeAt(topY);
      paintIsland(surface, cx, topY, width, depth, seed, biome.cold01);
      const trees = 1 + Math.floor(hash(seed, 5) * Math.min(3, width / (34 * layer.scale)));
      for (let t = 0; t < trees; t++) {
        const treeSeed = subSeed(seed, 40 + t), x = cx + (hash(treeSeed, 1) - 0.5) * width * 0.76, kind = hash(treeSeed, 2);
        if (kind < biome.cold01) paintPine(surface, x, topY, (55 + 90 * hash(treeSeed, 3)) * layer.scale, treeSeed, biome.cold01);
        else if (biome.flavour === 'mushroom' && hash(treeSeed, 4) < 0.7) paintMushroom(surface, x, topY, (28 + 62 * hash(treeSeed, 3)) * layer.scale, treeSeed);
        else paintBroadleaf(surface, x, topY, (45 + 85 * hash(treeSeed, 3)) * layer.scale, treeSeed, biome.cold01);
      }
      // A low bush or two on the grass.
      for (let b = 0; b < 2; b++) if (hash(seed, 60 + b) < 0.6) {
        paintClump(surface, cx + (hash(seed, 62 + b) - 0.5) * width * 0.8, topY - 2 * layer.scale, (4 + 3 * hash(seed, 64 + b)) * layer.scale, subSeed(seed, 66 + b), biome.cold01);
      }
    }
  }
}

function paintGround(surface: Surface, request: ChunkRequest, layer: BackdropLayer): void {
  const { grid, originY } = surface;
  if (request.groundY - 20 * layer.scale >= originY + grid.height) return;
  const seed = subSeed(request.seed, 3000 + request.layerIndex);
  const cold01 = request.biomeAt(request.groundY).cold01;
  // Ferns and bushes along the floor, painted first so the ground tucks their bases in.
  for (let x = 0; x < grid.width; x += Math.round(26 * layer.scale)) {
    if (hash(seed, x, 1) < 0.35) continue;
    paintClump(surface, x + hash(seed, x, 2) * 20 * layer.scale, request.groundY - 3 * layer.scale, (5 + 6 * hash(seed, x, 3)) * layer.scale, subSeed(seed, x), cold01);
  }
  for (let x = 0; x < grid.width; x++) {
    const top = request.groundY + Math.round((noise1(seed, x / 24) - 0.5) * 8 * layer.scale);
    for (let y = Math.max(top, originY); y < originY + grid.height; y++) {
      const d = y - top;
      const tone = d < 2 ? (cold01 > 0.5 ? TONE.snow0 : hash(seed, x, y) < 0.5 ? TONE.leaf3 : TONE.leaf2) : d < 6 ? TONE.rock2 : d < 16 ? TONE.rock1 : TONE.rock0;
      put(grid, x, y - originY, tone);
    }
  }
}

/** Paint one chunk. The grid is `config.chunkWidth` by `config.chunkHeight` slots. */
export function paintChunk(request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): PixelGrid {
  const layer: BackdropLayer = config.layers[request.layerIndex]!;
  const grid = createGrid(config.chunkWidth, config.chunkHeight);
  const surface: Surface = { grid, originY: request.chunk * config.chunkHeight };
  const cold = new Float32Array(grid.height);
  for (let row = 0; row < grid.height; row++) cold[row] = request.biomeAt(surface.originY + row).cold01;
  const lanes = trunkLanes(request.seed, request.layerIndex, request.groundY, config);
  for (const lane of lanes) paintTrunk(surface, lane, cold);
  paintIslands(surface, request, layer, config);
  for (const lane of lanes) paintBranches(surface, lane, request, layer, config);
  paintGround(surface, request, layer);
  return grid;
}
