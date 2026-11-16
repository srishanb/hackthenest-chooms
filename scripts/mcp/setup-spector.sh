#!/usr/bin/env bash
# Sets up the Spector.js MCP server (the harness's "webgl-inspection" tool) in .tools/spector.
#
# Why: Spector.js captures one WebGL frame and lists its draw calls, shaders and textures, which is how
# a renderer problem in the game (a filter, a tint, a texture) is inspected. Its MCP server is not on
# npm, so it is built from the Spector.js repository at a pinned commit.
#
# What it does, and nothing else:
#   1. fetches https://github.com/BabylonJS/Spector.js at the pinned commit into .tools/spector
#      (ignored by git, so nothing here is ever committed);
#   2. installs and builds only its mcp/ folder from that folder's own lockfile;
#   3. does NOT download a browser. The server's Playwright needs its own Chromium build; if that
#      build is not installed, the script says so and how to add it.
# Upstream's dist/spector.bundle.js is committed in that repository, so the repository root is not built.
# It is safe to run again: an existing checkout at the right commit is reused.
# Dev time only: it needs the network, and the game never uses any of it.
set -euo pipefail

REPO_URL="https://github.com/BabylonJS/Spector.js.git"
COMMIT="755e6a7671e58424fcfda1270823a71e91de3553"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$ROOT/.tools/spector"

mkdir -p "$DEST"
cd "$DEST"
if [ ! -d .git ]; then
  git init -q
  git remote add origin "$REPO_URL"
fi
if [ "$(git rev-parse -q --verify HEAD 2>/dev/null || true)" != "$COMMIT" ]; then
  echo "fetching Spector.js at $COMMIT"
  git fetch -q --depth 1 origin "$COMMIT"
  git checkout -q --detach "$COMMIT"
fi
[ -f dist/spector.bundle.js ] || { echo "dist/spector.bundle.js is missing in the checkout"; exit 1; }

cd mcp
echo "installing mcp/ dependencies from its lockfile"
npm ci --no-audit --no-fund
echo "building mcp/"
npm run build
[ -f dist/index.js ] || { echo "build did not produce mcp/dist/index.js"; exit 1; }

# Which Chromium build this Playwright wants, and whether it is already installed.
node --input-type=module -e '
  import { createRequire } from "node:module";
  const require = createRequire(process.cwd() + "/package.json");
  const { chromium } = require("playwright");
  const { existsSync } = require("node:fs");
  const path = chromium.executablePath();
  const version = require("playwright/package.json").version;
  if (existsSync(path)) {
    console.log(`Playwright ${version} found its Chromium: ${path}`);
  } else {
    console.log(`Playwright ${version} wants a Chromium build that is not installed: ${path}`);
    console.log("To add it (about 170 MB): cd .tools/spector/mcp && npx playwright install chromium");
  }
'
echo "Spector.js MCP server built: .tools/spector/mcp/dist/index.js"
