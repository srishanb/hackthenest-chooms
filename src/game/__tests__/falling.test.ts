import { describe, expect, it } from 'vitest';
import { EMBER_CONFIG } from '../../config/ember.config';
import { GAME_CONFIG } from '../../config/game.config';
import type { SectionData } from '../../shared/contracts/content';
import type { GameEvent } from '../../shared/contracts/events';
import { createPlayer, stepPlayer } from '../player/movement';
import type { PlatformBox } from '../player/types';
import { sectionAt } from '../world/bounds';
import { landingEvents } from '../world/fall-tracker';

const plat = (id: string, x: number, y: number, width = 240) => ({ id, x, y, width, height: 20, type: 'static' });
const low: SectionData = { id: 's1', spawn: { x: 480, y: 460 }, platforms: [{ ...plat('floor', 480, 500, 960), height: 24 }, plat('a', 350, 395), plat('c', 350, 185)], refuge: null, finish: null };
const high: SectionData = { id: 's2', spawn: { x: 350, y: 140 }, platforms: [plat('entry', 350, 185), plat('b', 620, 80), plat('top', 620, -130)], refuge: null, finish: { x: 620, y: -175, width: 160, height: 80 } };
const SECTIONS = [low, high];
const BOXES: PlatformBox[] = SECTIONS.flatMap((s) => s.platforms.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })));
const DT = 1000 / GAME_CONFIG.stepHz;
const NONE = { left: false, right: false, jump: false };

function drop(fromX: number, fromY: number): { events: GameEvent[]; y: number; platformId: string | null } {
  let s = createPlayer(fromX, fromY);
  const events: GameEvent[] = [];
  for (let i = 0; i < 20_000; i += 1) {
    const out = stepPlayer(s, NONE, BOXES, GAME_CONFIG.view.width, GAME_CONFIG, DT);
    s = out.state;
    if (out.events.landed) events.push(...landingEvents(out.events.landed, EMBER_CONFIG));
    if (s.grounded) break;
  }
  return { events, y: s.y, platformId: s.platformId };
}

describe('sectionAt', () => {
  it('reads the section by height, and section 1 below everything', () => {
    expect(sectionAt(SECTIONS, 600)).toBe('s1');
    expect(sectionAt(SECTIONS, 300)).toBe('s1');
    expect(sectionAt(SECTIONS, 100)).toBe('s2');
    expect(sectionAt(SECTIONS, -400)).toBe('s2');
    expect(sectionAt([], 0)).toBeNull();
  });
});

describe('falling', () => {
  it('a fall always lands: dropping from the top of section 2 ends on a platform or the floor', () => {
    const result = drop(700, -200); // beside the top ledge, off all platforms except the ones below
    expect(result.platformId).not.toBeNull();
    expect(sectionAt(SECTIONS, result.y)).toBeDefined();
    const missAll = drop(900, -200); // right of every ledge: must reach the full-width floor
    expect(missAll.platformId).toBe('floor');
    expect(sectionAt(SECTIONS, missAll.y)).toBe('s1');
  });

  it('a long drop emits one land and one big fall', () => {
    const { events } = drop(900, -200);
    expect(events.filter((e) => e.type === 'land')).toHaveLength(1);
    const falls = events.filter((e): e is Extract<GameEvent, { type: 'fall' }> => e.type === 'fall');
    expect(falls).toHaveLength(1);
    expect(falls[0]?.big).toBe(true);
  });

  it('a short drop emits land but no fall; a mid drop is a fall that is not big', () => {
    expect(landingEvents({ platformId: 'p', fallHeightPx: 20 }, EMBER_CONFIG).map((e) => e.type)).toEqual(['land']);
    const mid = landingEvents({ platformId: 'p', fallHeightPx: 200 }, EMBER_CONFIG);
    expect(mid.map((e) => e.type)).toEqual(['land', 'fall']);
    expect(mid[1]).toMatchObject({ type: 'fall', big: false });
  });

  it('never emits section_reset', () => {
    expect(drop(900, -200).events.some((e) => e.type === 'section_reset')).toBe(false);
  });
});
