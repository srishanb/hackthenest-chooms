/**
 * Distant garden ledges drawn behind the climb.
 * They are placed from a stable hash so they stay put, scroll slower than the camera,
 * and shift toward a snowy or dimmer look from the scenery values passed in.
 * Decorative only: nothing here touches physics or the player.
 */
import { sceneryCorruption } from '../../config/fuel-visibility.config';
/** Seeded distant garden ledges. Decorative only: no physics bodies, bright rims or landing events. */
import type { Scene } from 'phaser';
import { ATMOSPHERE_CONFIG as C, unit } from '../../config/atmosphere.config';
import { WILDLIFE_CONFIG } from '../../config/wildlife.config';
import { mixColor, stableUnit } from './presentation';
const FALL = WILDLIFE_CONFIG.waterfall;
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
    const plants = ['forest-fern', 'forest-mushrooms', 'grass-bush', 'forest-mushrooms', 'forest-fern'].map((key) =>
      scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(1).setDepth(-5));
    const winterPlants = ['snowforest-pine', 'winter-bush', 'winter-crystal', 'winter-bush', 'snowforest-pine'].map((key) =>
      scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(key === 'snowforest-pine' ? 0.4 : 1).setDepth(-5));
    const vines = [-0.3, 0.3].map(() => scene.add.image(0, 0, 'hanging-vine').setOrigin(0.5, 0).setDepth(-6).setScale(0.7));
    // A thin waterfall off the ledge's edge: a lip, a long body, and two fainter tails so it thins into mist.
    const fall = {
      lip: scene.add.sprite(0, 0, 'wildlife-waterfall-top', 0).setOrigin(0.5, 0).setScale(2).setScrollFactor(0).setDepth(-6.5),
      body: ['wildlife-waterfall-middle', 'wildlife-waterfall-middle', 'wildlife-waterfall-bottom'].map((key) =>
        scene.add.tileSprite(0, 0, FALL.frame * 2, FALL.frame * 2, key, 0).setOrigin(0.5, 0).setTileScale(2).setScrollFactor(0).setDepth(-6.5)),
    };
    return { vines, soil, skirt, grass, redGrass, plants, snowySoil, snowySkirt, snowyGrass, winterPlants, fall };
  });
  return {
    setSnow(value: number) { snow = unit(value); },
    /** `clockMs` drives the waterfalls; it already stands still while paused or with reduced motion. */
    update(c: number, clockMs = 0) {
      c = sceneryCorruption(c);
      // Falling water freezes as the snow comes in.
      const fallFrame = Math.floor(clockMs * (1 - snow) / FALL.frameMs) % FALL.frames;
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
        for (const [j, vine] of garden.vines.entries()) vine.setScrollFactor(0)
          .setPosition(x + (j ? 0.3 : -0.3) * width, y + depth - scroll - 4)
          .setTint(tint).setAlpha(0.4);
        // These objects live in parallax world space, not the gameplay camera's world coordinates.
        for (const image of [garden.soil, garden.skirt, garden.grass, garden.redGrass, garden.snowySoil, garden.snowySkirt, garden.snowyGrass]) {
          image.setScrollFactor(0); image.y -= scroll;
        }
        for (const [j, plant] of garden.plants.entries()) {
          plant.setScrollFactor(0).setPosition(x + (j - 2) * width * 0.18, y - scroll + 2)
            .setTint(tint).setAlpha(0.48 * (1 - snow));
          garden.winterPlants[j]!.setScrollFactor(0).setPosition(plant.x, plant.y)
            .setTint(tint).setAlpha(0.48 * snow);
        }
        // Some ledges, chosen by their stable id, spill a waterfall from one side.
        const falls = stableUnit(`fall:${id}`) < FALL.chance01;
        const { lip, body } = garden.fall;
        lip.setVisible(falls); for (const part of body) part.setVisible(falls);
        if (falls) {
          const fallX = Math.round(x + (stableUnit(`fall-x:${id}`) < 0.5 ? -0.34 : 0.34) * width);
          const length = FALL.minLengthPx + stableUnit(`fall-len:${id}`) * (FALL.maxLengthPx - FALL.minLengthPx);
          const water = mixColor(mixColor(0x9fdcd2, 0xe6f4ff, snow), 0x8f6a9c, c);
          const top = Math.round(y - scroll + 4), cell = FALL.frame * 2;
          if (lip.frame.name !== String(fallFrame)) lip.setFrame(fallFrame);
          lip.setPosition(fallX, top).setTint(water).setAlpha(FALL.alpha);
          // Lip, then the body, then two tails that fade: heights in px, alpha as a share of the body's.
          const parts: Array<[number, number]> = [[length, 1], [cell * 2, 0.55], [cell, 0.3]];
          let partTop = top + cell;
          for (const [i, part] of body.entries()) {
            const [partHeight, share] = parts[i]!;
            if (part.frame.name !== String(fallFrame)) part.setFrame(fallFrame);
            part.setPosition(fallX, partTop).setSize(cell, partHeight).setTint(water).setAlpha(FALL.alpha * share);
            partTop += partHeight;
          }
        }
      }
    },
  };
}
