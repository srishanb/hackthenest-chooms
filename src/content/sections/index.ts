/** One continuous world: five independently authored stages, each with ten unique platforms. */
import type { SectionData } from '../../shared/contracts/content';
import { DEFAULT_SECTIONS } from './defaults';
import { PUBLISHED_LAYOUTS } from './published-layouts';

export const SECTIONS: readonly SectionData[] = PUBLISHED_LAYOUTS ?? DEFAULT_SECTIONS;
