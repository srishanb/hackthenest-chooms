/** Early two-section drafts (lower and upper corridors), kept for reference and tests.
 * The game runs on `SECTIONS` from index.ts, not on these. */
import type { SectionData } from '../../shared/contracts/content';
import { SECTION_ONE_DRAFT } from './section-1';
import { SECTION_TWO_DRAFT } from './section-2';

export const SECTION_DRAFTS: readonly SectionData[] = [SECTION_ONE_DRAFT, SECTION_TWO_DRAFT];
