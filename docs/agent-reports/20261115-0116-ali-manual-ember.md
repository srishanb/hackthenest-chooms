# After-job report: reusable manual recovery ember

- Agent: Ali (Codex)
- Branch and PR: ali/manual-ember, https://github.com/srishanb/hackthenest-chooms/pull/45
- Phase and plan: explicit Ali gameplay revision to P4/P6; docs/FEATURES.md updated to record the requested behavior
- Started and finished: approximately 01:05–01:16 Eastern, November 15, 2026

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Exactly one ember, reusable for unlimited returns | Three consecutive recovery cycles retain the same marker in unit tests | High |
| E places or picks up the ember; pickup required before moving it | Safe ledge, nearby pickup, remote/airborne rejection tests pass | High |
| R requests recovery after landing below the marker | Game input wired; eligibility and cancellation tests pass | High |
| Remove automatic checkpoint saves and refills | Rest-area tests verify no checkpoint/refill events; scene uses only manual-anchor persistence | High |
| Manual marker persists; old auto-refuge saves are ignored | Versioned storage and old-save rejection tests pass | High |
| Valid-time recovery cannot advance on stale data | Target-time, invalid-time, paused-phase and frozen-stream tests pass | High |
| Explicit ordinary-input rescue and safe return | Bus event labels assistance; scene calls existing teleportPlayer and clears held input | High |
| Features/tutorial/HUD match reusable design | Updated descriptions and inspected live preview | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Focused tests | npx vitest run src/game/__tests__/save.test.ts src/game/__tests__/refuge.test.ts src/game/__tests__/recovery.test.ts | 21 tests pass |
| Full validation | npm run check | TypeScript and 236 tests in 36 files pass |
| Level geometry | npm run check:levels | Both test sections all reachable |
| Production/format | npm run build; git diff --check | Pass; pre-existing classic vendor-script warning remains |
| Browser preview | Port 5185 simulator/fixed, guide skip, keyboard movement/jumping and screenshots | Carried/place hint, a placed marker, unlimited pickup hint and assistance-used badge observed |

**Not verified:** a real EEG board or full calibrated browser activation, every possible browser/OS combination, or final P8 authored levels. Unit tests cover calibrated activation timing and repeated returns. The user was interacting with the live preview during inspection, so not every observed placement/rescue action was performed by the agent.

## 3. Problems, workarounds and dead ends

- Initial interpretation proposed a consumable ember. Ali clarified in this chat that it is unlimited-use and can be picked up. The implemented design is reusable; no consumption/refill path remains.
- Existing HUD test expected the old 'Recovery ember available' wording. Updated its expected text to 'Reusable recovery ember', then reran the full suite successfully.
- A first patch combined delete/add operations for one path and was rejected without applying changes. Reissued as supported updates.

## 4. Deviations from the plan

- Ali's explicit revision supersedes the auto-checkpoint and consumable-ember descriptions in older P4/P6 plans. Updated FEATURES.md as requested; did not approve any other phase plan or change its approval line.
- One manually placed point is persisted under lighten.manual-ember.v2; old auto-save data is left untouched but never read by gameplay.
- The tutorial storage version is bumped so existing players see the new placement/pickup instructions once.
- Used a separate managed worktree, stacked on PR #40 for current controls/tutorial. No history rewriting.

## 5. Changes

- Game: manual recovery controller, safe placement/pickup, reusable returns, no-auto-save rest areas, save schema, scene integration, marker rendering, tests and INDEX.
- UI: hints/tutorial, recovery progress and assistance/cancel controls, assistance-used source label, tutorial-version bump, INDEX and one existing wording test.
- Contract change: three small UI command events (ember_assist_requested, ember_cancel_request, run_restart), committed separately.
- docs/FEATURES.md: manual-only saved point, one reusable ember, unlimited recovery, pickup-before-relocation, no automatic checkpoints/refills, current control bindings. Committed separately.
- Dependencies: None.
- Edits outside game lane: minimal UI and event-contract edits required for the explicit user request; requested shared feature-register edit. No physics changes.
- INDEX files updated: Yes.

## 6. Follow-ups and questions for humans

- Reviewer: PR #45 is stacked on PR #40. Merge #40 first, then review this gameplay revision. Do not delete either branch.
- Ali: E places on a fully supported safe stationary ledge. E picks up only beside the marker. Land below it, then R opens recovery; R again cancels. Choose the labelled rescue to test without calibrated EEG. The marker remains placed after return.
- Integrator: older phase-plan details for automatic checkpoints/consumption are superseded by this requested feature revision and need reconciliation before further P5/P6 work.

## 7. Can a teammate explain this?

You carry one ember and decide where your recovery point goes. Place it on a safe ledge, recover to it as often as needed, and pick it up before moving it elsewhere. Walking through the level never creates checkpoints automatically, and the signal never changes movement physics.
