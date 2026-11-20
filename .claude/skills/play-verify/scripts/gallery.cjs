#!/usr/bin/env node
/**
 * Full-page screenshot of a dev page (a candle or backdrop gallery under src/game/__tests__/).
 *
 * Why: the galleries draw every mood, trait or backdrop height on one page, so one screenshot shows
 * a visual change across all of them, which a single game run cannot.
 *
 * Usage (a dev server must already be running; see the play-verify skill):
 *   node .claude/skills/play-verify/scripts/gallery.cjs --page src/game/__tests__/candle-faces.html
 *        [--query "?seed=7"] [--name faces] [--port 5173] [--url http://localhost:5173/]
 *        [--out _agents_workspace/shots] [--width 1920] [--height 580]
 * Port and output folder default as in smoke.cjs.
 *
 * It waits for `window.galleryReady === true` (every gallery sets it when drawn), prints the text of
 * `#note` if the page has one, saves <name>.png and prints any console or page errors.
 */
const { existsSync, mkdirSync, readFileSync } = require('node:fs');
const { basename, join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = resolve(__dirname, '..', '..', '..', '..');

function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] !== undefined ? process.argv[at + 1] : fallback;
}

function portFromEnvLocal() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) return undefined;
  const match = readFileSync(file, 'utf8').match(/^PORT=(\d+)/m);
  return match ? match[1] : undefined;
}

function loadPlaywright() {
  try { return require('playwright'); } catch { /* try the global folder below */ }
  try { return require(join(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim(), 'playwright')); } catch { /* none */ }
  console.error('Playwright is not installed. See "Without Playwright" in .claude/skills/play-verify/SKILL.md.');
  process.exit(2);
}

(async () => {
  const pagePath = option('page', undefined);
  if (!pagePath) {
    console.error('Give the page: --page src/game/__tests__/<gallery>.html');
    process.exit(2);
  }
  const port = option('port', process.env.PORT || portFromEnvLocal() || '5173');
  const base = option('url', `http://localhost:${port}/`);
  const name = option('name', basename(pagePath, '.html'));
  const out = resolve(option('out', process.env.PLAY_VERIFY_OUT || join(ROOT, '_agents_workspace', 'shots')));
  mkdirSync(out, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: Number(option('width', '1920')), height: Number(option('height', '580')) },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push('PAGEERROR ' + error.message));

  let failed = false;
  try {
    await page.goto(new URL(pagePath.replace(/^\//, '') + option('query', ''), base).href);
    await page.waitForFunction(() => window.galleryReady === true, null, { timeout: 30000 });
    const note = await page.locator('#note').count() ? await page.locator('#note').textContent() : null;
    if (note) console.log('note:', note);
    const file = join(out, `${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('screenshot:', file);
  } catch (error) {
    failed = true;
    console.error('gallery failed:', error.message);
  }
  console.log('errors:', JSON.stringify(errors.slice(0, 20)));
  await browser.close();
  process.exit(failed || errors.length > 0 ? 1 : 0);
})();
