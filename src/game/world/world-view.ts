/** Tutorial platform colors and visible wind/motion cues; collision geometry stays in the simulation. */
import type { Scene } from 'phaser';
import type { PlatformBox } from '../player/types';
import type { LoadedWorld } from './section-loader';
import { stageWeatherAt } from './stage-weather';
import { STAGES_CONFIG } from '../../config/stages.config';

export function drawWorld(scene: Scene, world: LoadedWorld) {
  const flakes = Array.from({ length: STAGES_CONFIG.snowflakeCount }, (_, index) =>
    scene.add.circle(index * 137 % world.width, index * 83 % 540, 1 + index % 2, 0xe9f6ff, 0)
      .setScrollFactor(0).setDepth(201));
  let lastTimeMs = 0;
  let snowDriftPx = 0;
  const colors: Record<string, number> = { static: 0x8a93a8, moving: 0x80c99d, slippery: 0x8cdef2 };
  const marks = world.platforms.map((platform) => {
    if (platform.motion) {
      scene.add.rectangle(platform.x, platform.y + platform.height, platform.width + platform.motion.distance * 2, 2, 0x80c99d, 0.2).setDepth(0);
    }
    const body = scene.add.rectangle(platform.x, platform.y, platform.width, platform.height, colors[platform.type] ?? colors.static).setDepth(0);
    const rim = scene.add.rectangle(platform.x, platform.y - platform.height / 2, platform.width, 3, platform.type === 'slippery' ? 0xd6faff : 0xc8decf, 0.7).setDepth(platform.type === 'static' ? 1 : 200);
    return { id: platform.id, height: platform.height, body, rim };
  });
  const arrows = world.sections.flatMap((section) => (section.wind ?? []).flatMap((wind) => {
    scene.add.rectangle(wind.x, wind.y, wind.width, wind.height, 0x8cdef2, 0.045).setDepth(-1);
    return Array.from({ length: 7 }, (_, index) => {
      const x = wind.x - wind.width / 2 + (index + 1) / 8 * wind.width;
      const sign = Math.sign(wind.accelerationX) || 1;
      const head = scene.add.triangle(x, wind.y, -7, -5, 7, 0, -7, 5, 0xb7e8f4, 0.6).setScale(sign, 1).setDepth(200);
      const shaft = scene.add.rectangle(x - 8 * sign, wind.y, 16, 2, 0xb7e8f4, 0.6).setDepth(200);
      return { x, y: wind.y, sign, head, shaft };
    });
  }));
  return {
    update(platforms: readonly PlatformBox[], timeMs: number, reducedMotion: boolean, playerY = 500): void {
      const weather = stageWeatherAt(world.sections, playerY);
      if (timeMs < lastTimeMs) snowDriftPx = 0;
      const dtSeconds = Math.max(0, timeMs - lastTimeMs) / 1000;
      lastTimeMs = timeMs;
      if (!reducedMotion) snowDriftPx += dtSeconds * STAGES_CONFIG.snowWindPxPerSecond * weather.wind01;
      // Screen-space flakes avoid a world-sized emitter. Gameplay time freezes on pause/recovery.
      const seconds = reducedMotion ? 0 : timeMs / 1000;
      for (const [index, flake] of flakes.entries()) {
        const x = (index * 137 + (reducedMotion ? 0 : snowDriftPx)) % world.width;
        const y = (index * 83 + seconds * STAGES_CONFIG.snowFallPxPerSecond) % 540;
        flake.setPosition(x, y).setAlpha(weather.snow01 * STAGES_CONFIG.snowOpacity);
      }
      const r = Math.round(39 + weather.snow01 * 10);
      const g = Math.round(50 + weather.snow01 * 14 + weather.wind01 * 3);
      const b = Math.round(74 + weather.snow01 * 16);
      scene.cameras.main.setBackgroundColor((r << 16) | (g << 8) | b);
      for (const mark of marks) {
        const platform = platforms.find((candidate) => candidate.id === mark.id);
        if (platform) { mark.body.setPosition(platform.x, platform.y); mark.rim.setPosition(platform.x, platform.y - mark.height / 2); }
      }
      const offset = reducedMotion ? 0 : timeMs % 1200 / 1200 * 24;
      for (const arrow of arrows) {
        arrow.head.setPosition(arrow.x + offset * arrow.sign, arrow.y);
        arrow.shaft.setPosition(arrow.x + (offset - 8) * arrow.sign, arrow.y);
      }
    },
  };
}
