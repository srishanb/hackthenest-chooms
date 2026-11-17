/**
 * Builds the forest scenery and platform skins around the climb.
 * It layers sky, background forest, atmosphere, gardens and the corruption screen,
 * and reskins each platform. Everything is decorative; no collision bodies are made here.
 */
import { FUEL_VISIBILITY_CONFIG as V, sceneryCorruption } from '../../config/fuel-visibility.config';
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
import { createCorruptionScreen } from './corruption-screen';
import { createAmbientLife } from './ambient-life';
import { createGrassTufts } from './grass-tufts';
import { createPerchingBirds } from './perching-birds';
import { createBackdrop, type BackdropSource } from '../backdrop/backdrop-view';
import { mixColor, pickFitting, pickPartner, reveal, stableUnit } from './presentation';
import { snapToGrid } from './pixel-grid-snap';
import { addPropFrames, drawnSize, FOREST_DECAY, FOREST_PROPS, PROP_ART, WINTER_DECAY, WINTER_PROPS } from './prop-art';

export interface ForestWorld {
  update(corruption: number, deltaMs: number, reducedMotion: boolean, paused: boolean, strength?: number): void;
  setEnvironment(value: Partial<VisualEnvironment>): void;
  /** Tell the scenery where the candle is, so the birds on the ledges can fly off as it comes near. */
  setCandle(x: number, y: number): void;
  /** A new run's seed for the generated backdrop. Does nothing when the world was built without one. */
  reseedBackdrop(seed: number): void;
  syncPlatforms(platforms: readonly PlatformBox[]): void;
  /** Draw a platform that appeared after the world was built (endless mode). `winter` picks the snowy skin. */
  addPlatform(platform: PlatformBox, winter: boolean): void;
  /** Destroy everything drawn for a platform. Unknown ids are ignored. */
  removePlatform(id: string): void;
  /**
   * Shake a platform's art sideways by `offsetX` px (snapped to the art grid) or hide it (a crumbling ledge,
   * ledge-kinds-view.ts). Decorative only; unknown ids are ignored.
   */
  setPlatformLook(id: string, offsetX: number, visible: boolean): void;
}

/**
 * `backdrop` asks for the forest behind the climb to be generated from a seed (the endless climb).
 * Without it the older repeating trunks and far garden ledges are drawn (the authored climb).
 */
export function createForestWorld(scene: Scene, world: LoadedWorld, backdrop?: BackdropSource): ForestWorld {
  const camera = scene.cameras.main;
  const width = scene.scale.width, height = scene.scale.height;
  // Cut the multi-sprite prop sheets into single props (prop-art.ts) before any ledge is drawn.
  addPropFrames(scene);
  const sky = scene.add.rectangle(0, 0, width, height, C.sky.calm).setOrigin(0).setScrollFactor(0).setDepth(-40);
  const generated = backdrop ? createBackdrop(scene, backdrop) : null;
  // A generated backdrop draws its own gradient sky over the whole screen, so the flat one would only cost fill.
  sky.setVisible(!generated);
  const background = generated ? null : createVerticalForest(scene);
  const atmosphere = createAtmosphere(scene);
  const gardens = generated ? null : createBackdropGardens(scene);
  const life = createAmbientLife(scene);
  const grass = createGrassTufts(scene);
  const birds = createPerchingBirds(scene);
  let candle: { x: number; y: number } | null = null;
  let snowMix = 0;
  const screen = createCorruptionScreen(scene);
  const mist = scene.add.tileSprite(0, 0, width, height, 'forest-mist').setOrigin(0).setScrollFactor(0)
    .setTileScale(C.pixelScale).setDepth(-8);
  /** Everything drawn for one platform, kept together so a platform can be removed while playing. */
  interface PlatformSkin {
    id: string; x: number; y: number;
    /** Where the art was last drawn, so a still ledge costs nothing per frame. */
    drawnX: number; drawnY: number;
    /** Extra sideways shake (grid px) and whether it is shown (a crumbling ledge). */
    lookX: number; shown: boolean;
    terrain: GameObjects.TileSprite[];
    redTerrain: Array<{ normal: GameObjects.TileSprite; red: GameObjects.TileSprite }>;
    props: Array<{ healthy: GameObjects.Image; decayed: GameObjects.Image; threshold: number }>;
    marks: Array<{ image: GameObjects.Image | GameObjects.Sprite | GameObjects.TileSprite | GameObjects.Rectangle; x: number; y: number }>;
  }
  const skins = new Map<string, PlatformSkin>();
  const rims: GameObjects.Rectangle[] = [];
  /** Decorations that belong to no platform (the plants along the first floor). */
  const looseProps: PlatformSkin['props'] = [];
  let propCount = 0;
  function addPlatform(platform: PlatformBox, winter: boolean): void {
    if (skins.has(platform.id)) return;
    // A bounce cap is a mushroom, drawn whole by ledge-kinds-view.ts: no soil, plants or birds.
    if (platform.type === 'bounce') return;
    const skin = winter ? ENVIRONMENT_ASSETS.winter : ENVIRONMENT_ASSETS.forest;
    const terrain: PlatformSkin['terrain'] = [], redTerrain: PlatformSkin['redTerrain'] = [], props: PlatformSkin['props'] = [];
    const left = platform.x - platform.width / 2, top = platform.y - platform.height / 2;
    // The ledge's art is drawn on the art grid (pixel-grid-snap.ts); its landing box stays exact.
    const artLeft = snapToGrid(left), artTop = snapToGrid(top), artWidth = snapToGrid(platform.width);
    terrain.push(scene.add.tileSprite(artLeft, artTop, artWidth, Math.min(6, platform.height), skin.middle)
      .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    // A tapered, stepped island silhouette rather than a full rectangular slab.
    // These are render-only soil columns; the original landing boxes are authoritative.
    const columns = 13, columnWidth = artWidth / columns;
    for (let column = 0; column < columns; column++) {
      const normalized = (column + 0.5) / columns * 2 - 1;
      const variation = Math.floor(stableUnit(`soil:${platform.id}:${column}`) * 2) * 2;
      const depth = 2 + Math.round(Math.sqrt(1 - normalized * normalized) * 24 / 2) * 2 + variation;
      const inset = column === 0 || column === columns - 1 ? 6 : 0;
      // Column edges on grid lines, so neighbouring columns meet without a gap or an overlap.
      const start = snapToGrid(column * columnWidth) + (column === 0 ? inset : 0);
      const end = snapToGrid((column + 1) * columnWidth) - (column === columns - 1 ? inset : 0);
      terrain.push(scene.add.tileSprite(artLeft + start,
        artTop + 4, end - start, depth, winter ? skin.middle : 'grass-soil')
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(-1));
    }
    const capWidth = snapToGrid(Math.min(32, artWidth / 2));
    for (const [x, key] of [[artLeft, skin.left], [artLeft + artWidth - capWidth, skin.right]] as const) {
      terrain.push(scene.add.tileSprite(x, artTop, capWidth, Math.min(6, platform.height), key)
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(0));
    }
    if (!winter) for (const tile of [...terrain]) {
      const key = `${tile.texture.key}-red`;
      if (!scene.textures.exists(key)) continue;
      const red = scene.add.tileSprite(tile.x, tile.y, tile.width, tile.height, key)
        .setOrigin(0).setTileScale(C.pixelScale).setDepth(tile.depth + 0.1).setAlpha(0);
      redTerrain.push({ normal: tile, red });
      terrain.push(red);
    }
    if (propCount < C.maxProps) {
      // Stable one/two-plant compositions avoid identical bookends on every platform.
      const composition = stableUnit(`composition:${platform.id}`);
      const slots = composition > 0.55 ? [-0.9, -0.45, 0.25, 0.8] : [-0.8, -0.15, 0.65];
      for (const side of slots) {
        if (propCount >= C.maxProps) break;
        const seed = stableUnit(`${platform.id}:${side}`);
        const x = snapToGrid(platform.x + side * (platform.width / 2 - Math.min(28, platform.width / 4)));
        // Pick the prop that fits this spot and draw it at the one pixel size; never squeeze it to a height.
        const own = winter ? (seed > 0.75 ? PROP_ART.crystal : seed > 0.5 ? PROP_ART['snowy-bush'] : seed > 0.25 ? PROP_ART.fir : PROP_ART.stone)
          : seed > 0.8 ? PROP_ART['mushroom-round'] : seed > 0.65 ? PROP_ART.bush : seed > 0.45 ? PROP_ART.fern : seed > 0.1 ? PROP_ART['mushroom-tall'] : PROP_ART.stone;
        // A seeded height budget per spot (44..76 px): about half the spots are tall enough for a mushroom or a fern,
        // the rest get a bush or a stone. Nothing taller (the big tree and pine never fit).
        const maxHeight = 44 + stableUnit(`plant-size:${platform.id}:${side}`) * 32;
        const piece = pickFitting([own, ...(winter ? WINTER_PROPS : FOREST_PROPS)], drawnSize, platform.width / 2, maxHeight)!;
        // One art pixel into the soil (it was 3 px), so the prop stands in the grass rather than on it.
        const base = snapToGrid(top) + C.pixelScale;
        const healthy = scene.add.image(x, base, piece.key, piece.frame)
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-2);
        // The decayed partner is chosen no taller than the healthy prop, so nothing grows tall over a landing.
        const partner = pickPartner(winter ? WINTER_DECAY : FOREST_DECAY, drawnSize, drawnSize(piece).height + 4, stableUnit(`decay:${platform.id}:${side}`))!;
        const decayed = scene.add.image(x, base, partner.key, partner.frame)
          .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-1).setAlpha(0);
        props.push({ healthy, decayed, threshold: seed * 0.65 });
        propCount++;
      }
    }
    // Vines at the one pixel size; a seeded mirror keeps neighbours from looking stamped (they were scaled 0.65..1.35).
    const vines = [-0.65, 0.45].map((offset) => scene.add.image(snapToGrid(platform.x + platform.width * offset / 2),
      snapToGrid(top) + 12, 'hanging-vine').setOrigin(0.5, 0).setDepth(-2)
      .setScale(C.pixelScale).setFlipX(stableUnit(`vine:${platform.id}:${offset}`) < 0.5)
      .setTint(winter ? 0xb1cad6 : 0x8ca778));
    // Ice: a bright blue sheet over the top, a white glint along it and icicles hanging off the front,
    // so an icy ledge is told apart from plain snow at a glance.
    const ice: GameObjects.Rectangle[] = [];
    if (platform.type === 'slippery') {
      // Every edge on whole art pixels (two world px), so the ice sits on the same grid as the terrain.
      ice.push(scene.add.rectangle(artLeft - 2, artTop - 2, artWidth + 4, 8, 0x8fd4ff, 0.95).setOrigin(0).setDepth(0.5));
      ice.push(scene.add.rectangle(artLeft + 4, artTop - 2, artWidth - 8, 2, 0xe9f8ff, 0.95).setOrigin(0).setDepth(0.6));
      const icicles = Math.max(3, Math.floor(platform.width / 22));
      for (let i = 0; i < icicles; i++) {
        const x = snapToGrid(artLeft + 4 + (artWidth - 14) * (i + stableUnit(`ice:${platform.id}:${i}`) * 0.7) / icicles);
        const length = snapToGrid(5 + stableUnit(`ice-len:${platform.id}:${i}`) * 9);
        // Three art pixels wide with a one-pixel tip in the middle.
        ice.push(scene.add.rectangle(x, artTop + 6, 6, length, 0xa9e2ff, 0.92).setOrigin(0).setDepth(0.5));
        ice.push(scene.add.rectangle(x + 2, artTop + 6 + length, 2, 4, 0xcfefff, 0.9).setOrigin(0).setDepth(0.5));
      }
    }
    // Swaying grass on forest ledges, and maybe a bird. Snowy ledges keep their bare look, but birds still visit.
    const tufts = winter ? [] : grass.plant(platform.id, platform.x, artTop, platform.width);
    // No bird perches on a ledge that may fall away.
    if (platform.type !== 'crumbling') birds.addPerch(platform.id, platform.x, artTop, platform.width);
    // Follow authored moving ledges using simulation positions, never signal values.
    const images = [...vines, ...terrain, ...ice, ...tufts, ...props.flatMap((prop) => [prop.healthy, prop.decayed])];
    skins.set(platform.id, { id: platform.id, x: platform.x, y: platform.y, drawnX: platform.x, drawnY: platform.y, lookX: 0, shown: true, terrain, redTerrain, props,
      marks: images.map((image) => ({ image, x: image.x, y: image.y })) });
  }
  function removePlatform(id: string): void {
    const skin = skins.get(id);
    if (!skin) return;
    propCount -= skin.props.length;
    birds.removePerch(id);
    for (const mark of skin.marks) mark.image.destroy();
    skins.delete(id);
  }
  for (const platform of world.platforms) {
    addPlatform(platform, world.sections.some((section) => (section.stage?.snow01 ?? 0) > 0 && section.platforms.some((row) => row.id === platform.id)));
  }
  const spores = Array.from({ length: C.spores }, (_, i) => ({
    x: stableUnit(`spore-x:${i}`) * width, y: stableUnit(`spore-y:${i}`) * height,
    seed: stableUnit(`spore-phase:${i}`),
    // One art pixel, or two side by side: whole art pixels on the grid.
    image: scene.add.rectangle(0, 0, i % 3 === 0 ? 4 : 2, 2, 0xffdba4).setOrigin(0).setScrollFactor(0).setDepth(4),
  }));
  let clock = 0;
  const floor = world.platforms.find((platform) => platform.width >= world.width * 0.9);
  if (floor) for (let i = 1; i <= 8; i++) {
    // At the one pixel size: a single mushroom or a fern (they were drawn at 1x), and a thorn of matching height.
    const piece = i % 3 === 0 ? PROP_ART['mushroom-round'] : PROP_ART.fern;
    const plant = scene.add.image(snapToGrid(i / 9 * world.width), snapToGrid(floor.y - floor.height / 2) + C.pixelScale,
      piece.key, piece.frame).setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-2);
    const partner = pickPartner(FOREST_DECAY, drawnSize, drawnSize(piece).height + 4, stableUnit(`floor-decay:${i}`))!;
    looseProps.push({ healthy: plant, decayed: scene.add.image(plant.x, plant.y, partner.key, partner.frame)
      .setOrigin(0.5, 1).setScale(C.pixelScale).setDepth(-1).setAlpha(0), threshold: stableUnit(`floor:${i}`) * 0.65 });
  }
  return {
    setEnvironment(value) {
      snowMix = value.snowEnabled && Number.isFinite(value.snow01) ? Math.max(0, Math.min(1, value.snow01!)) : 0;
      atmosphere.setEnvironment(value);
      background?.setSnow(value.snowEnabled ? value.snow01 ?? 0 : 0);
      gardens?.setSnow(value.snowEnabled ? value.snow01 ?? 0 : 0);
      life.setSnow(value.snowEnabled ? value.snow01 ?? 0 : 0);
    },
    setCandle(x, y) { candle = { x, y }; },
    reseedBackdrop(seed) { generated?.reseed(seed); },
    addPlatform,
    removePlatform,
    syncPlatforms(platforms) {
      for (const position of platforms) {
        const group = skins.get(position.id);
        // Only a ledge that moved since the last call needs its art moved.
        if (!group || (position.x === group.drawnX && position.y === group.drawnY)) continue;
        group.drawnX = position.x; group.drawnY = position.y;
        birds.movePerch(position.id, position.x, position.y - position.height / 2);
        for (const mark of group.marks) {
          // The whole skin moves by one snapped offset, so it stays rigid and on the art grid.
          mark.image.setPosition(mark.x + snapToGrid(position.x - group.x) + group.lookX, mark.y + snapToGrid(position.y - group.y));
        }
      }
    },
    setPlatformLook(id, offsetX, visible) {
      const group = skins.get(id);
      const lookX = snapToGrid(offsetX);
      if (!group || (group.lookX === lookX && group.shown === visible)) return;
      group.lookX = lookX; group.shown = visible;
      for (const mark of group.marks) {
        mark.image.setPosition(mark.x + snapToGrid(group.drawnX - group.x) + lookX, mark.y + snapToGrid(group.drawnY - group.y)).setVisible(visible);
      }
    },
    update(corruption, deltaMs, reducedMotion, paused, strength = 1) {
      const c = Math.max(0, Math.min(1, corruption));
      if (import.meta.env.DEV) {
        scene.game.canvas.dataset.forestCorruption = c.toFixed(3);
        scene.game.canvas.dataset.forestFps = scene.game.loop.actualFps.toFixed(1);
      }
      if (!reducedMotion && !paused) clock += Math.min(deltaMs, 100);
      // Behind a generated backdrop the sky is the colour its far layers fade toward (its own gradient is drawn over it).
      const skyCalm = generated
        ? generated.fogAtCamera()
        : mixColor(C.sky.calm, 0x263a4d, snowMix);
      sky.setFillStyle(mixColor(skyCalm, C.sky.corrupted, c));
      background?.update(c);
      generated?.update(sceneryCorruption(c), clock, c);
      gardens?.update(c, clock);
      const paintCorruption = sceneryCorruption(c);
      life.update(paintCorruption, deltaMs, reducedMotion, paused);
      grass.update(clock, paintCorruption);
      birds.update(deltaMs, candle, paintCorruption, reducedMotion, paused);
      atmosphere.update(c, deltaMs, reducedMotion, paused, strength);
      screen.update(c, deltaMs, reducedMotion, paused, strength);
      sky.setSize(camera.width, camera.height);
      mist.setSize(camera.width, camera.height);
      // Tile offsets are in texture px, which are art pixels: whole ones keep the mist on the grid.
      mist.tilePositionX = reducedMotion ? 0 : Math.round(clock / 160);
      mist.tilePositionY = Math.round(camera.scrollY * 0.08 / C.pixelScale);
      mist.setTint(mixColor(mixColor(0xa9d4c0, 0xbed5e6, snowMix), 0xbf8aa9, c)).setAlpha(0.04 + C.mistMaxAlpha * c);
      const plantCorruption = sceneryCorruption(c);
      const tint = mixColor(C.terrain.calm, C.terrain.corrupted, plantCorruption);
      const paintProp = (prop: PlatformSkin['props'][number]): void => {
        const blend = reveal(Math.min(1, plantCorruption * (0.3 / V.decayFadeWidth)), prop.threshold * V.decayThresholdScale);
        prop.healthy.setAlpha(0.85 * (1 - blend)).setTint(mixColor(0xd7ebcb, 0xb88da3, plantCorruption));
        prop.decayed.setAlpha(blend * V.decayOpacity);
      };
      for (const skin of skins.values()) {
        for (const tile of skin.terrain) tile.setTint(tint);
        for (const pair of skin.redTerrain) {
          pair.normal.setAlpha(1);
          pair.red.setAlpha(plantCorruption).setTint(0xffffff);
        }
        for (const prop of skin.props) paintProp(prop);
      }
      for (const rim of rims) rim.setFillStyle(mixColor(C.rim.calm, C.rim.corrupted, c));
      for (const prop of looseProps) paintProp(prop);
      for (const spore of spores) {
        const phase = clock / C.sporePeriodMs * Math.PI * 2 + spore.seed * Math.PI * 2;
        const drift = reducedMotion ? 0 : Math.sin(phase) * C.sporeDriftPx;
        spore.image.setPosition(snapToGrid(spore.x + drift), snapToGrid(spore.y + (reducedMotion ? 0 : Math.cos(phase) * C.sporeDriftPx)));
        spore.image.setFillStyle(mixColor(mixColor(0xd5f2a6, 0xd9efff, snowMix), 0xf6a17e, c)).setAlpha(0.08 + c * 0.3);
      }
    },
  };
}
