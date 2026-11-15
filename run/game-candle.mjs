// @ts-check
/** Run file: the procedural candle player, its pixel flame, and the small wax growth buff. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-candle',
  title: 'Candle: procedural sprite, pixel flame, wax growth',
  status: 'ready',
  features: ['MOV-1', 'MOV-2', 'LAN-2'],
  order: 215,
  tests: ['src/game/__tests__/candle.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Optional first look: open /src/game/__tests__/candle-gallery.html on the dev server (six seeds, every pose, three flame sizes).',
    'Press Play. Walk left and right, charge a jump, jump, fall and land.',
    'Reload the page a few times (or add &candleSeed=40 to keep one candle).',
    'Clench (key 2) for a while after calibrating, or pick up wax, and watch the flame.',
    'Collect wax: watch the candle and how far a full jump goes.',
  ],
  expect: [
    'The player is a pixel-art candle drawn by code, with the same idle, run, charge, rise, fall and land poses as before.',
    'Every reload (and every Play again) gives a differently shaped and coloured candle and flame; the same candleSeed always gives the same one.',
    'The flame grows with a bigger light and shrinks with a smaller one, flickering in pixel steps; with reduced motion it changes size but does not flicker.',
    'Each wax makes the candle about 2% bigger and walking and jump reach about 2% further (at most about 6%); nothing else about the physics changes.',
    'After the finish, Play again slides the camera down to the start before you can move (a cut with reduced motion).',
  ],
});
