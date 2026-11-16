#!/usr/bin/env node
/**
 * Starts the Spector.js MCP server (the harness's "webgl-inspection" tool) over stdio.
 *
 * Why a launcher: the server is built locally by scripts/mcp/setup-spector.sh into .tools/spector
 * (ignored by git), so `.mcp.json` points here and this file finds it, or says how to build it.
 *
 * Browser: the server drives Chromium through its own Playwright. When the Chromium build that
 * Playwright wants is not installed but another one is (CHROME_PATH, or /opt/pw-browsers/chromium in
 * the cloud environment), this launcher makes Playwright launch that one instead of asking for a
 * second download. Playwright has no setting for this, so it wraps `chromium.launch` before the
 * server loads. Set SPECTOR_USE_PLAYWRIGHT_CHROMIUM=1 to turn that off.
 *
 * stdout belongs to the MCP protocol: this file writes its own messages to stderr only.
 * Dev time only: the game never uses it.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mcpDir = join(root, '.tools', 'spector', 'mcp');
const entry = join(mcpDir, 'dist', 'index.js');

if (!existsSync(entry)) {
  console.error('Spector.js MCP server is not built. Run: bash scripts/mcp/setup-spector.sh');
  process.exit(1);
}

if (process.env.SPECTOR_USE_PLAYWRIGHT_CHROMIUM !== '1') {
  const require = createRequire(join(mcpDir, 'package.json'));
  const { chromium } = require('playwright');
  const fallback = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium'].find((path) => path && existsSync(path));
  if (!existsSync(chromium.executablePath()) && fallback) {
    const launch = chromium.launch.bind(chromium);
    chromium.launch = (options = {}) => launch({ ...options, executablePath: options.executablePath ?? fallback });
    console.error(`spector: Playwright's own Chromium is not installed; using ${fallback}`);
  }
}

await import(pathToFileURL(entry).href);
