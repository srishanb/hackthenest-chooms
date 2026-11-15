/** LAN-3 fade: outlines show inside the light and are gone past its edge. */
import { describe, expect, it } from 'vitest';
import { FADE_END_FACTOR, fadeAlpha, fadeSegments } from '../effects/outline-fade';

describe('fadeAlpha', () => {
  it('is fully visible inside the light radius', () => {
    expect(fadeAlpha(0, 100)).toBe(1);
    expect(fadeAlpha(100, 100)).toBe(1);
  });

  it('fades linearly past the radius and reaches zero at the fade end', () => {
    const mid = 100 * (1 + FADE_END_FACTOR) / 2;
    expect(fadeAlpha(mid, 100)).toBeCloseTo(0.5);
    expect(fadeAlpha(100 * FADE_END_FACTOR, 100)).toBe(0);
    expect(fadeAlpha(1000, 100)).toBe(0);
  });

  it('a smaller light hides the same ledge sooner', () => {
    expect(fadeAlpha(130, 90)).toBeLessThan(fadeAlpha(130, 200));
  });
});

describe('fadeSegments', () => {
  const ledge = { x1: 0, y1: 0, x2: 400, y2: 0, current: false };

  it('keeps pieces near the lantern and drops the ones in the dark', () => {
    const pieces = fadeSegments([ledge], 0, 0, 100);
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) expect(Math.max(piece.x1, piece.x2)).toBeLessThanOrEqual(100 * FADE_END_FACTOR + 8);
    expect(pieces[0]!.alpha).toBe(1);
  });

  it('draws nothing for a ledge entirely outside the light', () => {
    expect(fadeSegments([ledge], 0, 1000, 100)).toEqual([]);
  });

  it('keeps the current-platform flag on every piece', () => {
    const pieces = fadeSegments([{ ...ledge, current: true }], 0, 0, 100);
    expect(pieces.every((piece) => piece.current)).toBe(true);
  });
});
