// @ts-check
/** Run file: the pause menu and the live settings panel (P2.1, P2.2). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'ui-pause-settings',
  title: 'Pause menu and settings',
  status: 'ready',
  features: ['UX-2'],
  order: 310,
  tests: ['src/ui/__tests__/settings-store.test.ts', 'src/ui/__tests__/settings-editor.test.ts'],
  query: '?algo=passthrough-v0',
  steps: [
    'Click the game, start walking, and press Escape.',
    'Use only the keyboard (Tab, Enter, arrow keys) to open Settings.',
    'Set "Effect strength" to 0%, choose "Back to pause", then "Resume climb", and watch the light for a few seconds.',
    'Pause again. Under "Key bindings", change "Charge jump" to W. Resume and jump with W.',
    'Reload the page and check the settings are still as you left them. Then set them back.',
  ],
  expect: [
    'Escape shows "Climb paused" and the character stops; "Resume climb" continues exactly where you were.',
    'Every control can be reached and changed without a mouse.',
    'With effect strength 0% the light stops following the signal and holds one size, but it is still lit.',
    'A remapped key works at once, with no reload, and survives a reload.',
  ],
});
