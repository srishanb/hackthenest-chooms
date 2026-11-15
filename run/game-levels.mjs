// @ts-check
/** Run file: section data is valid and every ledge can be reached with the real jump maths (P4.2). */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'game-levels',
  title: 'Levels: section data and reachability',
  status: 'partial',
  note: 'Neil\'s two draft sections are tested. The reachability checker (tools/levels, P4.2) is still in a pull request; this run file uses it as soon as it lands.',
  features: ['PLT-1', 'PLT-2'],
  order: 250,
  tests: ['src/content/__tests__/section-drafts.test.ts', 'tools/levels/check-levels.test.ts', 'src/game/__tests__/sections.test.ts'],
  commands: [{ script: 'check:levels', needs: 'tools/levels/check-levels.ts' }],
  steps: ['Read the output above. When the level checker exists it lists every ledge and whether a jump can reach it.'],
  expect: [
    'The draft section tests pass.',
    'Once tools/levels is merged: "npm run check:levels" passes for the real sections and fails for a ledge placed out of reach.',
  ],
});
