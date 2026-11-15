// @ts-check
/** Run file: the recovery ember. Not built yet; this file is the checklist for when it is (plan P6). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-ember',
  title: 'Recovery ember: return to the ledge you fell from',
  status: 'planned',
  note: 'Not built. Plan: docs/plans/P6.md (waiting for Ali\'s approval). The HUD already shows whether an ember is available.',
  features: ['EMB-2', 'EMB-3', 'EMB-4', 'EMB-5', 'EMB-6', 'EMB-8', 'EMB-9'],
  order: 260,
  tests: ['src/game/__tests__/ember-machine.test.ts', 'src/game/__tests__/return-anchor.test.ts'],
  steps: [
    'When P6 lands: fall from a high ledge, press R, and hold the resting state (alpha boost on the simulator) for about four seconds.',
    'Also try: cancel with R, and the labelled ordinary-input rescue.',
  ],
  expect: [
    'Gameplay freezes during recovery; progress pauses (never resets) when the resting state lapses.',
    'You return to the last safe ledge before the fall, with no leftover speed and no jump firing on arrival.',
    'The ember is spent on a return and not on a cancel.',
  ],
});
