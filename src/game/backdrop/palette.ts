/**
 * Turns a painted grid of colour slots into real colours, one row at a time.
 *
 * Each forest flavour has its own colours for the same slots (green leaves, orange leaves, pink
 * blossom, jungle greens...), and all of them share one cold palette. A row's colours are the
 * flavour's mixed toward the cold one by how cold that height is, then pulled toward that height's
 * fog colour (sky.ts) by the layer's fog, so far layers are pale and the forest turns to snow
 * gradually, with no line where it changes. The horizon's far slots are coloured by the biome of
 * the range they belong to (horizon.ts). Mist slots are the fog colour and see-through.
 * Pure: writes RGBA bytes into an array the caller owns.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropFlavour } from '../../config/backdrop.config';
import type { BackdropBiome } from './chunk-types';
import { TONE, TONE_COUNT, type PixelGrid } from './pixel-grid';
import { mixRgb, skyAt } from './sky';

/** One flavour's colours: bark x4, leaf x5, rock x4 (dark to lit), mushroom cap x3, water (dark, light, foam), petal, horizon x5. */
interface Ramps {
  bark: readonly number[]; leaf: readonly number[]; rock: readonly number[]; cap: readonly number[];
  water: readonly number[]; petal: number; far: readonly number[];
}
const SNOW = [0x9fbfd4, 0xdcecf7], STEM = [0xc2bba0, 0x857f72], CAP = [0x6e2a2a, 0xa8483a, 0xd9825a];
const BARK = [0x0d1c1f, 0x18302f, 0x24443e, 0x33594c], ROCK = [0x101c26, 0x1a2c38, 0x263f4a, 0x34535c];
const WATER = [0x2c5f70, 0x4b8e9c, 0x9cd0d4];

const WARM: Record<BackdropFlavour, Ramps> = {
  broadleaf: { bark: BARK, leaf: [0x0c2422, 0x123a30, 0x1c5440, 0x2c7050, 0x49905c], rock: ROCK, cap: CAP, water: WATER, petal: 0x2c7050,
    far: [0x123a30, 0x1f5440, 0x2f5f55, 0x3d7a52, 0x6fa7a8] },
  autumn: { bark: [0x17191c, 0x2a2a29, 0x403b33, 0x574d3d], leaf: [0x2a1a14, 0x4f2c18, 0x7d461d, 0xab672b, 0xd29440], rock: [0x161a20, 0x24282e, 0x363a3e, 0x4a4c4c], cap: CAP,
    water: [0x2e5560, 0x4e8088, 0x9cc4c4], petal: 0xc8803a, far: [0x3a2418, 0x5a3820, 0x5a4a44, 0x8a5a2a, 0x7a9aa0] },
  mushroom: { bark: [0x0f1a26, 0x1a2c3a, 0x27424e, 0x375a62], leaf: [0x0c1f2a, 0x12303a, 0x1a4a4c, 0x266660, 0x3c8474], rock: [0x131a2c, 0x1f2a42, 0x2e3f5a, 0x3e5270],
    cap: [0x7a2638, 0xc0453f, 0xf0925c], water: [0x2a4a70, 0x4a78a0, 0x98c0d8], petal: 0x8fd0b0, far: [0x1c2440, 0x2c3858, 0x3c3e60, 0x6a4a78, 0x7088a8] },
  blossom: { bark: [0x1a1820, 0x2d2832, 0x443a44, 0x5c4f58], leaf: [0x2a1626, 0x4d2442, 0x763a60, 0x9a5480, 0xbc7898], rock: [0x1a1a26, 0x2a2836, 0x3c384a, 0x504a5e], cap: CAP,
    water: [0x3a5470, 0x5a80a0, 0xb0c8dc], petal: 0xe0a0c0, far: [0x3a2440, 0x56345a, 0x5c4660, 0xa06888, 0x8090a8] },
  jungle: { bark: [0x1a1510, 0x2e2418, 0x45361f, 0x5c4a2a], leaf: [0x08201a, 0x0f3a26, 0x1a5a32, 0x2c7a3c, 0x4e9a48], rock: [0x14201c, 0x22332a, 0x34483a, 0x46604a], cap: CAP,
    water: [0x2a6a72, 0x4aa0a4, 0xa8dcd4], petal: 0x4e9a48, far: [0x1e2a1c, 0x3c4a2c, 0x3a5548, 0x3f7a3c, 0x8ec4c0] },
};
const COLD: Ramps = { bark: [0x10181f, 0x1c2a33, 0x2a3d47, 0x3a515a], leaf: [0x0b1e26, 0x112e38, 0x1a4450, 0x285c66, 0x3c7780], rock: [0x18222e, 0x27384a, 0x3a5068, 0x4e6680],
  cap: [0x4a3a52, 0x6e5a78, 0x9884a0], water: [0x587890, 0x7c9cb4, 0xb0c8dc], petal: 0xc8dcea, far: [0x2a3a52, 0x50668a, 0x6a7f9c, 0xb8cadc, 0x9cb8cc] };

/** Slot colours in slot order (see TONE). The far slots repeat the horizon ramp for both families. */
const slots = (r: Ramps): number[] => [0, ...r.bark, ...r.leaf, ...r.rock.slice(0, 3), ...SNOW, ...r.cap, ...STEM, r.rock[3]!, ...r.water, r.petal, ...r.far, ...r.far, 0, 0];
const WARM_SLOTS = Object.fromEntries(Object.entries(WARM).map(([key, ramps]) => [key, slots(ramps)])) as Record<BackdropFlavour, number[]>;
const COLD_SLOTS = slots(COLD);
/** Opacity (0..255) of the see-through mist slots. */
const MIST_ALPHA = { [TONE.mist0]: 64, [TONE.mist1]: 120 } as Record<number, number>;
/** Slots dimmed a little more than the rest, so snow, foam and petals are never as bright as a ledge. */
const EXTRA_FOG = new Set<number>([TONE.snow0, TONE.snow1, TONE.foam, TONE.petal]);

/** The colour of `slot` for a biome, before fog. */
const ownColour = (slot: number, biome: BackdropBiome): number => mixRgb(WARM_SLOTS[biome.flavour][slot]!, COLD_SLOTS[slot]!, biome.cold01);

/** A far slot's colour: a range is all mountain or all hill, so its ramp follows the same line as its shape (horizon.ts). */
const farColour = (slot: number, biome: BackdropBiome): number => (biome.cold01 >= 0.5 ? COLD_SLOTS : WARM_SLOTS[biome.flavour])[slot]!;

/** The colour of falling water in a biome, already pulled toward the fog by `fog01`: what backdrop-view.ts tints its moving water with. */
export function waterColour(biome: BackdropBiome, fog01: number, config: BackdropConfig = BACKDROP_CONFIG): number {
  return mixRgb(ownColour(TONE.water1, biome), skyAt(biome, config).fog, fog01);
}

/**
 * Fill `out` (RGBA, four bytes per cell, row after row) with the colours of `grid`.
 * `originY` is the layer height of the grid's first row, `biomeAt` the biome at a height,
 * `fog01` how far the layer's colours are pulled toward the fog, and `farBiomeAt` (horizon only)
 * the biome of the range of each far family on a row.
 */
export function colourChunk(grid: PixelGrid, originY: number, biomeAt: (y: number) => BackdropBiome, fog01: number, out: Uint8ClampedArray,
  config: BackdropConfig = BACKDROP_CONFIG, farBiomeAt?: (y: number, parity: 0 | 1) => BackdropBiome): void {
  const row = new Uint32Array(TONE_COUNT), alpha = new Uint8Array(TONE_COUNT).fill(255);
  for (const [slot, value] of Object.entries(MIST_ALPHA)) alpha[Number(slot)] = value;
  for (let y = 0; y < grid.height; y++) {
    const biome = biomeAt(originY + y), fog = skyAt(biome, config).fog;
    for (let slot = 1; slot < TONE.farA0; slot++) row[slot] = mixRgb(ownColour(slot, biome), fog, EXTRA_FOG.has(slot) ? Math.min(1, fog01 + 0.14) : fog01);
    for (const parity of [0, 1] as const) {
      const far = farBiomeAt ? farBiomeAt(originY + y, parity) : biome, farFog = skyAt(far, config).fog;
      for (let k = 0; k < 5; k++) { const slot = TONE.farA0 + parity * 5 + k; row[slot] = mixRgb(farColour(slot, far), farFog, fog01); }
    }
    row[TONE.mist0] = mixRgb(fog, 0xdfe8ee, 0.1); row[TONE.mist1] = mixRgb(fog, 0xdfe8ee, 0.16);
    for (let x = 0; x < grid.width; x++) {
      const slot = grid.cells[y * grid.width + x]!, at = (y * grid.width + x) * 4;
      if (slot === 0) { out[at + 3] = 0; continue; }
      const colour = row[slot]!;
      out[at] = colour >> 16; out[at + 1] = (colour >> 8) & 255; out[at + 2] = colour & 255; out[at + 3] = alpha[slot]!;
    }
  }
}
