// @ts-check
/** Run file: play a recording back through the pipeline instead of a board. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-replay',
  title: 'Signal: replay a recording',
  status: 'ready',
  features: ['DIA-1', 'BCI-1'],
  order: 130,
  tests: ['src/signal/__tests__/sources.test.ts', 'src/signal/__tests__/signal-index.test.ts'],
  query: '?source=replay&replay=sim-fixture.jsonl&algo=passthrough-v0',
  steps: [
    'Click the game and press ` to open the overlay.',
    'Watch the values for about 30 seconds (the length of recordings/sim-fixture.jsonl).',
    'Keep watching after the recording ends.',
    'To replay a file of your own: put it in recordings/ and change "replay=" in the address bar to its name.',
  ],
  expect: [
    'The badge at the top right reads RECORDED REPLAY, never LIVE EEG.',
    'While the recording plays, intensity and resting move and valid=true, except from about 25 to 27 seconds: the recording has poor contact there, so quality drops to 0.30, valid turns false and the HUD says "Check signal quality", then it recovers.',
    'When it ends, sample age keeps growing, valid turns false and the light eases back to its neutral size.',
  ],
});
