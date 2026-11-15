# After-job report: signal-hardening

- Agent: claude (Fable 5.2 orchestrating and verifying; fixes written by an Opus 5.5 subagent, audit by another)
- Branch and PR: claude/signal-hardening, https://github.com/srishanb/hackthenest-chooms/pull/123
- Phase and plan: none. Follow-up to the stress test Srishan asked for ("stress and smoke test all backend ..."). Short
  plan is in the PR body.
- Started and finished: 10:15 to 11:00 Eastern

## 1. What I believe is complete

Ten defects found by a stress audit of `src/signal/`, `src/shared/` and the ember save. One commit each.

| Acceptance test | Result | Confidence |
|---|---|---|
| D1. `?algo=toString` or `constructor` falls back to the default algorithm instead of crashing boot | Pass | High |
| D2. A recording frame with no `spectrum`, a malformed one, or a non-finite `t` no longer throws in the pipeline | Pass | High |
| D3. Composure stays finite after `step(NaN)` or two `step(Infinity)` | Pass | High |
| D4. A throwing store subscriber does not stop later subscribers or throw into `set` | Pass | High |
| D5. The same for signal reader subscribers and preset subscribers | Pass | High |
| D6. A bus listener added during an emit does not receive that event | Pass | High |
| D8. A slow preset load that was superseded by a later choice does not take over | Pass | Medium: one residual race, see section 3 |
| D9. A failed preset switch leaves the playing preset looping | Pass | High |
| D10. A failed simulator connect removes its key listener and adapter | Pass | High |
| D11. A saved ember cooldown can never exceed the configured cooldown | Pass | High |
| `npm run check` and `npm run build` pass | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Each new test fails before its fix | Done by the subagent | Reported red-then-green for all but three tests, listed in section 3. I did not repeat this. |
| Full check | `npm run check` | 81 files, 528 tests passed (run by me on the final commit) |
| Build | `npm run build` | built in 429 ms (run by me) |
| Diff review | `git diff dc0875c HEAD` for the non-test files | Read by me: `bus.ts`, `store.ts`, `registry.ts`, `pipeline.ts`, `smoother.ts`, `controller.ts`, `recovery.ts` |
| Shipped presets unaffected by D2 | Subagent checked all five files in `public/recordings/presets/` | Every frame has a `spectrum` key |

**Not verified:** nothing here was run in a browser, and no real PiEEG board or SDK was used; every source in the
tests is a fake. I did not read the diffs of `recording-format.ts`, `preprocess.ts`, `sim-source.ts` or
`signal/index.ts` line by line; they are covered by the passing tests only. Whether NaN composure ever reached the
lantern, fog or audio before this fix was not measured.

## 3. Problems, workarounds and dead ends

- `git commit` fails inside the Bash sandbox for worktrees. The subagent copied its changed files to ten cumulative
  snapshot folders and I committed them outside the sandbox, one defect per commit. Snapshot order put D6 before D5.
- Three tests were not seen failing first: the "cancelled live switch" half of the D9 test (a guard that already
  passed), the second D1 test (added because `createSignal` itself crashed), and the D3 smoother unit test (written
  after the fix).
- Residual race, not fixed: preset A is playing, the user selects the simulator and then preset B before the
  simulator has finished connecting, and B fails. The simulator runs, but the selection still shows A and A's
  baselines stay applied. The window is only as long as the simulator's connect.

## 4. Deviations from the plan

- No plan file; see the note above.
- The audit's D7 (a re-entrant `set` inside a store listener sends duplicate notifications) is not fixed: it is
  cosmetic and changing it alters store semantics.
- `smooth` with an infinite `dtMs` used to jump to the target; it now does not move.
- The D11 cap is applied on load and not written back, so a corrupt save costs at most one cooldown per reload.

## 5. Changes

- Files changed: `src/shared/bus.ts`, `src/shared/store.ts`, `src/signal/index.ts`, `src/signal/pipeline.ts`,
  `src/signal/algorithms/registry.ts`, `src/signal/presets/controller.ts`, `src/signal/sources/recording-format.ts`,
  `src/signal/sources/sim-source.ts`, `src/signal/stages/preprocess.ts`, `src/signal/stages/smoother.ts`,
  `src/game/ember/recovery.ts`, and their tests (one new file, `src/signal/__tests__/preset-controller.test.ts`).
- Contract or config-schema changes requested: None. No type or event changed.
- New dependencies requested: None.
- Edits outside my lane: `src/game/ember/recovery.ts` (Ali's game lane), two lines, in its own commit.
  `src/shared/bus.ts` and `src/shared/store.ts` are shared files; each change is a few lines in its own commit.
- `INDEX.md` updated for new exports: not applicable (no new exports).

## 6. Follow-ups and questions for humans

- [ ] Srishan: the recorder keeps every frame with its spectrum, about 80 MB per hour, with no cap. A tab left open
      at a booth all day will grow by hundreds of MB. Add a ring buffer (keep the newest few minutes)?
- [ ] Srishan: `?preset=<unknown id>` starts no source and does not fall back to the simulator; the selection keeps
      reporting the unknown preset. Fall back?
- [ ] Srishan: four saved 60 s presets are about 4.7 MB in localStorage, near the usual 5 MB quota. The error is
      readable, not a crash. Cap the count?
- [ ] Srishan: close the residual preset race in section 3?
- [ ] Ali: the two-line cooldown cap in `recovery.ts` is in your lane; say if you want it done differently.

## 7. Can a teammate explain this?

We fed the signal code bad input on purpose: broken recordings, impossible timestamps, odd URLs and listeners that
crash. Ten things broke, and each now has a test and a small guard. The signal value the game reads stays a normal
number between 0 and 1 whatever comes in, and one broken listener can no longer stop the others.
