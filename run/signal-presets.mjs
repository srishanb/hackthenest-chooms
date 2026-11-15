// @ts-check
/** Run file: pick a replay preset in Settings and watch the light respond as it would to a live board. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'signal-presets',
  title: 'Signal: replay presets in Settings',
  status: 'ready',
  features: ['BCI-1'],
  order: 135,
  tests: ['src/signal/__tests__/presets.test.ts', 'tools/presets/presets.test.ts'],
  query: '',
  steps: [
    'Start the game, open Settings (Esc) and find "Signal source".',
    'Pick "Mixed climb" in the Input list. Close Settings and play for about a minute with the debug overlay open (the ` key).',
    'Open Settings again and pick "Octopus simulator", then another preset. Try the loop checkbox.',
    'With the simulator running for at least 5 seconds, type a name and press "Save current signal as preset". Pick it from the list, then try Export and Delete.',
  ],
  expect: [
    'The badge reads RECORDED REPLAY while a preset plays, never LIVE EEG.',
    'Mixed climb is calm (wide light, ember available), then tense (light narrows) from about 17 to 38 seconds, then calm again.',
    'Switching sources never reloads the page or moves the player.',
    'A saved preset survives a page reload and can be exported as a .jsonl file.',
  ],
});
