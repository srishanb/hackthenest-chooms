/**
 * The things the backdrop is made of, each painted as pixel art from a seed: a clump of leaves,
 * a limb, a broadleaf tree, a pine, a tall mushroom and a floating island.
 *
 * Every painter takes whole-forest coordinates (art pixels, y grows downward) and a surface that
 * knows which rows it covers, so a tree that straddles two chunks is painted into both and lines
 * up. Light comes from the upper left throughout. Pure: slots into a grid, no canvas, no Phaser.
 */
import { hash, noise1, put, subSeed, TONE, type PixelGrid } from './pixel-grid';

/** A grid and the forest row its first row stands for. */
export interface Surface { grid: PixelGrid; originY: number }

const plot = (surface: Surface, x: number, y: number, tone: number): void =>
  put(surface.grid, Math.round(x), Math.round(y) - surface.originY, tone);

/** True when rows `top`..`bottom` miss the surface entirely, so a painter can skip its work. */
const misses = (surface: Surface, top: number, bottom: number): boolean =>
  bottom < surface.originY || top >= surface.originY + surface.grid.height;

/**
 * A lumpy mass of leaves: several overlapping discs shaded as one, lit from the upper left,
 * with a speckled edge between tones. `snow01` (0..1) caps the lit top with snow.
 */
export function paintClump(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01 = 0): void {
  const size = Math.max(2, radius), reach = size * 1.4;
  if (misses(surface, cy - reach, cy + reach)) return;
  const xs = [cx], ys = [cy], rs = [size * 0.62];
  const lumps = 4 + Math.floor(hash(seed, 1) * 4);
  for (let i = 0; i < lumps; i++) {
    const angle = hash(seed, 10 + i) * Math.PI * 2, out = size * (0.25 + 0.4 * hash(seed, 20 + i));
    xs.push(cx + Math.cos(angle) * out); ys.push(cy + Math.sin(angle) * out * 0.7); rs.push(size * (0.38 + 0.3 * hash(seed, 30 + i)));
  }
  const top = Math.max(Math.floor(cy - reach), surface.originY);
  const bottom = Math.min(Math.ceil(cy + reach), surface.originY + surface.grid.height - 1);
  for (let y = top; y <= bottom; y++) {
    for (let x = Math.floor(cx - reach); x <= cx + reach; x++) {
      let light = -9;
      for (let i = 0; i < xs.length; i++) {
        const dx = (x - xs[i]!) / rs[i]!, dy = (y - ys[i]!) / rs[i]!, d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        // Brighter toward the upper left of each lump and toward its middle.
        const value = -dx * 0.5 - dy * 0.8 + (1 - d2) * 0.3;
        if (value > light) light = value;
      }
      if (light === -9) continue;
      const value = light + (hash(seed, x, y) - 0.5) * 0.16;
      let tone: number = value > 0.7 ? TONE.leaf4 : value > 0.35 ? TONE.leaf3 : value > -0.05 ? TONE.leaf2 : value > -0.5 ? TONE.leaf1 : TONE.leaf0;
      if (snow01 > 0 && value > 0.78 - snow01 * 0.62) tone = value > 0.98 - snow01 * 0.5 ? TONE.snow1 : TONE.snow0;
      plot(surface, x, y, tone);
    }
  }
}

/** A trunk or branch between two points, `w0` wide at the start and `w1` at the end. `stem` paints it pale (a mushroom's stalk). */
export function paintLimb(surface: Surface, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, stem = false): void {
  const pad = Math.max(w0, w1);
  if (misses(surface, Math.min(y0, y1) - pad, Math.max(y0, y1) + pad)) return;
  const lit = stem ? TONE.stem0 : TONE.bark2, mid = stem ? TONE.stem0 : TONE.bark1, dark = stem ? TONE.stem1 : TONE.bark0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const upright = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const width = Math.max(1, Math.round(w0 + (w1 - w0) * t));
    for (let j = 0; j < width; j++) {
      // Across the limb: lit on the upper-left side, dark on the lower-right.
      const across = width === 1 ? 0 : j / (width - 1) * 2 - 1;
      const tone = width <= 2 ? (j === 0 ? mid : dark) : across < -0.3 ? lit : across > 0.45 ? dark : mid;
      if (upright) plot(surface, x - width / 2 + j, y, tone); else plot(surface, x, y - width / 2 + j, tone);
    }
  }
}

/** A leafy tree standing at (`x`, `baseY`): a leaning trunk, one fork and three clumps for a crown. */
export function paintBroadleaf(surface: Surface, x: number, baseY: number, height: number, seed: number, snow01: number): void {
  const crown = height * (0.22 + 0.12 * hash(seed, 1));
  if (misses(surface, baseY - height - crown * 1.6, baseY + 2)) return;
  const lean = (hash(seed, 2) - 0.5) * height * 0.35, girth = Math.max(2, height * 0.07);
  const topX = x + lean, topY = baseY - height;
  const midX = x + lean * 0.35 + (hash(seed, 3) - 0.5) * 4, midY = baseY - height * 0.5;
  const side = hash(seed, 4) < 0.5 ? -1 : 1;
  const forkX = midX + side * height * 0.28, forkY = midY - height * 0.3;
  paintLimb(surface, x, baseY, midX, midY, girth, girth * 0.7);
  paintLimb(surface, midX, midY, topX, topY, girth * 0.7, 1.5);
  paintLimb(surface, midX, midY, forkX, forkY, girth * 0.5, 1);
  paintClump(surface, forkX, forkY, crown * 0.75, subSeed(seed, 5), snow01);
  paintClump(surface, topX - side * crown * 0.5, topY + crown * 0.2, crown * 0.8, subSeed(seed, 6), snow01);
  paintClump(surface, topX, topY - crown * 0.2, crown, subSeed(seed, 7), snow01);
}

/** A pine standing at (`x`, `baseY`): a short trunk and tiers of needles that narrow to a point. `snow01` loads the tiers with snow. */
export function paintPine(surface: Surface, x: number, baseY: number, height: number, seed: number, snow01: number): void {
  if (misses(surface, baseY - height - 2, baseY + 2)) return;
  paintLimb(surface, x, baseY, x, baseY - height * 0.3, Math.max(2, height * 0.05), 1);
  const tiers = Math.max(3, Math.floor(height / 13)), widest = height * (0.2 + 0.08 * hash(seed, 1));
  const step = height * 0.82 / tiers, tierHeight = Math.ceil(step * 1.7);
  for (let tier = 0; tier < tiers; tier++) {
    const half = widest * (1 - tier / tiers * 0.85) + 1;
    const tierTop = Math.round(baseY - height * 0.18 - step * (tier + 1));
    for (let row = 0; row < tierHeight; row++) {
      const y = tierTop + row, reach = Math.max(0.6, half * (row + 1) / tierHeight);
      for (let dx = -Math.ceil(reach); dx <= reach; dx++) {
        const px = Math.round(x) + dx, across = dx / reach;
        // The lowest row of a tier is ragged, like hanging needles.
        if (row === tierHeight - 1 && (px + tier) % 2 === 0) continue;
        let tone: number = row >= tierHeight - 2 ? TONE.leaf0 : across < -0.35 ? TONE.leaf3 : across < 0.3 ? TONE.leaf2 : TONE.leaf1;
        if (snow01 > 0 && across < 0.55 && row < tierHeight * 0.5 * snow01) tone = across < -0.1 ? TONE.snow1 : TONE.snow0;
        plot(surface, px, y, tone);
      }
    }
  }
}

/** A tall mushroom standing at (`x`, `baseY`): a pale leaning stalk under a spotted dome. */
export function paintMushroom(surface: Surface, x: number, baseY: number, height: number, seed: number): void {
  const half = height * (0.28 + 0.2 * hash(seed, 1)), dome = Math.max(3, Math.round(half * (0.55 + 0.3 * hash(seed, 2))));
  if (misses(surface, baseY - height - dome - 2, baseY + 2)) return;
  const topX = Math.round(x + (hash(seed, 3) - 0.5) * height * 0.3), topY = Math.round(baseY - height);
  paintLimb(surface, x, baseY, topX, topY, Math.max(2, height * 0.09), Math.max(2, height * 0.06), true);
  // Gills: a darker underside one row below the dome's rim.
  for (let dx = -Math.floor(half * 0.8); dx <= half * 0.8; dx++) plot(surface, topX + dx, topY + 1, dx % 2 === 0 ? TONE.stem1 : TONE.cap0);
  for (let row = 0; row < dome; row++) {
    const y = topY - dome + 1 + row, down = (row + 1) / dome, reach = half * Math.sqrt(1 - (1 - down) * (1 - down));
    for (let dx = -Math.ceil(reach); dx <= reach; dx++) {
      const px = topX + dx, across = dx / Math.max(1, reach);
      const value = -across * 0.5 + (1 - down) * 0.9 - 0.3;
      let tone: number = row === dome - 1 ? TONE.cap0 : value > 0.45 ? TONE.cap2 : value > -0.15 ? TONE.cap1 : TONE.cap0;
      // Pale spots, laid out on a coarse grid so each is a small blob.
      if (down < 0.85 && hash(seed, Math.floor(px / 3) + 50, Math.floor(y / 3)) > 0.8) tone = TONE.stem0;
      plot(surface, px, y, tone);
    }
  }
}

/**
 * A floating island: a grassy top `width` wide at `topY`, a rounded rocky underside `depth` deep,
 * and a few roots hanging below. `snow01` whitens the top.
 */
export function paintIsland(surface: Surface, cx: number, topY: number, width: number, depth: number, seed: number, snow01: number): void {
  if (misses(surface, topY - 3, topY + depth * 2.2)) return;
  const half = width / 2;
  for (let dx = -Math.floor(half); dx <= half; dx++) {
    const x = Math.round(cx) + dx, across = dx / half;
    const column = Math.round(depth * Math.sqrt(Math.max(0, 1 - across * across)) * (0.75 + 0.5 * noise1(seed, x / 9))) + 2;
    for (let d = 0; d < column; d++) {
      const share = (d + (hash(seed, x, d) - 0.5) * 3) / column;
      let tone: number;
      if (d < 2) tone = snow01 > 0.5 ? (d === 0 ? TONE.snow1 : TONE.snow0) : (hash(seed, x, 900 + d) < 0.5 ? TONE.leaf3 : TONE.leaf2);
      else tone = d === column - 1 ? TONE.rock0 : share < 0.4 ? (across < -0.2 ? TONE.rock2 : TONE.rock1) : share < 0.75 ? TONE.rock1 : TONE.rock0;
      plot(surface, x, topY + d, tone);
    }
    // A blade of grass here and there, and now and then a root trailing from the underside.
    if (snow01 <= 0.5 && hash(seed, x, 700) > 0.72) plot(surface, x, topY - 1, TONE.leaf3);
    if (hash(seed, x, 800) > 0.86) {
      const length = 3 + Math.floor(hash(seed, x, 801) * depth * 0.9);
      for (let d = 0; d < length; d++) plot(surface, x, topY + column + d, d % 4 === 3 ? TONE.leaf1 : TONE.bark1);
    }
  }
}
