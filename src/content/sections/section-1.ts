/** Early lower-corridors draft: wide, forgiving ledges for the first climb.
 * Kept for reference and tests; the game runs on `SECTIONS` from index.ts. */
import type { SectionData } from '../../shared/contracts/content';

export const SECTION_ONE_DRAFT: SectionData = {
  id: 'lower-corridors',
  spawn: { x: 480, y: 460 },
  platforms: [
    { id: 'lower-floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
    { id: 'lower-01', x: 350, y: 390, width: 260, height: 20, type: 'static' },
    { id: 'lower-02', x: 570, y: 280, width: 240, height: 20, type: 'static' },
    { id: 'lower-03', x: 350, y: 170, width: 240, height: 20, type: 'static' },
    { id: 'lower-04', x: 570, y: 60, width: 220, height: 20, type: 'static' },
    { id: 'lower-05', x: 350, y: -50, width: 220, height: 20, type: 'static' },
    { id: 'lower-06', x: 570, y: -160, width: 220, height: 20, type: 'static' },
    { id: 'lower-07', x: 350, y: -270, width: 220, height: 20, type: 'static' },
    { id: 'lower-rest', x: 570, y: -380, width: 280, height: 24, type: 'static' },
  ],
  refuge: null,
  finish: null,
};
