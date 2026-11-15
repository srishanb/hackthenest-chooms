# After-job report: P6.1.1 calibration flow and wording

- Agent: amrit (Codex)
- Branch and PR: amrit/p6-1-1-calibration-flow, https://github.com/srishanb/hackthenest-chooms/pull/30
- Phase and plan: P6.1.1, docs/plans/P6.1.md (PROPOSED). Amrit explicitly overrode approval pauses in chat; no approval line was written or edited.
- Started and finished: 23:26–23:30 Eastern, Nov 14, 2026

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Active/resting happy path | Pass: commands start each step; successful resting result finishes | High |
| Exact halfway cue | Pass: 5999 vs 6000 ms after active start; different resting duration also tested | High |
| Active failure to steady light | Pass: ordered setMode(fixed), calibrate(resting) commands | High |
| Resting failure remains honest | Pass: continueWithout finishes with restingCalibrated=false and requests fixed mode | High |
| Unknown reason and framing | Pass: unknown/missing/prototype keys use reviewed fallback; calibration strings pass wording rule | High |
| Retry priority and duplicate protection | Pass: two failures prefer fallback, retry restarts only failed step, controls ignored while running | High |

## 2. How I verified it

| Check | Command / steps | Actual result |
|---|---|---|
| Pre-code check | Remote branches, all PR search for P6.1, main UI INDEX and calibration stub | No implementation or competing claim found |
| Baseline | npm ci && npm run check | Exit 0; 121 tests, 20 files |
| Final check/build | npm run check && npm run build | Exit 0; typecheck and 130 tests in 21 files pass; Vite build passes with existing classic vendor-script warning |
| Diff hygiene | git diff --check | Pass |

**Not verified:** UI rendering, countdown/tone timing in a real browser, signal calibration success, Bluetooth connection, keyboard-only flow, a stranger finishing unaided, or production integration. P6.1.2 still owns the screens; P6.1.3 owns openers. This reducer only returns commands and never invokes a device.

## 3. Problems, workarounds and dead ends

- Strict indexed access required an explicit unknown-key fallback after the dictionary lookup; corrected before final checks.
- The steady-light path needs two actions, not one: switch mode before starting resting calibration. Commands are an ordered array so the screen can execute both without an accidental concurrent calibration.
- Results for the wrong step or after close are ignored. The future screen must also discard any stale promise callback from a prior mounted flow; the existing CalibrationResult has no run identifier.

## 4. Deviations from the plan

- Chat approval override recorded above; proposed plan status left untouched.
- Added an explicit closed screen, matching Escape/close behavior between steps. While a step is running, close/retry/start are ignored, as the screen plan requires.
- Timers advance instructions only; they never fabricate a successful result. The actual signal promise controls completion.
- continueWithout also requests fixed mode to match its promise that lighting stays steady.

## 5. Changes

- Files: src/ui/components/calibration/calibration-flow.ts, src/ui/__tests__/calibration-flow.test.ts, src/ui/strings.ts, src/ui/INDEX.md, this report.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: None. Diagnostic strings preserved.
- INDEX.md updated for new exports: Yes.

## 6. Follow-ups and questions for humans

- [ ] P6.1.2: render the flow, execute returned commands in order, derive durations from SIGNAL_CONFIG, and protect against callbacks after unmount.
- [ ] P6.1.3: expose UI-local openers only while gameplay is already stopped; do not write the game-owned snapshot.
- [ ] H-12: verify understandable wording and under-one-minute completion with a stranger.

## 7. Can a teammate explain this?

The flow shows two instructions for each calibration step and switches them halfway through the configured time. It waits for the real calibration result and offers retry or an honest fallback when the signal is not usable. The next task will put screens around this tested state machine.
