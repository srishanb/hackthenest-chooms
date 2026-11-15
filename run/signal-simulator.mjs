// @ts-check
/** Run file: the simulated EEG board and what the signal pipeline makes of it (P1.1, P1.2). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-simulator',
  title: 'Signal: simulated board, features and quality',
  status: 'ready',
  features: ['BCI-1', 'BCI-3', 'DIA-1', 'DIA-2'],
  order: 100,
  tests: [
    'src/signal/__tests__/sources.test.ts',
    'src/signal/__tests__/real-sdk.test.ts',
    'src/signal/__tests__/features.test.ts',
    'src/signal/__tests__/quality.test.ts',
    'src/signal/__tests__/preprocess.test.ts',
  ],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game, then press ` (backtick) to open the signal debug overlay at the bottom left.',
    'Read the top lines: source SIMULATED, algo passthrough-v0, sample age near 0 ms, valid=true.',
    'Press 1 (alpha boost on) and watch "resting" for a few seconds. Press 1 again to switch it off.',
    'Press 2 (jaw clench) a few times in a row and watch "feat active" and "intensity".',
    'Press 4 (noisy pin on) and watch "quality" and "contact". Press 4 again to switch it off.',
    'Press ` to hide the overlay.',
  ],
  expect: [
    'The badge at the top right always reads SIMULATED INPUT, even with the overlay hidden.',
    'Alpha boost on: "resting" climbs within about three seconds; off: it falls back.',
    'Noisy pin on: quality and contact drop, while the feature values stay on the same scale.',
    'The simulator keys are 1 to 4. Space, A and C do nothing to the signal (Space is the jump key).',
  ],
});
