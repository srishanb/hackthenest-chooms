# After-job report: first-launch controls tutorial

- Agent: Ali (Codex)
- Branch and PR: ali/p4-2-sections, https://github.com/srishanb/hackthenest-chooms/pull/40
- Phase and plan: P4 controls feedback; Ali explicitly requested a quick first-launch tutorial and refreshed preview in this chat
- Started and finished: approximately 00:58 to 01:03 Eastern, November 15, 2026

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| First launch shows a short guide | Verified in browser on fresh localhost origin | High |
| Explains A/D, arrows, Space/Up and hold/release aiming | All three pages inspected in browser | High |
| Tutorial pauses gameplay and permits keyboard navigation | Pause visible behind native modal; modal traps focus and isolates keyboard events | High |
| Completion is remembered across refresh | Completed, reloaded, guide stayed dismissed | High |
| Guide can be reopened | Controls button reopened step one | High |
| Blocked storage does not prevent playing | Persistence unit tests pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Full checks | npm run check | TypeScript and 235 tests in 35 files pass |
| Level reachability | npm run check:levels | Both sections all reachable |
| Production bundle | npm run build | Exit 0; existing classic vendor-script warning remains |
| Browser | localhost:5184 simulator/fixed preview; Next, Next, Start climbing, reload, Controls | Initial guide, correct pages, completion persistence and replay verified |
| Visual check | Screenshots at movement and jump steps | Text fits; changed dialog to an opaque shared background token to prevent underlying pause text bleeding through |

**Not verified:** every assistive technology, every viewport, or blocked-storage browser mode end to end. Storage failure paths have unit coverage. The preview was left open at step one for Ali.

## 3. Problems, workarounds and dead ends

- Previous browser-tab handles had expired. Opened a fresh preview and used a separate localhost origin to verify first-launch behavior without clearing existing checkpoint data.
- The game installs its pause listener during scene creation. The guide waits for the first section snapshot, then emits pause in a microtask after synchronous creation completes.

## 4. Deviations from the plan

- This is the explicit tutorial request on the existing controls-feedback PR, not a newly approved phase. No other plan approval was recorded.
- Reused the registered main-menu stub instead of adding a new shared component ID/config schema.
- Completion and Skip both remember the guide; Controls remains available to replay it. If storage is blocked, the next session may show it again.

## 5. Changes

- Files changed: ui/components/main-menu/main-menu.ts and CSS, tutorial-storage.ts and its tests, ui/strings.ts and ui/INDEX.md, this report.
- Contract/config-schema changes: None.
- New dependencies requested: None.
- Edits outside my lane: Minimal UI changes explicitly requested by Ali for the controls tutorial. No shared contracts, UI registry, UI config or other components changed.
- INDEX.md updated: Yes, UI exports and tutorial behavior documented.

## 6. Follow-ups and questions for humans

- Ali: use Next through the guide, then Start climbing to test controls; Controls reopens it anytime.
- Reviewer: UI edits implement the user's explicit follow-up request. Check tutorial mounting, teardown and pause ownership alongside the earlier keyboard changes.

## 7. Can a teammate explain this?

New players see three short pages teaching movement, charge jumping and saving at refuges. The guide pauses the climb while open and remembers when it was finished or skipped. Its Controls button lets anyone review it later without clearing their checkpoint.
