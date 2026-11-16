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

interface Mark { drop: WaxSpot; glow: GameObjects.Arc; body: GameObjects.Ellipse; shine: GameObjects.Arc }

export function createWaxDropsView(scene: Scene, bus: EventBus) {
  const marks = new Map<string, Mark>();
  let reducedMotion = false;
  let animationMs = 0;
  const destroy = (mark: Mark): void => { mark.glow.destroy(); mark.body.destroy(); mark.shine.destroy(); };
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
        });
      }
    },
    update(dtMs: number, running: boolean, reduceMotion: boolean): void {
      reducedMotion = reduceMotion;
      if (running) animationMs += Math.max(0, dtMs);
      for (const { drop, glow, body, shine } of marks.values()) {
        // Each drop hovers on its own phase so a row of them does not bob in step.
        const phase = animationMs / WAX_CONFIG.hoverPeriodMs * Math.PI * 2 + drop.x * 0.05;
        const hover = reduceMotion ? 0 : Math.sin(phase) * WAX_CONFIG.hoverPx;
        glow.setPosition(drop.x, drop.y + hover);
        body.setPosition(drop.x, drop.y + hover);
        shine.setPosition(drop.x - 2, drop.y - 3 + hover);
      }
    },
    destroy(): void { off(); for (const mark of marks.values()) destroy(mark); marks.clear(); },
  };
}
