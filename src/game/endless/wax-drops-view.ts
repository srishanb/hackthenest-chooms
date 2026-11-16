/**
 * Draws the wax drops of the live chunks: code-drawn droplets that hover, and a pulse on pickup.
 *
 * Why not wax/view.ts: that view builds one mark per drop of a fixed list. Here drops appear and
 * disappear with the chunks, so marks are created and destroyed as the list changes. Same colours
 * and sizes (wax.config.ts), so wax looks the same in both modes. Visual only.
 */
import type { GameObjects, Scene } from 'phaser';
import { WAX_CONFIG } from '../../config/wax.config';
import type { EventBus } from '../../shared/contracts/events';
import type { WaxSpot } from './generator';

interface Mark { drop: WaxSpot; glow: GameObjects.Arc; body: GameObjects.Ellipse; shine: GameObjects.Arc; beacon: GameObjects.Arc }

/** What the beacons need to know each frame: where the light is, how far it reaches, and how dark it is. */
export interface NightLight { x: number; y: number; radiusPx: number; night01: number }
/** A beacon is fully bright inside the light and fades out by this many light radii, so wax just past the dark's edge can be planned for. */
const BEACON_REACH = 2.1;
/** Above the darkness sheet (100), below the end-of-run veil (205). */
const BEACON_DEPTH = 150;

export function createWaxDropsView(scene: Scene, bus: EventBus) {
  const marks = new Map<string, Mark>();
  let reducedMotion = false;
  let animationMs = 0;
  const destroy = (mark: Mark): void => { mark.glow.destroy(); mark.body.destroy(); mark.shine.destroy(); mark.beacon.destroy(); };
  const off = bus.on('wax_collected', (event) => {
    const pulse = scene.add.circle(event.x, event.y, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor, 0.5).setDepth(93);
    scene.tweens.add({ targets: pulse, alpha: 0, scale: reducedMotion ? 1 : 2.5,
      duration: WAX_CONFIG.pickupPulseMs, onComplete: () => pulse.destroy() });
  });
  return {
    /** Show exactly the drops in `drops` that are not collected. Call when the chunk window or the collected set changes. */
    sync(drops: readonly WaxSpot[], isCollected: (id: string) => boolean): void {
      const wanted = new Set(drops.filter((drop) => !isCollected(drop.id)).map((drop) => drop.id));
      for (const [id, mark] of marks) if (!wanted.has(id)) { destroy(mark); marks.delete(id); }
      for (const drop of drops) {
        if (!wanted.has(drop.id) || marks.has(drop.id)) continue;
        marks.set(drop.id, {
          drop,
          glow: scene.add.circle(drop.x, drop.y, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor, 0.15).setDepth(90),
          body: scene.add.ellipse(drop.x, drop.y, WAX_CONFIG.dropWidthPx, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor).setDepth(91),
          shine: scene.add.circle(drop.x - 2, drop.y - 3, 2, WAX_CONFIG.highlightColor).setDepth(92),
          // A small ember-like dot drawn over the darkness: it shows only at night (see `update`).
          beacon: scene.add.circle(drop.x, drop.y, 3, WAX_CONFIG.waxColor, 0).setDepth(BEACON_DEPTH),
        });
      }
    },
    /** `xOf` gives a drop's current x when it rides a moving ledge (defaults to where it was generated). */
    update(dtMs: number, running: boolean, reduceMotion: boolean, light?: NightLight, xOf: (drop: WaxSpot) => number = (drop) => drop.x): void {
      reducedMotion = reduceMotion;
      if (running) animationMs += Math.max(0, dtMs);
      for (const { drop, glow, body, shine, beacon } of marks.values()) {
        // Each drop hovers on its own phase so a row of them does not bob in step.
        const phase = animationMs / WAX_CONFIG.hoverPeriodMs * Math.PI * 2 + drop.x * 0.05;
        const hover = reduceMotion ? 0 : Math.sin(phase) * WAX_CONFIG.hoverPx;
        const x = xOf(drop);
        glow.setPosition(x, drop.y + hover);
        body.setPosition(x, drop.y + hover);
        shine.setPosition(x - 2, drop.y - 3 + hover);
        // In the dark, wax glows a little beyond the candle's light, fading with distance.
        let alpha = 0;
        if (light && light.night01 > 0 && light.radiusPx > 0) {
          const distance = Math.hypot(x - light.x, drop.y - light.y) / light.radiusPx;
          alpha = light.night01 * 0.85 * Math.min(1, Math.max(0, (BEACON_REACH - distance) / (BEACON_REACH - 1)));
        }
        beacon.setPosition(x, drop.y + hover).setAlpha(alpha);
      }
    },
    destroy(): void { off(); for (const mark of marks.values()) destroy(mark); marks.clear(); },
  };
}
