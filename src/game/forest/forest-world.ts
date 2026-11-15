/** Bounded forest scenery and platform skins. All positions are decorative, never collision bodies. */
import type { GameObjects, Scene } from 'phaser';
import { FOREST_CONFIG as C } from '../../config/forest.config';
import type { LoadedWorld } from '../world/section-loader';
import { mixColor, reveal, stableUnit } from './presentation';

export interface ForestWorld {
  update(corruption: number, deltaMs: number, reducedMotion: boolean, paused: boolean): void;
}

export function createForestWorld(scene: Scene, world: LoadedWorld): ForestWorld {
  const camera = scene.cameras.main;
  const width = scene.scale.width, height = scene.scale.height;
  const sky = scene.add.rectangle(0, 0, width, height, C.sky.calm).setOrigin(0).setScrollFactor(0).setDepth(-40);
  const layers: Array<{ image: GameObjects.TileSprite; factor: number; dark: boolean }> = [];
  for (const [i, key] of ['forest-back', 'forest-front'].entries()) {
    const factor = C.parallax[i]!;
    for (const dark of [false, true]) {
      const image = scene.add.tileSprite(0, 0, width, height, key).setOrigin(0).setScrollFactor(0)
        .setTileScale(C.pixelScale).setDepth(-30 + i * 4 + (dark ? 1 : 0));
      image.setTint(dark ? 0x945a8a : 0x9ec99a);
      layers.push({ image, factor, dark });
    }
  }
  const canopy = scene.add.tileSprite(0, 0, width, height, 'forest-dark-canopy').setOrigin(0).setScrollFactor(0)
    .setTileScale(C.pixelScale).setTint(0x78516e).setDepth(-22);
  const leaves = scene.add.tileSprite(0, 0, width, height, 'forest-dark-leaves').setOrigin(0).setScrollFactor(0)
    .setTileScale(C.pixelScale).setTint(0xb45f80).setDepth(-20);
  const mist = scene.add.tileSprite(0, 0, width, height, 'forest-mist').setOrigin(0).setScrollFactor(0)
    .setTileScale(C.pixelScale).setDepth(-8);
  const terrain: Array<GameObjects.TileSprite | GameObjects.Image> = [];
  const rims: GameObjects.Rectangle[] = [];
  const props: Array<{ healthy: GameObjects.Image; decayed: GameObjects.Image; threshold: number }> = [];
  for (const platform of world.platforms) {
    const left = platform.x - platform.width / 2, top = platform.y - platform.height / 2;
    terrain.push(scene.add.tileSprite(left, top, platform.width, platform.height, 'forest-middle')
      .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    const capWidth = Math.min(32, platform.width / 2);
    for (const [x, key] of [[left, 'forest-left'], [left + platform.width - capWidth, 'forest-right']] as const) {
      terrain.push(scene.add.tileSprite(x, top, capWidth, platform.height, key)
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    }
    rims.push(scene.add.rectangle(platform.x, top + 1, platform.width, 2, C.rim.calm).setDepth(1));
    if (props.length < C.maxProps) {
      for (const side of [-1, 1]) {
        if (props.length >= C.maxProps) break;
        const seed = stableUnit(`${platform.id}:${side}`);
        const x = platform.x + side * (platform.width / 2 - Math.min(28, platform.width / 4));
        const healthy = scene.add.image(x, top + 3, seed > 0.5 ? 'forest-fern' : 'forest-mushrooms')
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-2);
        const decayed = scene.add.image(x, top + 3, seed > 0.5 ? 'forest-thorns' : 'forest-dark-mushrooms')
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-1).setAlpha(0);
        // Match the healthy prop's height instead of growing a tall atlas fragment over a landing.
        decayed.setScale(C.pixelScale * healthy.height / decayed.height);
        props.push({ healthy, decayed, threshold: seed * 0.65 });
      }
    }
  }
  const spores = Array.from({ length: C.spores }, (_, i) => ({
    x: stableUnit(`spore-x:${i}`) * width, y: stableUnit(`spore-y:${i}`) * height,
    seed: stableUnit(`spore-phase:${i}`),
    image: scene.add.rectangle(0, 0, i % 3 === 0 ? 3 : 2, 2, 0xffdba4).setScrollFactor(0).setDepth(4),
  }));
  let clock = 0;
  return {
    update(corruption, deltaMs, reducedMotion, paused) {
      const c = Math.max(0, Math.min(1, corruption));
      if (import.meta.env.DEV) {
        scene.game.canvas.dataset.forestCorruption = c.toFixed(3);
        scene.game.canvas.dataset.forestFps = scene.game.loop.actualFps.toFixed(1);
      }
      if (!reducedMotion && !paused) clock += Math.min(deltaMs, 100);
      sky.setFillStyle(mixColor(C.sky.calm, C.sky.corrupted, c));
      for (const layer of layers) {
        // Paired layers always share their anchor, scale and parallax: no crossfade jump.
        layer.image.tilePositionY = camera.scrollY * layer.factor / C.pixelScale;
        layer.image.setAlpha(layer.dark ? c : 1 - c);
      }
      canopy.tilePositionY = camera.scrollY * C.parallax[0] / C.pixelScale;
      canopy.setAlpha(c * 0.32);
      leaves.tilePositionY = camera.scrollY * C.parallax[1] / C.pixelScale;
      leaves.setAlpha(c * 0.1);
      mist.tilePositionX = reducedMotion ? 0 : clock / 160;
      mist.tilePositionY = camera.scrollY * 0.08 / C.pixelScale;
      mist.setTint(mixColor(0xa9d4c0, 0xbf8aa9, c)).setAlpha(0.04 + C.mistMaxAlpha * c);
      const tint = mixColor(C.terrain.calm, C.terrain.corrupted, c);
      for (const tile of terrain) tile.setTint(tint);
      for (const rim of rims) rim.setFillStyle(mixColor(C.rim.calm, C.rim.corrupted, c));
      for (const prop of props) {
        const blend = reveal(c, prop.threshold);
        prop.healthy.setAlpha(0.85 * (1 - blend)).setTint(mixColor(0xd7ebcb, 0xb88da3, c));
        prop.decayed.setAlpha(blend * 0.8);
      }
      for (const spore of spores) {
        const phase = clock / C.sporePeriodMs * Math.PI * 2 + spore.seed * Math.PI * 2;
        const drift = reducedMotion ? 0 : Math.sin(phase) * C.sporeDriftPx;
        spore.image.setPosition(spore.x + drift, spore.y + (reducedMotion ? 0 : Math.cos(phase) * C.sporeDriftPx));
        spore.image.setFillStyle(mixColor(0xd5f2a6, 0xf6a17e, c)).setAlpha(0.08 + c * 0.3);
      }
    },
  };
}
