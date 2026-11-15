# After-job report: progressive climb difficulty

- Agent: codex
- Branch: `codex/progressive-climb`
- Phase: user-requested content tuning; D-22 permits implementation without a new phase gate.
- Date: 15 November 2026, Eastern; before the 10:00 AM feature freeze.

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Later stages progressively narrow platforms and increase mean horizontal/vertical gaps | Pass, progression tests | High |
| Varied left/right routes and per-jump heights replace repetitive equal-rise staircases | Pass, authored data and variation tests | High |
| Every ledge remains reachable using the unchanged game physics | Pass, exact movement reachability search | High within sampled launch positions/charges/cycle phases |
| Tutorial remains forgiving; stage entry and completion geometry remain valid | Pass, tutorial unchanged and boundary tests pass | High |
| Full typecheck, tests and build | Pass | High |

Mean platform widths: Normal 207 px, Windy 154.8 px, Snow 119.2 px, Snowy/Windy 90.4 px. Smallest upper-stage ledge is 74 px. Mean within-stage rises increase from about 118 to 132, 142 and 152 px. Final ledges are slightly wider than preceding precision ledges for a brief respite.

## 2. How I verified it

- `npm run check:levels`: tutorial, normal, windy, snow and snow-windy all reachable, including cross-stage access.
- `npm run typecheck`: passed.
- `npm test -- --maxWorkers=2 --testTimeout=20000`: 501 tests across 78 files passed.
- `npm run build`: passed. Existing Vite native-loader/extensionless-import and vendored PiEEG script warnings remain.
- Browser at port 5194 with `editorTest=4`: final-stage spawn, narrow ledges, larger separations and snow/wind rendered correctly. Normal gameplay uses the same `SECTIONS` data; published layout override is currently null.
- Tests protect decreasing average widths, increasing clear horizontal/vertical gaps, route variation and the existing mandatory final-ledge stage boundaries.

**Not verified:** a human full-climb completion, subjective difficulty/fun, every wind phase, or physiological input. The reachability search proves sampled successful trajectories, not that every launch or wind phase succeeds. Physics, controls and signal behavior were not changed.

## 3. Problems, workarounds and dead ends

- The first final-stage layout had only three distinct horizontal jump distances. Shifted one ledge by 10 px to increase variety; reran reachability and the full checks successfully.
- Directional jumps rise less than straight-up jumps, so upper rises stay below the directional limit instead of increasing beyond the player's capability.

## 4. Deviations from the plan

- No new gameplay systems or physics changes. Difficulty comes only from authored geometry, with existing wind/ice adding pressure.
- Kept the tutorial unchanged and made later stages harder, rather than making the introduction less accessible.

## 5. Changes

- `src/content/sections/stage-layouts.ts`: narrower, varied ledges; explicit rises per jump; updated stage altitudes and wind-zone derivation; validates rise count and positive finite values.
- `src/content/__tests__/difficulty.test.ts`: progression and variation regression tests.
- `src/content/INDEX.md`: updated geometry description.
- No shared contract, config-schema, dependency, secret, asset, movement or signal changes. Content-local StageLayout now has risesPx instead of a constant risePx.

## 6. Follow-ups and questions for humans

- Playtest the final climb and assess difficulty on the demo display. Stage editor can still deliberately override the shared default layout through its publication workflow.
- Review/merge before the feature freeze, then update/reload the demo checkout.

## 7. Can a teammate explain this?

The first stage still teaches the controls on wide platforms. Higher stages have narrower landing targets, longer clear gaps and varied jump heights and directions. We tested all 50 ledges with the game's actual movement simulator so the harder climb remains possible without changing how the candle moves.
