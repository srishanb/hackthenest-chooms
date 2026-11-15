/** Validate authored sections once, before either the scene or the level checker uses them. */
import type { AreaData, PlatformData, SectionData } from '../../shared/contracts/content';
import { getPlatformType } from './platform-types/registry';

export const WORLD_TOP_MARGIN_PX = 240;

export interface LoadedWorld {
  sections: readonly SectionData[];
  platforms: PlatformData[];
  width: number;
  top: number;
  bottom: number;
}

function fail(id: string, reason: string): never { throw new Error(`Level ${id}: ${reason}`); }

function checkArea(area: AreaData, id: string, width: number): void {
  if (![area.x, area.y, area.width, area.height].every(Number.isFinite) || area.width <= 0 || area.height <= 0) {
    fail(id, 'coordinates and positive sizes must be finite');
  }
  if (area.x - area.width / 2 < 0 || area.x + area.width / 2 > width) fail(id, 'outside the side walls');
}

export function loadSections(sections: readonly SectionData[], width: number): LoadedWorld {
  if (!Number.isFinite(width) || width <= 0) fail('world', 'width must be positive');
  if (!sections.length) fail('world', 'at least one section is required');
  const sectionIds = new Set<string>();
  const platformIds = new Set<string>();
  const refugeIds = new Set<string>();
  const platforms: PlatformData[] = [];
  for (const [index, section] of sections.entries()) {
    if (!section.id.trim() || sectionIds.has(section.id)) fail(section.id, 'duplicate or empty section id');
    sectionIds.add(section.id);
    if (!section.platforms.length) fail(section.id, 'has no platforms');
    for (const platform of section.platforms) {
      if (!platform.id.trim() || platformIds.has(platform.id)) fail(platform.id, 'duplicate or empty platform id');
      platformIds.add(platform.id);
      checkArea(platform, platform.id, width);
      if (!getPlatformType(platform.type)) fail(platform.id, `unknown platform type ${platform.type}`);
      if (platform.type === 'moving' && !platform.motion) fail(platform.id, 'moving platform needs a motion cycle');
      if (platform.motion) {
        const { axis, distance, periodMs } = platform.motion;
        if (platform.type !== 'moving' || !['x', 'y'].includes(axis) || !Number.isFinite(distance) || distance < 0 || !Number.isFinite(periodMs) || periodMs <= 0) {
          fail(platform.id, 'invalid motion cycle');
        }
        if (axis === 'x' && (platform.x - platform.width / 2 - distance < 0 || platform.x + platform.width / 2 + distance > width)) fail(platform.id, 'motion leaves the side walls');
      }
      platforms.push(platform);
    }
    if (section.refuge) {
      if (!section.refuge.id.trim() || refugeIds.has(section.refuge.id)) fail(section.refuge.id, 'duplicate or empty refuge id');
      refugeIds.add(section.refuge.id);
      checkArea(section.refuge, section.refuge.id, width);
    }
    if (section.finish) {
      if (index !== sections.length - 1) fail(section.id, 'finish belongs in the last section');
      checkArea(section.finish, `${section.id}/finish`, width);
    }
    for (const [index, wind] of (section.wind ?? []).entries()) {
      checkArea(wind, `${section.id}/wind-${index}`, width);
      if (!Number.isFinite(wind.accelerationX) || !Number.isFinite(wind.periodMs) || wind.periodMs <= 0) fail(section.id, 'invalid wind cycle');
    }
  }
  const first = sections[0]!;
  const lowestY = Math.max(...first.platforms.map((platform) => platform.y));
  if (!first.platforms.some((platform) => platform.y === lowestY &&
    platform.x - platform.width / 2 <= 0 && platform.x + platform.width / 2 >= width)) {
    fail(first.id, 'lowest platform must be a full-width floor');
  }
  const top = Math.min(...platforms.map((platform) => platform.y - platform.height / 2 - (platform.motion?.axis === 'y' ? platform.motion.distance : 0))) - WORLD_TOP_MARGIN_PX;
  const bottom = Math.max(...platforms.map((platform) => platform.y + platform.height / 2 + (platform.motion?.axis === 'y' ? platform.motion.distance : 0)));
  for (const section of sections) {
    if (![section.spawn.x, section.spawn.y].every(Number.isFinite) ||
      section.spawn.x < 0 || section.spawn.x > width || section.spawn.y < top || section.spawn.y > bottom) {
      fail(section.id, 'spawn outside the world');
    }
    for (const area of [section.refuge, section.finish]) {
      if (area && (area.y - area.height / 2 < top || area.y + area.height / 2 > bottom)) {
        fail(section.id, 'zone outside the world');
      }
    }
  }
  return { sections, platforms, width, top, bottom };
}
