/** Reachable fixtures pass and physically impossible ledges or zones fail with their IDs. */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../src/config/game.config';
import type { SectionData } from '../../src/shared/contracts/content';
import { checkReachability } from './reach';

function fixture(): SectionData {
  return { id: 'test', spawn: { x: 480, y: 460 }, refuge: null,
    finish: { x: 480, y: 330, width: 100, height: 40 },
    platforms: [
      { id: 'floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
      { id: 'ledge', x: 480, y: 380, width: 200, height: 20, type: 'static' },
    ] };
}

describe('level reachability', () => {
  it('rejects invalid physics instead of entering an unbounded search', () => {
    expect(() => checkReachability([fixture()], { ...GAME_CONFIG, gravityY: 0 })).toThrow(/physics/);
  });
  it('reaches a ledge and the finish with the same physics as the player', () => {
    expect(checkReachability([fixture()], GAME_CONFIG)).toEqual([{ sectionId: 'test', unreachable: [] }]);
  });

  it('reports a platform 2000px above the climb', () => {
    const section = fixture();
    section.platforms.push({ id: 'too-high', x: 480, y: -1620, width: 200, height: 20, type: 'static' });
    expect(checkReachability([section], GAME_CONFIG)[0]!.unreachable).toEqual(['too-high']);
  });

  it('does not count a remote refuge as reachable just because its section is reachable', () => {
    const section = fixture();
    section.platforms.push({ id: 'too-high', x: 480, y: -1620, width: 200, height: 20, type: 'static' });
    section.refuge = { id: 'remote-refuge', x: 480, y: -1700, width: 100, height: 50 };
    expect(checkReachability([section], GAME_CONFIG)[0]!.unreachable).toEqual(['too-high', 'remote-refuge']);
  });

  it('recognizes two section IDs for exactly the same physical surface', () => {
    const section = fixture();
    section.platforms.push({ ...section.platforms[1]!, id: 'shared-ledge' });
    expect(checkReachability([section], GAME_CONFIG)[0]!.unreachable).toEqual([]);
  });

  it('does not allow a platform to become its own unreachable starting point', () => {
    const section = fixture();
    section.platforms.push({ id: 'isolated', x: 480, y: -1000, width: 200, height: 20, type: 'static' });
    expect(checkReachability([section], GAME_CONFIG)[0]!.unreachable).toEqual(['isolated']);
  });
});
