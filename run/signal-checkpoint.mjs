// @ts-check
/** Run file: the guided eyes-open / eyes-closed checkpoint, tried on the simulator (Q-04). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-checkpoint',
  title: 'Signal: eyes-open / eyes-closed checkpoint',
  status: 'ready',
  note: 'This run uses the simulator. On a real head, follow docs/OCTOPUS_TEST.md (see signal-live-board).',
  features: ['BCI-2', 'BCI-3'],
  order: 150,
  tests: ['src/ui/components/debug-overlay/checkpoint.test.ts', 'tools/eval/eval.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game and press ` to open the overlay.',
    'Click "Run checkpoint". It asks for eyes open 15 s, eyes closed 15 s, twice (one minute in all).',
    'On the simulator the alpha boost stands in for closed eyes: when it says "Eyes closed", press 1 once; when it says "Eyes open", press 1 again.',
    'Wait for "Checkpoint done and file downloaded".',
  ],
  expect: [
    'The overlay prints "closed/open" with a ratio. Above 1.3 it says "clear separation".',
    'A labelled recording downloads; it can be replayed or measured with: npm run eval -- intensity-v2 recordings/<file>.jsonl',
    'If you never press 1, the ratio is near 1 and it says "weak separation".',
  ],
});
