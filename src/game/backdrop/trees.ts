/**
 * Whole trees and their parts for the backdrop: a limb, a leafy tree with any crown style, a pine,
 * a tall mushroom, a palm, shelf fungi for trunks and the small plants that grow on islands.
 * Each is pixel art from a seed, standing at a point in whole-forest coordinates, lit from the
 * upper left. Pure: slots into a grid, no canvas, no Phaser.
 */
import { BACKDROP_CONFIG, type CrownStyle } from '../../config/backdrop.config';
import { hash, subSeed, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';
import { paintCrown } from './foliage';

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

/** A leafy tree standing at (`x`, `baseY`): a leaning trunk, one fork, and crowns of `style`. */
export function paintBroadleaf(surface: Surface, x: number, baseY: number, height: number, seed: number, snow01: number, style: CrownStyle = 'clump'): void {
  const crown = height * (0.22 + 0.12 * hash(seed, 1)) * BACKDROP_CONFIG.broadleafCrownScale;
  if (misses(surface, baseY - height - crown * 2.4, baseY + crown * 2.6)) return;
  const lean = (hash(seed, 2) - 0.5) * height * 0.35, girth = Math.max(2, height * BACKDROP_CONFIG.treeGirth01.broadleaf);
  const topX = x + lean, topY = baseY - height;
  const midX = x + lean * 0.35 + (hash(seed, 3) - 0.5) * 4, midY = baseY - height * 0.5;
  const side = hash(seed, 4) < 0.5 ? -1 : 1;
  const forkX = midX + side * height * 0.28, forkY = midY - height * 0.3;
  paintLimb(surface, x, baseY, midX, midY, girth, girth * 0.7);
  paintLimb(surface, midX, midY, topX, topY, girth * 0.7, 1.5);
  // A single tall crown (a column or umbrella) reads best alone; the rounder styles get a fork too.
  if (style === 'column' || style === 'umbrella') { paintCrown(surface, style, topX, topY, crown * 1.1, subSeed(seed, 7), snow01); return; }
  paintLimb(surface, midX, midY, forkX, forkY, girth * 0.5, 1);
  paintCrown(surface, style, forkX, forkY, crown * 0.75, subSeed(seed, 5), snow01);
  if (style === 'clump') paintCrown(surface, style, topX - side * crown * 0.5, topY + crown * 0.2, crown * 0.8, subSeed(seed, 6), snow01);
  paintCrown(surface, style, topX, topY - crown * 0.2, crown, subSeed(seed, 7), snow01);
}

/** A pine standing at (`x`, `baseY`): a short trunk and tiers of needles that narrow to a point. `snow01` loads the tiers with snow. */
export function paintPine(surface: Surface, x: number, baseY: number, height: number, seed: number, snow01: number): void {
  if (misses(surface, baseY - height - 2, baseY + 2)) return;
  paintLimb(surface, x, baseY, x, baseY - height * 0.3, Math.max(2, height * BACKDROP_CONFIG.treeGirth01.pine), 1);
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
  const girth = Math.max(2, height * BACKDROP_CONFIG.treeGirth01.mushroom);
  paintLimb(surface, x, baseY, topX, topY, girth, Math.max(2, girth * 0.67), true);
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

/** A palm standing at (`x`, `baseY`): a thin curving ringed trunk and a head of fronds. */
export function paintPalm(surface: Surface, x: number, baseY: number, height: number, seed: number): void {
  if (misses(surface, baseY - height * 1.6, baseY + height * 0.6)) return;
  const bend = (hash(seed, 1) - 0.5) * height * 0.7, girth = Math.max(2, Math.round(height * 0.07));
  const steps = Math.ceil(height);
  let topX = x, topY = baseY;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    topX = x + bend * t * t; topY = baseY - height * t;
    // Rings: every third row of the trunk is a shade darker.
    for (let j = 0; j < girth; j++) plot(surface, topX - girth / 2 + j, topY, i % 3 === 0 ? TONE.bark0 : j === 0 ? TONE.bark3 : j === girth - 1 ? TONE.bark0 : TONE.bark2);
  }
  paintCrown(surface, 'fronds', topX, topY, height * (0.45 + 0.15 * hash(seed, 2)), subSeed(seed, 3), 0);
}

/** A shelf fungus on the side of a trunk at (`x`, `y`): a half disc `width` wide sticking out toward `side` (-1 left, 1 right). */
export function paintShelfFungus(surface: Surface, x: number, y: number, width: number, side: -1 | 1, seed: number): void {
  const w = Math.max(2, width), tall = Math.max(2, Math.round(w * 0.45));
  if (misses(surface, y - tall, y + 2)) return;
  for (let row = 0; row < tall; row++) {
    const reach = w * Math.sqrt(1 - ((tall - 1 - row) / tall) ** 2);
    for (let d = 0; d <= reach; d++) {
      const tone = row === tall - 1 ? TONE.stem1 : row === 0 || d > reach - 1 ? TONE.cap2 : hash(seed, d, row) > 0.6 ? TONE.cap2 : TONE.cap1;
      plot(surface, x + side * d, y - tall + 1 + row, tone);
    }
  }
}

/** A short mushroom on an island top: a pale stalk and a small round cap. */
export function paintSmallMushroom(surface: Surface, x: number, baseY: number, size: number, seed: number): void {
  const s = Math.max(2, Math.round(size));
  for (let d = 1; d <= s; d++) plot(surface, x, baseY - d, TONE.stem0);
  const capY = baseY - s, half = Math.max(1, Math.round(s * (0.5 + 0.4 * hash(seed, 1))));
  for (let dx = -half; dx <= half; dx++) {
    plot(surface, x + dx, capY, dx < 0 ? TONE.cap2 : TONE.cap1);
    if (Math.abs(dx) < half) plot(surface, x + dx, capY - 1, dx <= 0 ? TONE.cap2 : TONE.cap1);
  }
}

/** A fern or tuft of grass on an island top: a few short blades arching out from (`x`, `baseY`). */
export function paintFern(surface: Surface, x: number, baseY: number, size: number, seed: number, snow01: number): void {
  const blades = 3 + Math.floor(hash(seed, 1) * 3), s = Math.max(2, size);
  for (let b = 0; b < blades; b++) {
    const lean = (b / (blades - 1) - 0.5) * 2, length = s * (0.7 + 0.5 * hash(seed, 10 + b));
    for (let d = 0; d < length; d++) {
      const t = d / length, bx = x + lean * d * 0.7 + lean * t * t * 2, by = baseY - 1 - d * (1 - Math.abs(lean) * 0.35) + t * t * Math.abs(lean) * 2;
      plot(surface, bx, by, snow01 > 0.6 && t > 0.6 ? TONE.snow0 : lean < 0 ? TONE.leaf3 : TONE.leaf2);
    }
  }
}
