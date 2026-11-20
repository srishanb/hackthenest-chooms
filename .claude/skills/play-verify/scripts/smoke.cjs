#!/usr/bin/env node
/**
 * Headless smoke run of the game: open it, start a run, take screenshots at given seconds, and print
 * the dev readout and every console or page error.
 *
 * Why: a passing type check and test suite does not prove the game draws, starts or keeps its frame
 * rate. This is the cheapest look at the real page, and it prints numbers a before/after check can compare.
 *
 * Usage (a dev server must already be running; see the play-verify skill):
 *   node .claude/skills/play-verify/scripts/smoke.cjs [--port 5173] [--url http://localhost:5173/]
 *        [--query "?bot=1&seed=42"] [--name smoke] [--out _agents_workspace/shots]
 *        [--seconds 3,10] [--width 1280] [--height 720] [--no-start]
 * Defaults: port from --port, else PORT in the environment, else PORT in .env.local, else 5173.
 * The output folder defaults to PLAY_VERIFY_OUT, else _agents_workspace/shots (ignored by git).
 *
 * Output: <name>-menu.png, then <name>-<t>s.png per second mark; one line per mark with the UI phase
 * (`#ui` data-phase) and the game canvas's dataset (`#game canvas`), then the errors seen.
 * Exit code 1 when the page never showed a canvas or reported a page error.
 */
const { existsSync, mkdirSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
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

/** Playwright is not in package.json: use the copy installed globally in the cloud environment. */
function loadPlaywright() {
  try { return require('playwright'); } catch { /* try the global folder below */ }
  try { return require(join(execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' }).trim(), 'playwright')); } catch { /* none */ }
  console.error('Playwright is not installed. See "Without Playwright" in .claude/skills/play-verify/SKILL.md.');
  process.exit(2);
}

(async () => {
  const port = option('port', process.env.PORT || portFromEnvLocal() || '5173');
  const base = option('url', `http://localhost:${port}/`);
  const query = option('query', '?bot=1&seed=42');
  const name = option('name', 'smoke');
  const out = resolve(option('out', process.env.PLAY_VERIFY_OUT || join(ROOT, '_agents_workspace', 'shots')));
  const seconds = option('seconds', '3,10').split(',').map(Number).filter((t) => t > 0).sort((a, b) => a - b);
  const start = !process.argv.includes('--no-start');
  mkdirSync(out, { recursive: true });

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: Number(option('width', '1280')), height: Number(option('height', '720')) },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push('PAGEERROR ' + error.message));

  let failed = false;
  try {
    await page.goto(new URL(query, base).href);
    await page.waitForSelector('#game canvas', { timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(out, `${name}-menu.png`) });
    if (start) await page.keyboard.press('Enter');
    let last = 0;
    for (const t of seconds) {
      await page.waitForTimeout((t - last) * 1000);
      last = t;
      await page.screenshot({ path: join(out, `${name}-${t}s.png`) });
      const data = await page.evaluate(() => {
        const canvas = document.querySelector('#game canvas');
        return canvas ? { ...canvas.dataset } : null;
      });
      const phase = await page.evaluate(() => document.querySelector('#ui')?.dataset.phase ?? null);
      console.log(`${t}s phase=${phase} ${JSON.stringify(data)}`);
    }
  } catch (error) {
    failed = true;
    console.error('smoke run failed:', error.message);
  }
  console.log('errors:', JSON.stringify(errors.slice(0, 20)));
  console.log('screenshots:', out);
  await browser.close();
  process.exit(failed || errors.some((e) => e.startsWith('PAGEERROR')) ? 1 : 0);
})();
