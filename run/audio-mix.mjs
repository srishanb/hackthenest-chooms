// @ts-check
/** Run file: audio. Only the mix rules exist so far; nothing plays yet (P5.4). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'audio-mix',
  title: 'Audio: mix rules (no sound yet)',
  status: 'partial',
  note: 'The pure mix rules are built and tested (P5.4.1). The audio engine, music layers and sound effects (P5.4.2, P5.4.3) are not, so the game is silent.',
  features: ['ATM-1', 'CHK-2', 'EMB-4'],
  order: 400,
  tests: ['src/audio/__tests__/mix-rules.test.ts'],
  steps: ['When P5.4.2 lands: play with sound on, clench (press 2) for a while, then stop; jump and land during the tense music.'],
  expect: [
    'The tense and quiet music layers crossfade smoothly with the signal and never get loud.',
    'Jump and landing sounds stay audible over the music at all times.',
    'Each of the four volume sliders in Settings changes only its own part.',
  ],
});
