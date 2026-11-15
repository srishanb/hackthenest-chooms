// @ts-check
/** Run file: refuges save progress at once and the save survives a reload (P4.4). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-save-refuge',
  title: 'Refuges: automatic saving and reload',
  status: 'ready',
  features: ['CHK-1', 'CHK-3', 'EMB-1'],
  order: 220,
  tests: ['src/game/__tests__/save.test.ts', 'src/game/__tests__/refuge.test.ts', 'src/shared/__tests__/safe-storage.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game. Climb to the third ledge above the floor: the refuge of the test climb is on it.',
    'Reload the page (Cmd-R or Ctrl-R).',
    'To start over, open the browser console (F12) and run: localStorage.removeItem("lighten.save.v1")   then reload.',
  ],
  expect: [
    'Entering the refuge saves immediately. No signal condition is involved.',
    'After the reload you start at the refuge, not on the floor.',
    'After removing the save and reloading, you start on the floor again.',
  ],
});
