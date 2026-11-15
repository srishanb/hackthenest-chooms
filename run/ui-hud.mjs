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
    'Look at the status panel at the top left.',
    'Press Escape, open Settings, switch "Show composure" on, go back and resume.',
    'Open the address again without "?algo=passthrough-v0" (the default algorithm, not calibrated yet).',
    'Open it with ?source=replay&replay=sim-fixture.jsonl&algo=passthrough-v0 and wait 35 seconds for the recording to end.',
  ],
  expect: [
    'With a good signal it says "Signal ready", "Signal quality: 100%" and "Recovery ember available".',
    'With "Show composure" on, a line "Composure (experimental):" appears. It is off by default: there is no meter unless you ask for one.',
    'With the default algorithm before calibration it says "Calibration needed".',
    'After the replay ends it says "Waiting for fresh signal".',
    'The wording stays on composure and signal quality: no medical or mood claims anywhere on the HUD.',
  ],
});
