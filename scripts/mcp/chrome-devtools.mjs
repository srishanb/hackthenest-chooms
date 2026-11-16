#!/usr/bin/env node
/**
 * Starts the Chrome DevTools MCP server (the harness's "perf-profiling" tool) over stdio.
 *
 * Why a launcher: the server is pinned (chrome-devtools-mcp 1.13.0) and started with the same safe
 * settings on every machine: headless, a throwaway browser profile (--isolated), no usage statistics
 * sent to Google (--no-usage-statistics), and no page addresses sent to the CrUX field-data service
 * (--no-performance-crux). Flag names are from `npx -y chrome-devtools-mcp@1.13.0 --help`.
 *
 * Browser: CHROME_PATH when set, otherwise /opt/pw-browsers/chromium (the cloud environment's
 * Playwright Chromium) when it exists, otherwise the server's own choice (a locally installed Chrome).
 * Running as root (the cloud container) Chromium needs --no-sandbox, so it is added only then.
 *
 * Extra arguments are passed through, for example `--help` or `--viewport 1280x720`.
 * Dev time only: `npx` needs the network the first time, and the game never uses any of this.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const args = ['-y', 'chrome-devtools-mcp@1.13.0', '--headless', '--isolated', '--no-usage-statistics', '--no-performance-crux'];
const browser = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium'].find((path) => path && existsSync(path));
if (browser) args.push('--executablePath', browser);
if (process.getuid?.() === 0) args.push('--chromeArg=--no-sandbox');
args.push(...process.argv.slice(2));

const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, {
  stdio: 'inherit',
  env: { ...process.env, CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1' },
});
child.on('exit', (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
