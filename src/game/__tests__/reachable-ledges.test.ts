/** LAN-3: the ledges the protected layer outlines are really reachable, higher, and never the current one. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../config/game.config';
import type { PlatformBox } from '../player/types';
import { outlineSegments, reachableLedges, type WorldBounds } from '../world/reachable-ledges';
import { ENDLESS_CONFIG } from '../../config/endless.config';
import { createEndlessGenerator } from '../endless/generator';

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

describe('reachableLedges with a lower reach (the endless climb at night)', () => {
  // From `a` (top 385): `level` is level with it, `low` is 50 px lower, both a short hop to the right.
  const level: PlatformBox = { id: 'level', x: 620, y: 395, width: 240, height: 20 };
  const low: PlatformBox = { id: 'low', x: 620, y: 445, width: 240, height: 20 };
  // Separate worlds: a ledge above another would catch the jump first.
  const withLevel = [floor, a, level], withLow = [floor, a, low];

  it('lists only higher ledges by default, as the authored climb does', () => {
    expect(reachableLedges(a, withLevel, world, GAME_CONFIG)).not.toContain('level');
    expect(reachableLedges(a, withLow, world, GAME_CONFIG)).not.toContain('low');
  });

  it('also lists a reachable ledge level with or a little below the one underfoot', () => {
    expect(reachableLedges(a, withLevel, world, GAME_CONFIG, 60)).toContain('level');
    expect(reachableLedges(a, withLow, world, GAME_CONFIG, 60)).toContain('low');
  });

  it('still never lists the ledge underfoot or anything deeper than the reach (the ground 103 px down stays dark)', () => {
    const ids = reachableLedges(a, withLow, world, GAME_CONFIG, 60);
    expect(ids).not.toContain('a');
    expect(ids).not.toContain('floor');
    // The ground is reachable (a drop), so only the reach keeps it dark.
    expect(reachableLedges(a, withLow, world, GAME_CONFIG, 120)).toContain('floor');
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

  it('finds a ledge reached only through an updraft column when given the columns (endless climb, D-36)', () => {
    // QA should-fix 2: at night the target of an updraft rise was never outlined.
    let checked = 0;
    for (let seed = 1; seed < 40 && checked < 3; seed++) {
      const generator = createEndlessGenerator(seed, GAME_CONFIG, ENDLESS_CONFIG);
      for (let index = 7; index < 20 && checked < 3; index++) {
        const chunk = generator.chunk(index);
        const span = chunk.pieces.find((piece) => piece.id === 'updraft-rise');
        if (!span) continue;
        const step = chunk.route[span.firstStep]!;
        const all = [...chunk.platforms, generator.floor(index + 1)];
        const from = all.find((p) => p.id === step.fromId)!;
        const bounds: WorldBounds = { width: 960, top: generator.floorTopPx(index + 1) - 480, bottom: chunk.floorTopPx + 50 };
        expect(reachableLedges(from, all, bounds, GAME_CONFIG, 0, chunk.updrafts)).toContain(step.toId);
        expect(reachableLedges(from, all, bounds, GAME_CONFIG)).not.toContain(step.toId);
        checked++;
      }
    }
    expect(checked).toBe(3);
  });
});
