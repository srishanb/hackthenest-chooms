// @ts-check
/** Run file: the minimal HUD at the top left (P2.3). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'ui-hud',
  title: 'HUD: ember and signal status',
  status: 'ready',
  features: ['UX-1', 'DIA-1'],
  order: 300,
  tests: ['src/ui/__tests__/hud-state.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Look at the top left: the "Climb status" panel.',
    'Press 4 (noisy pin on) and wait a few seconds; press 4 again.',
    'Press Escape, open Settings, switch "Show composure" on, go back and resume.',
    'Open the address again without "?algo=passthrough-v0" (the default algorithm, not calibrated yet).',
  ],
  expect: [
    'With a good signal it says "Signal ready" and "Recovery ember available".',
    'With the noisy pin on it changes to "Check signal quality".',
    'With "Show composure" on, a line "Composure (experimental):" appears. It is off by default: there is no meter unless you ask for one.',
    'With the default algorithm before calibration it says "Calibration needed".',
    'The wording stays on composure and signal quality: no medical or mood claims anywhere on the HUD.',
  ],
});
