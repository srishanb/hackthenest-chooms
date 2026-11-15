// @ts-check
/** Run file: the lantern light follows the signal within fixed limits, and reachable ledges stay readable (LAN-3). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-lantern',
  title: 'Lantern: light radius follows the signal',
  status: 'partial',
  note: 'Light radius and protected visibility (LAN-3) exist. Fog, shadows and background motion (P5.3) are not built.',
  features: ['LAN-1', 'LAN-2', 'LAN-3', 'LAN-4', 'ATM-2'],
  order: 240,
  tests: ['src/game/__tests__/effects-engine.test.ts', 'src/game/__tests__/reachable-ledges.test.ts', 'src/game/__tests__/outline-fade.test.ts'],
  query: '',
  steps: [
    'Click the game and press ` to open the overlay. Calibrate first: follow signal-calibration (resting, then active) until it reads valid=true.',
    'Watch the "lantern" line (a radius in px) and the pool of light around the character.',
    'Press 2 (jaw clench) about twice a second for ten seconds, then stop for ten seconds.',
    'Start a long jump and keep pressing 2 while in the air.',
    'Keep the game tab visible while you test: a hidden tab stops drawing, so the light does not move.',
    'Stand on the floor, then jump onto the first ledge. Look at the ledge you stand on and the ledges above it.',
  ],
  expect: [
    'Before calibration the light stays at its neutral size (190 px).',
    'After calibration, clenching raises "intensity" and shrinks the pool of light smoothly; it never jumps and never goes out.',
    'When you stop, the light grows back: nothing builds up permanently.',
    'The radius does not change between takeoff and landing.',
    'The lantern value always stays between 90 and 280 px.',
    'The ledge you stand on has a thin pale outline inside the light; it fades out a little past the edge of the light.',
    'Reachable ledges show a thin top-edge line only where the light reaches; in the dark there are no lines at all.',
    'The outlines change only when you land somewhere new, and never with the signal.',
  ],
});
