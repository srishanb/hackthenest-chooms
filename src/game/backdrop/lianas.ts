/**
 * Lianas: thick woody vines that sag in a curve between two neighbouring trunks, with leaves along
 * them, where the recipe has them (the jungle). In the nearest layer, whose trunks stand at the
 * screen's edges, a liana instead hangs in a loop from one trunk and back, so nothing crosses the
 * middle of the screen where the ledges are. Placed from the seed and the height only, so a liana
 * crossing a chunk edge meets exactly. Pure: slots into a grid.
 */
import { BACKDROP_CONFIG, type BackdropConfig } from '../../config/backdrop.config';
import { hash, subSeed, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';
import type { ChunkRequest } from './chunk-types';
import type { TrunkLane } from './trunks';
import { recipeOf } from './layout';

/** A sagging curve from (x0, y0) to (x1, y1) that dips `sag` rows below the straight line at its middle. */
function paintSag(surface: Surface, x0: number, y0: number, x1: number, y1: number, sag: number, seed: number, thick: number): void {
  if (misses(surface, Math.min(y0, y1) - 2, Math.max(y0, y1) + sag + 4)) return;
  const steps = Math.ceil(Math.abs(x1 - x0) + Math.abs(y1 - y0) + sag);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + sag * 4 * t * (1 - t);
    for (let k = 0; k < thick; k++) plot(surface, x, y + k, k === 0 ? TONE.bark2 : TONE.bark0);
    // A leaf now and then, alternating above and below the vine.
    if (i % 5 === 0 && hash(seed, i) > 0.35) {
      const up = (i / 5) % 2 === 0;
      plot(surface, x, up ? y - 1 : y + thick, TONE.leaf3); plot(surface, x + 1, up ? y - 1 : y + thick, TONE.leaf2);
      if (hash(seed, i, 2) > 0.5) plot(surface, x + 1, up ? y - 2 : y + thick + 1, TONE.leaf2);
    }
  }
}

export function paintLianas(surface: Surface, lanes: readonly TrunkLane[], request: ChunkRequest, coldAt: (y: number) => number, config: BackdropConfig = BACKDROP_CONFIG): void {
  const layer = config.layers[request.layerIndex]!;
  const spacing = config.lianaSpacing * layer.scale, sagMax = config.lianaSag * layer.scale;
  const first = Math.floor((surface.originY - sagMax * 2 - spacing) / spacing), last = Math.ceil((surface.originY + surface.grid.height + spacing) / spacing);
  const sorted = [...lanes].sort((a, b) => a.centre(0) - b.centre(0));
  const thick = Math.max(1, Math.round(1.6 * layer.scale));
  for (let index = first; index <= last; index++) {
    const y = index * spacing;
    if (y > request.groundY - 30 * layer.scale) continue;
    const biome = request.biomeAt(y), chance = recipeOf(biome, config).lianas01 * (1 - biome.cold01);
    if (chance <= 0) continue;
    if (layer.trunksAtEdges) {
      // Loops off each edge trunk, hanging toward the screen but not far into it.
      for (const lane of sorted) {
        const seed = subSeed(lane.seed, 8000 + index);
        if (hash(seed, 1) >= chance || coldAt(y) > lane.rockFrom) continue;
        const y1 = y + (20 + 50 * hash(seed, 2)) * layer.scale;
        const x0 = lane.centre(y) + lane.inward * lane.half(y) * 0.9, x1 = lane.centre(y1) + lane.inward * lane.half(y1) * 0.9;
        paintSag(surface, x0, y, x1, y1, (20 + 30 * hash(seed, 3)) * layer.scale, seed, thick);
      }
      continue;
    }
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i]!, b = sorted[i + 1]!, seed = subSeed(a.seed, 9000 + index);
      if (hash(seed, 1) >= chance || coldAt(y) > a.rockFrom || coldAt(y) > b.rockFrom) continue;
      const y1 = y + (hash(seed, 2) - 0.5) * spacing * 0.8;
      paintSag(surface, a.centre(y) + a.half(y) * 0.8, y, b.centre(y1) - b.half(y1) * 0.8, y1, sagMax * (0.4 + 0.6 * hash(seed, 3)), seed, thick);
    }
  }
}
