# After-job report: p1-pipeline (P1.4)

- Agent: claude (Sonnet 5.5 executing a plan written by Opus 5.5; code drafted earlier in the same session), agent A
- Branch and PR: `claude/p1-pipeline`, PR link in the PR itself
- Phase and plan: P1.4, `docs/plans/P1.md` (approved by Srishan)
- Started and finished: start time not recorded, finished about 21:45 Eastern

## 1. What I believe is complete

| Acceptance test (from the plan) | Result | Confidence |
|---|---|---|
| A new algorithm is one file plus one line | Pass. `passthrough-v0.ts` plus one registry line. Browser: `?algo=passthrough-v0` shows `algo passthrough-v0` on the overlay. Unit tests in `stages-p14.test.ts` cover the registry. | High |
| Hysteresis | Pass (unit test: resting oscillating 0.5 to 0.55 never flips `restingActive` once on). Browser: resting rose past 0.6 and `active=true`, and fell back to `active=false` only after dropping below 0.45. | High |
| Invalid data eases, never jumps | Pass (unit tests in `stages-p14.test.ts` and `pipeline.test.ts`: when frames stop, intensity moves toward neutral in smoother-sized steps). Not exercised in the browser. | High |
| Fixed mode | Pass. Unit test, and browser `?algo=passthrough-v0&mode=fixed`: intensity stayed 0.50 across 6 samples while resting rose 0.23 to 0.91 after Digit1. | High |
| The game is unchanged | Pass. `git diff --stat main -- src/game src/audio src/content` printed nothing. | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Typecheck and tests | `npm run check` | Exit 0. 14 test files, 92 tests passed. |
| Build | `npm run build` | Exit 0, vite built 57 modules. Warning: `<script src="./vendor/pieeg.js">` can't be bundled without type="module" (existing, not from this change). |
| Lane boundaries | `npx vitest run src/shared/__tests__/lane-boundaries.test.ts` | 1 test passed. |
| Game dirs unchanged | `git diff --stat main -- src/game src/audio src/content` | Empty. |
| PiEEG outside signal lane | `rg -n "PiEEG" src --glob '!src/signal/**'` | One hit: a comment at `src/config/signal.config.ts:25`. |
| Browser, `?algo=passthrough-v0` | Dev server on port 3024 (served this worktree), overlay opened | algo passthrough-v0, quality valid=true, sample age 0 to 7 ms, SIMULATED INPUT badge visible, calibrated true. |
| Browser, Digit1 | Key events dispatched with `window.dispatchEvent(new KeyboardEvent(...))` | Resting 0.25 before; 0.37 at 0.5 s, 0.64 at 1 s, 0.91 at 2.5 s. Second press: 0.91, then 0.69, 0.49, 0.37 (active=false at 2 s), 0.32. |
| Browser, `&mode=fixed` | Same, Digit1 once | mode fixed, intensity 0.50 throughout, resting 0.23 to 0.91. |
| Browser, `?algo=bogus` | Overlay | algo intensity-v1, valid=false, calibrated false; console warning `unknown algorithm "bogus", using "intensity-v1"`. |

**Not verified:** a real PiEEG board; a real head; runtime source switching through `control.connect()` in the browser (only unit tests); `intensity-v1` with a real calibration (no calibration was run in the browser or on real data); the Backquote and Digit1 keys pressed as physical keys (the browser tool's key press did not open the overlay, so I dispatched synthetic KeyboardEvents with the same `code`).

## 3. Problems, workarounds and dead ends

- The browser tool's Backquote key press did not toggle the overlay; synthetic `KeyboardEvent`s with `code: 'Backquote'` and `code: 'Digit1'` worked.
- Writing `.claude/launch.json` was blocked by the sandbox, but `preview_start` for the existing `p1-pipeline-dev` config worked; I confirmed the server served this worktree's code (it contained the new "already running" guard).
- `PIPESTATUS` in zsh gave an empty exit code on a piped run, so I reran `npm run check` unpiped to record exit 0.

## 4. Deviations from the plan

- (a) `createSignal` gains an optional third `SignalDeps` argument (`search`, `now`, `fetchText`) for tests. `main.ts` is unchanged and the frozen `SignalHandle` is untouched.
- (b) `AlgorithmEntry.needsCalibration` wraps the frozen `Algorithm` in the registry so `passthrough-v0` can be valid uncalibrated. `calibrated = !needsCalibration || (resting baseline && (fixed mode || active baseline))`.
- (c) Calibration is two equal timed phases per step, low window then high window, because the plan gave no phase protocol. The P6.1 screens must cue the player at the halfway point.
- (d) `defaultAlgo` changed from `'stub'` to `'intensity-v1'` in the signal-lane-owned `src/config/signal.config.ts` (a value change, not a type change).
- (e) `calibrate` has a re-entry guard: a second call while one is running rejects with "a calibration step is already running".
- (f) `?source=live` falls back to the simulator with a console error; `connect('LIVE_EEG')` throws until P3.

Known limitations:
- With `intensity-v1` the state is invalid until calibrated, so the lantern sits at neutral until the P1.6 dev Calibrate buttons or P6.1 screens exist. Use `?algo=passthrough-v0` to demo before then.
- The simulator clench (Digit2) is a one-shot, so the active high window may fail as `calibration.unstable` in the sim.
- Switching source at runtime jumps the clock base for one step.
- `setInterval` is never cleared because `SignalHandle` has no dispose (adding one is a contract change).
- New diagnostics keys longer than 12 characters print unaligned in the debug overlay (cosmetic, P1.6).
- `?replay=` works only on the dev server because `recordings/` is not under `public/`.

## 5. Changes

- Files changed: `src/signal/stages/{scorer,smoother,gates}.ts`, `src/signal/algorithms/{registry,intensity-v1,passthrough-v0}.ts`, `src/signal/url-params.ts`, `src/signal/pipeline.ts`, `src/signal/index.ts`, `src/config/signal.config.ts`, tests `src/signal/__tests__/{stages-p14,pipeline,signal-index}.test.ts`, `src/signal/INDEX.md`, this report.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: None.
- `INDEX.md` updated for new exports: yes

## 6. Follow-ups and questions for humans

- [ ] P1.6 (Antigravity): dev Calibrate buttons and overlay alignment.
- [ ] Integrator: optional `dispose()` on `SignalHandle`.
- [ ] Agent A: reset `lastFrame` / `lastStepMs` on runtime source switch.
- [ ] P3: tune calibration ratios on real heads.

## 7. Can a teammate explain this?

The signal code takes the brain-band numbers from the headset (or the simulator), turns them into a calm-to-focused intensity and a resting flag, and smooths them so the lantern never jumps. If the data stops or gets noisy it gently drifts back to neutral instead of snapping. Different scoring methods are one file each, picked with a URL option, and the game code did not change.
