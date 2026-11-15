// @ts-check
/** Run file: the repository's own guards, above all the rule that git history is never deleted. */
import { defineFeature } from './_lib.mjs';

export default defineFeature(import.meta.url, {
  id: 'process-guards',
  title: 'Repo guards: history, lanes and hooks',
  status: 'ready',
  features: [],
  order: 600,
  tests: ['tools/process/process-scripts.test.ts', 'src/shared/__tests__/lane-boundaries.test.ts', 'tools/pipeline/run-tooling.test.ts'],
  commands: [{ node: 'scripts/hooks/no-history-rewrite.mjs', args: ['--self-test'], needs: 'scripts/hooks/no-history-rewrite.mjs' }],
  steps: [
    'Run: git config core.hooksPath   (it should print .githooks; if not, run npm ci).',
    'Do NOT test the guard with a real force push. Its own tests above use a throwaway repository.',
  ],
  expect: [
    'The command-blocker self-test passes: force pushes, rebases and branch deletions are refused; ordinary pushes are allowed.',
    'The lane test passes: no folder under src/ imports another lane, and the movement code never imports the signal.',
  ],
});
