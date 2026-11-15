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
  query: '',
  steps: [
    'Click the game and press ` to open the overlay. Calibrate first: follow signal-calibration (resting, then active) until it reads valid=true.',
    'Watch the "lantern" line (a radius in px) and the pool of light around the character.',
    'Press 2 (jaw clench) about twice a second for ten seconds, then stop for ten seconds.',
    'Start a long jump and keep pressing 2 while in the air.',
    'Keep the game tab visible while you test: a hidden tab stops drawing, so the light does not move.',
  ],
  expect: [
    'Before calibration the light stays at its neutral size (190 px).',
    'After calibration, clenching raises "intensity" and shrinks the pool of light smoothly; it never jumps and never goes out.',
    'When you stop, the light grows back: nothing builds up permanently.',
    'The radius does not change between takeoff and landing.',
    'The lantern value always stays between 90 and 280 px.',
  ],
});
