/** Selected local forest textures, loaded once through BootScene; no CDN or source-pack loading. */
import type { Scene } from 'phaser';
import { FOREST_CONFIG } from '../../config/forest.config';

export const FOREST_IMAGES = {
  'hanging-vine': 'winter/vine_hanging.png',
  'winter-bush': 'winter/snowy_bush.png',
  'forest-trunk-snow': 'forest/trunk-snow.png',
  'corruption-abstract': 'corruption/abstract-25.png',
  'forest-crown-alt': 'forest/canopy-cluster-alt.png',
  'snowforest-crown': 'winter-forest/crown.png',
  'snowforest-left': 'winter-forest/left.png', 'snowforest-middle': 'winter-forest/middle.png', 'snowforest-right': 'winter-forest/right.png', 'snowforest-pine': 'winter-forest/pine.png',
  'grass-left': 'grassland/left.png', 'grass-middle': 'grassland/middle.png', 'grass-right': 'grassland/right.png',
  'grass-bush': 'grassland/bush.png', 'grass-stone': 'grassland/stone.png',
  'grass-soil': 'grassland/soil.png',
  'grass-cloud': 'grassland/cloud.png',
  'grass-tree': 'grassland/tree.png',
  'grass-left-red': 'grassland/left-red.png', 'grass-middle-red': 'grassland/middle-red.png',
  'grass-right-red': 'grassland/right-red.png', 'grass-soil-red': 'grassland/soil-red.png',
  'winter-left': 'winter/snowdirt_plat_left.png', 'winter-middle': 'winter/snowdirt_plat_mid.png', 'winter-right': 'winter/snowdirt_plat_right.png',
  'winter-fir': 'winter/fir_sapling.png', 'winter-crystal': 'winter/ice_crystal.png',
  'forest-trunk': 'forest/trunk-loop.png', 'forest-crown': 'forest/canopy-cluster.png',
  'forest-back': 'forest/trees-4.png', 'forest-front': 'forest/trees-2.png',
  'forest-mist': 'forest/mist.png', 'forest-dark-canopy': 'dark-forest/tree-bg.png',
  'forest-dark-leaves': 'dark-forest/back-forest.png',
  'forest-left': 'forest/terrain-left.png', 'forest-middle': 'forest/terrain-middle.png',
  'forest-right': 'forest/terrain-right.png', 'forest-fern': 'forest/fern.png',
  'forest-mushrooms': 'forest/mushrooms.png', 'forest-dark-mushrooms': 'dark-forest/mushrooms.png',
  'forest-thorns': 'dark-forest/thorns.png',
} as const;
export const RUBY_FRAMES = { idle: 10, run: 10, rise: 3, fall: 3, charge: 6, land: 3 } as const;

export function preloadForest(scene: Scene): void {
  for (const [key, file] of Object.entries(FOREST_IMAGES)) {
    if (!scene.textures.exists(key)) scene.load.image(key, `assets/${file}`);
  }
  for (const [key, file] of [['snow', 'snow_medium'], ['leaves', 'leaves_autumn'], ['fog', 'fog_thin']]) {
    if (!scene.textures.exists('weather-' + key)) scene.load.spritesheet('weather-' + key, 'assets/weather/' + file + '.png', { frameWidth: 128, frameHeight: 128 });
  }
  for (let i = 1; i <= 16; i++) if (!scene.textures.exists('wind-gust-' + i)) scene.load.image('wind-gust-' + i, 'assets/wind/W401-' + i + '.png');
  for (const state of Object.keys(RUBY_FRAMES)) {
    const key = `forest-ruby-${state}`;
    if (!scene.textures.exists(key)) scene.load.spritesheet(key, `assets/forest/ruby-${state}.png`, {
      frameWidth: FOREST_CONFIG.characterFrame.width, frameHeight: FOREST_CONFIG.characterFrame.height,
    });
  }
}
