# After-job report: Q-07 replayed ComposureState.t is on the wrong clock

- Agent: sonnet
- Branch and PR: sonnet/q-07-replay-state-clock, https://github.com/srishanb/hackthenest-chooms/pull/54
- Phase and plan: Q-07 (standing bug-fix task in docs/QUEUE.md)
- Started and finished: 06:00 to 06:15 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| A test fails before the fix and passes after | Pass | High |
| `npm run check` and `npm run build` pass | Pass (248 tests) | High |

What was wrong: `ComposureState.t` is documented as "ms on the performance.now() clock", but during `?source=replay` it carried the replay clock (the recording's frame times). The recovery ember (`src/game/ember/recovery.ts` `advance`) computes the signal age as `nowMs - signal.t + sampleAgeMs` with `nowMs = performance.now()`. When the recording's timestamps are earlier than the page's current time (a recording made soon after page load, replayed on a page open for a while), that age is huge, the signal always counts as stale, and EEG recovery never completes in replay mode (only assist works). Fix: `createSignal` now publishes `t = now()` for replay states. The recorder still records the replay-clock state, so recordings and `tools/eval` are unchanged.

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Failing test first | new test in `signal-index.test.ts`: recording frames at t=20 000, `now()` at 600 000, replay running | before: `t` 20 s away from now (expected 580083 <= 150 failed); after: passes |
| Full | `npm run check`; `npm run build` | 248 tests pass; build ok |

**Not verified:** the ember recovering in a browser on a replay (needs a recording file and calibration); the game only reads `state.t` in `ember/recovery.ts`.

## 3. Problems, workarounds and dead ends

- Sandbox blocks git push and `gh`; ran them with the sandbox disabled.

## 4. Deviations from the plan

- None.

## 5. Changes

- Files changed: `src/signal/index.ts` (`published` state), `src/signal/__tests__/signal-index.test.ts`.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: None.
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

- [ ] None.

## 7. Can a teammate explain this?

The state's timestamp is meant to be the page clock. While replaying a recording the signal code used the recording's clock instead, so other code comparing it to the page clock thought the signal was ancient. Now the published timestamp is always the page clock.
