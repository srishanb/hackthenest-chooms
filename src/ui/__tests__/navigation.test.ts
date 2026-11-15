/** Compass directions and distances come from real world geometry, never example values. */
import { describe, expect, it } from 'vitest';
import { navigationView } from '../components/hud/navigation';
import type { NavigationSnapshot } from '../../shared/contracts/game-state';
const world: NavigationSnapshot = { player: { x: 0, y: 0 }, originY: 320, lanternRadiusPx: 200, checkpoints: [] };
describe('checkpoint compass', () => {
  it('handles no placed Ember and rejects invalid scales', () => {
    expect(navigationView(world, 32)?.checkpoint).toBeNull();
    expect(navigationView(world, 0)).toBeNull();
    expect(navigationView(undefined, 32)).toBeNull();
  });
  it('chooses the nearest valid checkpoint and converts Euclidean distance', () => {
    const view = navigationView({ ...world, checkpoints: [{id:'far',x:320,y:0},{id:'near',x:96,y:128},{id:'invalid',x:NaN,y:0}] }, 32);
    expect(view?.checkpoint?.id).toBe('near'); expect(view?.checkpoint?.distanceMetres).toBe(5);
    expect(view?.heightMetres).toBe(10);
  });
  it.each([[0,-32,0],[32,0,90],[0,32,180],[-32,0,270]])('points correctly toward (%s,%s)', (x,y,angle) => {
    expect(navigationView({...world,checkpoints:[{id:'ember',x,y}]},32)?.checkpoint?.angleDegrees).toBe(angle);
  });
  it('updates when player position changes and clamps height below the start', () => {
    const checkpoints = [{id:'ember',x:96,y:128}];
    const view = navigationView({...world, player:{x:96,y:128}, checkpoints},32);
    expect(view?.checkpoint?.distanceMetres).toBe(0);
    expect(navigationView({...world,player:{x:0,y:500}},32)?.heightMetres).toBe(0);
  });
});
