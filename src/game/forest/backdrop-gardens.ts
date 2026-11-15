/** Seeded distant garden ledges. Decorative only: no physics bodies, bright rims or landing events. */
import type { Scene } from 'phaser';
import { mixColor, stableUnit } from './presentation';
export function createBackdropGardens(scene: Scene) {
  const raw = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('forestHeight') ?? 0) : 0;
  const offset = Number.isFinite(raw) ? raw : 0;
  const gardens = Array.from({ length: 5 }, () => {
    const soil = scene.add.tileSprite(0, 0, 180, 48, 'grass-soil').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const skirt = scene.add.tileSprite(0, 0, 130, 24, 'grass-soil').setOrigin(0.5, 0).setTileScale(2).setDepth(-6);
    const grass = scene.add.tileSprite(0, 0, 180, 12, 'grass-middle').setOrigin(0.5, 0).setTileScale(2).setDepth(-5);
    const plants = ['forest-fern', 'forest-mushrooms', 'grass-bush'].map((key) =>
      scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(1).setDepth(-5));
    return { soil, skirt, grass, plants };
  });
  return {
    update(c: number) {
      const camera = scene.cameras.main;
      const scroll = (camera.scrollY - offset) * 0.55;
      const first = Math.floor(scroll / 520) - 1;
      for (const [i, garden] of gardens.entries()) {
        const id = first + i;
        const seed = stableUnit(`garden:${id}`);
        const width = 130 + seed * 160, depth = 22 + stableUnit(`depth:${id}`) * 34;
        const x = 70 + stableUnit(`garden-x:${id}`) * (camera.width - 140);
        const y = id * 520 + stableUnit(`garden-y:${id}`) * 150;
        const tint = mixColor(0x5a8371, 0x674063, c);
        garden.soil.setPosition(x, y).setSize(width, depth).setTint(tint).setAlpha(0.5);
        garden.skirt.setPosition(x, y + depth - 2).setSize(width * 0.65, 12).setTint(tint).setAlpha(0.45);
        garden.grass.setPosition(x, y).setSize(width, 12).setTint(tint).setAlpha(0.5);
        // These objects live in parallax world space, not the gameplay camera's world coordinates.
        for (const image of [garden.soil, garden.skirt, garden.grass]) {
          image.setScrollFactor(0); image.y -= scroll;
        }
        for (const [j, plant] of garden.plants.entries()) {
          plant.setScrollFactor(0).setPosition(x + (j - 1) * width * 0.3, y - scroll + 2)
            .setTint(tint).setAlpha(0.48);
        }
      }
    },
  };
}
