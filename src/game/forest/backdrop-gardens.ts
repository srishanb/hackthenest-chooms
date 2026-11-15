/** Seeded distant garden ledges. Decorative only: no physics bodies, bright rims or landing events. */
import type { Scene } from 'phaser';
import { ATMOSPHERE_CONFIG as C, unit } from '../../config/atmosphere.config';
import { mixColor, stableUnit } from './presentation';
export function createBackdropGardens(scene: Scene) {
  let snow = 0;
  const gardens = Array.from({ length: C.gardenSlots }, () => {
    const soil = scene.add.tileSprite(0, 0, 180, 48, 'grass-soil').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const skirt = scene.add.tileSprite(0, 0, 130, 24, 'grass-soil').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const grass = scene.add.tileSprite(0, 0, 180, 12, 'grass-middle').setOrigin(0.5, 0).setTileScale(2).setDepth(-5);
    const redGrass = scene.add.tileSprite(0, 0, 180, 12, 'grass-middle-red').setOrigin(0.5, 0).setTileScale(2).setDepth(-4.9);
    const snowySoil = scene.add.tileSprite(0, 0, 180, 48, 'snowforest-middle').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const snowySkirt = scene.add.tileSprite(0, 0, 130, 24, 'snowforest-middle').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const snowyGrass = scene.add.tileSprite(0, 0, 180, 12, 'snowforest-middle').setOrigin(0.5, 0).setTileScale(2).setDepth(-5);
    const plants = ['forest-fern', 'forest-mushrooms', 'grass-bush'].map((key) =>
      scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(1).setDepth(-5));
    const winterPlants = ['snowforest-pine', 'winter-crystal', 'snowforest-pine'].map((key) =>
      scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(key === 'snowforest-pine' ? 0.4 : 1).setDepth(-5));
    return { soil, skirt, grass, redGrass, plants, snowySoil, snowySkirt, snowyGrass, winterPlants };
  });
  return {
    setSnow(value: number) { snow = unit(value); },
    update(c: number) {
      const camera = scene.cameras.main;
      const scroll = camera.scrollY * 0.55;
      const first = Math.floor(scroll / C.gardenSpacingPx) - 1;
      for (const [i, garden] of gardens.entries()) {
        const id = first + i;
        const seed = stableUnit(`garden:${id}`);
        const width = 130 + seed * 160, depth = 22 + stableUnit(`depth:${id}`) * 34;
        const x = 70 + stableUnit(`garden-x:${id}`) * (camera.width - 140);
        const y = id * C.gardenSpacingPx + stableUnit(`garden-y:${id}`) * 90;
        const tint = mixColor(mixColor(0x5a8371, 0x9ab5c7, snow), 0x674063, c);
        garden.soil.setPosition(x, y).setSize(width, depth).setTint(tint).setAlpha(0.5 * (1 - snow));
        garden.skirt.setPosition(x, y + depth - 2).setSize(width * 0.65, 12).setTint(tint).setAlpha(0.45 * (1 - snow));
        garden.grass.setPosition(x, y).setSize(width, 12).setTint(tint).setAlpha(0.5 * (1 - snow) * (1 - c));
        garden.redGrass.setPosition(x, y).setSize(width, 12).setTint(0xc18e9d).setAlpha(0.5 * (1 - snow) * c);
        garden.snowySoil.setPosition(x, y).setSize(width, depth).setTint(tint).setAlpha(0.5 * snow);
        garden.snowySkirt.setPosition(x, y + depth - 2).setSize(width * 0.65, 12).setTint(tint).setAlpha(0.45 * snow);
        garden.snowyGrass.setPosition(x, y).setSize(width, 12).setTint(tint).setAlpha(0.5 * snow);
        // These objects live in parallax world space, not the gameplay camera's world coordinates.
        for (const image of [garden.soil, garden.skirt, garden.grass, garden.redGrass, garden.snowySoil, garden.snowySkirt, garden.snowyGrass]) {
          image.setScrollFactor(0); image.y -= scroll;
        }
        for (const [j, plant] of garden.plants.entries()) {
          plant.setScrollFactor(0).setPosition(x + (j - 1) * width * 0.3, y - scroll + 2)
            .setTint(tint).setAlpha(0.48 * (1 - snow));
          garden.winterPlants[j]!.setScrollFactor(0).setPosition(plant.x, plant.y)
            .setTint(tint).setAlpha(0.48 * snow);
        }
      }
    },
  };
}
