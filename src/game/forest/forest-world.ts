/** Bounded forest scenery and platform skins. All positions are decorative, never collision bodies. */
import { ENVIRONMENT_ASSETS } from '../../config/environment-assets.config';
import type { GameObjects, Scene } from 'phaser';
import { FOREST_CONFIG as C } from '../../config/forest.config';
import type { LoadedWorld } from '../world/section-loader';
import type { PlatformBox } from '../player/types';
import type { VisualEnvironment } from '../../config/atmosphere.config';
import { createVerticalForest } from './vertical-forest';
import { createAtmosphere } from './atmosphere';
import { createBackdropGardens } from './backdrop-gardens';
import { mixColor, reveal, stableUnit } from './presentation';

export interface ForestWorld {
  update(corruption: number, deltaMs: number, reducedMotion: boolean, paused: boolean, strength?: number): void;
  setEnvironment(value: Partial<VisualEnvironment>): void;
  syncPlatforms(platforms: readonly PlatformBox[]): void;
}

export function createForestWorld(scene: Scene, world: LoadedWorld): ForestWorld {
  const camera = scene.cameras.main;
  const width = scene.scale.width, height = scene.scale.height;
  const sky = scene.add.rectangle(0, 0, width, height, C.sky.calm).setOrigin(0).setScrollFactor(0).setDepth(-40);
  const background = createVerticalForest(scene);
  const atmosphere = createAtmosphere(scene);
  const gardens = createBackdropGardens(scene);
  const mist = scene.add.tileSprite(0, 0, width, height, 'forest-mist').setOrigin(0).setScrollFactor(0)
    .setTileScale(C.pixelScale).setDepth(-8);
  const terrain: Array<GameObjects.TileSprite | GameObjects.Image> = [];
  const rims: GameObjects.Rectangle[] = [];
  const props: Array<{ healthy: GameObjects.Image; decayed: GameObjects.Image; threshold: number }> = [];
  const platformMarks: Array<{ id: string; x: number; y: number; marks: Array<{
    image: GameObjects.Image | GameObjects.TileSprite | GameObjects.Rectangle; x: number; y: number;
  }> }> = [];
  for (const platform of world.platforms) {
    const winter = world.sections.some((section) => (section.stage?.snow01 ?? 0) > 0 && section.platforms.some((row) => row.id === platform.id));
    const skin = winter ? ENVIRONMENT_ASSETS.winter : ENVIRONMENT_ASSETS.forest;
    const terrainStart = terrain.length, rimStart = rims.length, propStart = props.length;
    const left = platform.x - platform.width / 2, top = platform.y - platform.height / 2;
    terrain.push(scene.add.tileSprite(left, top, platform.width, Math.min(12, platform.height), skin.middle)
      .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    // A tapered, stepped island silhouette rather than a full rectangular slab.
    // These are render-only soil columns; the original landing boxes are authoritative.
    const columns = 9, columnWidth = platform.width / columns;
    for (let column = 0; column < columns; column++) {
      const edge = Math.min(column, columns - column - 1);
      const variation = Math.floor(stableUnit(`soil:${platform.id}:${column}`) * 3) * 2;
      const depth = 4 + Math.min(edge, 3) * 4 + variation;
      const inset = column === 0 || column === columns - 1 ? 5 : 0;
      terrain.push(scene.add.tileSprite(left + column * columnWidth + (column === 0 ? inset : 0),
        top + 10, columnWidth - inset, depth, winter ? skin.middle : 'grass-soil')
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(-1));
    }
    const capWidth = Math.min(32, platform.width / 2);
    for (const [x, key] of [[left, skin.left], [left + platform.width - capWidth, skin.right]] as const) {
      terrain.push(scene.add.tileSprite(x, top, capWidth, Math.min(12, platform.height), key)
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    }
    rims.push(scene.add.rectangle(platform.x, top + 1, platform.width, 2, C.rim.calm).setDepth(1));
    if (props.length < C.maxProps) {
      // Both edges receive seeded vegetation within the fixed 100-pair budget.
      for (const side of [-1, 1]) {
        if (props.length >= C.maxProps) break;
        const seed = stableUnit(`${platform.id}:${side}`);
        const x = platform.x + side * (platform.width / 2 - Math.min(28, platform.width / 4));
        const healthy = scene.add.image(x, top + 3, winter ? skin.plant : seed > 0.75 ? skin.plant : seed > 0.5 ? 'forest-fern' : seed > 0.12 ? 'forest-mushrooms' : 'grass-stone')
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-2);
        healthy.setScale(Math.min(C.pixelScale, 48 / healthy.height));
        const decayed = scene.add.image(x, top + 3, winter ? skin.decay : seed > 0.5 ? 'forest-thorns' : 'forest-dark-mushrooms')
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-1).setAlpha(0);
        // Match the healthy prop's height instead of growing a tall atlas fragment over a landing.
        decayed.setScale(C.pixelScale * healthy.height / decayed.height);
        props.push({ healthy, decayed, threshold: seed * 0.65 });
      }
    }
    // Follow authored moving ledges using simulation positions, never signal values.
    const images = [...terrain.slice(terrainStart), ...rims.slice(rimStart),
      ...props.slice(propStart).flatMap((prop) => [prop.healthy, prop.decayed])];
    platformMarks.push({ id: platform.id, x: platform.x, y: platform.y,
      marks: images.map((image) => ({ image, x: image.x, y: image.y })) });
  }
  const spores = Array.from({ length: C.spores }, (_, i) => ({
    x: stableUnit(`spore-x:${i}`) * width, y: stableUnit(`spore-y:${i}`) * height,
    seed: stableUnit(`spore-phase:${i}`),
    image: scene.add.rectangle(0, 0, i % 3 === 0 ? 3 : 2, 2, 0xffdba4).setScrollFactor(0).setDepth(4),
  }));
  let clock = 0;
  const floor = world.platforms.find((platform) => platform.width >= world.width * 0.9);
  if (floor) for (let i = 1; i <= 8; i++) {
    const plant = scene.add.image(i / 9 * world.width, floor.y - floor.height / 2 + 2,
      i % 3 === 0 ? 'forest-mushrooms' : 'forest-fern').setOrigin(0.5, 1).setScale(1).setDepth(-2);
    props.push({ healthy: plant, decayed: scene.add.image(plant.x, plant.y, 'forest-thorns')
      .setOrigin(0.5, 1).setScale(0.7).setDepth(-1).setAlpha(0), threshold: stableUnit(`floor:${i}`) * 0.65 });
  }
  return {
    setEnvironment(value) {
      atmosphere.setEnvironment(value);
      background.setSnow(value.snowEnabled ? value.snow01 ?? 0 : 0);
    },
    syncPlatforms(platforms) {
      const positions = new Map(platforms.map((platform) => [platform.id, platform]));
      for (const group of platformMarks) {
        const position = positions.get(group.id);
        if (position) for (const mark of group.marks) {
          mark.image.setPosition(mark.x + position.x - group.x, mark.y + position.y - group.y);
        }
      }
    },
    update(corruption, deltaMs, reducedMotion, paused, strength = 1) {
      const c = Math.max(0, Math.min(1, corruption));
      if (import.meta.env.DEV) {
        scene.game.canvas.dataset.forestCorruption = c.toFixed(3);
        scene.game.canvas.dataset.forestFps = scene.game.loop.actualFps.toFixed(1);
      }
      if (!reducedMotion && !paused) clock += Math.min(deltaMs, 100);
      sky.setFillStyle(mixColor(C.sky.calm, C.sky.corrupted, c));
      background.update(c);
      gardens.update(c);
      atmosphere.update(c, deltaMs, reducedMotion, paused, strength);
      sky.setSize(camera.width, camera.height);
      mist.setSize(camera.width, camera.height);
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
