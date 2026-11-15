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
    'Click the game and climb the six ledges above the floor. The finish zone is around the top ledge.',
    'Once you are in it, try to move.',
    'Reload the page.',
  ],
  expect: [
    'Entering the finish zone ends the climb once: the character freezes where it is (possibly still rising through the top ledge) and the HUD goes away (the phase is "finished").',
    'The signal plays no part: it finishes the same with the simulator untouched.',
    'After the reload you start from the bottom again, because finishing clears the save for the next player.',
  ],
});
