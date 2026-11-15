/** Full viewport and depleted sight agree across worlds and view sizes. */
import { expect, it } from 'vitest';
import { fuelVisibilityRadius as radius } from '../forest/fuel-visibility';
it('clears all corners at full fuel in either world and preserves emergency light', () => {
  for (const [w,h] of [[960,540],[1280,720],[540,960]] as const) {
    expect(radius(1,0,w,h)).toBe(Math.hypot(w,h));
    expect(radius(1,1,w,h)).toBe(Math.hypot(w,h));
    expect(radius(0,1,w,h)).toBe(60);
    expect(radius(0.5,1,w,h)).toBeLessThan(radius(0.5,0,w,h));
  }
});
