/**
 * Small moving things in the air of the forest: a far flock crossing now and then, fireflies and
 * spores that wander and blink, and single leaves drifting down.
 *
 * Each kind is a fixed set of sprites made once and moved every frame; nothing is created while
 * playing. They thin out as the forest turns (corruption) and in the snow, where the weather layer
 * takes over. Decoration only: drawn on the screen, never part of the world the candle touches.
 */
import type { Scene } from 'phaser';
import { WILDLIFE_CONFIG as C } from '../../config/wildlife.config';
import { mixColor, stableUnit } from './presentation';

/** `value` wrapped into 0..`span`, also for negative values. */
const wrap = (value: number, span: number): number => ((value % span) + span) % span;
const LEAF_GREEN = ['wildlife-leaf-green-1', 'wildlife-leaf-green-2'] as const;

export function createAmbientLife(scene: Scene) {
  let clock = 0, snow = 0;

  // Far flock: behind the garden ledges, in front of the tree trunks.
  const flock = Array.from({ length: C.flock.size }, () => scene.add.sprite(0, 0, 'wildlife-birb', C.flock.flightCells[0])
    .setScrollFactor(0).setDepth(-7.5).setScale(C.flock.scale).setVisible(false));
  let flight = 0, flockStartMs = 0, nextFlockMs = C.flock.minGapMs * 0.4;

  const fireflies = Array.from({ length: C.firefly.count }, (_, i) => ({
    seed: stableUnit(`firefly:${i}`), homeX: stableUnit(`firefly-x:${i}`), homeY: stableUnit(`firefly-y:${i}`),
    // Every third one is a slow green spore that glows steadily instead of blinking.
    spore: i % 3 === 2,
    sprite: scene.add.image(0, 0, i % 3 === 2 ? 'wildlife-spore' : 'wildlife-firefly').setScrollFactor(0).setDepth(4).setAlpha(0),
  }));

  const leaves = Array.from({ length: C.leaf.count }, (_, i) => ({
    seed: stableUnit(`leaf:${i}`), homeX: stableUnit(`leaf-x:${i}`), homeY: stableUnit(`leaf-y:${i}`),
    green: LEAF_GREEN[i % 2]!,
    sprite: scene.add.image(0, 0, LEAF_GREEN[i % 2]!).setScrollFactor(0).setDepth(4).setAlpha(0),
  }));

  return {
    setSnow(value: number) { snow = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)); },
    update(corruption: number, deltaMs: number, reducedMotion: boolean, paused: boolean) {
      const camera = scene.cameras.main, width = camera.width, height = camera.height;
      if (!paused && !reducedMotion) clock += Math.min(Math.max(0, deltaMs), 100);
      const calm = 1 - corruption;

      // --- Far flock ---------------------------------------------------------------------------
      const flying = flockStartMs > 0;
      if (!flying && clock >= nextFlockMs && corruption < C.bird.leaveAtCorruption01 && !reducedMotion) {
        flight++; flockStartMs = clock;
      }
      if (flockStartMs > 0) {
        const direction = stableUnit(`flock-dir:${flight}`) < 0.5 ? 1 : -1;
        const span = width + C.flock.size * C.flock.spacingPx + 40;
        const travelled = (clock - flockStartMs) / 1000 * C.flock.speedPxPerS;
        const baseY = height * (0.12 + stableUnit(`flock-y:${flight}`) * 0.4);
        const tint = mixColor(mixColor(0x0f2a2c, 0x2b3d52, snow), 0x2c1a33, corruption);
        for (const [i, bird] of flock.entries()) {
          // A loose V: each bird trails the leader and sits a little higher or lower.
          const trail = i * C.flock.spacingPx, side = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 7;
          const along = travelled - trail;
          const x = direction > 0 ? -20 + along : width + 20 - along;
          const bob = Math.sin(clock / 600 + i * 1.7) * C.flock.bobPx;
          const cell = C.flock.flightCells[(Math.floor(clock / C.flock.frameMs) + i) % C.flock.flightCells.length]!;
          if (bird.frame.name !== String(cell)) bird.setFrame(cell);
          bird.setPosition(Math.round(x), Math.round(baseY + side + bob - along * 0.06))
            .setFlipX(direction < 0).setTint(tint).setAlpha(C.flock.alpha * calm).setVisible(along > 0 && along < span);
        }
        if (travelled > span + C.flock.size * C.flock.spacingPx) {
          flockStartMs = 0;
          nextFlockMs = clock + C.flock.minGapMs + stableUnit(`flock-gap:${flight}`) * (C.flock.maxGapMs - C.flock.minGapMs);
          for (const bird of flock) bird.setVisible(false);
        }
      }

      // --- Fireflies and spores ----------------------------------------------------------------
      const glow = C.firefly.alpha * calm * calm * (1 - snow);
      const scroll = camera.scrollY * C.firefly.parallax;
      for (const fly of fireflies) {
        const phase = clock / C.firefly.wanderMs * Math.PI * 2 + fly.seed * Math.PI * 2;
        const x = fly.homeX * width + Math.sin(phase) * C.firefly.wanderPx + Math.sin(phase * 2.3 + 1) * C.firefly.wanderPx * 0.4;
        const y = wrap(fly.homeY * (height + 40) - scroll + Math.cos(phase * 0.8) * C.firefly.wanderPx - (fly.spore ? clock / 90 : 0), height + 40) - 20;
        const blink = fly.spore ? 0.55 : Math.max(0, Math.sin(clock / C.firefly.blinkMs * Math.PI * 2 + fly.seed * 40)) ** 2;
        fly.sprite.setPosition(Math.round(x), Math.round(y)).setAlpha(glow * (reducedMotion ? 0.5 : blink))
          .setTint(mixColor(fly.spore ? 0xc9f5a0 : 0xf4ffb0, 0xffa07a, corruption));
      }

      // --- Falling leaves ----------------------------------------------------------------------
      const leafAlpha = C.leaf.alpha * (1 - snow) * (reducedMotion ? 0 : 1);
      const leafScroll = camera.scrollY * C.leaf.parallax;
      for (const leaf of leaves) {
        const key = corruption >= C.leaf.redAt01 ? 'wildlife-leaf-autumn-red-1' : corruption >= C.leaf.orangeAt01 ? 'wildlife-leaf-autumn-orange-1' : leaf.green;
        if (leaf.sprite.texture.key !== key) leaf.sprite.setTexture(key);
        const sway = clock / C.leaf.swayMs * Math.PI * 2 + leaf.seed * Math.PI * 2;
        const speed = C.leaf.fallPxPerS * (0.7 + leaf.seed * 0.6);
        const x = wrap(leaf.homeX * width + Math.sin(sway) * C.leaf.swayPx + clock / 1000 * 6, width + 32) - 16;
        const y = wrap(leaf.homeY * (height + 32) + clock / 1000 * speed - leafScroll, height + 32) - 16;
        leaf.sprite.setPosition(Math.round(x), Math.round(y)).setRotation(Math.sin(sway) * 0.7 + leaf.seed * 6).setAlpha(leafAlpha);
      }
    },
  };
}
