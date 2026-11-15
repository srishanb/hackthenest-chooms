# After-job report: balance longer-fall strafing

- Agent: codex
- Branch and PR: codex/wax-falling-controls, https://github.com/srishanb/hackthenest-chooms/pull/75
- Phase and plan: direct user request for a longer activation delay and slower, less abrupt falling strafing.
- Started and finished: approximately 03:42 to 03:47 Eastern, 15 November 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Longer descent required for enhanced horizontal control | Delay increased from 200 to 350 ms; threshold checks pass | High |
| Slower and gentler strafing with predictable speed buildup | Speed 420 to 280 px/s, acceleration 4200 to 1800 px/s²; constant-increment regression passes | High |
| No extra control during short vertical/diagonal jumps | Complete original trajectory preserved for 0, 100 and 200 ms charge | High |
| Recovery possible with enough time but difficult for very late input | Both A/D recover nearby ledge with about 285 ms to steer, miss with about 140 ms | High |
| Existing launch/ascent, gravity, ground motion, wax and four-pixel ledge reach preserved | No production changes beyond falling config; regression coverage retained | High |

## 2. How I verified it

- `npm run check`: exit 0; 59 files / 404 tests pass. Targeted descent suite also rerun after tightening the missed-landing assertion.
- `npm run build`: exit 0, existing vendor-script warning.
- `node --import tsx tools/levels/check-levels.ts`: exit 0; all five stages reachable.
- `git diff --check`: exit 0.
- Inspected served config from port 5190: confirmed 1800 / 280 / 350 values.

**Not verified:** Subjective keyboard feel with the user. Quantitative tuning is covered by the deterministic simulation; no browser automation this turn.

## 3. Problems, workarounds and dead ends

- An old recovery test assumed a shorter drop would allow the previous high acceleration; updated it to a longer drop consistent with the requested delay. Explicitly retained separate successful and unsuccessful late-input scenarios.
- Expanded parameterized short-hop test initially inferred literal charge values as its mutable state type; annotated it with PlayerState.
- One full run passed all game tests but hit an existing real-SDK timing failure (15 frames observed against a >15 assertion). Reran the full check without changing signal code.

## 4. Deviations from the plan

- None. The existing acceleration was already linear, so reduced its magnitude instead of adding a new easing algorithm.

## 5. Changes

- Files: `src/config/game.config.ts`, `src/game/__tests__/descent-control.test.ts`, this report.
- Contract/schema changes: None. Updated existing tuning values only.
- New dependencies and edits outside game lane: None, except this report.
- INDEX.md: not applicable; no new exports.

## 6. Follow-ups and questions for humans

- Optional feel check in the existing http://127.0.0.1:5190/ preview.

## 7. Can a teammate explain this?

The player must fall longer before stronger steering unlocks. Once it does, the character builds sideways speed more gently and has a lower target speed. That preserves useful recovery on longer falls while requiring earlier commitment to a nearby ledge.
