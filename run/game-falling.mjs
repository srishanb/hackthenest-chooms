// @ts-check
/** Run file: falling costs height and nothing else (P4.3). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-falling',
  title: 'Falling: no death, only lost height',
  status: 'ready',
  features: ['FAL-1'],
  order: 210,
  tests: ['src/game/__tests__/falling.test.ts', 'src/game/__tests__/movement.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game. Climb two or three ledges (hold a direction, hold Space, release).',
    'Walk off the edge of a high ledge, or miss a jump on purpose.',
    'Try to walk or jump out through the left and right edges of the world.',
  ],
  expect: [
    'You fall until you land on a ledge or the floor. There is no health bar, no lives and no death screen.',
    'You are never moved back to a checkpoint: the fall-reset feature was removed from the final list.',
    'The floor spans the whole world, so a fall always ends on something. The side walls are solid.',
    'You can start climbing again at once.',
  ],
});
