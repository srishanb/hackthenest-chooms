/** Protected outlines must follow moving ledges instead of leaving ghost edges in the darkness. */
import { expect, it, vi } from 'vitest';
import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../../config/game.config';
import { createProtectedVisibility } from '../effects/protected-visibility';

// A light far larger than the test world, so the edge fade never hides a piece here.
const BIG_LIGHT = 10_000;

it('never outlines the occupied moving ledge, including while airborne', () => {
  const graphics = { setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn() };
  const scene = { add: { graphics: () => graphics } } as unknown as Scene;
  const platform = { id: 'moving', x: 480, y: 500, width: 220, height: 20 };
  const visibility = createProtectedVisibility(scene, 200, [platform], { width: 960, top: 0, bottom: 510 }, GAME_CONFIG);
  visibility.update(platform.id, 480, 480, BIG_LIGHT);
  expect(graphics.lineBetween).not.toHaveBeenCalled();
  visibility.update(platform.id, 480, 480, BIG_LIGHT, [{ ...platform, x: 500 }]);
  expect(graphics.lineBetween).not.toHaveBeenCalled();
  // In the air (null) the same ledge stays selected and still follows its movement.
  visibility.update(null, 480, 480, BIG_LIGHT, [{ ...platform, x: 510 }]);
  expect(graphics.lineBetween).not.toHaveBeenCalled();
});

it('draws nothing when the ledge is outside the light', () => {
  const graphics = { setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn() };
  const scene = { add: { graphics: () => graphics } } as unknown as Scene;
  const platform = { id: 'far', x: 480, y: 500, width: 220, height: 20 };
  const visibility = createProtectedVisibility(scene, 200, [platform], { width: 960, top: 0, bottom: 510 }, GAME_CONFIG);
  visibility.update(platform.id, 480, -2000, 100);
  expect(graphics.clear).toHaveBeenCalled();
  expect(graphics.lineBetween).not.toHaveBeenCalled();
});
