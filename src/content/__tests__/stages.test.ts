/** Stage count and boundaries guard the authored continuous journey without duplicating the physics checker. */
import { expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import { SECTIONS } from '../sections';

it('has five sequential ten-platform stages with one landing target each and no finish boxes', () => {
  expect(SECTIONS.map((section) => section.stage?.kind)).toEqual(['tutorial', 'normal', 'snow', 'windy', 'snow-windy']);
  const ids = SECTIONS.flatMap((section) => section.platforms.map((platform) => platform.id));
  expect(ids).toHaveLength(50); expect(new Set(ids).size).toBe(50);
  for (const section of SECTIONS) {
    expect(section.platforms).toHaveLength(10);
    expect(section.finish).toBeNull(); expect(section.refuge).toBeNull();
    expect(section.stage?.finalPlatformId).toBe(section.platforms.at(-1)!.id);
  }
});

it('connects each stage without a gap that could bypass its final landing', () => {
  const maxVerticalRise = GAME_CONFIG.jump.maxSpeed ** 2 / (2 * GAME_CONFIG.gravityY);
  for (let index = 1; index < SECTIONS.length; index++) {
    const previous = SECTIONS[index - 1]!.platforms;
    const final = previous.at(-1)!; const penultimate = previous.at(-2)!;
    const next = SECTIONS[index]!.platforms[0]!;
    expect(final.y - next.y).toBeGreaterThan(0);
    expect(final.y - next.y).toBeLessThan(maxVerticalRise);
    expect(penultimate.y - next.y).toBeGreaterThan(maxVerticalRise);
  }
});
