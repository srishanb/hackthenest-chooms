/** Continuous bark columns with finite seeded canopy clusters; complete forest plates never wrap vertically. */
import type { Scene } from 'phaser';
import { ATMOSPHERE_CONFIG as C } from '../../config/atmosphere.config';
import { mixColor, stableUnit } from './presentation';
import { crownLayout, visibleChunks } from './vertical-layout';

export function createVerticalForest(scene: Scene) {
  let snow = 0;
  const layers = [0.12, 0.28].map((factor, layer) => {
    const trunks = Array.from({ length: C.trunksPerLayer }, (_, i) => {
      const seed = stableUnit(`trunk:${layer}:${i}`);
      const image = scene.add.tileSprite(0, 0, 128, scene.scale.height, 'forest-trunk')
        .setOrigin(0).setScrollFactor(0).setTileScale(2).setDepth(-30 + layer * 4);
      const winter = scene.add.tileSprite(0, 0, 128, scene.scale.height, 'forest-trunk-snow')
        .setOrigin(0).setScrollFactor(0).setTileScale(2).setDepth(-29.9 + layer * 4);
      return { image, winter, seed, x: (i + seed * 0.6) / C.trunksPerLayer };
    });
    const crowns = Array.from({ length: C.crownSlots }, () => scene.add.image(0, 0, 'forest-crown')
      .setOrigin(0.5, 0).setScale(2).setScrollFactor(0).setDepth(-29 + layer * 4));
    const winterCrowns = Array.from({ length: C.crownSlots }, () => scene.add.image(0, 0, 'snowforest-crown')
      .setOrigin(0.5, 0).setScale(4).setScrollFactor(0).setDepth(-28 + layer * 4));
    return { factor, layer, trunks, crowns, winterCrowns };
  });
  return {
    setSnow(value: number) { snow = Math.max(0, Math.min(1, value)); },
    update(c: number) {
      const camera = scene.cameras.main, width = camera.width, height = camera.height;
      const scrollY = camera.scrollY;
      const altitude = Math.max(0, -scrollY) / 18000;
      const openness = Math.min(0.6, altitude * 0.6);
      for (const layer of layers) {
        const tint = mixColor(layer.layer ? 0x9ec99a : 0x638d82, 0x71416c, c);
        for (const trunk of layer.trunks) {
          trunk.image.setPosition(Math.round(trunk.x * width - 48), 0).setSize(128, height);
          // Source rows are reflected at both ends: exact RGBA continuity, no trunk reset/cutoff.
          trunk.image.tilePositionY = Math.round(scrollY * layer.factor / 2 + trunk.seed * 152);
          const alpha = (layer.layer ? 0.68 : 0.42) * (1 - openness);
          trunk.image.setTint(tint).setAlpha(alpha * (1 - snow));
          trunk.winter.setPosition(trunk.image.x, 0).setSize(128, height);
          trunk.winter.tilePositionY = trunk.image.tilePositionY;
          trunk.winter.setTint(mixColor(0xc2d9e9, 0x71416c, c)).setAlpha(alpha * snow);
        }
        const ids = visibleChunks(scrollY, height, layer.factor);
        for (const [i, crown] of layer.crowns.entries()) {
          const winter = layer.winterCrowns[i]!;
          const id = ids[Math.floor(i / 2)]; crown.setVisible(id !== undefined);
          winter.setVisible(id !== undefined);
          if (id === undefined) continue;
          const layout = crownLayout(layer.layer + (i % 2) * 7, id, width);
          layout.y += i % 2 * 260;
          const texture = (id + i + layer.layer) % 2 === 0 ? 'forest-crown' : 'forest-crown-alt';
          if (crown.texture.key !== texture) crown.setTexture(texture);
          crown.setPosition(Math.round(layout.x), Math.round(layout.y - scrollY * layer.factor))
            .setFlipX(layout.flip).setTint(tint).setAlpha(layout.alpha * (1 - openness) * (1 - snow));
          winter.setPosition(crown.x, crown.y).setFlipX(layout.flip)
            .setTint(mixColor(0xa7c7d5, 0x794d79, c)).setAlpha(snow * 0.6 * (1 - openness));
        }
      }
    },
  };
}
