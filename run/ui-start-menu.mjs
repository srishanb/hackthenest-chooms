// @ts-check
/** Run file: the start menu (title, Play, Settings) shown before the climb begins. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'ui-start-menu',
  title: 'Start menu: Play and Settings',
  status: 'ready',
  features: ['UX-2'],
  order: 305,
  tests: ['src/ui/__tests__/start-menu-state.test.ts', 'src/game/__tests__/phase-start.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Load the page and wait a moment. Do not touch anything yet.',
    'Press the arrow keys and Space: nothing in the game should move.',
    'Press Tab to reach Settings and press Enter. Change a setting, then choose "Back to start" (or press Escape).',
    'Press Tab back to Play and press Enter.',
    'On a first launch the controls guide appears; finish or skip it, then walk and jump.',
  ],
  expect: [
    'The page opens on "Lighten Up" with Play and Settings; the character stands still behind it.',
    'Settings opens the same settings panel as the pause menu, and Back or Escape returns to the start menu.',
    'Play (or Enter) hides the menu and the climb starts; the controls guide shows only after Play, never over the menu.',
    'After Play, Escape pauses as before; the start menu does not come back until a reload.',
  ],
});
