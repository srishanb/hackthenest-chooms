/**
 * The crown styles that are not round masses: palm fronds, broad single leaves (both for the
 * jungle) and drooping needle boughs loaded with snow (for the cold). Split from foliage.ts to keep
 * each file short. Lit from the upper left, a few flat tones each. Pure: slots into a grid.
 */
import { hash, TONE } from './pixel-grid';
import { misses, plot, type Surface } from './surface';

/**
 * Palm fronds: arching ribs from the crown's heart, each with leaflets on both sides that hang
 * back along it, the upper side lit. Some fronds rise, the outer ones droop.
 */
export function paintFronds(surface: Surface, cx: number, cy: number, radius: number, seed: number): void {
  const r = Math.max(4, radius);
  if (misses(surface, cy - r * 1.2, cy + r * 1.6)) return;
  const fronds = 6 + Math.floor(hash(seed, 1) * 3);
  for (let f = 0; f < fronds; f++) {
    // Spread across the top half, from straight out to the left round to straight out to the right.
    const angle = -Math.PI + Math.PI * (f + 0.5 + (hash(seed, 10 + f) - 0.5) * 0.6) / fronds;
    const length = r * (0.85 + 0.45 * hash(seed, 20 + f)), droop = 0.55 + 0.6 * hash(seed, 30 + f) + Math.abs(Math.cos(angle)) * 0.5;
    const steps = Math.ceil(length * 1.2);
    let px = cx, py = cy;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, x = cx + Math.cos(angle) * length * t, y = cy + Math.sin(angle) * length * t + droop * length * t * t;
      const dx = x - px, dy = y - py; px = x; py = y;
      plot(surface, x, y, TONE.leaf2);
      if (i % 2 === 1 || t > 0.95) continue;
      // Leaflets: short strokes either side, sweeping back and down, shorter toward the tip.
      const span = Math.max(1, Math.round((1 - t) * r * 0.28 + 1)), norm = Math.hypot(dx, dy) || 1;
      const nx = -dy / norm, ny = dx / norm;
      for (const side of [-1, 1]) for (let k = 1; k <= span; k++) {
        const lx = x + side * nx * k - dx / norm * k * 0.5, ly = y + side * ny * k + k * 0.6;
        const upper = side * ny < 0;
        plot(surface, lx, ly, k === span ? TONE.leaf0 : upper ? (k < 2 ? TONE.leaf4 : TONE.leaf3) : TONE.leaf1);
      }
    }
  }
  // The heart of the crown, where the fronds meet, and a few dark fruit.
  for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) plot(surface, cx + dx, cy + dy, dy < 0 ? TONE.leaf3 : TONE.leaf1);
  if (hash(seed, 2) > 0.5) for (let k = 0; k < 3; k++) plot(surface, cx - 1 + k, cy + 2, TONE.bark0);
}

/** Broad jungle leaves: four to seven big pointed leaves with a dark midrib, angled out and down. */
export function paintBigLeaves(surface: Surface, cx: number, cy: number, radius: number, seed: number): void {
  const r = Math.max(4, radius);
  if (misses(surface, cy - r * 1.3, cy + r * 1.5)) return;
  const leaves = 4 + Math.floor(hash(seed, 1) * 4);
  for (let l = 0; l < leaves; l++) {
    const angle = -Math.PI * 0.95 + Math.PI * 1.25 * (l + hash(seed, 10 + l) * 0.7) / leaves;
    const length = r * (0.85 + 0.4 * hash(seed, 20 + l)), width = length * (0.3 + 0.1 * hash(seed, 30 + l));
    const ux = Math.cos(angle), uy = Math.sin(angle), baseX = cx + ux * r * 0.15, baseY = cy + uy * r * 0.15;
    const reach = Math.ceil(length + 2);
    for (let y = Math.floor(baseY - reach); y <= baseY + reach + length * 0.3; y++) {
      for (let x = Math.floor(baseX - reach); x <= baseX + reach; x++) {
        // Along the leaf (u) and across it (v); the tip bends down a little.
        const rx = x - baseX, ry = y - baseY, u = rx * ux + ry * uy;
        if (u < 0 || u > length) continue;
        const v = -rx * uy + ry * ux - (u / length) ** 2 * length * 0.25 * Math.sign(ux || 1);
        const half = width * Math.sin(Math.PI * u / length) ** 0.75;
        if (Math.abs(v) > half) continue;
        const tone = Math.abs(v) < 0.7 ? TONE.leaf1 : Math.abs(v) > half - 1 ? TONE.leaf1 : v * Math.sign(ux || 1) < 0 ? (u < length * 0.6 ? TONE.leaf4 : TONE.leaf3) : TONE.leaf2;
        plot(surface, x, y, tone);
      }
    }
  }
}

/**
 * Drooping needle boughs, like the end of a snowy fir branch: three overlapping skirts of dark
 * needles, the upper ones narrower, each thick in the middle and thinning toward its drooping
 * ends, with a pillow of snow along its top (`snow01` 0 leaves them bare) and a ragged fringe below.
 */
export function paintBoughs(surface: Surface, cx: number, cy: number, radius: number, seed: number, snow01: number): void {
  const r = Math.max(4, radius);
  if (misses(surface, cy - r * 1.2, cy + r * 1.6)) return;
  const tiers = 3;
  for (let d = 0; d < tiers; d++) {
    const half = r * (0.55 + 0.55 * d / (tiers - 1)) * (0.9 + 0.2 * hash(seed, 30 + d));
    const centreX = cx + (hash(seed, 10 + d) - 0.5) * r * 0.3, tierTop = cy - r * 0.65 + d * r * 0.42;
    const thick = Math.max(3, r * 0.6), droop = r * 0.3;
    const pillow = snow01 > 0.15 ? 1 + Math.round(snow01 * 1.5) : 0;
    for (let dx = -Math.floor(half); dx <= half; dx++) {
      const across = Math.abs(dx / half), x = Math.round(centreX) + dx;
      const top = Math.round(tierTop + droop * across * across);
      const bottom = Math.round(top + thick * (1 - 0.6 * across)) + (hash(seed, x, 900 + d) > 0.55 ? 1 : 0) - ((x + d) % 3 === 0 ? 1 : 0);
      const cap = across > 0.85 ? Math.min(1, pillow) : pillow;
      for (let y = top; y <= bottom; y++) {
        const depth = y - top, lit = dx < 0;
        const tone = depth < cap ? (depth === 0 && lit ? TONE.snow1 : TONE.snow0)
          : y >= bottom ? TONE.leaf0 : depth < cap + 1 && lit ? TONE.leaf2 : hash(seed, x, y) > 0.85 ? TONE.leaf2 : TONE.leaf1;
        plot(surface, x, y, tone);
      }
    }
  }
}
