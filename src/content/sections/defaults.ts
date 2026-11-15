/** Original authored stages, also used to validate editor submissions and reset drafts. */
import type { SectionData } from '../../shared/contracts/content';
import { TUTORIAL_STAGE } from './tutorial';
import { buildStage, STAGE_LAYOUTS } from './stage-layouts';
export const DEFAULT_SECTIONS: readonly SectionData[] = [TUTORIAL_STAGE, ...STAGE_LAYOUTS.map(buildStage)];
