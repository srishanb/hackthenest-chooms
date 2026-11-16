/**
 * Paints one chunk of one backdrop layer from the run's seed.
 *
 * A layer is an endless strip, cut into chunks so only what is near the screen is ever painted.
 * Everything is placed from the seed and its own height, never from the chunk it happens to fall
 * in, so a trunk, cliff, tree or waterfall that crosses a chunk's edge is painted into both chunks
 * and meets exactly. The same seed always gives the same picture.
 *
 * The horizon layer holds far ridges (horizon.ts). A forest layer holds, back to front: trunks
 * that run the whole height (or rock cliffs where it is cold), lianas between them, floating islands
 * with trees, plants and waterfalls, branches with crowns and vines, the forest floor, and last
 * the mist bands in whatever air is left. What grows follows the height's biome and its recipe.
 * Pure: slots into a grid (pixel-grid.ts); palette.ts turns the slots into colours.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropLayer } from '../../config/backdrop.config';
import { createGrid, hash, noise1, put, subSeed, TONE, type PixelGrid } from './pixel-grid';
import type { Surface } from './surface';
import type { BackdropBiome, ChunkRequest, Waterfall } from './chunk-types';
import { paintLedgePines, paintTrunk, trunkLanes } from './trunks';
import { paintBranches } from './branches';
import { paintLianas } from './lianas';
import { paintIslands } from './islands';
import { paintClump } from './foliage';
import { paintMist } from './mist';
import { horizonFarBiome, paintHorizon } from './horizon';
import { chunkWaterfalls } from './layout';
import { colourChunk } from './palette';

export type { BackdropBiome, ChunkRequest, Waterfall } from './chunk-types';
export { trunkLanes, type TrunkLane } from './trunks';
export { chunkWaterfalls } from './layout';

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

/** The cold at any height of the request's layer, read from a table for the chunk's own rows (the hot path). */
function coldReader(request: ChunkRequest, originY: number, rows: number): (y: number) => number {
  const table = new Float32Array(rows + 4);
  for (let i = 0; i < table.length; i++) table[i] = request.biomeAt(originY - 2 + i).cold01;
  return (y) => {
    const i = y - originY + 2;
    return Number.isInteger(i) && i >= 0 && i < table.length ? table[i]! : request.biomeAt(y).cold01;
  };
}

/** Paint one chunk. The grid is `config.chunkWidth` by `config.chunkHeight` slots. */
export function paintChunk(request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): PixelGrid {
  const layer: BackdropLayer = config.layers[request.layerIndex]!;
  const grid = createGrid(config.chunkWidth, config.chunkHeight);
  const surface: Surface = { grid, originY: request.chunk * config.chunkHeight };
  if (layer.kind === 'horizon') {
    paintHorizon(surface, request, config);
    paintMist(surface, request, config);
    return grid;
  }
  const coldAt = coldReader(request, surface.originY, grid.height);
  const lanes = trunkLanes(request.seed, request.layerIndex, request.groundY, config);
  for (const lane of lanes) paintTrunk(surface, lane, coldAt);
  for (const lane of lanes) paintLedgePines(surface, lane, coldAt, layer, config);
  paintLianas(surface, lanes, request, coldAt, config);
  paintIslands(surface, request, config);
  for (const lane of lanes) paintBranches(surface, lane, request, coldAt, config);
  paintGround(surface, request, layer);
  paintMist(surface, request, config);
  return grid;
}

/** The biome function a layer's colours use: the horizon colours each far range by its own biome. */
export function chunkFarBiome(request: Pick<ChunkRequest, 'layerIndex' | 'biomeAt'>, config: BackdropConfig = BACKDROP_CONFIG): ((y: number, parity: 0 | 1) => BackdropBiome) | undefined {
  return config.layers[request.layerIndex]!.kind === 'horizon' ? horizonFarBiome(request.biomeAt, config) : undefined;
}

/** Paint a chunk, colour it into `out` (RGBA), and list its waterfalls: everything the view needs for one chunk. */
export function renderChunk(request: ChunkRequest, out: Uint8ClampedArray, config: BackdropConfig = BACKDROP_CONFIG): { grid: PixelGrid; waterfalls: Waterfall[] } {
  const layer = config.layers[request.layerIndex]!;
  const grid = paintChunk(request, config);
  colourChunk(grid, request.chunk * config.chunkHeight, request.biomeAt, layer.fog01, out, config, chunkFarBiome(request, config));
  return { grid, waterfalls: chunkWaterfalls(request, config) };
}
