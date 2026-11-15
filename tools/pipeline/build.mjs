#!/usr/bin/env node
// @ts-check
/**
 * The build pipeline: turns the source into a `dist/` folder that can run the demo with no network.
 *
 *   node tools/pipeline/build.mjs          (or: node run.mjs build)
 *   node tools/pipeline/build.mjs --fast   skip the type check, tests and level check
 *
 * Steps, in order. The pipeline stops at the first step that fails.
 *   1. preflight   Node version, dependencies installed, which commit is being built
 *   2. typecheck   `npm run typecheck`
 *   3. tests       `npm run test`
 *   4. levels      `npm run check:levels`, once the level checker exists
 *   5. bundle      `npm run build` (Vite) into a fresh dist/
 *   6. recordings  copy recordings/*.jsonl into dist/recordings/ so `?source=replay` works in the build
 *   7. audit       the built page, styles and scripts load nothing from the internet; files the page names exist
 *   8. stamp       write dist/build-info.json (commit, time, sizes)
 *
 * Why a script and not only `vite build`: the demo must work with the Wi-Fi off, and "it built"
 * does not prove that. Steps 6 and 7 are the parts Vite does not do for us.
 *
 * This is the START of the build process: add a step by adding one entry to STEPS below.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { ROOT, bold, dim, green, heading, npmRun, parseArgs, red, versionAtLeast, yellow } from '../../run/_lib.mjs';

const DIST = join(ROOT, 'dist');
const { flags } = parseArgs(process.argv.slice(2));
const FAST = flags.has('fast');

/**
 * @typedef {{ ok: boolean, detail: string, skipped?: boolean }} StepResult
 * @typedef {{ name: string, run: () => Promise<StepResult> | StepResult }} Step
 */

/** Facts gathered along the way and written to build-info.json. */
const info = {
  name: 'Lighten Up',
  version: '',
  commit: 'unknown',
  uncommittedChanges: false,
  builtAt: new Date().toISOString(),
  node: process.versions.node,
  checksSkipped: FAST,
  recordings: /** @type {string[]} */ ([]),
  files: /** @type {{ path: string, bytes: number }[]} */ ([]),
  totalBytes: 0,
};

/** @param {string[]} args @returns {string} git's output, or '' if git fails */
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return result.status === 0 ? String(result.stdout).trim() : '';
}

/** Every file under `folder`, as paths relative to it. @param {string} folder @returns {string[]} */
function listFiles(folder) {
  /** @type {string[]} */
  const found = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = join(folder, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(full).map((inner) => join(entry.name, inner)));
    else found.push(entry.name);
  }
  return found;
}

/** @param {number} bytes */
function size(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} kB`;
}

/** @param {string} script @param {string} what @returns {Promise<StepResult>} */
async function npmStep(script, what) {
  const code = await npmRun(script);
  return code === 0 ? { ok: true, detail: `${what} passed` } : { ok: false, detail: `"npm run ${script}" failed (exit ${code})` };
}

/** @param {string} why @returns {StepResult} */
const skipped = (why) => ({ ok: true, skipped: true, detail: why });

/** True for an address that needs the network (http, https, ws, wss, or protocol-relative //). @param {string} ref */
const isExternal = (ref) => /^(?:(?:https?|wss?):)?\/\//i.test(ref.trim());

const CSS_PATTERNS = [/url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)/gi, /@import\s+["']((?:https?:)?\/\/[^"']+)["']/gi];
const JS_PATTERNS = [
  /\b(?:import|importScripts|fetch|Worker|SharedWorker|WebSocket|EventSource)\s*\(\s*["'`]((?:(?:https?|wss?):)?\/\/[^"'`]+)["'`]/g,
  /\bfrom\s*["']((?:https?:)?\/\/[^"']+)["']/g, // import x from "https://..."
];

/** @param {string} text @param {RegExp[]} patterns @returns {string[]} */
function matchAll(text, patterns) {
  /** @type {string[]} */
  const found = [];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) if (match[1]) found.push(match[1]);
  return found;
}

/**
 * The files a built HTML page would load: values of src, href, srcset and poster on every tag
 * except <a> (a plain link loads nothing until someone clicks it). Quoted or unquoted.
 * `data-src` and the like are not loads, so the attribute name must stand alone.
 * @param {string} html
 * @returns {string[]}
 */
function loadedByHtml(html) {
  /** @type {string[]} */
  const found = [];
  for (const tag of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    if ((tag[1] ?? '').toLowerCase() === 'a') continue;
    for (const attr of (tag[2] ?? '').matchAll(/(?<![\w-])(src|href|srcset|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const unquoted = attr[4];
      const value = (attr[2] ?? attr[3] ?? (unquoted ? unquoted.replace(/\/$/, '') : '')).trim();
      const isSrcset = (attr[1] ?? '').toLowerCase() === 'srcset';
      const parts = isSrcset ? value.split(',').map((part) => part.trim().split(/\s+/)[0] ?? '') : [value];
      for (const part of parts) if (part) found.push(part);
    }
  }
  return found;
}

/**
 * Find references in built HTML, CSS or JavaScript that would need the network.
 *
 * This is an audit, not a proof. It reads addresses that are written out: tag attributes, inline
 * <style> and <script> blocks and style="" in HTML; url() and @import in CSS; import, fetch,
 * workers and sockets with a literal address in JavaScript. An address the code builds while
 * running cannot be seen here, which is why the hands-on check with the Wi-Fi off still matters.
 * @param {string} text file content
 * @param {'html' | 'css' | 'js'} kind
 * @returns {string[]} the offending references
 */
export function findExternalReferences(text, kind) {
  if (kind === 'css') return matchAll(text, CSS_PATTERNS);
  if (kind === 'js') return matchAll(text, JS_PATTERNS);
  const found = loadedByHtml(text).filter(isExternal);
  for (const block of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) found.push(...matchAll(block[1] ?? '', CSS_PATTERNS));
  for (const attr of text.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) found.push(...matchAll(attr[1] ?? attr[2] ?? '', CSS_PATTERNS));
  for (const block of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) found.push(...matchAll(block[1] ?? '', JS_PATTERNS));
  return found;
}

/** Local files a built HTML page would load, without any ?query or #hash. @param {string} html @returns {string[]} */
export function findLocalReferences(html) {
  /** @type {string[]} */
  const found = [];
  for (const ref of loadedByHtml(html)) {
    if (isExternal(ref) || /^[a-z][a-z0-9+.-]*:/i.test(ref)) continue; // remote, or data:, blob:, mailto: and the like
    const path = ref.split(/[?#]/)[0] ?? '';
    if (!path) continue;
    try {
      found.push(decodeURIComponent(path));
    } catch {
      found.push(path);
    }
  }
  return found;
}

/** @type {Step[]} */
const STEPS = [
  {
    name: 'preflight',
    run() {
      if (!versionAtLeast(process.versions.node, [22, 12])) return { ok: false, detail: `Node.js ${process.versions.node} is too old; install Node.js 26 LTS` };
      if (!existsSync(join(ROOT, 'node_modules', 'vite'))) return { ok: false, detail: 'dependencies are not installed; run: npm ci' };
      const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
      info.name = pkg.name ?? info.name;
      info.version = pkg.version ?? '';
      info.commit = git(['rev-parse', '--short', 'HEAD']) || 'unknown';
      info.uncommittedChanges = git(['status', '--porcelain']).length > 0;
      const dirty = info.uncommittedChanges ? ' with uncommitted changes' : '';
      return { ok: true, detail: `${info.name} ${info.version}, commit ${info.commit}${dirty}, Node.js ${info.node}` };
    },
  },
  { name: 'typecheck', run: () => (FAST ? skipped('--fast') : npmStep('typecheck', 'type check')) },
  { name: 'tests', run: () => (FAST ? skipped('--fast') : npmStep('test', 'all tests')) },
  {
    name: 'levels',
    run() {
      if (FAST) return skipped('--fast');
      if (!existsSync(join(ROOT, 'tools', 'levels', 'check-levels.ts'))) return skipped('the level checker (tools/levels) is not in the repo yet');
      return npmStep('check:levels', 'level reachability check');
    },
  },
  {
    name: 'bundle',
    async run() {
      rmSync(DIST, { recursive: true, force: true });
      const result = await npmStep('build', 'bundle');
      if (!result.ok) return result;
      if (!existsSync(join(DIST, 'index.html'))) return { ok: false, detail: 'Vite finished but dist/index.html is missing' };
      return { ok: true, detail: 'bundled into dist/' };
    },
  },
  {
    name: 'recordings',
    run() {
      const source = join(ROOT, 'recordings');
      const names = existsSync(source) ? readdirSync(source).filter((name) => name.endsWith('.jsonl')) : [];
      if (names.length === 0) return skipped('no recordings/*.jsonl to copy');
      mkdirSync(join(DIST, 'recordings'), { recursive: true });
      for (const name of names) cpSync(join(source, name), join(DIST, 'recordings', name));
      info.recordings = names;
      return { ok: true, detail: `copied ${names.length} recording${names.length === 1 ? '' : 's'} for offline replay: ${names.join(', ')}` };
    },
  },
  {
    name: 'audit',
    run() {
      /** @type {string[]} */
      const problems = [];
      const files = listFiles(DIST);
      for (const file of files) {
        if (file.split(sep)[0] === 'vendor') continue; // third-party code we ship as-is (the EEG library)
        const kind = file.endsWith('.html') ? 'html' : file.endsWith('.css') ? 'css' : /\.m?js$/.test(file) ? 'js' : null;
        if (!kind) continue;
        const text = readFileSync(join(DIST, file), 'utf8');
        for (const ref of findExternalReferences(text, kind)) problems.push(`${file} loads from the internet: ${ref}`);
        if (kind !== 'html') continue;
        for (const ref of findLocalReferences(text)) {
          const target = ref.startsWith('/') ? join(DIST, ref) : join(DIST, dirname(file), ref);
          if (!existsSync(target)) problems.push(`${file} names a file that is not in dist/: ${ref}`);
        }
      }
      if (!existsSync(join(DIST, 'vendor', 'pieeg.js'))) problems.push('dist/vendor/pieeg.js is missing (the EEG library must ship with the build)');
      if (problems.length > 0) return { ok: false, detail: problems.join('\n         ') };
      return { ok: true, detail: 'no internet address is loaded by the built page, styles or scripts (as written); every file the page names exists' };
    },
  },
  {
    name: 'stamp',
    run() {
      info.files = listFiles(DIST)
        .map((path) => ({ path: path.split(sep).join('/'), bytes: statSync(join(DIST, path)).size }))
        .sort((a, b) => b.bytes - a.bytes);
      info.totalBytes = info.files.reduce((sum, file) => sum + file.bytes, 0);
      writeFileSync(join(DIST, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);
      return { ok: true, detail: `${info.files.length} files, ${size(info.totalBytes)}; wrote dist/build-info.json` };
    },
  },
];

async function main() {
  heading(`Build${FAST ? ' (fast: checks skipped)' : ''}`);
  /** @type {{ name: string, result: StepResult, seconds: number }[]} */
  const done = [];
  let failed = false;
  for (const step of STEPS) {
    console.log(`\n${bold(`▸ ${step.name}`)}`);
    const startedAt = Date.now();
    /** @type {StepResult} */
    let result;
    try {
      result = await step.run();
    } catch (error) {
      result = { ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
    const seconds = (Date.now() - startedAt) / 1000;
    done.push({ name: step.name, result, seconds });
    const mark = !result.ok ? red('FAILED ') : result.skipped ? yellow('skipped') : green('ok     ');
    console.log(`  ${mark} ${result.detail} ${dim(`(${seconds.toFixed(1)} s)`)}`);
    if (!result.ok) {
      failed = true;
      break;
    }
  }

  heading('Build summary');
  for (const { name, result, seconds } of done) {
    const mark = !result.ok ? red('FAILED ') : result.skipped ? yellow('skipped') : green('ok     ');
    console.log(`  ${name.padEnd(11)} ${mark} ${dim(`${seconds.toFixed(1)} s`)}`);
  }
  if (failed) {
    console.log(red('\nThe build stopped at the failed step. Nothing in dist/ should be used.'));
    return 1;
  }
  const largest = info.files.slice(0, 3).map((file) => `${file.path} ${size(file.bytes)}`);
  console.log(`\n${green('Built')} ${relative(ROOT, DIST)}/  ${size(info.totalBytes)} in ${info.files.length} files  ${dim(`(largest: ${largest.join('; ')})`)}`);
  if (FAST) console.log(yellow('Checks were skipped (--fast): do not ship this build.'));
  if (info.uncommittedChanges) console.log(yellow('Built with uncommitted changes: commit first for a build you can trace.'));
  console.log(dim('Next: node run.mjs preview   then turn the Wi-Fi off and reload to prove it runs offline.'));
  return 0;
}

// Run only when started directly, so the helpers above can be imported by tests.
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/pipeline/build.mjs')) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    },
  );
}
