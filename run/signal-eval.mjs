// @ts-check
/** Run file: the headless evaluation tool that compares algorithms on a recording (no browser). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-eval',
  title: 'Signal: compare algorithms on a recording',
  status: 'ready',
  features: ['BCI-4'],
  order: 160,
  tests: ['tools/eval/eval.test.ts'],
  commands: [
    { script: 'eval', args: ['intensity-v2', 'recordings/sim-fixture.jsonl'], needs: 'recordings/sim-fixture.jsonl' },
    { script: 'eval', args: ['passthrough-v0', 'recordings/sim-fixture.jsonl'], needs: 'recordings/sim-fixture.jsonl' },
  ],
  steps: [
    'Read the two tables printed above: the same recording, run through two algorithms.',
    'To measure a recording of your own: npm run eval -- intensity-v2 recordings/<file>.jsonl',
  ],
  expect: [
    'Each table lists frames, seconds valid, intensity mean, minimum and maximum, and resting-active seconds.',
    'The two algorithms print different numbers for the same file.',
    'intensity-v2 shows 0 seconds valid on a recording with no calibration in it: that is expected.',
  ],
});
