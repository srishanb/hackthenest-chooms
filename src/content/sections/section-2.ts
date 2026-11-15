/** Narrower upper-climb draft, in the same world coordinates as section one. */
import type { SectionData } from '../../shared/contracts/content';

export const SECTION_TWO_DRAFT: SectionData = {
  id: 'upper-corridors',
  // Shares the lower section's final ledge so the future transition has a landing.
  spawn: { x: 570, y: -420 },
  platforms: [
    { id: 'upper-entry', x: 570, y: -380, width: 280, height: 24, type: 'static' },
    { id: 'upper-01', x: 300, y: -490, width: 180, height: 20, type: 'static' },
    { id: 'upper-02', x: 620, y: -600, width: 180, height: 20, type: 'static' },
    { id: 'upper-03', x: 300, y: -710, width: 180, height: 20, type: 'static' },
    { id: 'upper-04', x: 620, y: -820, width: 180, height: 20, type: 'static' },
    { id: 'upper-05', x: 300, y: -930, width: 180, height: 20, type: 'static' },
    { id: 'upper-06', x: 620, y: -1040, width: 180, height: 20, type: 'static' },
    { id: 'upper-07', x: 300, y: -1150, width: 180, height: 20, type: 'static' },
    { id: 'upper-summit', x: 620, y: -1260, width: 220, height: 24, type: 'static' },
  ],
  refuge: null,
  finish: null,
};
