/** Draw the validated stationary world; presentation never changes its collision geometry. */
import type { Scene } from 'phaser';
import type { LoadedWorld } from './section-loader';

export function drawWorld(scene: Scene, world: LoadedWorld): void {
  for (const platform of world.platforms) {
    scene.add.rectangle(platform.x, platform.y, platform.width, platform.height, 0x8a93a8).setDepth(0);
  }
  for (const section of world.sections) {
    for (const [area, color] of [[section.finish, 0xf2c14e]] as const) {
      if (area) scene.add.rectangle(area.x, area.y, area.width, area.height, color, 0.25).setDepth(1);
    }
  }
}
