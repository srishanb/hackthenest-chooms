/** Draw the validated stationary world; presentation never changes its collision geometry. */
import type { Scene } from 'phaser';
import type { LoadedWorld } from './section-loader';
import { createForestWorld, type ForestWorld } from '../forest/forest-world';

export function drawWorld(scene: Scene, world: LoadedWorld): ForestWorld {
  const forest = createForestWorld(scene, world);
  for (const section of world.sections) {
    for (const [area, color] of [[section.finish, 0xf2c14e]] as const) {
      if (area) scene.add.rectangle(area.x, area.y, area.width, area.height, color, 0.25).setDepth(1);
    }
  }
  return forest;
}
