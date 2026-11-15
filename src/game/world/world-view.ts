/** Decorative forest and authored weather; no extra platform outlines or motion guide rails. */
import type { Scene } from 'phaser';
import type { PlatformBox } from '../player/types';
import type { LoadedWorld } from './section-loader';
import { stageWeatherAt } from './stage-weather';
import { createForestWorld } from '../forest/forest-world';

export function drawWorld(scene: Scene, world: LoadedWorld) {
  const forest = createForestWorld(scene, world);
  return {
    forest,
    update(platforms: readonly PlatformBox[], _timeMs: number, _reducedMotion: boolean, playerY = 500): void {
      forest.syncPlatforms(platforms);
      const weather = stageWeatherAt(world.sections, playerY);
      forest.setEnvironment({ snowEnabled: weather.snow01 > 0, snow01: weather.snow01,
        windEnabled: weather.wind01 > 0, wind01: weather.wind01, direction: 1 });
    },
  };
}
