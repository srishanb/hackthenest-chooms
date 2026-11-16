/**
 * The plants, stones and crystals that stand on the ledges, as whole pieces of art drawn at the one
 * pixel size (`FOREST_CONFIG.pixelScale`).
 *
 * Why: props used to be squeezed to a target height with a fractional scale, so their pixels were
 * smaller than the terrain's. Now a ledge picks the prop that fits instead (presentation.ts
 * `pickFitting`). Some source images hold two or more sprites side by side; those are cut into
 * their own frames here (a crop of the original file, never edited pixels), so one mushroom or one
 * thorn bush can be chosen on its own.
 *
 * Every crop was checked to hold exactly one whole sprite of its sheet, and its width is even so a
 * centred prop still lands on the art grid.
 */
import type { Scene } from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';

export interface PropArt {
  /** Texture key (loaded in textures.ts). */
  key: string;
  /** Frame name: a crop added by `addPropFrames`, or undefined for the whole image. */
  frame?: string;
  /** Size in art px (texture px). */
  width: number;
  height: number;
  /** For a crop: where it sits in the source image, in texture px. */
  crop?: { x: number; y: number };
}

const art = (key: string, width: number, height: number, frame?: string, crop?: { x: number; y: number }): PropArt =>
  ({ key, width, height, frame, crop });

/**
 * Healthy props on forest and snowy ledges. Sizes in art px.
 * The big tree (`grass-tree`, 64x80) and pine (`snowforest-pine`, 58x110) are not here: at the one
 * pixel size they would be 160 and 220 px tall and bury the climb, so the fir sapling stands in.
 */
export const PROP_ART = {
  'mushroom-tall': art('forest-mushrooms', 28, 31, 'prop-mushroom-tall', { x: 2, y: 1 }),
  'mushroom-round': art('forest-mushrooms', 28, 28, 'prop-mushroom-round', { x: 34, y: 4 }),
  fern: art('forest-fern', 24, 29, 'prop-fern', { x: 4, y: 3 }),
  bush: art('grass-bush', 16, 16),
  stone: art('grass-stone', 8, 4, 'prop-stone', { x: 4, y: 12 }),
  'snowy-bush': art('winter-bush', 16, 16),
  crystal: art('winter-crystal', 16, 16),
  fir: art('winter-fir', 12, 14, 'prop-fir', { x: 2, y: 2 }),
} as const satisfies Record<string, PropArt>;

/** What a healthy prop turns into as the forest decays. Sizes in art px. */
export const DECAYED_ART = {
  'thorn-bush': art('forest-thorns', 26, 26, 'decay-thorn-bush', { x: 4, y: 10 }),
  'thorn-crystal': art('forest-thorns', 30, 25, 'decay-thorn-crystal', { x: 32, y: 11 }),
  'dark-weeds': art('forest-dark-mushrooms', 28, 26, 'decay-dark-weeds', { x: 34, y: 42 }),
  'dark-sprout': art('forest-dark-mushrooms', 24, 18, 'decay-dark-sprout', { x: 36, y: 74 }),
  'dark-shroom': art('forest-dark-mushrooms', 16, 14, 'decay-dark-shroom', { x: 32, y: 6 }),
  'dark-shroom-2': art('forest-dark-mushrooms', 16, 14, 'decay-dark-shroom-2', { x: 48, y: 6 }),
  'dark-grass': art('forest-dark-mushrooms', 28, 14, 'decay-dark-grass', { x: 34, y: 22 }),
  'ice-crystal': art('winter-crystal', 16, 16),
} as const satisfies Record<string, PropArt>;

/** Healthy props per biome, tallest first: the fallbacks when a ledge's own pick does not fit. */
export const FOREST_PROPS: readonly PropArt[] = [PROP_ART['mushroom-tall'], PROP_ART.fern, PROP_ART['mushroom-round'], PROP_ART.bush, PROP_ART.stone];
export const WINTER_PROPS: readonly PropArt[] = [PROP_ART.crystal, PROP_ART['snowy-bush'], PROP_ART.fir, PROP_ART.stone];

/** Decayed partners per biome, in no particular order (the seed picks among those that fit). */
export const FOREST_DECAY: readonly PropArt[] = Object.values(DECAYED_ART).filter((piece) => piece.key !== 'winter-crystal');
export const WINTER_DECAY: readonly PropArt[] = [DECAYED_ART['ice-crystal']];

/** Drawn size of a piece in world px: always exactly `pixelScale` per art pixel. */
export function drawnSize(piece: PropArt): { width: number; height: number } {
  return { width: piece.width * FOREST_CONFIG.pixelScale, height: piece.height * FOREST_CONFIG.pixelScale };
}

/** Add the crop frames to their textures once per game. Call after the forest textures have loaded. */
export function addPropFrames(scene: Scene): void {
  for (const piece of [...Object.values(PROP_ART), ...Object.values(DECAYED_ART)] as PropArt[]) {
    if (!piece.frame || !piece.crop || !scene.textures.exists(piece.key)) continue;
    const texture = scene.textures.get(piece.key);
    if (!texture.has(piece.frame)) texture.add(piece.frame, 0, piece.crop.x, piece.crop.y, piece.width, piece.height);
  }
}
