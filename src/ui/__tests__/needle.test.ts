/** The compass needle eases toward its target along the shortest way round. */
import { describe, expect, it } from 'vitest';
import { shortestTurn, stepNeedle } from '../components/hud/needle';

describe('compass needle', () => {
  it('turns the short way across north', () => {
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
    expect(shortestTurn(0, 180)).toBe(180);
  });

  it('moves gradually: part of the way per step, never past the target', () => {
    const one = stepNeedle(0, 90, 16, 300);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(90);
    let angle = 0;
    for (let t = 0; t < 3000; t += 16) angle = stepNeedle(angle, 90, 16, 300);
    expect(angle).toBeCloseTo(90, 1);
  });

  it('the same time gives the same turn at any frame rate', () => {
    let fast = 0; for (let i = 0; i < 10; i++) fast = stepNeedle(fast, 120, 10, 300);
    expect(fast).toBeCloseTo(stepNeedle(0, 120, 100, 300), 6);
  });

  it('reduced motion snaps straight to the target', () => {
    expect(stepNeedle(0, 90, 16, 300, true)).toBe(90);
  });
});
