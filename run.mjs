#!/usr/bin/env node
// @ts-check
/**
 * The one file to start from. It lists and runs everything you can do with this repo:
 * check your setup, start the game, run the tests, build it, and try one feature at a time.
 *
 *   node run.mjs                 show this menu and every feature
 *   node run.mjs doctor          check that this computer can run the game
 *   node run.mjs dev [?query]    start the game and open it (for example: node run.mjs dev "?mode=fixed")
 *   node run.mjs check           type check plus every automated test
 *   node run.mjs all             the automated checks of every feature, with a summary table
 *   node run.mjs <feature>       one feature: its tests, then a guided hands-on check in the browser
 *   node run.mjs build           the full build (checks, bundle, recordings, offline audit)
 *   node run.mjs preview         build, then serve the built game the way the demo will run
 *
 * Flags for a feature: --tests-only, --no-tests, --no-open. Flag for build and preview: --fast.
 *
 * Each feature lives in its own file under run/ and can also be started directly:
 * `node run/game-movement.mjs`. To add one, copy a file there and edit it; nothing else changes.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT,
  bold,
  dim,
  doctor,
  featureLine,
  featureUrl,
  green,
  heading,
  loadFeatures,
  npmRun,
  openBrowser,
  parseArgs,
  parseServerOutput,
  red,
  runAutomated,
  runFeature,
  startServer,
  stripAnsi,
  versionAtLeast,
  waitForCtrlC,
  yellow,
} from './run/_lib.mjs';

const COMMANDS = [
  ['doctor', 'check that this computer can run the game'],
  ['dev [?query]', 'start the game and open it in the browser'],
  ['check', 'type check plus every automated test'],
  ['all', 'automated checks of every feature, with a summary'],
  ['<feature>', 'one feature: tests, then a guided hands-on check'],
  ['build [--fast]', 'full build into dist/ (checks, bundle, recordings, offline audit)'],
  ['preview [--fast]', 'build, then serve the built game as the demo will run'],
];

/** @param {import('./run/_lib.mjs').Feature[]} features */
function printMenu(features) {
  heading('lighten: run and test');
  console.log('Usage: node run.mjs <command>\n');
  for (const [name, what] of COMMANDS) console.log(`  ${String(name).padEnd(22)} ${what}`);
  heading('Features (node run.mjs <name>, or node run/<name>.mjs)');
  for (const feature of features) console.log(featureLine(feature));
  console.log(dim('\nREADY = built and testable now. PARTIAL = some of it. PLANNED = not built yet (the run file says which plan).'));
  console.log(dim('First time here? Run: node run.mjs doctor   then: node run.mjs dev'));
}

/** Start a server, open a page, wait for Ctrl-C. @param {'dev' | 'preview'} script @param {string} query @param {Set<string>} flags */
async function serveAndWait(script, query, flags) {
  const server = await startServer(script);
  const url = featureUrl(server.url, query);
  console.log(server.started ? `Server started at ${server.url}` : `Using the server already running at ${server.url}`);
  if (flags.has('no-open')) console.log(`Open this in Chrome or Edge: ${bold(url)}`);
  else if (openBrowser(url)) console.log(`Opened ${bold(url)}`);
  else console.log(yellow(`Could not open a browser. Open this in Chrome or Edge: ${url}`));
  console.log(dim('Keys: Left and Right walk, hold Space to charge a jump and release to leap, ` opens the signal debug overlay.'));
  if (flags.has('no-wait')) {
    server.stop();
    return 0;
  }
  console.log(dim('Press Ctrl-C here to stop.'));
  await waitForCtrlC();
  server.stop();
  return 0;
}

/** Run the build pipeline (tools/pipeline/build.mjs) with the given flags. @param {Set<string>} flags @returns {Promise<number>} */
function runBuild(flags) {
  return new Promise((done) => {
    const args = [join(ROOT, 'tools', 'pipeline', 'build.mjs'), ...[...flags].map((flag) => `--${flag}`)];
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('error', () => done(1));
    child.on('exit', (code) => done(code ?? 1));
  });
}

/** The automated part of every feature, then one summary table. @param {import('./run/_lib.mjs').Feature[]} features */
async function runAll(features) {
  /** @type {{ feature: import('./run/_lib.mjs').Feature, result: string }[]} */
  const rows = [];
  let failures = 0;
  for (const feature of features) {
    heading(`${feature.title}  ${dim(`[${feature.id}]`)}`);
    if (feature.tests.length + feature.commands.length === 0) {
      rows.push({ feature, result: dim('no automated checks') });
      console.log(dim('  No automated checks.'));
      continue;
    }
    const outcome = await runAutomated(feature);
    if (outcome.ran === 0) rows.push({ feature, result: yellow('nothing to run yet') });
    else if (outcome.ok) rows.push({ feature, result: green('passed') });
    else {
      failures += 1;
      rows.push({ feature, result: red('FAILED') });
    }
  }
  heading('Summary');
  for (const { feature, result } of rows) console.log(`  ${feature.id.padEnd(22)} ${result}`);
  console.log(failures === 0 ? green('\nEvery automated feature check passed.') : red(`\n${failures} feature${failures === 1 ? '' : 's'} failed.`));
  console.log(dim('Hands-on checks are not part of "all": run a feature by name to do those.'));
  return failures === 0 ? 0 : 1;
}

/**
 * Check the run tooling itself: the pure helpers, and that every feature file is well formed.
 * @param {import('./run/_lib.mjs').Feature[]} features
 */
function selfTest(features) {
  /** @type {string[]} */
  const problems = [];
  /** @param {boolean} condition @param {string} message */
  const expect = (condition, message) => {
    if (!condition) problems.push(message);
  };

  // Pure helpers.
  const started = parseServerOutput('  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m3046\x1b[22m/\x1b[39m\n');
  expect(started?.url === 'http://localhost:3046/' && started.inUse === false, 'parseServerOutput: coloured "Local:" line');
  expect(parseServerOutput('Local: http://localhost:5173')?.url === 'http://localhost:5173/', 'parseServerOutput: adds the trailing slash');
  const busy = parseServerOutput('Error: Port 5173 is already in use');
  expect(busy?.url === 'http://localhost:5173/' && busy.inUse === true, 'parseServerOutput: port already in use');
  expect(parseServerOutput('Port 4173 is in use, trying another one...')?.inUse === true, 'parseServerOutput: "is in use" wording');
  expect(parseServerOutput('VITE v8 building...') === null, 'parseServerOutput: null before the server is ready');
  expect(stripAnsi('\x1b[1mbold\x1b[22m') === 'bold', 'stripAnsi');
  expect(featureUrl('http://localhost:5173/', '?mode=fixed') === 'http://localhost:5173/?mode=fixed', 'featureUrl: with a query');
  expect(featureUrl('http://localhost:5173', '') === 'http://localhost:5173/', 'featureUrl: no query, adds the slash');
  const parsed = parseArgs(['game-movement', '--tests-only', '?x=1']);
  expect(parsed.words.join(',') === 'game-movement,?x=1' && parsed.flags.has('tests-only'), 'parseArgs');
  expect(versionAtLeast('26.13.0', [22, 12]) && versionAtLeast('22.12.0', [22, 12]), 'versionAtLeast: new enough');
  expect(!versionAtLeast('22.11.9', [22, 12]) && !versionAtLeast('20.19.0', [22, 12]), 'versionAtLeast: too old');

  // Feature files.
  expect(features.length >= 10, `expected at least 10 feature files, found ${features.length}`);
  const seen = new Set();
  for (const feature of features) {
    const where = `run/${feature.id}.mjs`;
    expect(/^[a-z][a-z0-9-]*$/.test(feature.id), `${where}: id must be lower-case words joined by "-"`);
    expect(!seen.has(feature.id), `${where}: id is used twice`);
    seen.add(feature.id);
    expect(existsSync(join(ROOT, 'run', `${feature.id}.mjs`)), `${where}: the file name must match the id "${feature.id}"`);
    expect(!COMMANDS.some(([name]) => String(name).split(' ')[0] === feature.id), `${where}: id clashes with a run.mjs command`);
    expect(feature.title.length > 0, `${where}: title is empty`);
    expect(['ready', 'partial', 'planned'].includes(feature.status), `${where}: status must be ready, partial or planned`);
    expect(feature.status === 'ready' || Boolean(feature.note), `${where}: a partial or planned feature needs a note saying what is missing`);
    expect(feature.query === undefined || feature.query === '' || feature.query.startsWith('?'), `${where}: query must be '' or start with "?"`);
    expect(feature.query === undefined || feature.steps.length > 0, `${where}: a feature that opens the browser needs steps`);
    expect(feature.steps.length === 0 || feature.expect.length > 0, `${where}: steps need an "It works if" list`);
    for (const file of feature.tests) expect(file.endsWith('.test.ts'), `${where}: "${file}" is not a test file`);
    if (feature.status === 'ready') {
      for (const file of feature.tests) expect(existsSync(join(ROOT, file)), `${where}: READY but its test file is missing: ${file}`);
    }
    for (const text of [feature.title, feature.note ?? '', ...feature.steps, ...feature.expect]) {
      expect(!/\b(emotion|emotions|stress|stressed)\b/i.test(text), `${where}: wording uses a banned word (AGENTS.md rule 1): "${text}"`);
    }
  }

  if (problems.length === 0) {
    console.log(green(`run tooling self-test passed (${features.length} feature files).`));
    return 0;
  }
  console.log(red(`run tooling self-test found ${problems.length} problem${problems.length === 1 ? '' : 's'}:`));
  for (const problem of problems) console.log(`  - ${problem}`);
  return 1;
}

async function main() {
  const { words, flags } = parseArgs(process.argv.slice(2));
  const command = words[0];

  if (command !== 'doctor' && !versionAtLeast(process.versions.node, [22, 12])) {
    console.error(red(`Node.js ${process.versions.node} is too old. Install Node.js 26 LTS, then run: node run.mjs doctor`));
    return 1;
  }
  if (command === 'doctor') return doctor() === 0 ? 0 : 1;

  if (command && command !== 'list' && !existsSync(join(ROOT, 'node_modules', 'vite'))) {
    console.error(red('Dependencies are not installed. Run: npm ci'));
    return 1;
  }

  const features = await loadFeatures();
  if (!command || command === 'list' || command === 'help') {
    if (flags.has('json')) console.log(JSON.stringify(features, null, 2));
    else printMenu(features);
    return 0;
  }
  if (command === 'selftest') return selfTest(features);
  if (command === 'check') return npmRun('check');
  if (command === 'all') return runAll(features);
  if (command === 'build') return runBuild(flags);
  if (command === 'dev') return serveAndWait('dev', words[1] ?? '', flags);
  if (command === 'preview') {
    const built = await runBuild(new Set([...flags].filter((flag) => flag === 'fast')));
    if (built !== 0) return built;
    return serveAndWait('preview', words[1] ?? '', flags);
  }

  const feature = features.find((item) => item.id === command);
  if (feature) return runFeature(feature, flags);

  console.error(red(`Unknown command or feature: "${command}"`));
  const close = features.filter((item) => item.id.includes(command) || command.includes(item.id.split('-')[0] ?? ''));
  if (close.length > 0) console.error(`Did you mean: ${close.map((item) => item.id).join(', ')}?`);
  console.error('Run "node run.mjs" to see everything.');
  return 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  },
);
