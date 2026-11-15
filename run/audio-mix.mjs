// @ts-check
/** Run file: music that follows the signal (calm bed, tense loop, equal-power crossfade). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'audio-mix',
  title: 'Audio: music follows the signal',
  status: 'ready',
  features: ['ATM-1', 'CHK-2', 'EMB-4'],
  order: 400,
  tests: ['src/audio/__tests__/mix-rules.test.ts', 'src/audio/__tests__/engine.test.ts', 'tools/audio/tense-scaling.test.ts'],
  query: '?preset=mixed-climb&algo=intensity-v2',
  steps: [
    'Press Play (sound needs a click first), skip the guide, and listen for a minute while the "Mixed climb" preset plays: calm for 20 s, rising tension to about 40 s, then settling.',
    'Try ?preset=calm-climb, then ?preset=rising-tension and ?preset=poor-contact the same way.',
    'Jump and land during the tense part. Move the Music and Sound effects sliders in Settings.',
    'For the level readout, run npm run dev and open /src/audio/__tests__/tense-browser.html, press Start, then "Sweep mix".',
  ],
  expect: [
    'Calm: only the quiet forest bed. As tension rises over a few seconds the darker tense loop fades in and the bed fades down; it never jumps.',
    'At the highest tension a little of the calm bed stays under the tense loop. With a poor or missing signal the music stays mostly on the calm bed.',
    'The two layers are about equally loud, so the crossfade does not get louder. Jump and landing sounds stay audible over the music at all times.',
    'Each of the four volume sliders in Settings changes only its own part.',
  ],
});
