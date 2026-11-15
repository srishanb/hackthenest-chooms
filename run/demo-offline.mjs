// @ts-check
/** Run file: the built game, served the way the demo runs, with the network off. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'demo-offline',
  title: 'Demo build: runs with the Wi-Fi off',
  status: 'ready',
  features: [],
  order: 610,
  tests: ['tools/pipeline/run-tooling.test.ts'],
  steps: [
    'Run: node run.mjs preview   (it builds with every check, then serves dist/ and opens it).',
    'Turn the Wi-Fi off. Hard-reload the page (Cmd-Shift-R or Ctrl-Shift-R).',
    'Play: walk, jump, open the overlay with `, press 1 and 2.',
    'Open the address with ?source=replay&replay=sim-fixture.jsonl&algo=passthrough-v0 added.',
    'Turn the Wi-Fi back on.',
  ],
  expect: [
    'The build summary shows every step ok, including "audit" (nothing loads from the internet).',
    'With the Wi-Fi off the game loads and plays exactly as before.',
    'The replay works from the built game too, because the build copies recordings/ into dist/.',
    'The browser network tab (F12) shows no failed requests.',
  ],
});
