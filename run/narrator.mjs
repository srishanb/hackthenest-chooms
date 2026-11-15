// @ts-check
/** Run file: the narrator and captions. Not built yet; this file is the checklist for when it is (P7, P2.4). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'narrator',
  title: 'Narrator and captions',
  status: 'planned',
  note: 'Not built. Plans: docs/plans/P7.md (narrator, waiting for Amrit\'s approval) and P2.4 (captions). No lines are written yet.',
  features: ['NAR-1', 'NAR-2', 'NAR-3', 'NAR-4'],
  order: 410,
  tests: ['src/audio/__tests__/director.test.ts', 'src/ui/__tests__/captions.test.ts'],
  steps: ['When P7.3 lands: fall three times within ten seconds, then charge a jump right after a fall. Then turn the Wi-Fi off and repeat.'],
  expect: [
    'At most one line plays for the three falls, and none starts while a jump is charging.',
    'Every line has a caption; captions and the narrator volume follow Settings.',
    'Lines are about the climb and the fall, never about the player. Every clip plays with no network.',
  ],
});
