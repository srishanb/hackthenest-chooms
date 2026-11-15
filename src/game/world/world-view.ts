/** Tutorial platform colors and visible wind/motion cues; collision geometry stays in the simulation. */
import type { Scene } from 'phaser';
import type { PlatformBox } from '../player/types';
import type { LoadedWorld } from './section-loader';
import { stageWeatherAt } from './stage-weather';
import { createForestWorld } from '../forest/forest-world';

export function drawWorld(scene: Scene, world: LoadedWorld) {
  const forest = createForestWorld(scene, world);
  const marks = world.platforms.map((platform) => {
    if (platform.motion) {
      scene.add.rectangle(platform.x, platform.y + platform.height, platform.width + platform.motion.distance * 2, 2, 0x80c99d, 0.2).setDepth(0);
    }
    const rim = scene.add.rectangle(platform.x, platform.y - platform.height / 2, platform.width, 3, platform.type === 'slippery' ? 0xd6faff : 0xc8decf, 0.7).setDepth(platform.type === 'static' ? 1 : 200);
    return { id: platform.id, height: platform.height, rim };
  });
  return {
    forest,
    update(platforms: readonly PlatformBox[], timeMs: number, reducedMotion: boolean, playerY = 500): void {
      forest.syncPlatforms(platforms);
      const weather = stageWeatherAt(world.sections, playerY);
      forest.setEnvironment({ snowEnabled: weather.snow01 > 0, snow01: weather.snow01,
        windEnabled: weather.wind01 > 0, wind01: weather.wind01, direction: 1 });
      for (const mark of marks) {
        const platform = platforms.find((candidate) => candidate.id === mark.id);
        if (platform) { mark.rim.setPosition(platform.x, platform.y - mark.height / 2); }
      }

    },
  };
}
