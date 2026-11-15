// @ts-check
/** Run file: walking, the charge jump and air steering (P4.1). Start with: node run/game-movement.mjs */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-movement',
  title: 'Movement: walk, charge jump, air steering',
  status: 'ready',
  features: ['MOV-1', 'MOV-2', 'MOV-3', 'MOV-4'],
  order: 200,
  tests: ['src/game/__tests__/movement.test.ts', 'src/shared/__tests__/lane-boundaries.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game once so it has keyboard focus.',
    'Hold Left, then Right: the character walks along the floor.',
    'Hold Space for about a second and release with no direction held: it jumps straight up (near the first ledge it may catch that ledge\'s edge).',
    'Hold Right, hold Space briefly, release: a short hop to the right. Repeat holding Space longer: a higher, longer leap.',
    'Hold Space for three seconds, then release: the jump is the same as a one-second hold (the charge is capped at 0.9 s).',
    'Jump right, then hold Left in the air: the arc bends a little but never reverses.',
    'Press 2 (the simulated jaw clench) several times while jumping: the jumps do not change.',
  ],
  expect: [
    'The same key presses always give the same jump. The direction held at the moment you release decides left, right or straight up.',
    'Walking stops while a jump is charging.',
    'You can jump up through a ledge and land on top of it.',
    'Nothing the signal does changes how the character moves (only the light around it changes).',
  ],
});
