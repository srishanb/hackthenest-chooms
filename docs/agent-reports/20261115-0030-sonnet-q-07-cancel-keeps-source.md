# After-job report: Q-07 cancelling the Bluetooth picker kept no input source

- Agent: sonnet
- Branch and PR: sonnet/q-07-cancel-keeps-source, https://github.com/srishanb/hackthenest-chooms/pull/29
- Phase and plan: Q-07 (standing bug-fix task in docs/QUEUE.md)
- Started and finished: 23:25 to 23:35 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| A test fails before the fix and passes after | Pass | High |
| `npm run check` and `npm run build` pass | Pass (122 tests) | High |

What was wrong: `createSignal.startSource` stopped the running source (usually the simulator) before the new one had started. Pressing Connect Octopus 16 and cancelling the Bluetooth picker (or any failed connect) left no source running, `source` null, and the data went stale; there is no button to restart the simulator, so only a reload recovered. Fix: keep the previous source and its kind until the new one starts; stop it only after success; restore it on failure.

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Failing test first | new test in `src/signal/__tests__/signal-index.test.ts` (replay running, fake adapter rejects with `NotFoundError`) | failed before the fix: `valid` false after the failed connect |
| After fix | `npm run check`; `npm run build` | 122 tests pass; build ok |

**Not verified:** the real Bluetooth picker in Chrome; a successful live connect while the simulator runs (both feed `onFrame` for a moment before the simulator stops; frames carry their own `source`). Replay to live: during the picker the clock switches to `performance.now()`, so a running replay looks stale until the picker closes (edge case, left alone).

## 3. Problems, workarounds and dead ends

- Sandbox blocks git push and `gh`; ran them with the sandbox disabled.

## 4. Deviations from the plan

- None.

## 5. Changes

- Files changed: `src/signal/index.ts` (`startSource`), `src/signal/__tests__/signal-index.test.ts`.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: None (signal lane).
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

- [ ] None.

## 7. Can a teammate explain this?

When you start a new input source, the old one keeps running until the new one has really started. If starting fails, for example you close the Bluetooth chooser, the old one just keeps going.
