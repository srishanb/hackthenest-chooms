/**
 * The full-height trunks of a backdrop layer, and the rock cliffs some of them become in the cold.
 *
 * A trunk lane runs the whole height of the forest: it wanders, thickens, flares into roots at the
 * floor and carries moss. Some lanes are "rocky": where the cold passes the lane's own threshold
 * the trunk gives way to a cliff, wider than the trunk, stepping out and in every few rows like
 * ledges, with darker strata, cracks, shadow under each ledge, snow on each ledge's top and now and
 * then a small pine standing on one. Everything is computed from the seed and the height, so a
 * cliff that crosses a chunk edge meets exactly. Pure: slots into a grid.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropLayer } from '../../config/backdrop.config';
import { hash, noise1, put, subSeed, TONE } from './pixel-grid';
import type { Surface } from './surface';
import { paintPine } from './trees';

/** One full-height trunk of a layer: where its middle is and how wide it is, at any height. */
export interface TrunkLane {
  seed: number; centre(y: number): number; half(y: number): number; inward: -1 | 0 | 1;
  /** Cold (0..1) above which this lane is a rock cliff; above 1 for a lane that stays a trunk. */
  rockFrom: number;
  /** Half widths of the cliff to the left and the right of the centre, stepped into ledges. */
  rockLeft(y: number): number; rockRight(y: number): number;
  /** Rows between the cliff's darker strata lines. */
  strata: number;
}

/** The full-height trunks of a layer. The same for every chunk, which is what makes them continuous. */
export function trunkLanes(seed: number, layerIndex: number, groundY: number, config: BackdropConfig = BACKDROP_CONFIG): TrunkLane[] {
  const layer: BackdropLayer = config.layers[layerIndex]!;
  const layerSeed = subSeed(seed, 1000 + layerIndex);
  const step = Math.max(4, config.rock.ledgeStep * layer.scale);
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
    const half = (y: number): number => {
      // Roots: the trunk spreads over its last stretch above the ground.
      const flare = y > flareFrom ? ((y - flareFrom) / (60 * layer.scale)) ** 2 * width * 0.6 : 0;
      return width / 2 * (0.82 + 0.36 * noise1(subSeed(laneSeed, 2), y / 170)) + flare;
    };
    const cliff = Math.max(width, layer.trunkMinWidth) / 2 * config.rock.widen;
    // An edge cliff keeps its outer side off screen, so only its inner side steps.
    const ledge = (y: number, part: number): number => cliff * (0.62 + 0.7 * hash(laneSeed, Math.floor(y / step + part * 0.5), 60 + part));
    return {
      seed: laneSeed,
      inward: layer.trunksAtEdges ? (left ? 1 : -1) : 0,
      centre: (y) => baseX + (noise1(laneSeed, y / (config.trunkWanderHeight * layer.scale)) - 0.5) * 2 * config.trunkWanderPx * layer.scale,
      half,
      rockFrom: hash(laneSeed, 9) < layer.rockLanes01 ? 0.45 + 0.4 * hash(laneSeed, 10) : 2,
      rockLeft: (y) => layer.trunksAtEdges && left ? cliff * 1.4 : ledge(y, 0),
      rockRight: (y) => layer.trunksAtEdges && !left ? cliff * 1.4 : ledge(y, 1),
      strata: Math.max(4, Math.round(config.rock.strataStep * layer.scale)),
    };
  });
}

/** True when forest position (x, y) is inside the lane's cliff. `coldAt` is the cold at a height. */
function inRock(lane: TrunkLane, x: number, y: number, coldAt: (y: number) => number): boolean {
  if (coldAt(y) <= lane.rockFrom) return false;
  const centre = lane.centre(y);
  return x >= centre - lane.rockLeft(y) && x <= centre + lane.rockRight(y);
}

function rockTone(lane: TrunkLane, x: number, y: number, coldAt: (y: number) => number): number {
  const cold = coldAt(y), centre = lane.centre(y), left = centre - lane.rockLeft(y), right = centre + lane.rockRight(y);
  const across = (x - left) / Math.max(1, right - left);
  // Ledges: the top of a step is lit or snowy, the row under a step's overhang is in shadow.
  if (!inRock(lane, x, y - 1, coldAt)) return cold > 0.4 ? TONE.snow1 : TONE.rock3;
  if (!inRock(lane, x, y - 2, coldAt)) return cold > 0.4 && hash(lane.seed, x, y) < cold ? TONE.snow0 : TONE.rock3;
  if (!inRock(lane, x, y + 1, coldAt)) return TONE.rock0;
  // Big flat faces: a lit band on the left whose width wanders from ledge to ledge, a mid face, a shaded right side.
  const litBand = 2 + 4 * hash(lane.seed, Math.floor(y / 11), 80);
  let tone: number = x - left < litBand ? TONE.rock3 : across < 0.38 ? TONE.rock2 : across < 0.74 ? TONE.rock1 : TONE.rock0;
  // Strata: thin wavy darker lines across the lit faces only, broken here and there.
  if (tone !== TONE.rock0 && (y + Math.round(Math.sin(x / 9 + lane.seed) * 2)) % lane.strata === 0 && hash(lane.seed, x >> 3, y) > 0.35) tone = tone === TONE.rock3 ? TONE.rock2 : TONE.rock1;
  return tone;
}

/** Paint a lane into the surface: bark where it is a trunk, a cliff where it is rock. */
export function paintTrunk(surface: Surface, lane: TrunkLane, coldAt: (y: number) => number): void {
  const { grid, originY } = surface;
  const anchor = Math.round(lane.centre(0));
  for (let row = 0; row < grid.height; row++) {
    const y = originY + row, centre = lane.centre(y), cold = coldAt(y);
    if (cold > lane.rockFrom) {
      for (let x = Math.floor(centre - lane.rockLeft(y)); x <= centre + lane.rockRight(y); x++) put(grid, x, row, rockTone(lane, x, y, coldAt));
      continue;
    }
    const half = lane.half(y);
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
      if (across < -0.7 && speck < cold * 0.75) tone = TONE.snow0;
      put(grid, x, row, tone);
    }
  }
}

/** Small pines standing on the cliff's ledges, where a step juts out at least a few pixels. */
export function paintLedgePines(surface: Surface, lane: TrunkLane, coldAt: (y: number) => number, layer: BackdropLayer, config: BackdropConfig = BACKDROP_CONFIG): void {
  if (lane.rockFrom > 1) return;
  const step = Math.max(4, config.rock.ledgeStep * layer.scale), tallest = 34 * layer.scale;
  for (let k = Math.floor(surface.originY / step) - 1; k <= Math.ceil((surface.originY + surface.grid.height + tallest) / step) + 1; k++) {
    for (const part of [0, 1] as const) {
      // A step boundary of this side: the side's width changes at y.
      const y = Math.round((k + part * 0.5) * step);
      if (coldAt(y) <= lane.rockFrom || coldAt(y - 1) <= lane.rockFrom) continue;
      const width = part === 0 ? lane.rockLeft : lane.rockRight;
      const jut = width(y) - width(y - 1);
      if (jut < 4 || hash(lane.seed, k, 70 + part) > 0.4) continue;
      const centre = lane.centre(y), x = part === 0 ? centre - width(y - 1) - jut / 2 : centre + width(y - 1) + jut / 2;
      paintPine(surface, x, y, (12 + 22 * hash(lane.seed, k, 72 + part)) * layer.scale, subSeed(lane.seed, k * 2 + part), coldAt(y));
    }
  }
}
