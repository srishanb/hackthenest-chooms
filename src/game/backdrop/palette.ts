/**
 * Turns a painted grid of colour slots into real colours, one row at a time.
 *
 * Each forest flavour has its own colours for the same slots (green leaves, orange leaves, pink
 * blossom...), and all of them share one cold palette. A row's colours are the flavour's mixed
 * toward the cold one by how cold that height is, then pulled toward the sky by the layer's fog,
 * so far layers are pale and the forest turns to snow gradually, with no line where it changes.
 * Pure: writes RGBA bytes into an array the caller owns.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropFlavour } from '../../config/backdrop.config';
import type { BackdropBiome } from './paint-chunk';
import { TONE, TONE_COUNT, type PixelGrid } from './pixel-grid';

/** Slot colours in slot order (see TONE): bark x4, leaf x5, rock x3, snow x2, cap x3, stem x2. Slot 0 is unused. */
type Ramp = readonly number[];
const BARK = [0x0d1c1f, 0x18302f, 0x24443e, 0x33594c], ROCK = [0x101c26, 0x1a2c38, 0x263f4a];
const SNOW = [0x9fbfd4, 0xdcecf7], CAP = [0x6e2a2a, 0xa8483a, 0xd9825a], STEM = [0xc2bba0, 0x857f72];
const ramp = (bark: Ramp, leaf: Ramp, rock: Ramp, cap: Ramp): Ramp => [0, ...bark, ...leaf, ...rock, ...SNOW, ...cap, ...STEM];

const WARM: Record<BackdropFlavour, Ramp> = {
  broadleaf: ramp(BARK, [0x0c2422, 0x123a30, 0x1c5440, 0x2c7050, 0x49905c], ROCK, CAP),
  autumn: ramp([0x17191c, 0x2a2a29, 0x403b33, 0x574d3d], [0x2a1a14, 0x4f2c18, 0x7d461d, 0xab672b, 0xd29440], ROCK, CAP),
  mushroom: ramp([0x0f1a26, 0x1a2c3a, 0x27424e, 0x375a62], [0x0c1f2a, 0x12303a, 0x1a4a4c, 0x266660, 0x3c8474], [0x131a2c, 0x1f2a42, 0x2e3f5a], [0x7a2638, 0xc0453f, 0xf0925c]),
  blossom: ramp([0x1a1820, 0x2d2832, 0x443a44, 0x5c4f58], [0x2a1626, 0x4d2442, 0x7d3c64, 0xab5e88, 0xd690ae], ROCK, CAP),
};
const COLD: Ramp = ramp([0x10181f, 0x1c2a33, 0x2a3d47, 0x3a515a], [0x0b1e26, 0x112e38, 0x1a4450, 0x285c66, 0x3c7780], [0x18222e, 0x27384a, 0x3a5068], [0x4a3a52, 0x6e5a78, 0x9884a0]);

const channel = (colour: number, shift: number): number => (colour >> shift) & 255;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Fill `out` (RGBA, four bytes per cell, row after row) with the colours of `grid`.
 * `originY` is the layer height of the grid's first row, `biomeAt` the biome at a height,
 * and `fog01` how far the layer's colours are pulled toward the sky.
 */
export function colourChunk(grid: PixelGrid, originY: number, biomeAt: (y: number) => BackdropBiome, fog01: number, out: Uint8ClampedArray, config: BackdropConfig = BACKDROP_CONFIG): void {
  const row = new Uint8Array(TONE_COUNT * 3);
  for (let y = 0; y < grid.height; y++) {
    const biome = biomeAt(originY + y), warm = WARM[biome.flavour], cold = Math.max(0, Math.min(1, biome.cold01));
    for (let slot = 1; slot < TONE_COUNT; slot++) {
      // Snow is dimmed a little more than the rest, so a snowy bough is never as bright as a ledge.
      const fog = slot === TONE.snow0 || slot === TONE.snow1 ? Math.min(1, fog01 + 0.14) : fog01;
      for (let c = 0; c < 3; c++) {
        const shift = 16 - c * 8;
        const own = lerp(channel(warm[slot]!, shift), channel(COLD[slot]!, shift), cold);
        const sky = lerp(channel(config.sky.forest, shift), channel(config.sky.cold, shift), cold);
        row[slot * 3 + c] = Math.round(lerp(own, sky, fog));
      }
    }
    for (let x = 0; x < grid.width; x++) {
      const slot = grid.cells[y * grid.width + x]!, at = (y * grid.width + x) * 4;
      if (slot === 0) { out[at + 3] = 0; continue; }
      out[at] = row[slot * 3]!; out[at + 1] = row[slot * 3 + 1]!; out[at + 2] = row[slot * 3 + 2]!; out[at + 3] = 255;
    }
  }
}
