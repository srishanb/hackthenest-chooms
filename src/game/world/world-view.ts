/** Tutorial platform colors and visible wind/motion cues; collision geometry stays in the simulation. */
import type { Scene } from 'phaser';
import type { PlatformBox } from '../player/types';
import type { LoadedWorld } from './section-loader';
import { stageWeatherAt } from './stage-weather';
import { STAGES_CONFIG } from '../../config/stages.config';
import { createForestWorld } from '../forest/forest-world';

export function drawWorld(scene: Scene, world: LoadedWorld) {
  const forest = createForestWorld(scene, world);
  // Local presentation QA only: move scenery/weather sampling, never camera or physics.
  const heightQuery = import.meta.env.DEV ? Number(new URLSearchParams(window.location.search).get('forestHeight') ?? 0) : 0;
  const visualOffset = Number.isFinite(heightQuery) ? heightQuery : 0;
  const marks = world.platforms.map((platform) => {
    if (platform.motion) {
      scene.add.rectangle(platform.x, platform.y + platform.height, platform.width + platform.motion.distance * 2, 2, 0x80c99d, 0.2).setDepth(0);
    }
    const rim = scene.add.rectangle(platform.x, platform.y - platform.height / 2, platform.width, 3, platform.type === 'slippery' ? 0xd6faff : 0xc8decf, 0.7).setDepth(platform.type === 'static' ? 1 : 200);
    return { id: platform.id, height: platform.height, rim };
  });
  const arrows = world.sections.flatMap((section) => (section.wind ?? []).flatMap((wind) => {
    scene.add.rectangle(wind.x, wind.y, wind.width, wind.height, 0x8cdef2, 0.045).setDepth(-1);
    const rows = Math.ceil(wind.height / STAGES_CONFIG.windArrowRowSpacingPx);
    const columns = STAGES_CONFIG.windArrowColumns;
    return Array.from({ length: rows * columns }, (_, index) => {
      const x = wind.x - wind.width / 2 + (index % columns + 1) / (columns + 1) * wind.width;
      const y = wind.y - wind.height / 2 + (Math.floor(index / columns) + 0.5) / rows * wind.height;
      const sign = Math.sign(wind.accelerationX) || 1;
      const head = scene.add.triangle(x, y, -7, -5, 7, 0, -7, 5, 0xb7e8f4, 0.6).setScale(sign, 1).setDepth(200);
      const shaft = scene.add.rectangle(x - 8 * sign, y, 16, 2, 0xb7e8f4, 0.6).setDepth(200);
      return { x, y, sign, head, shaft };
    });
  }));
  return {
    forest,
    update(platforms: readonly PlatformBox[], timeMs: number, reducedMotion: boolean, playerY = 500): void {
      forest.syncPlatforms(platforms);
      const weather = stageWeatherAt(world.sections, playerY - visualOffset);
      forest.setEnvironment({ snowEnabled: weather.snow01 > 0, snow01: weather.snow01,
        windEnabled: weather.wind01 > 0, wind01: weather.wind01, direction: 1 });
      for (const mark of marks) {
        const platform = platforms.find((candidate) => candidate.id === mark.id);
        if (platform) { mark.rim.setPosition(platform.x, platform.y - mark.height / 2); }
      }
      const offset = reducedMotion ? 0 : timeMs % 1200 / 1200 * 24;
      for (const arrow of arrows) {
        arrow.head.setPosition(arrow.x + offset * arrow.sign, arrow.y);
        arrow.shaft.setPosition(arrow.x + (offset - 8) * arrow.sign, arrow.y);
      }
    },
  };
}
