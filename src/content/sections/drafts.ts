/** Pending P4.2 integration: export drafts separately so the current scene stays playable. */
import type { SectionData } from '../../shared/contracts/content';
import { SECTION_ONE_DRAFT } from './section-1';
import { SECTION_TWO_DRAFT } from './section-2';

export const SECTION_DRAFTS: readonly SectionData[] = [SECTION_ONE_DRAFT, SECTION_TWO_DRAFT];
