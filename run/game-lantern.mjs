// @ts-check
/** Run file: the lantern light follows the signal within fixed limits (P5.1 so far). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-lantern',
  title: 'Lantern: light radius follows the signal',
  status: 'partial',
  note: 'Only the light radius exists. Protected visibility, fog, shadows and failure handling are plan P5 (not approved yet).',
  features: ['LAN-1', 'LAN-2', 'LAN-4', 'ATM-2'],
  order: 240,
  tests: ['src/game/__tests__/effects-engine.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game and press ` to open the overlay: watch the "lantern" line (a radius in px).',
    'Press 2 (jaw clench) about twice a second for ten seconds, then stop for ten seconds.',
    'Start a long jump and press 2 while in the air.',
    'Press 4 (noisy pin on), wait five seconds, press 4 again.',
  ],
  expect: [
    'Clenching shrinks the pool of light smoothly; it never jumps and never goes out.',
    'When you stop, the light grows back: nothing builds up permanently.',
    'The radius does not change between takeoff and landing.',
    'The lantern value always stays between 90 and 280 px.',
  ],
});
