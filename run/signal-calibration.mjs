// @ts-check
/** Run file: per-player calibration of the resting and active-play baselines (P1.3, intensity-v2). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-calibration',
  title: 'Signal: calibrate resting and active play',
  status: 'ready',
  note: 'Uses the developer buttons on the debug overlay; the player-facing calibration screens are plan P6.1.',
  features: ['BCI-2', 'BCI-4', 'LAN-1'],
  order: 110,
  tests: [
    'src/signal/__tests__/calibration.test.ts',
    'src/signal/__tests__/intensity-v2.test.ts',
    'src/signal/__tests__/pipeline.test.ts',
    'src/signal/__tests__/stages-p14.test.ts',
  ],
  query: '',
  steps: [
    'Click the game and press ` to open the overlay. It reads algo intensity-v2, calibrated false, valid=false.',
    'Click "Calibrate resting". It runs for 12 seconds: do nothing for the first 6 (eyes open), then press 1 once (alpha boost on, standing in for eyes closed) and wait.',
    'When it prints "resting: ok", press 1 again to switch the alpha boost off.',
    'Click "Calibrate active". For the first 6 seconds do nothing (relaxed). For the last 6 seconds press 2 (jaw clench) about twice a second.',
    'When it prints "active: ok", read the overlay: calibrated true, valid=true.',
    'Now press 2 several times and watch the pool of light around the character.',
  ],
  expect: [
    'Before calibration the light stays at its neutral size and the state is not valid.',
    'Each step prints "ok", or a reason such as calibration.noSeparation or calibration.unstable; a failed step can simply be run again.',
    'After both steps: repeated clenches raise "intensity" and the light shrinks smoothly; when you stop, it recovers.',
    'Clicking a Calibrate button while a step is running is not possible (both are disabled).',
  ],
});
