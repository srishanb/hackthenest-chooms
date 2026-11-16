/**
 * Leaves: the crown shapes a backdrop tree or branch can carry, each painted as flat-shaded pixel
 * art from a seed and lit from the upper left.
 *
 * Why several: one lumpy clump everywhere read as the same blobby bush. These styles give each
 * forest its own silhouette: lumpy clumps, flat cedar tiers, wide umbrellas, weeping willow
 * strands, tall narrow columns, airy twigs with single leaves, palm fronds, broad jungle leaves and
 * drooping snow-laden boughs. `paintCrown` picks the painter for a style. `snow01` (0..1) loads the
 * lit tops with snow. Pure: slots into a grid, no canvas, no Phaser.
 */
import type { CrownStyle } from '../../config/backdrop.config';
import { hash, TONE } from './pixel-grid';
import { misses, plot, rowsOf, type Surface } from './surface';
import { paintBigLeaves, paintBoughs, paintFronds } from './foliage-shapes';

/**
 * A lumpy mass of leaves: several overlapping discs shaded as one, with a speckled edge between
 * tones. `stretchX` and `stretchY` squash it (a tall narrow column is 0.55 by 1.7).
 */
export function paintClump(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01 = 0, stretchX = 1, stretchY = 1): void {
  const size = Math.max(2, radius), reachX = size * 1.4 * stretchX, reachY = size * 1.4 * stretchY;
  if (misses(surface, cy - reachY, cy + reachY)) return;
  const xs = [cx], ys = [cy], rs = [size * 0.62];
  const lumps = 4 + Math.floor(hash(seed, 1) * 4);
  for (let i = 0; i < lumps; i++) {
    const angle = hash(seed, 10 + i) * Math.PI * 2, out = size * (0.25 + 0.4 * hash(seed, 20 + i));
    xs.push(cx + Math.cos(angle) * out * stretchX); ys.push(cy + Math.sin(angle) * out * 0.7 * stretchY); rs.push(size * (0.38 + 0.3 * hash(seed, 30 + i)));
  }
  const [top, bottom] = rowsOf(surface, cy - reachY, cy + reachY);
  const narrow = Math.min(stretchX, 1);
  for (let y = top; y <= bottom; y++) {
    for (let x = Math.floor(cx - reachX); x <= cx + reachX; x++) {
      let light = -9;
      for (let i = 0; i < xs.length; i++) {
        const dx = (x - xs[i]!) / (rs[i]! * narrow), dy = (y - ys[i]!) / rs[i]!, d2 = dx * dx + dy * dy;
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

/**
 * Flat pads of leaves: `pads` horizontal layers narrowing upward (a cedar), or one wide dome
 * (`dome`, an umbrella like an acacia). Each pad has a lit top, a dark underside and a ragged fringe.
 */
export function paintPads(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01: number, pads: number, dome: boolean): void {
  const r = Math.max(3, radius);
  if (misses(surface, cy - r * 2, cy + r * 1.2)) return;
  for (let p = 0; p < pads; p++) {
    const half = dome ? r * (1.45 + 0.2 * hash(seed, 3)) : r * (1.15 - 0.62 * p / Math.max(1, pads - 1)) + 1;
    const thick = Math.max(2, Math.round(dome ? r * 0.62 : r * 0.36));
    const padY = Math.round(dome ? cy - r * 0.2 : cy + r * 0.5 - p * r * 0.62);
    const padX = cx + (hash(seed, 10 + p) - 0.5) * r * 0.5;
    for (let row = 0; row <= thick; row++) {
      const share = (row + 0.5) / thick;
      const reach = half * (dome ? 0.15 + 0.85 * Math.sqrt(Math.max(0, 1 - (1 - share) * (1 - share))) : Math.min(1, 0.72 + share * 0.5));
      const y = padY - thick + row;
      for (let dx = -Math.ceil(reach); dx <= reach; dx++) {
        const x = Math.round(padX) + dx, across = dx / reach, speck = hash(seed, x, y);
        if (row === thick && speck > 0.55) continue;
        let tone: number = row === thick ? TONE.leaf0 : row === 0 ? (across < 0.2 ? TONE.leaf4 : TONE.leaf3)
          : share < 0.45 ? (across < -0.2 ? TONE.leaf3 : TONE.leaf2) : across > 0.5 ? TONE.leaf1 : TONE.leaf2;
        if (row > 0 && row < thick && speck > 0.9) tone = TONE.leaf1;
        if (snow01 > 0 && row <= 1 && speck < snow01 * 1.15) tone = row === 0 ? TONE.snow1 : TONE.snow0;
        plot(surface, x, y, tone);
      }
      // A hanging fringe of single leaves under the pad.
      if (row === thick) for (let dx = -Math.floor(reach * 0.9); dx <= reach * 0.9; dx += 2) if (hash(seed, padX + dx, 77) > 0.6) plot(surface, padX + dx, y + 1, TONE.leaf0);
    }
  }
}

/** A willow: a small dome with long strands of leaves hanging from it. */
export function paintWeeping(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01: number): void {
  const r = Math.max(3, radius);
  if (misses(surface, cy - r * 1.2, cy + r * 2.8)) return;
  const strands = Math.round(r * 1.3);
  for (let s = 0; s < strands; s++) {
    const across = hash(seed, 100 + s) * 2 - 1, x = Math.round(cx + across * r * 1.05);
    const start = cy + r * 0.1 * (1 - across * across);
    const length = r * (1 + 1.5 * hash(seed, 200 + s)) * (1 - 0.45 * Math.abs(across));
    for (let d = 0; d < length; d++) {
      const y = start + d, speck = hash(seed, x, Math.round(y));
      if (speck > 0.9) continue;
      // The strand sways a pixel out halfway down, and carries a lighter leaf now and then.
      const sway = d > length * 0.5 && across < 0 ? -1 : d > length * 0.5 ? 1 : 0;
      plot(surface, x + sway, y, speck > 0.72 ? TONE.leaf3 : across < -0.3 ? TONE.leaf2 : TONE.leaf1);
    }
  }
  paintClump(surface, cx, cy - r * 0.2, r * 0.78, seed, snow01, 1.15, 0.7);
}

/** Thin twigs fanning out, each carrying a few separate leaves (or blossoms), with sky showing between. */
export function paintSparse(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01: number): void {
  const r = Math.max(3, radius);
  if (misses(surface, cy - r * 1.4, cy + r * 1.2)) return;
  const twigs = 4 + Math.floor(hash(seed, 1) * 4);
  for (let t = 0; t < twigs; t++) {
    // Mostly upward and outward, like a thinning crown.
    const angle = -Math.PI * (0.08 + 0.84 * (t + hash(seed, 10 + t) * 0.8) / twigs), length = r * (0.7 + 0.5 * hash(seed, 20 + t));
    const steps = Math.ceil(length);
    for (let i = 0; i <= steps; i++) {
      const x = cx + Math.cos(angle) * i, y = cy + Math.sin(angle) * i * 0.85;
      plot(surface, x, y, TONE.bark1);
      if (i < 3 || (i + t) % 3 !== 0) continue;
      // A little cluster of leaves: a plus shape, lit on its upper left.
      const lx = Math.round(x + (hash(seed, t, i) - 0.5) * 3), ly = Math.round(y - 1);
      const lit = hash(seed, i, 300 + t) > 0.5;
      plot(surface, lx, ly, snow01 > hash(seed, lx, ly) ? TONE.snow0 : lit ? TONE.leaf4 : TONE.leaf3);
      plot(surface, lx - 1, ly + 1, TONE.leaf3); plot(surface, lx + 1, ly + 1, TONE.leaf1); plot(surface, lx, ly + 1, TONE.leaf2);
      if (hash(seed, lx, 400) > 0.5) plot(surface, lx, ly + 2, TONE.leaf1);
    }
  }
}

/** Paint a crown of `style` centred at (`cx`, `cy`), about `radius` across. */
export function paintCrown(surface: Surface, style: CrownStyle, cx: number, cy: number, radius: number, seed: number, snow01: number): void {
  switch (style) {
    case 'clump': paintClump(surface, cx, cy, radius, seed, snow01); return;
    case 'column': paintClump(surface, cx, cy - radius * 0.5, radius, seed, snow01, 0.55, 1.7); return;
    case 'tiers': paintPads(surface, cx, cy, radius, seed, snow01, 2 + Math.floor(hash(seed, 2) * 2.5), false); return;
    case 'umbrella': paintPads(surface, cx, cy, radius, seed, snow01, 1, true); return;
    case 'weeping': paintWeeping(surface, cx, cy, radius, seed, snow01); return;
    case 'sparse': paintSparse(surface, cx, cy, radius, seed, snow01); return;
    case 'fronds': paintFronds(surface, cx, cy, radius * 1.15, seed); return;
    case 'bigleaf': paintBigLeaves(surface, cx, cy, radius, seed); return;
    case 'boughs': paintBoughs(surface, cx, cy, radius, seed, snow01); return;
  }
}

/** Petals or leaves drifting down and to the right from a crown: `count` single pixels. */
export function paintPetals(surface: Surface, cx: number, cy: number, radius: number, seed: number, count: number): void {
  if (count <= 0 || misses(surface, cy - radius, cy + radius * 3.2)) return;
  for (let i = 0; i < count; i++) {
    const fall = hash(seed, 500 + i), x = cx + (hash(seed, 600 + i) - 0.3) * radius * 2 + fall * radius * 1.2;
    const y = cy + radius * 0.4 + fall * radius * 2.6;
    plot(surface, x, y, TONE.petal);
    if (hash(seed, 700 + i) > 0.6) plot(surface, x + 1, y, TONE.petal);
  }
}
