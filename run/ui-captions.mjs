// @ts-check
/** Run file: captions for narrator lines (P2.4). The narrator is not built yet, so this uses the dev sample lines. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'ui-captions',
  title: 'Captions: narrator line text',
  status: 'ready',
  features: ['NAR-4'],
  order: 310,
  tests: ['src/ui/__tests__/captions.test.ts'],
  query: '?captionDemo',
  steps: [
    'Press Play, then watch the bottom of the screen: a sample caption appears every few seconds and fades after about three seconds.',
    'Press Escape, open Settings, turn "Captions enabled" off, go back and resume.',
    'Turn it back on and raise "Caption size", then resume.',
    'In the browser console run lightenCaption("Any line you like") (dev server only).',
  ],
  expect: [
    'Each caption is a plain sentence about the climb; none judges the player or mentions feelings or health.',
    'With captions off, nothing shows. Turning them on again shows the current line if one is still active.',
    'A bigger caption size makes the text larger straight away, with no reload.',
    'A new line replaces the old one at once and restarts the timer.',
    'The captions work with Wi-Fi off: no request is made.',
  ],
});
