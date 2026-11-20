# Tools registry

Agents and skills name a tool by its **role**, never by a hard tool name. When the preferred tool is
missing or unreachable, use the alternative and say in your report that you did. Reviewed on the dates
below; change a row here and every agent and skill follows.

| Role | Preferred tool | Alternative (if unavailable) | Status | Last reviewed |
|------|----------------|------------------------------|--------|---------------|
| `framework-api` | The `phaser4-api` skill (`.claude/skills/phaser4-api/`, the official Phaser 4.2.1 skills vendored) | Read the installed types and source: `node_modules/phaser/types/phaser.d.ts`, `node_modules/phaser/src/` | active | 2026-11-16 |
| `perf-profiling` | Chrome DevTools MCP 1.13.0 (`chrome-devtools` in `.mcp.json`) | The game's own dev readout (`document.querySelector('#game canvas').dataset.forestFps` and the `endless*` keys, dev builds only) through the `play-verify` scripts | active | 2026-11-16 |
| `webgl-inspection` | Spector.js MCP (`spector` in `.mcp.json`) | `perf-profiling` screenshots and console messages; say in the report that no frame capture was made | active (needs one-time setup) | 2026-11-16 |
| `library-docs` | Context7 MCP 4.7.1 (`context7` in `.mcp.json`) | The pinned package's own README and type files in `node_modules/<package>/` | active | 2026-11-16 |
| `browser-automation` | Playwright (installed globally in the cloud environment, with Chromium in `/opt/pw-browsers`), used by the `play-verify` scripts | A Playwright MCP server if the session has one (tools named `browser_navigate`, `browser_take_screenshot`, ...) | active | 2026-11-16 |

## How each is set up, and what the owner approves

**Project MCP servers are approved per person.** `.mcp.json` at the repo root declares
`chrome-devtools`, `spector` and `context7`. Claude Code does not start a project server until the
person running it approves it (it asks on the first interactive start in this repo; `claude mcp list`
shows "Pending approval" until then). Each teammate decides for themselves. In a non-interactive session
nobody can approve, so expect the alternative to be used there. Start Claude Code at the repository root:
the server commands use paths relative to it.

All three are development tools. They need the network the first time (`npx` downloads the package),
and the game never uses any of them (AGENTS.md rule 3).

### framework-api: `phaser4-api`

Nothing to install. Read `.claude/skills/phaser4-api/SKILL.md` for the v3-to-v4 traps and the topic
map. Its `references/SOURCE.md` says where the files came from and how to update them when Phaser is upgraded.

### perf-profiling: Chrome DevTools MCP

`scripts/mcp/chrome-devtools.mjs` runs `npx -y chrome-devtools-mcp@1.13.0 --headless --isolated
--no-usage-statistics --no-performance-crux`, with `--executablePath` set to `CHROME_PATH` or
`/opt/pw-browsers/chromium` when present, and `--chromeArg=--no-sandbox` only when running as root.
`node scripts/mcp/chrome-devtools.mjs --help` lists every option. Useful tools: `new_page`,
`performance_start_trace` / `performance_stop_trace`, `performance_analyze_insight`,
`list_console_messages`, `take_screenshot`, `evaluate_script`. Headless Chromium renders WebGL in
software here, so frame times only compare with each other (see the `play-verify` skill, "Comparing
before and after fairly").

### webgl-inspection: Spector.js MCP

One-time setup per machine: `bash scripts/mcp/setup-spector.sh`. It fetches
https://github.com/BabylonJS/Spector.js at commit `755e6a7671e58424fcfda1270823a71e91de3553` into
`.tools/spector` (ignored by git) and builds only its `mcp/` server; it downloads no browser.
`scripts/mcp/spector.mjs` starts it, or prints "run the setup script" and exits 1. The server's own
Playwright (1.65) wants a Chromium build that the cloud environment does not have, so the launcher points
it at `CHROME_PATH` or `/opt/pw-browsers/chromium` instead (set `SPECTOR_USE_PLAYWRIGHT_CHROMIUM=1` to
use Playwright's own, after `cd .tools/spector/mcp && npx playwright install chromium`). Useful tools:
`load_url` (the dev server's address), `capture_frame`, `get_draw_calls`, `get_shaders`, `get_textures`,
`get_command_details`, `get_console_logs`.

### library-docs: Context7 MCP

`npx -y @upstash/context7-mcp@4.7.1`; no API key is needed for normal use and none may be committed (a
key, if ever wanted, goes in the person's own environment as `CONTEXT7_API_KEY`, never in the repo).
Tools: `resolve-library-id`, then `query-docs`. Online documentation may
describe a different version than the lockfile pins: the installed package wins.

### browser-automation: Playwright

Not in `package.json`, on purpose. The cloud environment has it globally (`npm root -g`, 1.63 at
the last review) with Chromium under `/opt/pw-browsers`; `CHROME_PATH` points at a wrapper that adds
`--no-sandbox` for root. The `play-verify` scripts find it there. On another machine, install it outside
the repo, or use a Playwright MCP server if the session has one.

## Reviewing this registry

Revisit when Phaser, Playwright or a pinned MCP version changes, or when a tool keeps being skipped.
Update the version pins in `.mcp.json` and `scripts/mcp/`, re-run each launcher once, and change the
"Last reviewed" date.
