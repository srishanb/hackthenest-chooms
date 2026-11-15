/**
 * The authored climb, in order. Owner: content (Neil).
 *
 * P0 holds one tiny test section so the foundation has something to stand on.
 * P8.2 replaces it with the two real sections; to add one, write `section-<n>.ts`
 * and add it to this list.
 */
import type { SectionData } from '../../shared/contracts/content';

const foundationTestSection: SectionData = {
  id: 'p0-test',
  spawn: { x: 480, y: 300 },
  platforms: [
    { id: 'ground', x: 480, y: 500, width: 720, height: 24, type: 'static' },
    { id: 'ledge', x: 700, y: 400, width: 160, height: 16, type: 'static' },
  ],
};

export const SECTIONS: readonly SectionData[] = [foundationTestSection];
