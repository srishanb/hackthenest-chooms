// @ts-check
/** Run file: record a session in the browser, download it and replay it (P1.5, Q-02). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-recording',
  title: 'Signal: record a session and replay it',
  status: 'ready',
  features: ['DIA-1'],
  order: 140,
  tests: ['src/signal/__tests__/recorder.test.ts', 'src/signal/__tests__/signal-index.test.ts', 'tools/eval/eval.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game and press ` to open the overlay.',
    'Play with the simulator keys (1, 2) for about 20 seconds so the recording has something in it.',
    'Click "Download recording" (or press Shift+R). A .jsonl file lands in your Downloads folder.',
    'Move that file into the recordings/ folder of this repo.',
    'Change the address to end with ?source=replay&replay=<your file name>&algo=passthrough-v0 and press Enter.',
  ],
  expect: [
    'The downloaded file is text: one JSON object per line, starting with a header line.',
    'It holds band powers, the spectrum, quality, the composure state and events. It never holds raw samples or names.',
    'Replaying it shows RECORDED REPLAY and the same rises and falls you made while recording.',
  ],
});
