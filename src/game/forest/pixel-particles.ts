/**
 * Tiny airborne things (fireflies, spores, falling leaves) drawn by code, a few art pixels each, at
 * the one pixel size.
 *
 * Why: the 16 x 16 images used before were drawn at 1x beside 2x terrain (so their pixels were half
 * size), and at 2x they would be far too big. Instead a handful of small pixel shapes is painted once
 * into one canvas texture, the same way the candle and the darkness are drawn by code. Leaves no
 * longer rotate freely (that breaks the square pixels): `leafPose` picks one of three drawn angles and
 * a flip. No downloaded or generated art; the leaf colours are taken from the leaf images they replace
 * (public/assets/wildlife/leaf-*.png, reodesuxz).
 */
import type { Scene } from 'phaser';

export const PARTICLE_TEXTURE = 'pixel-particles';

/**
 * Shapes, one string per row: '.' is empty; other letters are looked up in the palette.
 * Fireflies and spores are drawn light (w, l) so the game's tint gives their colour.
 */
const SHAPES = {
  firefly: ['.l.', 'lwl', '.l.'],
  spore: ['ll', 'll'],
  /** A leaf lying flat, tip to the right. */
  'leaf-0': ['.bbb..', 'hvvvbb', '.bbb..'],
  /** A leaf at 45 degrees, tip up and to the right. */
  'leaf-1': ['...hb', '..bbb', '.bvb.', 'bvb..', '.b...'],
  /** A leaf standing up, tip at the top. */
  'leaf-2': ['.h.', 'bbb', 'bvb', 'bvb', '.b.'],
} as const;

const LIGHT = { w: '#ffffff', l: 'rgba(255,255,255,0.6)' } as const;
/** Leaf colours: body, vein and highlight, from the leaf images these replace. */
export const LEAF_COLOURS = {
  green: { b: '#5cb85c', v: '#215735', h: '#9be18b' },
  'green-dark': { b: '#388548', v: '#215735', h: '#5cb85c' },
  orange: { b: '#f08a24', v: '#8f1804', h: '#ffc345' },
  red: { b: '#d9452f', v: '#780c25', h: '#ff8a56' },
} as const;
export type LeafColour = keyof typeof LEAF_COLOURS;
export type LeafFrame = 0 | 1 | 2;

/** Frame name of a leaf of this colour at this angle step. */
export const leafFrame = (colour: LeafColour, frame: LeafFrame): string => `leaf-${colour}-${frame}`;

/**
 * The drawn pose closest to a free rotation `angle` (radians, clockwise as on screen): one of three
 * shapes plus flips. A leaf looks the same turned half a circle, so only 0..180 degrees matter.
 */
export function leafPose(angle: number): { frame: LeafFrame; flipY: boolean } {
  const turn = Number.isFinite(angle) ? ((angle % Math.PI) + Math.PI) % Math.PI : 0;
  const step = Math.round(turn / (Math.PI / 4)) % 4;
  // 0: flat. 1: tip down-right (the up-right shape flipped). 2: upright. 3: tip up-right.
  if (step === 0) return { frame: 0, flipY: false };
  if (step === 2) return { frame: 2, flipY: false };
  return { frame: 1, flipY: step === 1 };
}

/** Every frame to paint: its name, its shape and its palette. */
function frames(): Array<{ name: string; rows: readonly string[]; palette: Readonly<Record<string, string>> }> {
  const list: Array<{ name: string; rows: readonly string[]; palette: Readonly<Record<string, string>> }> = [
    { name: 'firefly', rows: SHAPES.firefly, palette: LIGHT },
    { name: 'spore', rows: SHAPES.spore, palette: LIGHT },
  ];
  for (const colour of Object.keys(LEAF_COLOURS) as LeafColour[]) {
    for (const frame of [0, 1, 2] as const) list.push({ name: leafFrame(colour, frame), rows: SHAPES[`leaf-${frame}`], palette: LEAF_COLOURS[colour] });
  }
  return list;
}

/** Paint the particle texture once per game (art px; draw it at `pixelScale`). */
export function ensureParticleTexture(scene: Scene): void {
  if (scene.textures.exists(PARTICLE_TEXTURE)) return;
  const list = frames();
  // One row of cells, each as wide as the widest shape plus a gap, so no frame bleeds into the next.
  const cell = 1 + Math.max(...list.map((f) => Math.max(f.rows.length, ...f.rows.map((row) => row.length))));
  const texture = scene.textures.createCanvas(PARTICLE_TEXTURE, cell * list.length, cell);
  if (!texture) return;
  const context = texture.getContext();
  for (const [i, f] of list.entries()) {
    for (const [y, row] of f.rows.entries()) {
      for (const [x, char] of [...row].entries()) {
        const colour = f.palette[char];
        if (!colour) continue;
        context.fillStyle = colour;
        context.fillRect(i * cell + x, y, 1, 1);
      }
    }
    texture.add(f.name, 0, i * cell, 0, Math.max(...f.rows.map((row) => row.length)), f.rows.length);
  }
  texture.refresh();
}
