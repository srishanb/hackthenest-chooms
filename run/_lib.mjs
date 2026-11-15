// @ts-check
/**
 * Shared helpers for the run files in this folder and for `run.mjs` at the repo root.
 *
 * What it does: runs npm scripts, starts (or finds) the dev server, opens the game in a browser at
 * the right URL, and prints the steps a person follows to check one feature by hand.
 *
 * Why plain Node and not bash: two of our four laptops run Windows. Every run file works the same
 * in Git Bash, PowerShell, cmd and a Mac terminal, and needs nothing beyond `npm ci`.
 *
 * A "feature" is one small object (see the Feature typedef). Each `run/<name>.mjs` file defines one
 * and can be started on its own: `node run/game-movement.mjs`.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The repo root (the folder that holds package.json). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IS_WINDOWS = process.platform === 'win32';
/** Vite needs this Node version or newer (package.json "engines"). */
const MIN_NODE = [22, 12];

// ───────────────────────────── printing ─────────────────────────────

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
/** @param {string} code @param {string} text */
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
/** @param {string} text */
export const bold = (text) => paint('1', text);
/** @param {string} text */
export const dim = (text) => paint('2', text);
/** @param {string} text */
export const green = (text) => paint('32', text);
/** @param {string} text */
export const red = (text) => paint('31', text);
/** @param {string} text */
export const yellow = (text) => paint('33', text);

/** @param {string} text */
export function heading(text) {
  console.log(`\n${bold(text)}`);
}

// ───────────────────────────── pure helpers (covered by `node run.mjs selftest`) ─────────────────────────────

/** Remove terminal colour codes. @param {string} text */
export function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Read Vite's output. Returns the server URL once Vite prints it, or the busy port when Vite
 * refuses to start because something already listens there, or null while neither has appeared.
 * @param {string} text
 * @returns {{ url: string, inUse: boolean } | null}
 */
export function parseServerOutput(text) {
  const clean = stripAnsi(text);
  const local = clean.match(/Local:\s+(https?:\/\/[^\s]+)/);
  if (local?.[1]) return { url: local[1].endsWith('/') ? local[1] : `${local[1]}/`, inUse: false };
  const busy = clean.match(/Port (\d+) is (?:already )?in use/i);
  if (busy?.[1]) return { url: `http://localhost:${busy[1]}/`, inUse: true };
  return null;
}

/**
 * Join the server URL and a feature's query string.
 * @param {string} baseUrl for example http://localhost:5173/
 * @param {string} query '' or something starting with '?'
 */
export function featureUrl(baseUrl, query) {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return query ? `${base}${query}` : base;
}

/**
 * Split command-line arguments into words and `--flags`.
 * @param {string[]} argv
 * @returns {{ words: string[], flags: Set<string> }}
 */
export function parseArgs(argv) {
  const words = [];
  const flags = new Set();
  for (const arg of argv) {
    if (arg.startsWith('--')) flags.add(arg.slice(2));
    else words.push(arg);
  }
  return { words, flags };
}

/** @param {string} version for example "26.13.0" @param {number[]} minimum for example [22, 12] */
export function versionAtLeast(version, minimum) {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < minimum.length; i += 1) {
    const have = parts[i] ?? 0;
    const need = minimum[i] ?? 0;
    if (have !== need) return have > need;
  }
  return true;
}

// ───────────────────────────── running commands ─────────────────────────────

/**
 * Start an npm script. On Windows `npm` is a .cmd file and needs a shell, so the command is passed
 * as one string there; arguments are repo-relative paths and simple words (no spaces).
 * @param {string} script
 * @param {string[]} args
 * @param {import('node:child_process').SpawnOptions} options
 */
function spawnNpm(script, args, options) {
  const tail = args.length > 0 ? ['--', ...args] : [];
  if (IS_WINDOWS) return spawn(['npm', 'run', script, ...tail].join(' '), { ...options, cwd: ROOT, shell: true });
  return spawn('npm', ['run', script, ...tail], { ...options, cwd: ROOT });
}

/**
 * Run an npm script to the end, showing its output. Resolves to its exit code.
 * @param {string} script
 * @param {string[]} [args]
 * @returns {Promise<number>}
 */
export function npmRun(script, args = []) {
  return new Promise((done) => {
    const child = spawnNpm(script, args, { stdio: 'inherit' });
    child.on('error', (error) => {
      console.error(red(`could not start "npm run ${script}": ${error.message}`));
      done(1);
    });
    child.on('exit', (code) => done(code ?? 1));
  });
}

/**
 * Run a Node script from this repo to the end, showing its output. Resolves to its exit code.
 * @param {string} file repo-relative path
 * @param {string[]} [args]
 * @returns {Promise<number>}
 */
export function nodeRun(file, args = []) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [join(ROOT, file), ...args], { cwd: ROOT, stdio: 'inherit' });
    child.on('error', (error) => {
      console.error(red(`could not start "node ${file}": ${error.message}`));
      done(1);
    });
    child.on('exit', (code) => done(code ?? 1));
  });
}

/** Stop a child process and everything it started. @param {import('node:child_process').ChildProcess} child */
function killTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (IS_WINDOWS) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM'); // the whole group (the child was started detached)
  } catch {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
}

/** True if the page at `url` is this game (its index.html has the #game element). @param {string} url */
async function looksLikeOurGame(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return response.ok && (await response.text()).includes('id="game"');
  } catch {
    return false;
  }
}

/**
 * Start a Vite server through its npm script (`dev` or `preview`) and wait until it is reachable.
 * If the port is already taken by this game's own server, that server is reused.
 * @param {'dev' | 'preview'} script
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<{ url: string, started: boolean, stop: () => void }>}
 */
export function startServer(script, options = {}) {
  const timeoutMs = options.timeoutMs ?? 40_000;
  return new Promise((ready, fail) => {
    const child = spawnNpm(script, [], { stdio: ['ignore', 'pipe', 'pipe'], detached: !IS_WINDOWS });
    const stop = () => killTree(child);
    let output = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      stop();
      fail(new Error(`"npm run ${script}" did not start within ${timeoutMs / 1000} s.\n${stripAnsi(output)}`));
    }, timeoutMs);

    /** @param {Buffer} chunk */
    const onData = (chunk) => {
      if (settled) return;
      output += chunk.toString();
      const found = parseServerOutput(output);
      if (!found) return;
      settled = true;
      clearTimeout(timer);
      if (!found.inUse) {
        process.once('exit', stop);
        ready({ url: found.url, started: true, stop });
        return;
      }
      stop();
      looksLikeOurGame(found.url).then((ours) => {
        if (ours) ready({ url: found.url, started: false, stop: () => {} });
        else fail(new Error(`${found.url} is in use by another program. Stop it, or set a different PORT in .env.local.`));
      });
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fail(new Error(`could not start "npm run ${script}": ${error.message}`));
    });
    child.on('exit', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fail(new Error(`"npm run ${script}" stopped (exit ${code}) before the server was ready.\n${stripAnsi(output)}`));
    });
  });
}

/**
 * Open a URL in a browser. Prefers Chrome or Edge on a Mac, because Web Bluetooth (the EEG board)
 * only works in Chromium browsers. Returns false if nothing could be started.
 * @param {string} url
 */
export function openBrowser(url) {
  /** @type {[string, string[]][]} */
  const attempts =
    process.platform === 'darwin'
      ? [
          ['open', ['-a', 'Google Chrome', url]],
          ['open', ['-a', 'Microsoft Edge', url]],
          ['open', [url]],
        ]
      : IS_WINDOWS
        ? [['rundll32', ['url.dll,FileProtocolHandler', url]]]
        : [['xdg-open', [url]]];
  for (const [command, args] of attempts) {
    const result = spawnSync(command, args, { stdio: 'ignore' });
    if (result.status === 0) return true;
  }
  return false;
}

/** Resolves when the person presses Ctrl-C (or the process is told to stop). */
export function waitForCtrlC() {
  return new Promise((done) => {
    process.once('SIGINT', () => done(undefined));
    process.once('SIGTERM', () => done(undefined));
  });
}

// ───────────────────────────── features ─────────────────────────────

/**
 * @typedef {Object} FeatureCommand
 * @property {string} [script] an npm script name, for example "eval"
 * @property {string} [node]   or: a repo-relative Node script to run with this Node, for example a self-test
 * @property {string[]} [args]
 * @property {string} [needs]  repo-relative file that must exist, or the command is skipped
 *
 * @typedef {Object} Feature
 * @property {string} id       short name used on the command line (matches the file name)
 * @property {string} title
 * @property {'ready' | 'partial' | 'planned'} status  ready = built; partial = some of it; planned = not built yet
 * @property {string} [note]   what is missing or where the plan is, for partial and planned
 * @property {string[]} features  feature ids from docs/FEATURES.md
 * @property {number} order    position in lists (lower first)
 * @property {string[]} tests  test files run with Vitest (repo-relative); missing files are skipped
 * @property {FeatureCommand[]} commands  extra npm scripts to run after the tests
 * @property {string} [query]  URL query for the hands-on check; leave out when there is nothing to open
 * @property {string[]} steps  what to do in the browser, in order
 * @property {string[]} expect what you should see if it works
 */

/** True when the file at `metaUrl` is the script Node was started with. @param {string} metaUrl */
function isEntryScript(metaUrl) {
  const started = process.argv[1];
  if (!started) return false;
  try {
    const a = realpathSync(fileURLToPath(metaUrl));
    const b = realpathSync(resolve(started));
    return IS_WINDOWS ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch {
    return false;
  }
}

/**
 * Define a feature. If the file was started directly (`node run/<name>.mjs`), also run it.
 * @param {string} metaUrl pass `import.meta.url`
 * @param {Partial<Feature> & Pick<Feature, 'id' | 'title' | 'status'>} feature
 * @returns {Feature}
 */
export function defineFeature(metaUrl, feature) {
  /** @type {Feature} */
  const full = { features: [], order: 500, tests: [], commands: [], steps: [], expect: [], ...feature };
  if (isEntryScript(metaUrl)) {
    runFeature(full, parseArgs(process.argv.slice(2)).flags).then(
      (code) => process.exit(code),
      (error) => {
        console.error(red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
      },
    );
  }
  return full;
}

/** Load every feature file in this folder, in order. @returns {Promise<Feature[]>} */
export async function loadFeatures() {
  const folder = join(ROOT, 'run');
  const files = readdirSync(folder).filter((name) => name.endsWith('.mjs') && !name.startsWith('_'));
  /** @type {Feature[]} */
  const features = [];
  for (const name of files) {
    const module = await import(pathToFileURL(join(folder, name)).href);
    if (module.default) features.push(module.default);
  }
  return features.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** @param {Feature['status']} status */
function statusLabel(status) {
  if (status === 'ready') return green('READY');
  if (status === 'partial') return yellow('PARTIAL');
  return dim('PLANNED');
}

/** One line per feature, for menus. @param {Feature} feature */
export function featureLine(feature) {
  return `  ${feature.id.padEnd(22)} ${statusLabel(feature.status).padEnd(useColor ? 16 : 7)} ${feature.title}`;
}

/**
 * Run the automated part of a feature: its test files, then its extra commands.
 * @param {Feature} feature
 * @returns {Promise<{ ok: boolean, ran: number, skipped: string[] }>}
 */
export async function runAutomated(feature) {
  const present = feature.tests.filter((file) => existsSync(join(ROOT, file)));
  const skipped = feature.tests.filter((file) => !present.includes(file));
  let ok = true;
  let ran = 0;
  if (present.length > 0) {
    ran += 1;
    ok = (await npmRun('test', present)) === 0;
  }
  for (const command of feature.commands) {
    if (!ok) break;
    const label = command.script ? `npm run ${command.script}` : `node ${command.node}`;
    if (command.needs && !existsSync(join(ROOT, command.needs))) {
      skipped.push(`${label} (needs ${command.needs})`);
      continue;
    }
    ran += 1;
    if (command.script) ok = (await npmRun(command.script, command.args ?? [])) === 0;
    else if (command.node) ok = (await nodeRun(command.node, command.args ?? [])) === 0;
  }
  return { ok, ran, skipped };
}

/**
 * Run one feature: automated checks first, then the hands-on check in the browser.
 * Flags: `tests-only` (no browser), `no-tests` (browser only), `no-open` (print the URL, do not
 * open it), `no-wait` (stop the server right after printing; used by automated runs).
 * @param {Feature} feature
 * @param {Set<string>} flags
 * @returns {Promise<number>} exit code
 */
export async function runFeature(feature, flags) {
  heading(`${feature.title}  ${dim(`[${feature.id}]`)}`);
  console.log(`Status: ${statusLabel(feature.status)}${feature.note ? `  ${feature.note}` : ''}`);
  if (feature.features.length > 0) console.log(dim(`Features (docs/FEATURES.md): ${feature.features.join(', ')}`));

  if (!flags.has('no-tests')) {
    const hasAutomated = feature.tests.length + feature.commands.length > 0;
    if (!hasAutomated) {
      console.log(dim('\nNo automated checks for this feature yet.'));
    } else {
      heading('1. Automated checks');
      const result = await runAutomated(feature);
      for (const item of result.skipped) console.log(yellow(`  skipped, not in the repo yet: ${item}`));
      if (result.ran === 0) console.log(dim('  Nothing to run yet.'));
      else if (result.ok) console.log(green('  Automated checks passed.'));
      else {
        console.log(red('  Automated checks FAILED. Fix these before checking by hand.'));
        return 1;
      }
    }
  }

  if (flags.has('tests-only')) return 0;
  if (feature.query === undefined) {
    if (feature.steps.length > 0) printSteps(feature, null);
    return 0;
  }

  heading('2. Hands-on check in the browser');
  const server = await startServer('dev');
  const url = featureUrl(server.url, feature.query);
  console.log(server.started ? `Dev server started at ${server.url}` : `Using the dev server already running at ${server.url}`);
  if (flags.has('no-open')) console.log(`Open this in Chrome or Edge: ${bold(url)}`);
  else if (openBrowser(url)) console.log(`Opened ${bold(url)} ${dim('(use Chrome or Edge; the EEG board needs one of them)')}`);
  else console.log(yellow(`Could not open a browser. Open this in Chrome or Edge: ${url}`));
  printSteps(feature, url);

  if (flags.has('no-wait')) {
    server.stop();
    return 0;
  }
  console.log(dim(server.started ? '\nPress Ctrl-C here when you are done (this also stops the dev server).' : '\nPress Ctrl-C here when you are done.'));
  await waitForCtrlC();
  server.stop();
  return 0;
}

/** @param {Feature} feature @param {string | null} url */
function printSteps(feature, url) {
  if (feature.steps.length > 0) {
    console.log(`\n${bold('Do this')}${url ? '' : ' (nothing to open for this one)'}:`);
    feature.steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
  }
  if (feature.expect.length > 0) {
    console.log(`\n${bold('It works if')}:`);
    for (const line of feature.expect) console.log(`  - ${line}`);
  }
}

// ───────────────────────────── doctor ─────────────────────────────

/**
 * Check that this computer can run the game. Prints one line per check.
 * @returns {number} how many checks failed
 */
export function doctor() {
  heading('Setup check');
  let failed = 0;
  /** @param {boolean} ok @param {string} label @param {string} fix */
  const check = (ok, label, fix) => {
    console.log(`  ${ok ? green('ok  ') : red('FAIL')} ${label}${ok ? '' : `\n       ${fix}`}`);
    if (!ok) failed += 1;
  };
  /** @param {string} label @param {string} hint */
  const note = (label, hint) => console.log(`  ${yellow('note')} ${label}\n       ${hint}`);

  check(versionAtLeast(process.versions.node, MIN_NODE), `Node.js ${process.versions.node} (need ${MIN_NODE.join('.')} or newer)`, 'Install Node.js 26 LTS from https://nodejs.org');

  const npm = IS_WINDOWS ? spawnSync('npm --version', { shell: true, encoding: 'utf8' }) : spawnSync('npm', ['--version'], { encoding: 'utf8' });
  check(npm.status === 0, `npm ${String(npm.stdout ?? '').trim() || 'not found'}`, 'npm ships with Node.js; reinstall Node.js.');

  check(existsSync(join(ROOT, 'node_modules', 'vite')), 'Dependencies installed (node_modules)', 'Run: npm ci');
  check(existsSync(join(ROOT, 'public', 'vendor', 'pieeg.js')), 'EEG library present (public/vendor/pieeg.js)', 'Your checkout is incomplete; run: git pull');

  const git = spawnSync('git', ['config', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' });
  const hooks = String(git.stdout ?? '').trim();
  if (git.error) note('git was not found', 'Install Git (Git for Windows on Windows) to commit and push.');
  else if (hooks !== '.githooks') note('The history guard is not installed in this clone', 'Run: npm ci   (it installs the pre-push hook that refuses force pushes and deletions)');
  else check(true, 'History guard installed (pre-push hook)', '');

  if (!existsSync(join(ROOT, '.env.local'))) note('No .env.local here', 'That is fine: the dev server uses port 5173. Worktrees made by scripts/wt.sh get their own port.');
  note('Use Chrome or Edge', 'Web Bluetooth (the Octopus 16 board) does not work in Safari or Firefox.');
  console.log(failed === 0 ? green('\nThis computer is ready.') : red(`\n${failed} problem${failed === 1 ? '' : 's'} to fix.`));
  return failed;
}
