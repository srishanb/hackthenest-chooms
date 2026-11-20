/** The generated backdrop is repeatable, joins across chunk edges, follows the climb's bands, and each biome paints its own features. */
import { expect, it } from 'vitest';
import { BACKDROP_CONFIG, type BackdropFlavour, type CrownStyle } from '../../config/backdrop.config';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { chunkWaterfalls, paintChunk, renderChunk, trunkLanes, type BackdropBiome, type ChunkRequest } from '../backdrop/paint-chunk';
import { colourChunk } from '../backdrop/palette';
import { createGrid, TONE, TONE_COUNT } from '../backdrop/pixel-grid';
import { paintCrown } from '../backdrop/foliage';
import { horizonRangeAt } from '../backdrop/horizon';
import { skyAt } from '../backdrop/sky';
import { backdropBiomeAt, flavourOfBand } from '../endless/backdrop-biome';
import { isFrozen } from '../backdrop/water';
import { fallFrame, fallPace, snapToArt, stripRect, type StripRect } from '../backdrop/strip-layout';

const C = BACKDROP_CONFIG, E = ENDLESS_CONFIG;
const HORIZON = 0, FAR = 1, MID = 2, NEAR = C.layers.length - 1;
/** A biome that turns cold with height, so tests cover leafy trees, pines and the blend between. */
const biomeAt = (y: number): BackdropBiome => ({ cold01: Math.max(0, Math.min(1, -y / 1500)), flavour: y < -3000 ? 'mushroom' : 'broadleaf' });
/** The same, but one flavour throughout. */
const flavoured = (flavour: BackdropFlavour) => (y: number): BackdropBiome => ({ ...biomeAt(y), flavour });
/** A biome that never changes. */
const steady = (flavour: BackdropFlavour, cold01: number) => (): BackdropBiome => ({ flavour, cold01 });
const request = (layerIndex: number, chunk: number, seed = 42, at: (y: number) => BackdropBiome = biomeAt): ChunkRequest => ({ seed, layerIndex, chunk, biomeAt: at, groundY: 250 });
const count = (cells: Uint8Array, ...tones: number[]): number => cells.reduce((n, tone) => n + (tones.includes(tone) ? 1 : 0), 0);

it('has a horizon layer behind the forest layers, slowest and farthest back', () => {
  expect(C.layers[HORIZON]!.kind).toBe('horizon');
  expect(C.layers[HORIZON]!.parallax).toBeGreaterThanOrEqual(0.05); expect(C.layers[HORIZON]!.parallax).toBeLessThanOrEqual(0.08);
  for (let i = 1; i < C.layers.length; i++) {
    expect(C.layers[i]!.parallax).toBeGreaterThan(C.layers[i - 1]!.parallax);
    expect(C.layers[i]!.depth).toBeGreaterThan(C.layers[i - 1]!.depth);
  }
});

it('paints the same chunk from the same seed, and a different one from another seed', () => {
  for (let layer = 0; layer < C.layers.length; layer++) {
    const once = paintChunk(request(layer, -3)), again = paintChunk(request(layer, -3));
    expect(again.cells).toEqual(once.cells);
    expect(paintChunk(request(layer, -3, 43)).cells).not.toEqual(once.cells);
    expect(once.cells.every((tone) => tone < TONE_COUNT)).toBe(true);
    // Something is there, and it is not a solid wall.
    const filled = once.cells.reduce((n, tone) => n + (tone ? 1 : 0), 0) / once.cells.length;
    expect(filled).toBeGreaterThan(0.03); expect(filled).toBeLessThan(0.95);
  }
});

it('joins across chunk edges: two chunks stacked are exactly one painted twice as tall, in every layer and flavour', () => {
  const tall = { ...C, chunkHeight: C.chunkHeight * 2 };
  for (const flavour of C.flavours.map((entry) => entry.flavour)) for (let layer = 0; layer < C.layers.length; layer++) for (const pair of [-1, -4, -9]) {
    const at = flavoured(flavour);
    // Chunk `pair` of the tall grid covers chunks 2*pair and 2*pair + 1 of the normal one.
    const whole = paintChunk(request(layer, pair, 42, at), tall);
    const upper = paintChunk(request(layer, pair * 2, 42, at)), lower = paintChunk(request(layer, pair * 2 + 1, 42, at));
    const stacked = new Uint8Array(whole.cells.length);
    stacked.set(upper.cells, 0); stacked.set(lower.cells, upper.cells.length);
    let differing = 0;
    for (let i = 0; i < stacked.length; i++) if (stacked[i] !== whole.cells[i]) differing++;
    expect(differing, `${flavour}, layer ${layer}, chunk ${pair}`).toBe(0);
  }
});

it('runs its trunks the whole height without a jump, inside the picture', () => {
  for (let layer = 1; layer < C.layers.length; layer++) {
    const lanes = trunkLanes(7, layer, 250);
    expect(lanes.length).toBe(C.layers[layer]!.trunks);
    for (const lane of lanes) for (let y = -5000; y < 0; y += 37) {
      expect(Math.abs(lane.centre(y + 1) - lane.centre(y))).toBeLessThan(1);
      expect(lane.half(y)).toBeGreaterThan(1);
      expect(lane.centre(y)).toBeGreaterThan(-C.chunkWidth * 0.2); expect(lane.centre(y)).toBeLessThan(C.chunkWidth * 1.2);
    }
  }
  // The nearest layer keeps its trunks at the sides, so the middle of the screen stays clear for the ledges.
  for (const lane of trunkLanes(7, NEAR, 250)) {
    expect(Math.abs(lane.centre(-800) - C.chunkWidth / 2)).toBeGreaterThan(C.chunkWidth * 0.3);
  }
});

it('fills the ground below the forest floor and brings snow only where it is cold', () => {
  const ground = paintChunk(request(MID, 0));
  const lastRow = ground.cells.subarray((C.chunkHeight - 1) * C.chunkWidth);
  expect(lastRow.every((tone) => tone !== TONE.none)).toBe(true);
  const snowIn = (chunk: number): number => count(paintChunk(request(MID, chunk)).cells, TONE.snow0, TONE.snow1);
  expect(snowIn(0)).toBe(0);
  expect(snowIn(-8)).toBeGreaterThan(200);
});

it('turns to rock in the cold: cliffs, crags and snow-capped peaks at the horizon', () => {
  const cold = steady('broadleaf', 1);
  let rock = 0, snow = 0;
  for (let chunk = -6; chunk < -2; chunk++) {
    const cells = paintChunk(request(MID, chunk, 42, cold)).cells;
    rock += count(cells, TONE.rock3); snow += count(cells, TONE.snow0, TONE.snow1);
  }
  expect(rock).toBeGreaterThan(2000); expect(snow).toBeGreaterThan(500);
  // In the warm forest there is far less lit rock: it belongs to the cold.
  let warmRock = 0;
  for (let chunk = -6; chunk < -2; chunk++) warmRock += count(paintChunk(request(MID, chunk, 42, steady('broadleaf', 0))).cells, TONE.rock3);
  expect(warmRock).toBeLessThan(rock / 4);
  const horizon = paintChunk(request(HORIZON, -2, 42, cold)).cells;
  expect(count(horizon, TONE.farA3, TONE.farB3)).toBeGreaterThan(300);
});

it('grows a jungle with lianas and many waterfalls', () => {
  const jungle = steady('jungle', 0), noLianas = { ...C, recipes: { ...C.recipes, jungle: { ...C.recipes.jungle, lianas01: 0 } } };
  let falls = 0, water = 0, lianaPixels = 0;
  for (let chunk = -8; chunk < -2; chunk++) {
    const painted = paintChunk(request(MID, chunk, 42, jungle));
    falls += chunkWaterfalls(request(MID, chunk, 42, jungle)).length;
    water += count(painted.cells, TONE.water0, TONE.water1, TONE.foam);
    const bare = paintChunk(request(MID, chunk, 42, jungle), noLianas);
    for (let i = 0; i < bare.cells.length; i++) if (bare.cells[i] !== painted.cells[i]) lianaPixels++;
  }
  expect(falls).toBeGreaterThan(5); expect(water).toBeGreaterThan(1000); expect(lianaPixels).toBeGreaterThan(500);
  let broadleafFalls = 0;
  for (let chunk = -8; chunk < -2; chunk++) broadleafFalls += chunkWaterfalls(request(MID, chunk, 42, steady('broadleaf', 0))).length;
  expect(falls).toBeGreaterThan(broadleafFalls);
});

it('lists exactly the waterfalls it paints, the same for the same seed', () => {
  for (const flavour of ['broadleaf', 'jungle', 'autumn'] as const) for (let layer = FAR; layer <= NEAR; layer++) for (let chunk = -10; chunk < -1; chunk++) {
    const ask = request(layer, chunk, 5, steady(flavour, 0)), grid = paintChunk(ask), falls = chunkWaterfalls(ask);
    expect(chunkWaterfalls(ask)).toEqual(falls);
    const originY = chunk * C.chunkHeight;
    // Every painted drop of water lies in a listed fall (its pool, its water or its foamy foot)...
    for (let i = 0; i < grid.cells.length; i++) {
      const tone = grid.cells[i]!;
      if (tone !== TONE.water0 && tone !== TONE.water1) continue;
      const x = i % C.chunkWidth, y = originY + Math.floor(i / C.chunkWidth);
      expect(falls.some((fall) => Math.abs(x - fall.x) <= fall.width / 2 + 4 && y >= fall.topY - 2 && y <= fall.topY + fall.length), `${flavour} ${layer} ${chunk} (${x}, ${y})`).toBe(true);
    }
    // ...and every listed fall is painted: the next test checks its water cell by cell.
    for (const fall of falls) expect(fall.layerIndex).toBe(layer);
  }
  const ask = request(MID, -4, 5, steady('jungle', 0));
  expect(chunkWaterfalls({ ...ask, seed: 6 })).not.toEqual(chunkWaterfalls(ask));
  // A fall that crosses a chunk edge is the same fall in both chunks (and at least one does).
  let twins = 0;
  for (let chunk = -12; chunk < -2; chunk++) {
    const here = chunkWaterfalls(request(MID, chunk, 5, steady('jungle', 0))), below = chunkWaterfalls(request(MID, chunk + 1, 5, steady('jungle', 0)));
    for (const fall of here) { const twin = below.find((other) => other.id === fall.id); if (twin) { expect(twin).toEqual(fall); twins++; } }
  }
  expect(twins).toBeGreaterThan(0);
});

/** The request the view makes for a layer on the real endless climb (same sums as backdrop-view.ts). */
function viewRequest(seed: number, layerIndex: number, chunk: number): ChunkRequest {
  const layer = C.layers[layerIndex]!, view = 540, start = -20;
  return {
    seed, layerIndex, chunk, groundY: ((E.baseFloorTopPx - start) + start * layer.parallax) / C.pixelScale,
    biomeAt: (y) => backdropBiomeAt((y * C.pixelScale - view / 2) / layer.parallax + view / 2, seed, E),
  };
}

it('paints water under every moving strip: foliage never covers a fall, and a fall never reaches the ground', () => {
  let strips = 0, frozen = 0;
  // Every fourth chunk up the climb (warm, freezing and frozen heights), which keeps seed 5, mid layer, chunk -7: the overlapping-falls case.
  for (const seed of [5, 16, 42]) for (let layer = FAR; layer <= NEAR; layer++) for (let chunk = -43; chunk < 1; chunk += 4) {
    const ask = viewRequest(seed, layer, chunk), { grid, waterfalls } = renderChunk(ask, new Uint8ClampedArray(C.chunkWidth * C.chunkHeight * 4));
    const originY = chunk * C.chunkHeight;
    for (const fall of waterfalls) {
      if (isFrozen(fall.cold01)) { frozen++; continue; }
      strips++;
      const left = Math.round(fall.x - fall.width / 2), cells = Math.max(2, Math.round(fall.width));
      for (let y = fall.topY + 1; y < fall.topY + fall.length; y++) {
        if (y < originY || y >= originY + C.chunkHeight) continue;
        for (let x = Math.max(0, left); x < Math.min(C.chunkWidth, left + cells); x++) {
          const tone = grid.cells[(y - originY) * C.chunkWidth + x]!;
          expect([TONE.water0, TONE.water1, TONE.foam], `seed ${seed} layer ${layer} chunk ${chunk} (${x}, ${y})`).toContain(tone);
        }
      }
      expect(fall.topY + fall.length, 'fall stops above the ground').toBeLessThan(ask.groundY);
    }
  }
  expect(strips).toBeGreaterThan(30); expect(frozen).toBeGreaterThan(0);
});

it('places a strip on the art pixel grid by the same sums as the painter, and runs the water by cold', () => {
  const rect: StripRect = { x: 0, y: 0, width: 0, length: 0, frame: 0 };
  const fall = { id: 1, layerIndex: MID, x: 101, topY: -400, width: 7.4, length: 90, cold01: 0, biome: { cold01: 0, flavour: 'jungle' as const } };
  const ps = C.pixelScale;
  // Columns: the painter's rounded left edge and cell count.
  const out = stripRect(fall, 1000.7, 0, rect);
  expect(out.width).toBe(7 * ps); expect(out.x - out.width / 2).toBe(Math.round(101 - 3.7) * ps);
  // Rows: one art pixel below the lip, one short of the length, on the grid, and moving with the scroll one art pixel at a time.
  expect(out.length).toBe(90 * ps - ps);
  for (const scroll of [0, 0.4, 1, 1.6, 333.3, -812.9]) {
    const y = stripRect(fall, scroll, 0, rect).y;
    expect(Math.abs((y - ps) % ps), `scroll ${scroll}`).toBe(0);
    expect(y - ps).toBe(snapToArt(-400 * ps - scroll));
    // A strip lies where the chunk picture's own row lands: chunk origin rounded the same way.
    const chunk = -2, imageY = snapToArt(chunk * C.chunkHeight * ps - scroll);
    expect(y).toBe(imageY + (-400 - chunk * C.chunkHeight) * ps + ps);
  }
  // Pace: 1 warm, 0 at and above the freeze cold, falling steadily between.
  expect(fallPace(0)).toBe(1); expect(fallPace(C.cold.freezeAt01)).toBe(0); expect(fallPace(1)).toBe(0);
  expect(fallPace(C.cold.freezeAt01 / 2)).toBeCloseTo(0.5);
  expect(isFrozen(C.cold.freezeAt01)).toBe(true); expect(isFrozen(C.cold.freezeAt01 - 0.01)).toBe(false);
  expect(fallFrame(10000, 0)).toBe(0);
  expect(fallFrame(C.waterfallView.frameMs * 3, 1)).toBe(3);
  expect(stripRect({ ...fall, cold01: 1 }, 0, 99999, rect).frame).toBe(0);
});

it('freezes waterfalls where it is cold', () => {
  let frozen = 0;
  for (let chunk = -12; chunk < -1; chunk++) for (const fall of chunkWaterfalls(request(MID, chunk, 9, steady('jungle', 1)))) { expect(fall.cold01).toBe(1); frozen++; }
  const icy = renderChunk(request(MID, -4, 9, steady('jungle', 1)), new Uint8ClampedArray(C.chunkWidth * C.chunkHeight * 4));
  expect(count(icy.grid.cells, TONE.water0, TONE.water1)).toBe(0);
  expect(frozen).toBeGreaterThan(0);
});

it('has every crown style in some recipe, and each paints a shape', () => {
  const used = new Set<CrownStyle>(Object.keys(C.cold.crowns) as CrownStyle[]);
  for (const recipe of Object.values(C.recipes)) for (const style of Object.keys(recipe.crowns) as CrownStyle[]) used.add(style);
  const all: CrownStyle[] = ['clump', 'tiers', 'umbrella', 'weeping', 'fronds', 'bigleaf', 'sparse', 'column', 'boughs'];
  expect([...used].sort()).toEqual([...all].sort());
  const shapes = all.map((style) => {
    const grid = createGrid(80, 80);
    paintCrown({ grid, originY: 0 }, style, 40, 40, 14, 3, 0.8);
    expect(count(grid.cells, TONE.none), style).toBeLessThan(80 * 80 - 40);
    return grid.cells.join();
  });
  // No two styles paint the same picture.
  expect(new Set(shapes).size).toBe(all.length);
});

it('paints a chunk quickly enough to do in one frame now and then', () => {
  paintChunk(request(MID, -2));
  const started = performance.now();
  for (let chunk = -20; chunk < -10; chunk++) paintChunk(request(NEAR, chunk));
  // Ten chunks; generous, since CI machines vary. In a browser one takes a few ms.
  expect(performance.now() - started).toBeLessThan(2500);
});

it('colours far layers closer to the fog, and leaves empty cells see-through and mist half see-through', () => {
  const grid = paintChunk(request(MID, -1));
  const colours = (fog01: number): Uint8ClampedArray => { const out = new Uint8ClampedArray(grid.cells.length * 4); colourChunk(grid, -C.chunkHeight, biomeAt, fog01, out); return out; };
  const near = colours(0.1), far = colours(0.8);
  let nearGap = 0, farGap = 0, solid = 0;
  for (let i = 0; i < grid.cells.length; i++) {
    const tone = grid.cells[i]!;
    if (tone === TONE.none) { expect(near[i * 4 + 3]).toBe(0); continue; }
    if (tone === TONE.mist0 || tone === TONE.mist1) { expect(near[i * 4 + 3]).toBeLessThan(255); continue; }
    expect(near[i * 4 + 3]).toBe(255); solid++;
    const fog = skyAt(biomeAt(-C.chunkHeight + Math.floor(i / C.chunkWidth))).fog, sky = [(fog >> 16) & 255, (fog >> 8) & 255, fog & 255];
    for (let c = 0; c < 3; c++) { nearGap += Math.abs(near[i * 4 + c]! - sky[c]!); farGap += Math.abs(far[i * 4 + c]! - sky[c]!); }
  }
  expect(solid).toBeGreaterThan(1000);
  expect(farGap).toBeLessThan(nearGap * 0.5);
});

it('keeps neighbouring horizon ranges of one family apart, so each is coloured by its own biome', () => {
  for (let y = -3000; y < 300; y++) for (const parity of [0, 1] as const) {
    const k = horizonRangeAt(y, parity);
    if (k !== null) expect(((k % 2) + 2) % 2).toBe(parity);
  }
  // Every row is covered by at least one range or lies in a thin gap between them.
  let uncovered = 0;
  for (let y = -3000; y < 0; y++) if (horizonRangeAt(y, 0) === null && horizonRangeAt(y, 1) === null) uncovered++;
  expect(uncovered).toBeLessThan(3000 * 0.2);
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

it('gives each forest band a repeatable flavour from the seed, and every flavour can occur', () => {
  expect(flavourOfBand(1, 0)).toBe('broadleaf');
  const seen = new Set<string>();
  for (let band = 2; band < 120; band += 2) { expect(flavourOfBand(9, band)).toBe(flavourOfBand(9, band)); seen.add(flavourOfBand(9, band)); }
  expect(seen.size).toBe(C.flavours.length);
  expect(seen.has('jungle')).toBe(true);
});
