/** Editor uses the actual forest/platform renderer, with draggable authoring handles above it. */
import * as Phaser from 'phaser';
import type { SectionData } from '../../shared/contracts/content';
import { preloadForest } from '../forest/textures';
import { drawWorld } from '../world/world-view';
export function createStageCanvas(parent: HTMLElement, stages: SectionData[], index: number, selected: string,
  changed: (id: string, done: boolean) => void): () => void {
  const stage = stages[index]!;
  class EditorScene extends Phaser.Scene {
    preload(): void { preloadForest(this); }
    create(): void {
      const platforms = stages.flatMap((s) => s.platforms);
      const top = Math.min(...platforms.map((p) => p.y)) - 240;
      const bottom = Math.max(...platforms.map((p) => p.y)) + 100;
      const view = drawWorld(this, { sections: stages, platforms, width: 960, top, bottom });
      const ys = [...stage.platforms.map((p) => p.y), stage.spawn.y];
      const low = Math.min(...ys) - 90, high = Math.max(...ys) + 90;
      const fit = () => this.cameras.main.setZoom(Math.min(this.scale.width / 1000, this.scale.height / (high - low))).centerOn(480, (low + high) / 2);
      fit(); this.scale.on('resize', fit);
      this.events.once('shutdown', () => this.scale.off('resize', fit));
      view.update(platforms, 0, true, (low + high) / 2); view.forest.update(0.2, 0, true, true);
      const marker = (id: string, x: number, y: number, width: number, height: number, color: number, resize = false) => {
        const handle = this.add.rectangle(x, y, width, height, color, .3).setStrokeStyle(2, color).setDepth(300).setInteractive({ draggable: true });
        handle.on('pointerdown', () => changed(id, false));
        handle.on('pointerup', () => changed(id, true));
        handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          if (id === 'spawn') { stage.spawn.x = Math.round(dragX); stage.spawn.y = Math.round(dragY); handle.setPosition(dragX, dragY); }
          else if (id === 'refuge' && stage.refuge) { stage.refuge.x = Math.round(dragX); stage.refuge.y = Math.round(dragY); handle.setPosition(dragX, dragY); }
          else {
            const platform = stage.platforms.find((p) => p.id === id)!;
            if (resize) { platform.width = Math.max(24, Math.round((dragX - platform.x) * 2)); handle.setPosition(platform.x + platform.width / 2, platform.y); }
            else { platform.x = Math.round(dragX); platform.y = Math.round(dragY); handle.setPosition(dragX, dragY); }
            view.update(platforms, 0, true, (low + high) / 2);
          }
          changed(id, false);
        });
        handle.on('dragend', () => changed(id, true));
      };
      for (const p of stage.platforms) {
        marker(p.id, p.x, p.y, p.width, Math.max(20, p.height), p.id === stage.stage?.finalPlatformId ? 0xffd46a : p.id === selected ? 0xffffff : 0x8cdef2);
        if (p.id === selected) marker(p.id, p.x + p.width / 2, p.y, 16, 28, 0xffffff, true);
      }
      marker('spawn', stage.spawn.x, stage.spawn.y, 24, 36, 0x7fd1a0);
      if (stage.refuge) marker('refuge', stage.refuge.x, stage.refuge.y, stage.refuge.width, stage.refuge.height, 0x7fd1a0);
    }
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent, width: parent.clientWidth, height: parent.clientHeight, pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [EditorScene] });
  return () => game.destroy(true);
}
