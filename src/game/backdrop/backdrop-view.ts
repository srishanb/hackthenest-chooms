/**
 * Shows the generated backdrop behind the climb and keeps it painted as the camera moves.
 *
 * Back to front: a gradient sky (sky-view.ts), then each layer of config `layers` (the horizon
 * ridges, then the far, middle and near forest). Each layer owns a few canvas textures, one painted
 * chunk each. As the camera climbs, a chunk that has scrolled out of reach is repainted as the next
 * one coming into view, so the cost stays fixed however high the climb goes. A chunk that is about
 * to be seen is painted at once; a chunk only being prepared ahead waits for a frame in which
 * nothing else was painted. Layers follow different shares of the camera's climb, which is what
 * gives the forest its depth. Moving water is laid over the painted falls (waterfall-view.ts).
 * Decoration only: nothing here has a collision body or is read by movement.
 */
import type { GameObjects, Scene, Textures } from 'phaser';
import { BACKDROP_CONFIG as C } from '../../config/backdrop.config';
import { mixColor } from '../forest/presentation';
import { waterColour } from './palette';
import { renderChunk, type BackdropBiome, type Waterfall } from './paint-chunk';
import { mixRgb, skyAt } from './sky';
import { createSkyGradient } from './sky-view';
import { createWaterfallStrips, type StripPlacement } from './waterfall-view';
import { snapToArt, stripRect, type StripRect } from './strip-layout';
import { isFrozen } from './water';

export interface BackdropSource {
  /** The run's seed: the same seed paints the same forest. */
  seed: number;
  /** What grows at a world height (the same heights the ledges use). */
  biomeAt(worldY: number): BackdropBiome;
  /** World height of the top of the ground the climb starts from, and the camera's scroll there. */
  floorWorldY: number; startScrollY: number;
}

interface Slot { image: GameObjects.Image; texture: Textures.CanvasTexture; pixels: ImageData; chunk: number | null; waterfalls: Waterfall[] }

export function createBackdrop(scene: Scene, source: BackdropSource) {
  let seed = source.seed;
  const viewHeight = scene.scale.height, chunkPx = C.chunkHeight * C.pixelScale;
  const sky = createSkyGradient(scene, -39, C.skyBands);
  const layers = C.layers.map((layer, layerIndex) => {
    const slots: Slot[] = Array.from({ length: C.chunksPerLayer }, (_, i) => {
      const key = `backdrop-${layerIndex}-${i}`;
      // A scene that starts again finds its textures still there and simply repaints them.
      const texture = scene.textures.exists(key)
        ? scene.textures.get(key) as Textures.CanvasTexture
        : scene.textures.createCanvas(key, C.chunkWidth, C.chunkHeight);
      if (!texture) throw new Error('could not create a backdrop texture');
      const image = scene.add.image(0, 0, key).setOrigin(0).setScale(C.pixelScale).setScrollFactor(0).setDepth(layer.depth).setVisible(false);
      return { image, texture, pixels: texture.getContext().createImageData(C.chunkWidth, C.chunkHeight), chunk: null, waterfalls: [] };
    });
    const strips = layer.waterfalls01 > 0
      ? createWaterfallStrips(scene, layer.depth + 0.5, C.waterfallView.pool, Math.max(1, Math.round(C.pixelScale * layer.scale)))
      : null;
    return {
      layer, layerIndex, slots, strips,
      // Which fall (by id, -1 for none) holds each strip, and this frame's candidates: both reused, so nothing is allocated.
      holders: Array.from({ length: strips?.size ?? 0 }, () => -1), used: Array.from({ length: strips?.size ?? 0 }, () => false), candidates: [] as Waterfall[],
      // Where the starting ground sits in this layer, so every layer's floor meets the real one at the start.
      groundY: ((source.floorWorldY - source.startScrollY) + source.startScrollY * layer.parallax) / C.pixelScale,
      // The world height whose view has this layer row at the middle of the screen.
      biomeAt: (y: number): BackdropBiome => source.biomeAt((y * C.pixelScale - viewHeight / 2) / layer.parallax + viewHeight / 2),
    };
  });

  const paint = (entry: (typeof layers)[number], slot: Slot, chunk: number): void => {
    const { waterfalls } = renderChunk({ seed, layerIndex: entry.layerIndex, chunk, biomeAt: entry.biomeAt, groundY: entry.groundY }, slot.pixels.data);
    slot.texture.getContext().putImageData(slot.pixels, 0, 0);
    slot.texture.refresh();
    slot.chunk = chunk; slot.waterfalls = waterfalls;
  };

  // Reused every frame, so drawing the water allocates nothing.
  const rect: StripRect = { x: 0, y: 0, width: 0, length: 0, frame: 0 };
  const placement: StripPlacement = { x: 0, y: 0, width: 0, length: 0, frame: 0, tint: 0, alpha: 0 };

  /**
   * Lay the layer's moving strips over the falls in its shown chunks. A fall that already has a strip
   * keeps it while it is on screen (so nothing pops); a free strip goes to the unserved fall nearest
   * the screen's middle first. Falls left without a strip stay painted and still.
   */
  const drawWater = (entry: (typeof layers)[number], scroll: number, clockMs: number, corruption: number): void => {
    const strips = entry.strips;
    if (!strips || strips.size === 0) return;
    const camera = scene.cameras.main, { candidates, holders, used } = entry, ps = C.pixelScale;
    candidates.length = 0;
    for (const slot of entry.slots) {
      if (slot.chunk === null || !slot.image.visible) continue;
      for (const fall of slot.waterfalls) {
        if (isFrozen(fall.cold01)) continue;
        const y = snapToArt(fall.topY * ps - scroll), length = fall.length * ps;
        if (y > camera.height || y + length < 0) continue;
        if (!candidates.some((other) => other.id === fall.id)) candidates.push(fall);
      }
    }
    const middle = camera.height / 2;
    const distance = (fall: Waterfall): number => Math.abs(fall.topY * ps - scroll + fall.length * ps / 2 - middle);
    candidates.sort((a, b) => distance(a) - distance(b));
    // A strip whose fall left the screen (or was repainted away) is free again.
    for (let i = 0; i < holders.length; i++) { used[i] = false; if (holders[i] !== -1 && !candidates.some((fall) => fall.id === holders[i])) holders[i] = -1; }
    for (const fall of candidates) {
      let index = holders.indexOf(fall.id);
      if (index < 0) { index = holders.indexOf(-1); if (index < 0) continue; holders[index] = fall.id; }
      stripRect(fall, scroll, clockMs, rect);
      placement.x = rect.x; placement.y = rect.y; placement.width = rect.width; placement.length = rect.length; placement.frame = rect.frame;
      placement.tint = mixColor(waterColour(fall.biome, entry.layer.fog01), C.waterfallView.corruptionTint, corruption);
      placement.alpha = C.waterfallView.alpha01 * (1 - entry.layer.fog01 * C.waterfallView.fogFade01);
      strips.place(index, placement);
      used[index] = true;
    }
    for (let i = 0; i < strips.size; i++) if (!used[i]) strips.place(i, null);
  };

  return {
    /** A new run with a new seed: every chunk is painted afresh as it is next needed. */
    reseed(next: number) {
      if (next === seed) return;
      seed = next;
      for (const entry of layers) { for (const slot of entry.slots) { slot.chunk = null; slot.waterfalls = []; } entry.holders.fill(-1); }
    },
    /** How cold it is where the camera is looking (0..1). */
    coldAtCamera(): number {
      const camera = scene.cameras.main;
      return source.biomeAt(camera.scrollY + camera.height / 2).cold01;
    },
    /** The fog colour where the camera is looking: the bottom of the sky, which the far layers fade into. */
    fogAtCamera(): number {
      const camera = scene.cameras.main;
      return skyAt(source.biomeAt(camera.scrollY + camera.height / 2)).fog;
    },
    /**
     * `corruption` tints the layers as the forest goes wrong, `clockMs` drives the water (it stands
     * still while paused or with reduced motion) and `skyCorruption` (0..1) pulls the sky toward its corrupted colour.
     */
    update(corruption: number, clockMs = 0, skyCorruption = corruption) {
      const camera = scene.cameras.main;
      const colours = skyAt(source.biomeAt(camera.scrollY + camera.height / 2));
      sky.resize(camera.width);
      sky.update(mixRgb(colours.top, C.skyCorrupted, skyCorruption), mixRgb(colours.fog, C.skyCorrupted, skyCorruption * 0.8));
      const tint = mixColor(0xffffff, C.layerCorruptionTint, corruption);
      let painted = 0;
      for (const entry of layers) {
        const scroll = camera.scrollY * entry.layer.parallax;
        const first = Math.floor(scroll / chunkPx), last = Math.floor((scroll + camera.height - 1) / chunkPx);
        const wanted = (chunk: number): boolean => chunk >= first - 1 && chunk <= last + 1;
        const holder = (chunk: number): Slot | undefined => entry.slots.find((slot) => slot.chunk === chunk);
        const spare = (): Slot | undefined => entry.slots.find((slot) => slot.chunk === null || !wanted(slot.chunk));
        // On screen now: must be painted this frame.
        for (let chunk = first; chunk <= last; chunk++) {
          if (holder(chunk)) continue;
          const slot = spare();
          if (slot) { paint(entry, slot, chunk); painted++; }
        }
        // Just off screen: prepared ahead, one chunk in a quiet frame.
        for (const chunk of [first - 1, last + 1]) {
          if (painted > 0 || holder(chunk)) continue;
          const slot = spare();
          if (slot) { paint(entry, slot, chunk); painted++; }
        }
        for (const slot of entry.slots) {
          const shown = slot.chunk !== null && wanted(slot.chunk);
          slot.image.setVisible(shown);
          if (shown) slot.image.setPosition(0, snapToArt(slot.chunk! * chunkPx - scroll)).setTint(tint);
        }
        drawWater(entry, scroll, clockMs, corruption);
      }
    },
  };
}
