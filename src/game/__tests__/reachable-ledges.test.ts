/** LAN-3: the ledges the protected layer outlines are really reachable, higher, and never the current one. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import type { PlatformBox } from '../player/types';
import { outlineSegments, reachableLedges, type WorldBounds } from '../world/reachable-ledges';

// Shaped like the test climb: a full-width floor and alternating ledges 105 px apart.
const floor: PlatformBox = { id: 'floor', x: 480, y: 500, width: 960, height: 24 };
const a: PlatformBox = { id: 'a', x: 350, y: 395, width: 240, height: 20 };
const b: PlatformBox = { id: 'b', x: 620, y: 290, width: 240, height: 20 };
const far: PlatformBox = { id: 'far', x: 480, y: -1500, width: 240, height: 20 };
const platforms = [floor, a, b, far];
const world: WorldBounds = { width: 960, top: -1760, bottom: 512 };

describe('reachableLedges', () => {
  it('lists the next ledge up', () => {
    expect(reachableLedges(floor, platforms, world, GAME_CONFIG)).toContain('a');
    expect(reachableLedges(a, platforms, world, GAME_CONFIG)).toContain('b');
  });

  it('never lists the current platform or anything lower', () => {
    const fromB = reachableLedges(b, platforms, world, GAME_CONFIG);
    expect(fromB).not.toContain('b');
    expect(fromB).not.toContain('a');
    expect(fromB).not.toContain('floor');
  });

  it('never lists a ledge out of jumping range', () => {
    expect(reachableLedges(floor, platforms, world, GAME_CONFIG)).not.toContain('far');
  });

  it('gives the same answer every time (the physics is deterministic)', () => {
    expect(reachableLedges(floor, platforms, world, GAME_CONFIG)).toEqual(reachableLedges(floor, platforms, world, GAME_CONFIG));
  });
});

describe('outlineSegments', () => {
  it('outlines the current platform on four sides and only the top edge of a reachable one', () => {
    const segments = outlineSegments(platforms, 'floor', ['a']);
    expect(segments).toHaveLength(5);
    expect(segments[4]).toEqual({ x1: 230, y1: 385, x2: 470, y2: 385, current: false });
  });

  it('draws nothing for a ledge that is not reachable', () => {
    const segments = outlineSegments(platforms, null, []);
    expect(segments).toEqual([]);
  });
});
