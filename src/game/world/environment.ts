/** Authored moving ledges and visible wind run on gameplay time, never on the EEG signal. */
import type { PlatformData, SectionData } from '../../shared/contracts/content';
import type { PlatformBox } from '../player/types';

export function platformsAt(platforms: readonly PlatformData[], timeMs: number, dtMs = 0): PlatformBox[] {
  return platforms.map((platform) => {
    const motion = platform.motion;
    const offset = (t: number): number => motion ? Math.sin(t / motion.periodMs * Math.PI * 2) * motion.distance : 0;
    const current = offset(timeMs); const previous = offset(timeMs - dtMs);
    return { ...platform, x: platform.x + (motion?.axis === 'x' ? current : 0),
      y: platform.y + (motion?.axis === 'y' ? current : 0),
      dx: motion?.axis === 'x' ? current - previous : 0, dy: motion?.axis === 'y' ? current - previous : 0 };
  });
}

export function windAt(sections: readonly SectionData[], player: { x: number; y: number }, timeMs: number): number {
  let acceleration = 0;
  for (const section of sections) for (const wind of section.wind ?? []) {
    if (Math.abs(player.x - wind.x) > wind.width / 2 || Math.abs(player.y - wind.y) > wind.height / 2) continue;
    const gust = 0.35 + 0.65 * (Math.sin(timeMs / wind.periodMs * Math.PI * 2) + 1) / 2;
    const edge = Math.min(wind.width / 2 - Math.abs(player.x - wind.x), wind.height / 2 - Math.abs(player.y - wind.y));
    const blend = wind.fadePx ? Math.min(1, Math.max(0, edge / wind.fadePx)) : 1;
    acceleration += wind.accelerationX * gust * blend;
  }
  return acceleration;
}
