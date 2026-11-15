/** Protected outlines must follow moving ledges instead of leaving ghost edges in the darkness. */
import { expect, it, vi } from 'vitest';
import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../../config/game.config';
import { createProtectedVisibility } from '../effects/protected-visibility';

it('tracks current geometry while grounded and airborne without redrawing unchanged edges', () => {
  const graphics = { setDepth: vi.fn().mockReturnThis(), clear: vi.fn(), lineStyle: vi.fn(), lineBetween: vi.fn() };
  const scene = { add: { graphics: () => graphics } } as unknown as Scene;
  const platform = { id: 'moving', x: 480, y: 500, width: 220, height: 20 };
  const visibility = createProtectedVisibility(scene, 200, [platform], { width: 960, top: 0, bottom: 510 }, GAME_CONFIG);
  visibility.update(platform.id);
  expect(graphics.clear).toHaveBeenCalledTimes(1);
  visibility.update(platform.id);
  expect(graphics.clear).toHaveBeenCalledTimes(1);
  visibility.update(platform.id, [{ ...platform, x: 500 }]);
  expect(graphics.lineBetween).toHaveBeenCalledWith(390, 490, 610, 490);
  visibility.update(null, [{ ...platform, x: 510 }]);
  expect(graphics.clear).toHaveBeenCalledTimes(3);
  expect(graphics.lineBetween).toHaveBeenCalledWith(400, 490, 620, 490);
});
