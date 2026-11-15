/** Code-drawn wax droplets and a small pickup pulse; no downloaded or generated art. */
import type { Scene } from 'phaser';
import { WAX_CONFIG } from '../../config/wax.config';
import type { EventBus } from '../../shared/contracts/events';
import type { createWaxRewards } from './rewards';

export function createWaxView(scene: Scene, wax: ReturnType<typeof createWaxRewards>, bus: EventBus) {
  const marks = wax.drops.map((drop) => ({
    drop,
    glow: scene.add.circle(drop.x, drop.y, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor, 0.15).setDepth(200),
    body: scene.add.ellipse(drop.x, drop.y, WAX_CONFIG.dropWidthPx, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor).setDepth(201),
    shine: scene.add.circle(drop.x - 2, drop.y - 3, 2, WAX_CONFIG.highlightColor).setDepth(202),
  }));
  let reducedMotion = false;
  let animationMs = 0;
  const off = bus.on('wax_collected', (event) => {
    const pulse = scene.add.circle(event.x, event.y, WAX_CONFIG.dropHeightPx, WAX_CONFIG.waxColor, 0.5).setDepth(203);
    scene.tweens.add({ targets: pulse, alpha: 0, scale: reducedMotion ? 1 : 2.5,
      duration: WAX_CONFIG.pickupPulseMs, onComplete: () => pulse.destroy() });
  });
  return {
    update(dtMs: number, running: boolean, reduceMotion: boolean): void {
      reducedMotion = reduceMotion;
      if (running) animationMs += Math.max(0, dtMs);
      const hover = reduceMotion ? 0 : Math.sin(animationMs / WAX_CONFIG.hoverPeriodMs * Math.PI * 2) * WAX_CONFIG.hoverPx;
      for (const { drop, glow, body, shine } of marks) {
        const visible = !wax.isCollected(drop.id);
        glow.setVisible(visible).setPosition(drop.x, drop.y + hover);
        body.setVisible(visible).setPosition(drop.x, drop.y + hover);
        shine.setVisible(visible).setPosition(drop.x - 2, drop.y - 3 + hover);
      }
    },
    destroy(): void { off(); for (const mark of marks) { mark.glow.destroy(); mark.body.destroy(); mark.shine.destroy(); } },
  };
}
