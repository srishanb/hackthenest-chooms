# After-job report: P0 Foundation

- Agent: claude (built on Claude Fable 5.2; report, commits and PR on Claude Opus 5.5 after Srishan's model rule)
- Branch and PR: `claude/p0-foundation`, see the PR this file is part of
- Phase and plan: P0, `docs/plans/P0.md` (approved by Srishan in chat; the agent recorded the line at his instruction, D-12)
- Started and finished: 19:56 to 20:20 Eastern, Sat 14 Nov 2026

## 1. What I believe is complete

| Acceptance test (from the plan) | Result | Confidence |
|---|---|---|
| 1. `npm ci && npm run check` passes | Pass on the Mac (clean `npm ci` from the lockfile, then 23 tests). **Not run on Windows.** | High (Mac), unknown (Windows) |
| 2. Dev server uses the worktree port | Pass: served on 3046, the `PORT` `wt.sh` wrote | High |
| 3. Canvas and physics | Pass: box falls, lands on the static platform, walks with Left and Right | High |
| 4. Signal reaches the screen through the contracts | Pass: overlay showed intensity 0.28 → 0.05 and lantern 168 → 228 px over 2 s; badge reads `SIMULATED INPUT` | High |
| 5. UI is removable | Pass: all nine components set to `enabled: false`; box still moved, no console errors | High |
| 6. Lane boundaries are enforced | Pass: a temporary `game → signal` import and a `game/player → composure` import both failed the test | High |
| 7. Offline | **Partial:** `npm run build && npm run preview` loads with only three requests, all to `localhost`. Wi-Fi was not turned off. | Medium |
| 8. No secrets and no CDN | Pass: no `http(s)://` in `index.html`, `src/` or `public/` outside `vendor/`; `.env.example` holds names only | High |
| Phaser 4 spike (task 3) | Pass: Arcade body plus a canvas-texture darkness layer work in 4.2.1; no fallback to 3.90 | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check | `npx tsc --noEmit` (TypeScript 7.0.2 strict) | exit 0 |
| Unit tests | `npx vitest run` | 5 files, 23 tests passed |
| Clean install | `rm -rf node_modules dist && npm ci && npm run check && npm run build` | all pass |
| Build | `vite build` | 1.38 MB JS (Phaser), 2.2 kB CSS, `vendor/pieeg.js` copied |
| Browser, dev | Built-in browser on `localhost:3046`; dispatched key events; read the overlay text twice, 2 s apart | values changed as expected; 181 frames in 1.5 s; no console errors |
| Browser, preview build | Same, on `vite preview` | `PiEEG.VERSION` = `1.3.0-octopus`; `isSecureContext` true; `navigator.bluetooth` present |
| Vendored file integrity | `shasum -a 256` of the download versus the copy read in the architecture session | identical: `8ecdf103…e818` |
| Vendored file behaviour | `grep` for `fetch(`, `XMLHttpRequest`, `importScripts`, `eval(`, `new Function` | 0 matches |

**Not verified:**

- Anything on Windows (Git Bash, `npm ci`, the canvas on the Yoga or IdeaPad).
- A run with Wi-Fi actually off.
- The new `ci.yml` and the `check` gate in `ai-review.yml`. Their first run is on this PR. The model step of `ai-review` will skip itself again, because the PR changes that workflow file (seen on PR #3).
- Real key presses in a focused window. I used synthetic `KeyboardEvent`s with `code` set, which is what the scene reads.
- `connectSimulator` / `connectBLE` in `pieeg.js`. Nothing calls them yet (P1.1).
- Frame rate on the M4 Air or the Yoga.

## 3. Problems, workarounds and dead ends

- `tsx` cannot open its IPC pipe inside the Claude Code sandbox (`listen EPERM`). Not needed in P0; `tools/` scripts arrive later. Run `tsx` outside the sandbox.
- `import.meta.dirname` would have tied the lane test to newer Node; replaced with `fileURLToPath(import.meta.url)`.
- `npm install` warned that esbuild's install script was not run (npm 11's default). Vite and Vitest still work; documented in the README.
- The browser preview tool only reads `.claude/launch.json` from `codebase/`, so I wrote an untracked one there pointing at this worktree. `.claude/launch.json` is now in `.gitignore`.
- Mid-task, Srishan set a strict rule: Fable only for architectural planning. Work paused until the session switched to Opus 5.5.

## 4. Deviations from the plan

- **Extra contract files.** The plan listed six; there are ten. `signal-api.ts` holds `SignalControl`, `SignalDiagnostics` and `SignalHandle` (the UI needs them, so they should not live in a file called "internal"). `config.ts` holds the types of `src/config/`. `content.ts` holds `SectionData` and `NarratorLine` (marked as a starting shape for P4.2 and P7). `app.ts` holds `Stores`.
- **`GameSnapshot.prompt` became `promptKey`**, and `calibration_result.reason` became `reasonKey`, to make it explicit they are keys into `strings.ts`, never display text.
- **Events are timestamped by the bus** (`listener(event, tMs)`) instead of every event carrying a `t` field, so emitters cannot forget it.
- **`ai-review.yml` now runs `ci.yml` first** (`needs: check`), so the AI reviewer can never merge a PR whose build or tests fail. The plan said "does not merge while CI is failing"; this is how.
- **No `pieeg.d.ts` yet.** The plan put the typed wrapper in P1.1; P0 only vendors and loads the file.
- **`README.md` verify steps** now describe what you should see and the npm cache workaround.

## 5. Changes

- Files: `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.github/workflows/ci.yml` (new), `.github/workflows/ai-review.yml`, `CREDITS.md`, `public/vendor/pieeg.js` and its `README.md`, everything under `src/`, `README.md`, `docs/PLAN.md` (folder tree), `docs/STATUS.md`, this report.
- Contract or config-schema changes: P0 creates them (see §4 for differences from the plan).
- New dependencies: `phaser 4.2.1`; dev `vite 8.3.8`, `typescript 7.0.2`, `vitest 5.1.0`, `tsx 4.23.15`, `@types/node 26.6.6`. All exact pins.
- Edits outside my lane: none (integrator task; every lane's stub is part of P0 by plan).
- `INDEX.md` updated: yes, one per lane (`shared`, `signal`, `game`, `ui`, `audio`, `content`).

## 6. Follow-ups and questions for humans

- [ ] Srishan: review and merge this PR (it touches shared files, so it never auto-merges).
- [ ] Someone on Windows: after the merge, run `npm ci && npm run check && npm run dev` in Git Bash and say whether it works.
- [ ] Anyone: run the offline test once (H-13 is later, but a quick check now catches surprises).
- [ ] Team: the finalised feature list (H-01) unlocks P4. P1, P2 and P3 can start as soon as this merges.
- [ ] Note for the P1 agent: `SIGNAL_CONFIG.simKeys` uses `Digit1`–`Digit4`, not the starter's Space/A/C.

## 7. Can a teammate explain this?

This PR sets up the empty building with all its doors in place. Each folder under `src/` belongs to one person and
talks to the others only through small shared types in `src/shared/`. Right now a fake signal makes the lantern
breathe, so everyone can build their part against the real wiring before the real EEG code exists.
