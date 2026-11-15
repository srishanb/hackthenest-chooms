# After-job report: run file, build pipeline and per-feature run files

- Agent: claude (Fable 5.2 wrote the code, by Srishan's stated exception to the model rule; two Sonnet 5.5 subagents bug-checked it)
- Branch and PR: `claude/run-and-build`, PR 44
- Phase and plan: none. Srishan asked in chat: "create an overarching run file, the start of a build process, and a
  folder with a bunch of run files for each feature for testing. code this with fable ... use a sonnet subagent to bug
  check as you are coding."
- Started and finished: 00:37 to 01:15 Eastern, Sun 15 Nov 2026 (with a pause when a usage limit was reached)

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| `run.mjs`: one entry point (`doctor`, `dev`, `check`, `all`, `<feature>`, `build`, `preview`, `selftest`) | Done | High on macOS; Windows not run |
| `run/`: 22 feature run files (13 ready, 6 partial, 3 planned), `_lib.mjs` shared runner, `README.md` | Done | High for the automated part; Medium for hands-on steps (see §2) |
| `tools/pipeline/build.mjs`: preflight, typecheck, tests, levels, bundle, recordings, audit, stamp | Done | High |
| Tests: `node run.mjs selftest` and `tools/pipeline/run-tooling.test.ts` | Done, passing | High |
| npm scripts `start`, `doctor`, `build:full`; README section | Done | High |
| Bug check by a Sonnet subagent while coding | Done, two passes; findings fixed (§3) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Self-test | `node run.mjs selftest` | passed, 22 feature files |
| Every feature's automated checks | `node run.mjs all` | no failures (the eval tool needs to run outside the agent sandbox) |
| Full build | `node run.mjs build` | every step ok; `levels` skipped (checker not on `main` yet); 6.09 MB, 29 files |
| Server lifecycle | second instance reuses and keeps waiting; SIGINT while waiting; SIGHUP; SIGINT during startup; `preview` while `dev` runs | all behave; no Vite process left behind (port answered 000 after each) |
| Replay path | `curl <dev>/recordings/sim-fixture.jsonl` | 200, the file |
| Browser, hands-on | `?algo=passthrough-v0`: overlay, alpha key, badge, HUD; default algorithm: Calibrate resting and active, pause menu, settings | resting rose 0.24 to 0.94 with alpha; calibration printed `resting: ok` and `active: ok`, valid=true, intensity rose to 0.90 on clenches; "Climb paused", Settings and "Resume climb" work |

**Not verified:**
- Anything on Windows (Git Bash, PowerShell, cmd): `npm` through a shell, `taskkill`, opening Chrome or Edge with PowerShell.
- A browser actually opening (the agent sandbox blocks it); only `--no-open` was run.
- The light visibly shrinking: the browser pane was not drawing frames while hidden, so the lantern value did not update. Covered by the effects-engine tests only.
- Hands-on steps for movement, falling, saving at the refuge, the finish, replay timing, recording download and the checkpoint were checked against the code by the second bug-check pass, not played by hand.
- The live board, on any machine.

## 3. Problems, workarounds and dead ends

- The folder name `tools/build/` is ignored by `.gitignore` (`build/`), so the pipeline lives in `tools/pipeline/`.
- Bug check, pass 1 (fixed): waiting for Ctrl-C did not keep Node alive when a server was reused; the detached Vite
  server survived SIGINT, SIGTERM and SIGHUP outside the wait; `preview` silently reused a running dev server; one
  broken run file broke every command; the audit missed unquoted attributes and `srcset` and flagged plain links; a
  half-received "Local:" line gave a truncated URL; the `all` summary overstated.
- Bug check, pass 2 (fixed): a malformed default export still broke loading; `selftest` and `help` demanded
  `node_modules`; `data-src` counted as a load; inline styles and scripts were not scanned; no message when the server
  died by itself. Not fixed, by choice: signal exit codes are 130 for every signal; two checkouts on the same port
  cannot be told apart (a warning is printed); the audit is an audit, not a proof (said in its header).
- The browser check and pass 2 corrected run-file claims the code contradicts: six ledges, not seven; the replay
  fixture has poor contact at 25 to 27 s; the badge reads LIVE EEG before a board connects; the recorder also stores
  spectra and state; the charge cap is 0.9 s.
- Found, not mine to fix (told the bug hunter, which confirmed it): the simulated noisy pin does not lower signal
  quality. `docs/OCTOPUS_TEST.md` names `public/recordings/` in one place while replay reads `/recordings/`.
- One test (`real-sdk.test.ts`) uses real timers and ran slowly, and failed once, while the machine was busy.

## 4. Deviations from the plan

No plan file: direct instruction from the repo owner. Run files exist for features that are not built yet (ember,
narrator); they are marked PLANNED and act as checklists.

## 5. Changes

- Files: `run.mjs`, `run/_lib.mjs`, `run/README.md`, 22 `run/<feature>.mjs`, `tools/pipeline/build.mjs`,
  `tools/pipeline/run-tooling.test.ts`, `package.json` (three scripts), `README.md` (one section), this report.
- Contract or config-schema changes: none. New dependencies: none.
- Edits outside my lane: none (integrator files). `INDEX.md`: not applicable; `run/README.md` is the index.

## 6. Follow-ups and questions for humans

- [ ] Someone on Windows: run `node run.mjs doctor`, `node run.mjs game-movement` and Ctrl-C, and say what happens.
- [ ] Each lane: add or update the run file when you build a feature (`run/README.md` says how).
- [ ] Signal lane: decide what "quality" should do about one bad pin (the noisy-pin gap).

## 7. Can a teammate explain this?

`node run.mjs` is the menu for everything: check your setup, start the game, run the tests, build it. Every feature
has a small file under `run/` that runs that feature's tests and then tells you exactly what to press and what you
should see. The build script also proves the game needs no internet, because the demo hall Wi-Fi cannot be trusted.
