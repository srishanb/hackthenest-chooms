// @ts-check
/** Run file: the active-play fallback, where intensity stays fixed but the resting signal still works. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-fixed-mode',
  title: 'Signal: fixed-intensity fallback',
  status: 'ready',
  features: ['BCI-6', 'BCI-5'],
  order: 120,
  tests: ['src/signal/__tests__/pipeline.test.ts', 'src/signal/__tests__/signal-index.test.ts'],
  query: '?algo=passthrough-v0&mode=fixed',
  steps: [
    'Click the game and press ` to open the overlay. It reads mode fixed.',
    'Watch "intensity" and the light for ten seconds; press 2 (jaw clench) a few times as well.',
    'Press 1 (alpha boost on) and watch "resting".',
  ],
  expect: [
    'Intensity stays at 0.50 and the light does not change size, whatever the signal does.',
    '"resting" still rises with the alpha boost: the resting interaction keeps working in fixed mode.',
  ],
});
