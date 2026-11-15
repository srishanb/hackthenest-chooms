// @ts-check
/** Run file: reaching the top wins, with no signal condition (P4.5). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-finish',
  title: 'Finish: reach the top to win',
  status: 'ready',
  features: ['END-1'],
  order: 230,
  tests: ['src/game/__tests__/finish.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game and climb all seven ledges of the test climb. The finish zone is just above the top ledge.',
    'Once you are in it, try to move.',
    'Reload the page.',
  ],
  expect: [
    'Entering the finish zone ends the climb once: movement stops and the HUD goes away (the phase is "finished").',
    'The signal plays no part: it finishes the same with the simulator untouched.',
    'After the reload you start from the bottom again, because finishing clears the save for the next player.',
  ],
});
