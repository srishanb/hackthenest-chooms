/**
 * Ground for the backdrop: a grassy floating island with roots and leafy vines hanging under it,
 * and a rock crag (a floating cliff with strata and snow on its ledges) for the cold.
 * Pixel art from a seed in whole-forest coordinates, lit from the upper left. Pure: slots only.
 */
import { hash, noise1, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';

/** How deep an island's underside is below its top at column `x` (art pixels). Shared with waterfalls, which pour past it. */
export function islandColumn(cx: number, x: number, width: number, depth: number, seed: number): number {
  const across = (x - cx) / (width / 2);
  return Math.round(depth * Math.sqrt(Math.max(0, 1 - across * across)) * (0.75 + 0.5 * noise1(seed, x / 9))) + 2;
}

/**
 * A floating island: a grassy top `width` wide at `topY`, a rounded rocky underside `depth` deep,
 * roots and leafy vines hanging below (`vines01` how many). `snow01` whitens the top.
 */
export function paintIsland(surface: Surface, cx: number, topY: number, width: number, depth: number, seed: number, snow01: number, vines01 = 0.3): void {
  if (misses(surface, topY - 3, topY + depth * 3.4)) return;
  const half = width / 2;
  for (let dx = -Math.floor(half); dx <= half; dx++) {
    const x = Math.round(cx) + dx, across = dx / half;
    const column = islandColumn(cx, x, width, depth, seed);
    for (let d = 0; d < column; d++) {
      const share = (d + (hash(seed, x, d) - 0.5) * 3) / column;
      let tone: number;
      if (d < 2) tone = snow01 > 0.5 ? (d === 0 ? TONE.snow1 : TONE.snow0) : (hash(seed, x, 900 + d) < 0.5 ? TONE.leaf3 : TONE.leaf2);
      else if (d === 2 && snow01 <= 0.5 && hash(seed, x, 950) < 0.55) tone = TONE.leaf1;
      else tone = d === column - 1 ? TONE.rock0 : share < 0.4 ? (across < -0.2 ? TONE.rock2 : TONE.rock1) : share < 0.75 ? TONE.rock1 : TONE.rock0;
      plot(surface, x, topY + d, tone);
    }
    // A blade of grass here and there.
    if (snow01 <= 0.5 && hash(seed, x, 700) > 0.72) plot(surface, x, topY - 1, TONE.leaf3);
    // Roots trailing from the underside, and leafy vines that hang longer and carry leaves.
    const hanger = hash(seed, x, 800);
    if (hanger > 0.88) {
      const length = 3 + Math.floor(hash(seed, x, 801) * depth * 0.9);
      for (let d = 0; d < length; d++) plot(surface, x, topY + column + d, d % 4 === 3 ? TONE.leaf1 : TONE.bark1);
    } else if (snow01 < 0.5 && hanger < vines01 * 0.16 && Math.abs(across) < 0.8) {
      const length = 6 + Math.floor(hash(seed, x, 802) * depth * 1.8);
      for (let d = 0; d < length; d++) {
        plot(surface, x, topY + column - 1 + d, d % 3 === 2 ? TONE.leaf2 : TONE.leaf1);
        if (d % 5 === 3) plot(surface, x + (d % 10 === 3 ? -1 : 1), topY + column - 1 + d, TONE.leaf3);
      }
    }
  }
}

/** Depth of a crag below its top at column `x`: stepped cliffs narrowing to a point underneath. */
export function cragColumn(cx: number, x: number, width: number, depth: number, seed: number): number {
  const across = Math.abs((x - cx) / (width / 2));
  if (across > 1) return 0;
  // Steps of four columns, so the underside reads as broken cliff faces rather than a smooth bowl.
  const step = Math.floor(x / 4);
  const shape = (1 - across ** 1.6) * (0.7 + 0.5 * hash(seed, step, 31));
  return Math.max(3, Math.round(depth * shape));
}

/**
 * A rock crag floating in the cold: a flat top `width` wide at `topY` capped with snow, a deep body
 * of stepped cliffs `depth` deep with darker strata every few rows, lit faces on the left.
 */
export function paintCrag(surface: Surface, cx: number, topY: number, width: number, depth: number, seed: number, snow01: number): void {
  if (misses(surface, topY - 4, topY + depth + 2)) return;
  const half = width / 2;
  // The top is uneven: two or three flat steps rather than one line.
  const topAt = (x: number): number => topY + Math.round((noise1(seed + 5, x / 14) - 0.5) * 5 * Math.min(1, width / 60));
  for (let dx = -Math.floor(half); dx <= half; dx++) {
    const x = Math.round(cx) + dx, across = dx / half, column = cragColumn(cx, x, width, depth, seed);
    if (column <= 0) continue;
    const top = topAt(x), leftEdge = cragColumn(cx, x - 1, width, depth, seed) < column - 2;
    for (let d = 0; d < column - (top - topY); d++) {
      const y = top + d;
      let tone: number = across < -0.55 || leftEdge ? TONE.rock3 : across < -0.1 ? TONE.rock2 : across < 0.45 ? TONE.rock1 : TONE.rock0;
      // Thin wavy strata across the lit faces only.
      if (tone !== TONE.rock0 && (y + Math.round(Math.sin(x / 8 + seed) * 2)) % 9 === 0 && hash(seed, x >> 3, y) > 0.3) tone = tone === TONE.rock3 ? TONE.rock2 : TONE.rock1;
      if (d === 0) tone = snow01 > 0.3 ? TONE.snow1 : TONE.rock3;
      else if (d === 1 && snow01 > 0.3) tone = hash(seed, x, 3) < snow01 ? TONE.snow0 : tone;
      plot(surface, x, y, tone);
    }
  }
}
