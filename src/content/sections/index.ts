/**
 * The authored climb, in order. Owner: content (Neil).
 *
 * P0 holds one tiny test section so the foundation has something to stand on.
 * P8.2 replaces it with the two real sections; to add one, write `section-<n>.ts`
 * and add it to this list.
 */
import type { SectionData } from '../../shared/contracts/content';

// Test climb for P4 (one world, y grows downward, section 2 above section 1, 960 px wide).
// Section 1 ends at `low-c`; section 2 repeats that ledge as `high-entry` and owns the refuge on it.
const testLow: SectionData = {
  id: 'p0-low',
  spawn: { x: 480, y: 460 },
  platforms: [
    { id: 'low-floor', x: 480, y: 500, width: 960, height: 24, type: 'static' },
    { id: 'low-a', x: 350, y: 395, width: 240, height: 20, type: 'static' },
    { id: 'low-b', x: 620, y: 290, width: 240, height: 20, type: 'static' },
    { id: 'low-c', x: 350, y: 185, width: 240, height: 20, type: 'static' },
  ],
  refuge: null,
  finish: null,
};

const testHigh: SectionData = {
  id: 'p0-high',
  spawn: { x: 350, y: 140 },
  platforms: [
    { id: 'high-entry', x: 350, y: 185, width: 240, height: 20, type: 'static' },
    { id: 'high-a', x: 620, y: 80, width: 240, height: 20, type: 'static' },
    { id: 'high-b', x: 350, y: -25, width: 240, height: 20, type: 'static' },
    { id: 'high-c', x: 620, y: -130, width: 240, height: 20, type: 'static' },
  ],
  refuge: { id: 'refuge-1', x: 350, y: 135, width: 200, height: 100 },
  finish: { x: 620, y: -175, width: 160, height: 80 },
};

export const SECTIONS: readonly SectionData[] = [testLow, testHigh];
