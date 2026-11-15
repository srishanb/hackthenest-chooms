/** One continuous world: five independently authored stages, each with ten unique platforms. */
import type { SectionData } from '../../shared/contracts/content';
import { TUTORIAL_STAGE } from './tutorial';
import { buildStage, STAGE_LAYOUTS } from './stage-layouts';

export const SECTIONS: readonly SectionData[] = [TUTORIAL_STAGE, ...STAGE_LAYOUTS.map(buildStage)];
