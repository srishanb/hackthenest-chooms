# After-job report: harness setup (agents, skills, orchestrator, MCP tools)

- Agent: claude (Claude Code subagent, Opus 5.5)
- Branch and PR: `worktree-agent-aa33738c8feeeb8ba` (a Claude Code worktree branch from `main` at `653741f`); no PR, the lead merges the branch
- Phase and plan: harness-setup Steps 3 to 6; the change manifest was approved by Srishan (recorded in the lead's session), no plan file
- Started and finished: start not recorded; finished 16:37 Eastern

## 1. What I believe is complete

| Manifest row | Result | Confidence |
|---|---|---|
| 1. `.claude/skills/lighten-up-orchestrator/SKILL.md` (Template B, subagent mode; phases 0 to 5, agents table, routing by difficulty, the "lead does not write code" rule with its reason, data passing, error handling, two test scenarios; 197 lines) | Pass | High |
| 2. `references/tools.md` (5 roles, the registry schema, setup and per-person approval of MCP servers) | Pass | High |
| 3. `.claude/agents/game-qa.md` (`model: claude-opus-5-5`, general-purpose type, cross-boundary method, never edits) | Pass | High |
| 4. `feature-builder.md`, `bug-fixer.md`: one added section (phaser4-api, tools by role, hand-off notes, art rule); frontmatter and existing rules untouched | Pass | High |
| 5. `.claude/skills/ethos-check/SKILL.md` (7 checks with commands, exceptions found in the tree) | Pass | Medium: the greps are heuristics, they were run on this tree and on this branch's diff |
| 6. `.claude/skills/play-verify/` (SKILL.md, `scripts/smoke.cjs`, `scripts/gallery.cjs`) | Pass | High |
| 7. `.claude/skills/game-only-release/SKILL.md` (release steps and Signing) | Pass | Medium: names checked against the pinned electron-builder; Azure and certificate-vendor facts marked unverified |
| 8. `.claude/skills/phaser4-api/` (router + 28 vendored upstream skills, LICENSE.md, SOURCE.md, CREDITS.md row) | Pass | High |
| 10. `.mcp.json` + `scripts/mcp/chrome-devtools.mjs` | Pass | High |
| 11. `scripts/mcp/setup-spector.sh` + `scripts/mcp/spector.mjs` + `.mcp.json` entry | Pass | High |
| 12. Context7 `.mcp.json` entry | Pass | High |
| 13. `.gitignore`: `_agents_workspace/`, `.tools/`, and (added by the lead mid-task) `.claude/worktrees/` | Pass | High |
| 14. `CLAUDE.md`: import line first, then the harness pointer and change history | Pass | High |
| 15. This report | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm ci`, `npm run check` | 95 test files, 675 tests passed, exit 0 |
| Build | `npm run build`; also `node tools/pipeline/build.mjs --fast` (includes the offline audit) | Built; pipeline steps bundle, recordings, audit, stamp all ok |
| Frontmatter | parsed every `SKILL.md` and agent file with PyYAML | All valid; skill `name` equals folder name; agents have `model` |
| No placeholders or plugin paths | `grep -rn "{[A-Z_]\+}" .claude CLAUDE.md` and a grep for the plugin path | Only the existing `${CLAUDE_PROJECT_DIR}` hooks in `.claude/settings.json` (not mine, valid); nothing else |
| `.mcp.json` schema | compared with what `claude mcp add -s project` writes (in a scratch folder); `claude mcp get <name>` in the worktree | Same shape (`mcpServers`, `type: stdio`); all three listed as project servers, "Pending approval" |
| chrome-devtools launcher | `node scripts/mcp/chrome-devtools.mjs --help`; an MCP stdio session: initialize, tools/list, `new_page` on a WebGL2 test page | Help printed (flag names copied from it); server 1.13.0 started local Chromium headless, 33 tools, WebGL2 available |
| Spector setup | `bash scripts/mcp/setup-spector.sh` | Fetched the pinned commit into `.tools/spector`, `npm ci` + `tsc` in `mcp/`, no browser download. Reported that its Playwright 1.65.0 wants Chromium build 1254 while 1243 is installed |
| Spector launcher | MCP session against the dev server: `load_url`, `get_context_info`, `capture_frame`; also with `mcp/dist` moved away | Launcher fell back to `CHROME_PATH`; loaded the game (4 canvases), captured a frame: 51 draw calls, 9 shader programs, WebGL 1, no GL errors. Without the build it printed the setup line and exited 1 |
| Context7 | MCP session: tools/list, `resolve-library-id` for "phaser" | Tools `resolve-library-id`, `query-docs`; returned Phaser library IDs without an API key |
| play-verify smoke | dev server on 5288, `smoke.cjs --query "?bot=1&seed=42" --seconds 3,8` | Phase `playing`, readout printed (`forestFps` 25.7 then 22.9, height 0 then 332 px), no errors; screenshots read: HUD, candle, ledges, narrator line all drawn |
| play-verify gallery | `gallery.cjs --page src/game/__tests__/candle-faces.html` | Screenshot read: every mood for ten candles plus the menu emblem; no errors |
| Server stopped | `kill`, then `curl` the port | Connection refused |
| Ethos-check commands | ran the check blocks against this branch's diff | Ran without shell errors; test files excluded from the network grep after a first run showed localhost URLs in tests |
| Phaser claims in phaser4-api | grepped `node_modules/phaser/types/phaser.d.ts` and `src/core/Config.js` | `TintModes`, `setTintMode`, `PI_OVER_2`, `vertexRoundMode`, `tileRotation`, `addNodeConstructor`, `BaseFilterShader` exist; `setTintFill` exists but is documented "does nothing"; `TAU` is PI*2; `roundPixels` defaults to false and `pixelArt` turns it on |
| Signing names | `npm ci --ignore-scripts` in `desktop/`; read `winOptions.d.ts`, `macOptions.d.ts`, `codesign.js`, `MacUpdater.js`, `NsisUpdater.js`; grepped `process.env.` | All option and env names in the skill appear in the pinned source, except the Azure Entra variables, marked unverified |
| Vendored links | checked every relative link in the copied files | All resolve |
| Nothing under `src/` or `public/` changed | `git diff --stat 653741f..HEAD -- src public` | Empty |

**Not verified:** that Claude Code actually triggers `lighten-up-orchestrator` from the CLAUDE.md gate in a fresh session (needs a new session); a real run of the orchestrator with spawned agents; the MCP servers inside an interactive Claude Code session after approval (I tested them over stdio with my own client); the Chrome DevTools performance-trace tools; the signing steps (no accounts); the release workflow (not run); the scripts on Windows or macOS.

## 3. Problems, workarounds and dead ends

- Spector's `mcp/` Playwright (1.65.0) wants Chromium build 1254; the environment has 1243 and the brief said not to download a second browser. Playwright has no environment variable for the launch executable, so `scripts/mcp/spector.mjs` wraps `chromium.launch` in-process to use `CHROME_PATH` or `/opt/pw-browsers/chromium` when Playwright's own build is missing. It works with the 1243 build. `SPECTOR_USE_PLAYWRIGHT_CHROMIUM=1` turns this off.
- Spector's `mcp/` does not depend on `spectorjs`; it needs the repository's `dist/spector.bundle.js`, which upstream commits, so the repository root is not built.
- The worktree guard refused some compound git commands; split them into plain ones.
- The repo's `package.json` is `"type": "module"`, so the play-verify scripts are `.cjs` to `require` the globally installed Playwright (ESM import ignores `NODE_PATH`).

## 4. Deviations from the plan

- The brief named `backdrop-gallery.html`; it exists on `origin/game-only` but not on `main` (this branch's base). play-verify documents it as present on branches with the generated backdrop and shows `candle-faces.html` as the default example.
- `desktop/package.json` `"version"` is not read by the release workflow (the tag sets the version through `extraMetadata`); the skill still says to raise it, and why.
- The brief described Decision D-32 as part of the branch flow; D-32 (on `game-only` only) is about the generated backdrop, so the orchestrator cites D-31 only. "Squash merges only" is recorded as a repository setting from the brief; it is not written in `docs/`.
- Added `.claude/worktrees/` to `.gitignore` at the lead's request (an amendment to row 13).
- Two upstream links in the vendored Phaser files were already broken (`references/REFERENCE..//SKILL.md`); fixed them and recorded it in `SOURCE.md`.

## 5. Changes

- Files changed: `.gitignore`, `.mcp.json`, `scripts/mcp/{chrome-devtools.mjs,spector.mjs,setup-spector.sh}`, `CLAUDE.md`, `CREDITS.md` (one Libraries row), `.claude/agents/{game-qa,feature-builder,bug-fixer}.md`, `.claude/skills/{lighten-up-orchestrator,ethos-check,play-verify,game-only-release,phaser4-api}/`, this report.
- Contract or config-schema changes requested: None
- New dependencies requested: None in `package.json`. Development-time packages run through `npx` at pinned versions (`chrome-devtools-mcp@1.13.0`, `@upstash/context7-mcp@4.7.1`); Spector.js is cloned at a pinned commit into the ignored `.tools/`.
- Edits outside my lane: integrator files (`scripts/`, `CLAUDE.md`, `.gitignore`, `.mcp.json`), approved by Srishan in the manifest. `CREDITS.md` (content lane): one row, as the manifest asked.
- `INDEX.md` updated for new exports: not applicable

## 6. Follow-ups and questions for humans

- [ ] Each teammate approves the three project MCP servers on first interactive start (Claude Code asks); without approval the agents use the alternatives in `tools.md`.
- [ ] On a new machine, run `bash scripts/mcp/setup-spector.sh` once for the WebGL inspector.
- [ ] Signing (Srishan): choose Azure Trusted Signing or a certificate for Windows, and an Apple Developer ID for macOS; create the GitHub secrets; then a planned change to `desktop/package.json`, `desktop/update-feed.cjs`, `desktop/updater.cjs` and the release workflow (see the `game-only-release` skill).
- [ ] Start a fresh session to confirm the CLAUDE.md gate invokes the orchestrator.

## 7. Can a teammate explain this?

The repo now tells every Claude Code session to start from one "orchestrator" skill. For real work it
writes a brief, has an Opus agent build or a Sonnet agent fix, has a QA agent check the change against
the game's rules and the running game, and only then does the lead commit and open a pull request. The
other skills are checklists and scripts those agents use: the Phaser 4 manual, the rule checks, a
headless screenshot run, and the release steps.
