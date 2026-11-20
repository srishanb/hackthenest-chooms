/**
 * The horizon layer: big far silhouettes that pass very slowly behind the forest.
 *
 * It is a stack of "ranges", one every `rangeSpacing` rows, which works out at about one per forest
 * or snow band of the climb. Each range has two ridge lines: a paler back ridge and a darker front
 * ridge. What the ridges are depends on the biome at the range: snow-capped mountain peaks with lit
 * and shaded faces in the cold, flat-topped table mountains with thin waterfalls in the jungle, and
 * rolling hills of tree tops elsewhere (with giant mushrooms on them in a mushroom stretch).
 * Below a range's ridges its body fills down and dithers away, and the next range down overlaps it.
 *
 * Ranges use the far slots: even ranges family A, odd ranges family B, so two neighbouring ranges in
 * different biomes are each coloured by their own biome (see `horizonFarBiome` and palette.ts).
 * Pure: slots into a grid.
 */
import { BACKDROP_CONFIG, type BackdropConfig } from '../../config/backdrop.config';
import { hash, noise1, subSeed, TONE } from './pixel-grid';
import type { Surface } from './surface';
import type { BackdropBiome, ChunkRequest } from './chunk-types';
import { ditherAt } from './mist';

type RangeKind = 'peaks' | 'hills' | 'mesa';
const FAR_A = [TONE.farA0, TONE.farA1, TONE.farA2, TONE.farA3, TONE.farA4] as const;
const FAR_B = [TONE.farB0, TONE.farB1, TONE.farB2, TONE.farB3, TONE.farB4] as const;

export const rangeKindOf = (biome: BackdropBiome): RangeKind => biome.cold01 >= 0.5 ? 'peaks' : biome.flavour === 'jungle' ? 'mesa' : 'hills';

/** Rows a range covers, from above its tallest back peak to the end of its fade. */
function rangeExtent(k: number, config: BackdropConfig): [number, number] {
  const h = config.horizon, base = k * h.rangeSpacing;
  return [base - h.backRaise - h.peakHeight[1] - 8, base + h.fillDepth + h.fadeDepth];
}

/** The range of `parity` (0 even, 1 odd) that covers row `y`, if any. */
export function horizonRangeAt(y: number, parity: 0 | 1, config: BackdropConfig = BACKDROP_CONFIG): number | null {
  const near = Math.floor(y / config.horizon.rangeSpacing);
  for (let k = near - 1; k <= near + 2; k++) {
    if (((k % 2) + 2) % 2 !== parity) continue;
    const [top, bottom] = rangeExtent(k, config);
    if (y >= top && y <= bottom) return k;
  }
  return null;
}

/** For the palette: the biome of the range of `parity` covering row `y` (or the row's own biome where none does). */
export function horizonFarBiome(biomeAt: (y: number) => BackdropBiome, config: BackdropConfig = BACKDROP_CONFIG) {
  return (y: number, parity: 0 | 1): BackdropBiome => {
    const k = horizonRangeAt(y, parity, config);
    return biomeAt(k === null ? y : k * config.horizon.rangeSpacing);
  };
}

/** Height above the range's base line of a ridge at column x, and whether that column is lit (faces the upper left). */
interface Ridge {
  height: number; lit: boolean; water: boolean;
  /** Peaks only: the summit's column and height, and how far the line between its lit and shaded faces leans per row down. */
  peakX: number; peakTall: number; lean: number;
}

function ridgeAt(kind: RangeKind, seed: number, x: number, config: BackdropConfig): Ridge {
  const [low, high] = config.horizon.peakHeight;
  if (kind === 'peaks') {
    let best = -Infinity, peakX = 0, peakTall = 0, lean = 0;
    for (let i = 0; i < 6; i++) {
      const at = (i + 0.15 + 0.7 * hash(seed, i)) * 88 - 24, tall = low + (high - low) * hash(seed, 10 + i), slope = 0.75 + 0.75 * hash(seed, 20 + i);
      const value = tall - Math.abs(x - at) * slope;
      if (value > best) { best = value; peakX = at; peakTall = tall; lean = (hash(seed, 30 + i) - 0.5) * 0.9; }
    }
    return { height: Math.max(3, best + (noise1(seed, x / 3) - 0.5) * 4), lit: x < peakX, water: false, peakX, peakTall, lean };
  }
  if (kind === 'mesa') {
    let best = 6 + noise1(seed, x / 30) * 10, lit = false, water = false;
    for (let i = 0; i < 4; i++) {
      const left = (i + 0.1 * hash(seed, i)) * 125 - 10, right = left + 50 + 50 * hash(seed, 30 + i), tall = low * 0.8 + (high - low) * 0.6 * hash(seed, 10 + i);
      const outside = Math.max(0, left - x, x - right), value = tall - outside * 3.5 - (outside === 0 ? noise1(seed + i, x / 5) * 2 : 0);
      if (value > best) {
        best = value; lit = x < left + (right - left) * 0.35;
        const fallX = left + (right - left) * (0.3 + 0.4 * hash(seed, 40 + i));
        water = hash(seed, 50 + i) < 0.7 && outside === 0 && Math.abs(x - fallX) < 1.5;
      }
    }
    return { height: best, lit, water, peakX: 0, peakTall: 0, lean: 0 };
  }
  // Hills: two slow waves, with a scalloped line of tree tops on them.
  const roll = low * 0.35 + noise1(seed, x / 70) * high * 0.5 + noise1(seed + 1, x / 26) * 10;
  const crown = 5 + Math.floor(hash(seed, Math.floor(x / 9), 3) * 5), within = (x % crown) / crown * 2 - 1;
  return { height: roll + Math.sqrt(Math.max(0, 1 - within * within)) * 4, lit: within < 0, water: false, peakX: 0, peakTall: 0, lean: 0 };
}

function paintRange(surface: Surface, request: ChunkRequest, k: number, config: BackdropConfig): void {
  const { grid, originY } = surface, h = config.horizon, base = k * h.rangeSpacing;
  const biome = request.biomeAt(base), kind = rangeKindOf(biome), slots = ((k % 2) + 2) % 2 === 0 ? FAR_A : FAR_B;
  const seed = subSeed(request.seed, 6000 + k);
  for (const back of [true, false]) {
    const ridgeSeed = subSeed(seed, back ? 1 : 2), line = back ? base - h.backRaise : base;
    const end = back ? base + h.fillDepth * 0.5 : base + h.fillDepth + h.fadeDepth;
    for (let x = 0; x < grid.width; x++) {
      const ridge = ridgeAt(kind, ridgeSeed, x, config), top = Math.round(line - ridge.height);
      const snowLine = kind === 'peaks' ? ridge.height * 0.42 + (noise1(ridgeSeed + 9, x / 6) - 0.5) * 8 + (back ? -4 : 0) : Infinity;
      for (let y = Math.max(top, originY); y <= end && y < originY + grid.height; y++) {
        // The foot of a range melts into haze: thinning mist rather than a hard bottom edge.
        const fade = (y - (base + h.fillDepth)) / h.fadeDepth;
        if (fade > 0 && fade > ditherAt(x, y) * 0.5) {
          if (!back && grid.cells[(y - originY) * grid.width + x] === TONE.none) grid.cells[(y - originY) * grid.width + x] = fade < 0.55 ? TONE.mist1 : TONE.mist0;
          continue;
        }
        const above = line - y, depth = y - top;
        let tone: number;
        if (above > snowLine) tone = back || kind !== 'peaks' || x < ridge.peakX + (ridge.peakTall - above) * ridge.lean ? slots[3] : slots[2];
        else if (back) tone = slots[2];
        else if (kind === 'hills') {
          // Rows of tree tops further down the slope: a scallop of lit crowns every few rows, flat shade between.
          const row = Math.floor(depth / 9), within = depth % 9, column = (x + row * 5) % 8;
          const crownTop = 3 - Math.round(Math.sqrt(Math.max(0, 1 - ((column - 3.5) / 4) ** 2)) * 3);
          tone = depth < 2 ? (ridge.lit ? slots[3] : slots[1]) : row > 0 && within >= crownTop && within < crownTop + 2 && column < 4 ? slots[1] : slots[0];
        }
        else if (kind === 'mesa') tone = depth < 2 ? slots[3] : ridge.water && depth < ridge.height * 0.8 ? slots[4] : (y % 5 === 0 && ridge.lit) ? slots[0] : ridge.lit ? slots[1] : slots[0];
        // Peaks: the line between the lit and shaded faces runs down from the summit at a slant, like a ridge
        // seen in light from the upper left; below the base line the mountain's foot is one flat shade.
        else tone = above > 0 && x < ridge.peakX + (ridge.peakTall - above) * ridge.lean ? slots[1] : slots[0];
        grid.cells[(y - originY) * grid.width + x] = tone;
      }
    }
    if (!back && kind === 'hills' && biome.flavour === 'mushroom') paintFarMushrooms(surface, ridgeSeed, line, slots, config);
  }
}

/** Giant mushroom silhouettes standing on a far hill line. */
function paintFarMushrooms(surface: Surface, seed: number, line: number, slots: typeof FAR_A | typeof FAR_B, config: BackdropConfig): void {
  const { grid, originY } = surface;
  for (let m = 0; m < 4; m++) {
    if (hash(seed, 90 + m) < 0.35) continue;
    const x = Math.round((m + 0.2 + 0.6 * hash(seed, 91 + m)) * grid.width / 4), ground = line - ridgeAt('hills', seed, x, config).height + 2;
    const tall = 12 + 16 * hash(seed, 92 + m), half = 6 + 8 * hash(seed, 93 + m), capY = Math.round(ground - tall);
    const put = (px: number, py: number, tone: number): void => {
      if (px >= 0 && px < grid.width && py >= originY && py < originY + grid.height) grid.cells[(py - originY) * grid.width + px] = tone;
    };
    for (let y = capY; y <= ground; y++) for (let dx = -1; dx <= 1; dx++) put(x + dx, y, dx < 0 ? slots[1] : slots[0]);
    for (let row = 0; row < half * 0.6; row++) {
      const reach = half * Math.sqrt(1 - (1 - (row + 1) / (half * 0.6)) ** 2);
      for (let dx = -Math.ceil(reach); dx <= reach; dx++) put(x + dx, capY - Math.ceil(half * 0.6) + row + 1, row < 2 && dx < 0 ? slots[3] : dx < 0 ? slots[1] : slots[0]);
    }
  }
}

/** Paint the horizon layer's chunk: every range that shows in it, the upper ones first. */
export function paintHorizon(surface: Surface, request: ChunkRequest, config: BackdropConfig = BACKDROP_CONFIG): void {
  const spacing = config.horizon.rangeSpacing, end = surface.originY + surface.grid.height;
  for (let k = Math.floor(surface.originY / spacing) - 1; k <= Math.ceil(end / spacing) + 2; k++) {
    const [top, bottom] = rangeExtent(k, config);
    if (bottom < surface.originY || top >= end) continue;
    paintRange(surface, request, k, config);
  }
}
