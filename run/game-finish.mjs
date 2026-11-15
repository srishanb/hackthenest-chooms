// @ts-check
/** Run file: reaching the top wins, with no signal condition (P4.5), and Play again restarts the climb. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-finish',
  title: 'Finish: reach the top to win, then play again',
  status: 'ready',
  features: ['END-1'],
  order: 230,
  tests: ['src/game/__tests__/finish.test.ts', 'src/game/__tests__/play-again.test.ts', 'src/ui/__tests__/finish-screen-state.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game and climb the six ledges above the floor. The finish zone is around the top ledge.',
    'Once you are in it, try to move.',
    'Press Enter (or click Play again).',
    'Climb to the finish a second time.',
  ],
  expect: [
    'Entering the finish zone ends the climb once: the character freezes where it is (possibly still rising through the top ledge) and the HUD goes away (the phase is "finished").',
    'The signal plays no part: it finishes the same with the simulator untouched.',
    'The finish screen says "You reached the top" with Play again focused; the character cannot move behind it.',
    'Enter or Play again puts you back at the bottom with no ember placed and no wax collected, without a page reload; settings and calibration stay as they were.',
    'Reaching the top again shows the finish screen again.',
  ],
});
