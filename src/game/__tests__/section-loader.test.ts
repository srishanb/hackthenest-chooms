/** Authored mistakes must name the broken object before rendering or simulation begins. */
import { describe, expect, it } from 'vitest';
import type { SectionData } from '../../shared/contracts/content';
import { loadSections } from '../world/section-loader';
import { getPlatformType } from '../world/platform-types/registry';

function section(): SectionData {
  return { id: 'first', spawn: { x: 480, y: 460 }, refuge: null, finish: null,
    platforms: [{ id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' }] };
}

describe('section loading', () => {
  it('returns the same geometry used by gameplay and marks static ledges as safe anchors', () => {
    const authored = section();
    const world = loadSections([authored], 960);
    expect(world.platforms).toEqual(authored.platforms);
    expect(world.bottom).toBe(512);
    expect(getPlatformType('static')).toEqual({ stationary: true, anchorSafe: true });
    expect(getPlatformType('constructor')).toBeUndefined();
  });

  it('names an unknown platform type', () => {
    const authored = section();
    authored.platforms[0]!.type = 'mystery';
    expect(() => loadSections([authored], 960)).toThrow(/floor.*unknown platform type mystery/);
  });

  it('requires a full-width floor below the first section', () => {
    const authored = section();
    authored.platforms[0]!.width = 100;
    expect(() => loadSections([authored], 960)).toThrow(/first.*full-width floor/);
  });

  it('rejects duplicate platform IDs instead of silently dropping geometry', () => {
    const authored = section();
    authored.platforms.push({ ...authored.platforms[0]!, y: 300 });
    expect(() => loadSections([authored], 960)).toThrow(/floor.*duplicate/);
  });

  it('rejects nonfinite geometry and zones outside the world', () => {
    const authored = section();
    authored.platforms[0]!.y = NaN;
    expect(() => loadSections([authored], 960)).toThrow(/floor.*finite/);
    const other = section();
    other.refuge = { id: 'outside', x: -10, y: 450, width: 20, height: 20 };
    expect(() => loadSections([other], 960)).toThrow(/outside.*side walls/);
  });

  it('rejects an empty climb and a finish before the last section', () => {
    expect(() => loadSections([], 960)).toThrow(/at least one section/);
    const first = section();
    first.finish = { x: 480, y: 450, width: 60, height: 60 };
    const second = { ...section(), id: 'second', platforms: [{ ...section().platforms[0]!, id: 'second-floor' }] };
    expect(() => loadSections([first, second], 960)).toThrow(/first.*last section/);
  });
});
