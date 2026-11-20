/**
 * The other candle's drawing helpers: its seed always differs from this player's, and the off-screen marker sits
 * inside the screen edge toward the candle, drawn in whole art pixels on the 2x grid.
 */
import { describe, expect, it } from 'vitest';
import { PIXEL_GRID } from '../forest/pixel-grid-snap';
import { edgeMarker, markerPixels, remoteSeed } from '../netplay/remote-view';

describe('the other candle on screen', () => {
  it('keeps its own seed unless it equals this player\'s', () => {
    expect(remoteSeed(5, 9)).toBe(5);
    expect(remoteSeed(9, 9)).not.toBe(9);
  });

  it('has no marker while on screen, and one inside the edge toward it when off screen', () => {
    expect(edgeMarker(100, 100, 960, 540)).toBeNull();
    const above = edgeMarker(480, -900, 960, 540)!;
    expect(above.y).toBeGreaterThan(0);
    expect(above.y).toBeLessThan(40);
    expect(above.x).toBeCloseTo(480, 6);
    expect(above.angle).toBeCloseTo(-Math.PI / 2, 6);
    const right = edgeMarker(5000, 270, 960, 540)!;
    expect(right.x).toBeGreaterThan(920);
    expect(right.x).toBeLessThan(960);
  });

  it('draws the marker in whole art pixels on the grid, with a bright triangle inside a dark backing', () => {
    const cells = markerPixels({ x: 481, y: 17, angle: -Math.PI / 2 });
    expect(cells.length).toBeGreaterThan(20);
    for (const cell of cells) {
      expect(cell.x % PIXEL_GRID).toBe(0);
      expect(cell.y % PIXEL_GRID).toBe(0);
    }
    const bright = cells.filter((cell) => cell.fill);
    expect(bright.length).toBeGreaterThan(4);
    expect(bright.length).toBeLessThan(cells.length);
    // Pointing up: the bright pixels reach higher than they reach low.
    const top = Math.min(...bright.map((cell) => cell.y)), bottom = Math.max(...bright.map((cell) => cell.y));
    expect(17 - top).toBeGreaterThan(bottom - 17);
  });
});
