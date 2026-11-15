/** Geometry guards for authored drafts; these do not replace P4.2's collision-aware checker. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import type { SectionData } from '../../shared/contracts/content';
import { SECTION_DRAFTS } from '../sections/drafts';

function gaps(section: SectionData): number[] {
  return section.platforms.slice(1).map((next, i) => {
    const previous = section.platforms[i]!;
    return Math.max(0, Math.abs(next.x - previous.x) - (next.width + previous.width) / 2);
  });
}

describe('section drafts', () => {
  it('has distinct IDs, finite geometry, static ledges and no ledges outside horizontal bounds', () => {
    const ids = SECTION_DRAFTS.flatMap((section) => [section.id, ...section.platforms.map((p) => p.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of SECTION_DRAFTS) {
      for (const platform of section.platforms) {
        expect([platform.x, platform.y, platform.width, platform.height].every(Number.isFinite)).toBe(true);
        expect(platform.type).toBe('static');
        expect(platform.width).toBeGreaterThan(0);
        expect(platform.height).toBeGreaterThan(0);
        expect(platform.x - platform.width / 2).toBeGreaterThanOrEqual(0);
        expect(platform.x + platform.width / 2).toBeLessThanOrEqual(GAME_CONFIG.view.width);
      }
    }
  });

  it('provides a full-width bottom catch and matching transition ledges under both spawns', () => {
    const first = SECTION_DRAFTS[0]!;
    const second = SECTION_DRAFTS[1]!;
    const floor = first.platforms[0]!;
    expect(floor.width).toBe(GAME_CONFIG.view.width);
    expect(floor.x).toBe(GAME_CONFIG.view.width / 2);
    const exit = first.platforms.at(-1)!;
    const entry = second.platforms[0]!;
    expect([entry.x, entry.y, entry.width]).toEqual([exit.x, exit.y, exit.width]);
    for (const section of SECTION_DRAFTS) {
      const landing = section.platforms[0]!;
      expect(Math.abs(section.spawn.x - landing.x)).toBeLessThan(landing.width / 2);
      expect(section.spawn.y).toBeLessThan(landing.y - landing.height / 2);
    }
  });

  it('has larger average edge gaps in section two', () => {
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(average(gaps(SECTION_DRAFTS[1]!))).toBeGreaterThan(average(gaps(SECTION_DRAFTS[0]!)));
  });

  it('keeps every planned rise and edge gap inside the full-charge ballistic envelope', () => {
    const radians = GAME_CONFIG.jump.angleDeg * Math.PI / 180;
    const vx = GAME_CONFIG.jump.maxSpeed * Math.cos(radians);
    const vy = GAME_CONFIG.jump.maxSpeed * Math.sin(radians);
    for (const section of SECTION_DRAFTS) {
      for (let i = 1; i < section.platforms.length; i++) {
        const from = section.platforms[i - 1]!;
        const to = section.platforms[i]!;
        const rise = (from.y - from.height / 2) - (to.y - to.height / 2);
        expect(rise).toBeGreaterThan(0);
        const discriminant = vy * vy - 2 * GAME_CONFIG.gravityY * rise;
        expect(discriminant).toBeGreaterThan(0);
        const descendingTime = (vy + Math.sqrt(discriminant)) / GAME_CONFIG.gravityY;
        // A gap within this bound is only a feasibility screen, not proof of a safe jump.
        expect(gaps(section)[i - 1]!).toBeLessThan(vx * descendingTime);
      }
    }
  });
});
