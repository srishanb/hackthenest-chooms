/** The generated backdrop is repeatable, joins across chunk edges, and follows the climb's forest and snow bands. */
import { expect, it } from 'vitest';
import { BACKDROP_CONFIG } from '../../config/backdrop.config';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { paintChunk, trunkLanes, type BackdropBiome, type ChunkRequest } from '../backdrop/paint-chunk';
import { colourChunk } from '../backdrop/palette';
import { TONE, TONE_COUNT } from '../backdrop/pixel-grid';
import { backdropBiomeAt, flavourOfBand } from '../endless/backdrop-biome';

const C = BACKDROP_CONFIG, E = ENDLESS_CONFIG;
/** A biome that turns cold with height, so tests cover leafy trees, pines and the blend between. */
const biomeAt = (y: number): BackdropBiome => ({ cold01: Math.max(0, Math.min(1, -y / 1500)), flavour: y < -3000 ? 'mushroom' : 'broadleaf' });
const request = (layerIndex: number, chunk: number, seed = 42): ChunkRequest => ({ seed, layerIndex, chunk, biomeAt, groundY: 250 });

it('paints the same chunk from the same seed, and a different one from another seed', () => {
  for (let layer = 0; layer < C.layers.length; layer++) {
    const once = paintChunk(request(layer, -3)), again = paintChunk(request(layer, -3));
    expect(again.cells).toEqual(once.cells);
    expect(paintChunk(request(layer, -3, 43)).cells).not.toEqual(once.cells);
    expect(once.cells.every((tone) => tone < TONE_COUNT)).toBe(true);
    // Something is there, and it is not a solid wall.
    const filled = once.cells.reduce((count, tone) => count + (tone ? 1 : 0), 0) / once.cells.length;
    expect(filled).toBeGreaterThan(0.03); expect(filled).toBeLessThan(0.9);
  }
});

it('joins across chunk edges: two chunks stacked are exactly one painted twice as tall', () => {
  const tall = { ...C, chunkHeight: C.chunkHeight * 2 };
  for (let layer = 0; layer < C.layers.length; layer++) for (const pair of [-1, -4, -9]) {
    // Chunk `pair` of the tall grid covers chunks 2*pair and 2*pair + 1 of the normal one.
    const whole = paintChunk(request(layer, pair), tall);
    const upper = paintChunk(request(layer, pair * 2)), lower = paintChunk(request(layer, pair * 2 + 1));
    const stacked = new Uint8Array(whole.cells.length);
    stacked.set(upper.cells, 0); stacked.set(lower.cells, upper.cells.length);
    let differing = 0;
    for (let i = 0; i < stacked.length; i++) if (stacked[i] !== whole.cells[i]) differing++;
    expect(differing, `layer ${layer}, chunk ${pair}`).toBe(0);
  }
});

it('runs its trunks the whole height without a jump, inside the picture', () => {
  for (let layer = 0; layer < C.layers.length; layer++) {
    const lanes = trunkLanes(7, layer, 250);
    expect(lanes.length).toBe(C.layers[layer]!.trunks);
    for (const lane of lanes) for (let y = -5000; y < 0; y += 37) {
      expect(Math.abs(lane.centre(y + 1) - lane.centre(y))).toBeLessThan(1);
      expect(lane.half(y)).toBeGreaterThan(1);
      expect(lane.centre(y)).toBeGreaterThan(-C.chunkWidth * 0.2); expect(lane.centre(y)).toBeLessThan(C.chunkWidth * 1.2);
    }
  }
  // The nearest layer keeps its trunks at the sides, so the middle of the screen stays clear for the ledges.
  for (const lane of trunkLanes(7, 2, 250)) {
    expect(Math.abs(lane.centre(-800) - C.chunkWidth / 2)).toBeGreaterThan(C.chunkWidth * 0.3);
  }
});

it('fills the ground below the forest floor and grows pines only where it is cold', () => {
  const ground = paintChunk(request(1, 0));
  const lastRow = ground.cells.subarray((C.chunkHeight - 1) * C.chunkWidth);
  expect(lastRow.every((tone) => tone !== TONE.none)).toBe(true);
  const snowIn = (chunk: number): number => paintChunk(request(1, chunk)).cells.reduce((n, tone) => n + (tone === TONE.snow0 || tone === TONE.snow1 ? 1 : 0), 0);
  expect(snowIn(0)).toBe(0);
  expect(snowIn(-8)).toBeGreaterThan(200);
});

it('paints a chunk quickly enough to do in one frame now and then', () => {
  paintChunk(request(1, -2));
  const started = performance.now();
  for (let chunk = -20; chunk < -10; chunk++) paintChunk(request(2, chunk));
  // Ten chunks; generous, since CI machines vary. In a browser one takes about 5 ms.
  expect(performance.now() - started).toBeLessThan(1500);
});

it('colours far layers closer to the sky, and leaves empty cells see-through', () => {
  const grid = paintChunk(request(1, -1));
  const colours = (fog01: number): Uint8ClampedArray => { const out = new Uint8ClampedArray(grid.cells.length * 4); colourChunk(grid, -C.chunkHeight, biomeAt, fog01, out); return out; };
  const near = colours(0.1), far = colours(0.8);
  const sky = [(C.sky.forest >> 16) & 255, (C.sky.forest >> 8) & 255, C.sky.forest & 255];
  let nearGap = 0, farGap = 0, solid = 0;
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] === TONE.none) { expect(near[i * 4 + 3]).toBe(0); continue; }
    expect(near[i * 4 + 3]).toBe(255); solid++;
    for (let c = 0; c < 3; c++) { nearGap += Math.abs(near[i * 4 + c]! - sky[c]!); farGap += Math.abs(far[i * 4 + c]! - sky[c]!); }
  }
  expect(solid).toBeGreaterThan(1000);
  expect(farGap).toBeLessThan(nearGap * 0.5);
});

it('follows the climb: warm at the start, cold through a snowy band, changing smoothly', () => {
  const at = (chunks: number): BackdropBiome => backdropBiomeAt(E.baseFloorTopPx - chunks * E.chunkHeightPx, 42, E);
  const perBand = E.biome.chunksPerBand;
  expect(at(0).cold01).toBe(0); expect(at(0).flavour).toBe('broadleaf');
  expect(at(-3).cold01).toBe(0);
  expect(at(perBand * 1.5).cold01).toBe(1);
  expect(at(perBand * 2.5).cold01).toBe(0);
  let previous = at(0);
  for (let chunks = 0; chunks < perBand * 9; chunks += 0.01) {
    const here = at(chunks);
    expect(Math.abs(here.cold01 - previous.cold01)).toBeLessThan(0.05);
    // The flavour only ever changes where everything is pine and snow, so the change is never seen.
    if (here.flavour !== previous.flavour) expect(here.cold01).toBe(1);
    previous = here;
  }
});

it('gives each forest band a repeatable flavour from the seed, with variety across bands', () => {
  expect(flavourOfBand(1, 0)).toBe('broadleaf');
  const seen = new Set<string>();
  for (let band = 2; band < 80; band += 2) { expect(flavourOfBand(9, band)).toBe(flavourOfBand(9, band)); seen.add(flavourOfBand(9, band)); }
  expect(seen.size).toBe(C.flavours.length);
});
