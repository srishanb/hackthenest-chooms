# After-job report: collectible wax rewards

- Agent: codex acting for Ali
- Branch and PR: ali/wax-rewards, https://github.com/srishanb/hackthenest-chooms/pull/50
- Phase and plan: P4 extension; Ali's direct request for collectible wax and subsequent sparse-placement request. Plan and acceptance checks recorded in draft PR #50.
- Started and finished: approximately 01:20 to 01:52 Eastern, 15 Nov 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Optional pickups give ten seconds of capped wider light, feedback and a collection goal | Pass | High |
| Randomly choose 1–3 drops per run, with only one active/visible collectible | Pass | High |
| Persist selection and pickups across reloads without restoring the temporary bonus | Pass | High |
| Freeze reward timers during pause/recovery; hold light changes until landing | Pass | High |
| Reward never changes movement or depends on EEG | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Types and automated tests | `npm run check` | 41 test files, 272 tests passed, exit 0 |
| Course | `npm run check:levels` | All five tutorial sections reachable, exit 0 |
| Production bundle | `npm run build` | Pass; existing classic vendor-script warning remains |
| Preview | Opened localhost:5186 in the in-app browser | HUD showed Wax 0/1 and tutorial lesson; earlier common-wax preview showed collection and boost feedback |
| Reward cases | `wax.test.ts` | 12 tests cover amount cap, one active, persistence, timer/light behavior, reset and blocked storage |

**Not verified:** No complete manual collectible sweep, real EEG hardware, other browsers or user study. No claim about a measured dopamine response. Storage persistence cannot survive browser storage being blocked or cleared; the in-memory game still runs.

## 3. Problems, workarounds and dead ends

- Initial implementation placed wax on every eligible ledge. Ali requested scarcity, so it now selects a small random subset and activates it in climb order.
- Restoring only collected IDs would allow rerolling on reload. Save the selection before the first pickup as well.
- Desktop shell retained its old PATH; ran npm via the configured Git Bash login environment.

## 4. Deviations from the plan

- Scope expanded at Ali's instruction to rare random placement and the tutorial hazards reported separately. Bonus remains visual, preserving consistent controls and physics.

## 5. Changes

- Files: wax controller/view/config/tests, scene integration, shared optional wax snapshot and pickup event, HUD/strings, game/UI indexes and FEATURES COL-1; see PR diff.
- Contract changes: optional `GameSnapshot.wax` and typed `wax_collected` event. All callers pass type checks.
- Dependencies requested: None.
- Outside game lane: minimal shared event/snapshot fields, UI feedback/text and feature register required for the requested mechanic; shared changes committed separately.
- INDEX.md updated: Yes.

## 6. Follow-ups and questions for humans

- Ali: playtest whether 1–3 optional pickups and the ten-second boost feel rewarding. No input blocks this implementation.

## 7. Can a teammate explain this?

Gold wax is an optional treasure that briefly widens your lantern. Each run picks only a few locations and shows one treasure at a time. It never changes your jump or uses the EEG signal to decide rewards.
