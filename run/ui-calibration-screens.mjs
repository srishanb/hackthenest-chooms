// @ts-check
/** Run file: the player-facing calibration flow. Logic and wording exist; the screens do not yet (P6.1). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'ui-calibration-screens',
  title: 'Calibration screens ("lighting the lantern")',
  status: 'partial',
  note: 'The flow logic and wording are built and tested (P6.1.1). The screens themselves (P6.1.2) and their buttons (P6.1.3) are not: use signal-calibration for a hands-on calibration today.',
  features: ['BCI-2', 'BCI-5', 'BCI-6'],
  order: 320,
  tests: ['src/ui/__tests__/calibration-flow.test.ts'],
  steps: ['When P6.1.2 lands: start the calibration from the pause menu and follow the screens without reading any instructions first.'],
  expect: [
    'A stranger finishes it in under a minute.',
    'Each step cues you at the halfway point; a failed step explains why in plain words and offers a retry and the fixed-intensity fallback.',
    'The wording never treats closed eyes as proof of calmness.',
  ],
});
