# After-job report: wax height and falling controls

- Agent: codex
- Branch and PR: codex/wax-falling-controls; PR linked from the final chat response.
- Phase and plan: direct gameplay request in this chat; targeted extension of existing wax rewards and fixed-step movement.
- Started and finished: approximately 03:18 to 03:28 Eastern, 15 November 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| New wax only spawns at/above current collision feet, including equality and saved drops on resume | Pass | High |
| Invalid spawn searches preserve collected resources; candidates update as player moves | Pass | High |
| Slippery ledges support valid wax spawns and collection | Pass | High |
| Descent accelerates smoothly toward either direction, reverses momentum and coasts without input | Pass | High |
| Nearby lower platform reached instead of floor | Pass, compared against previous descent rule | High |
| Four-pixel edge recovery on both sides; ordinary landings have priority | Pass | High |
| No ascent catch, distant catch, catch below a passed top, or immediate walk-off recatch | Pass | High |
| Jump launch, charge, ascent/apex state, ground speed, gravity and free-fall vertical trajectory unchanged | Pass | High |
| Existing environment, moving support, snow/wind stages, saves, manual ember/checkpoints | Existing regression suites and five-stage reachability pass | High for automated behavior |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Types and all tests | `npm run check` with Node and Git Bash on PATH | Exit 0; 59 files, 391 tests pass |
| Production build | `npm run build` | Exit 0; existing non-module vendor script warning |
| Authored stage reachability | `node --import tsx tools/levels/check-levels.ts` | Exit 0; tutorial, normal, snow, windy and snow-windy all reachable |
| Patch whitespace | `git diff --check` | Exit 0 |

**Not verified:** Manual browser playtesting and subjective feel on physical keyboard. Snow is presentation over the same collision boxes; automated environment/stage tests cover its integration. No hardware/EEG changes or hardware testing.

## 3. Problems, workarounds and dead ends

- Initial checkout was an old P0 stub; fetched main and created a managed isolated worktree at 8939f0c.
- `npm` and `gh` existed under Program Files but were absent from PATH. Used their installed locations.
- Initial check passed all gameplay tests but failed the process test because `bash` was absent from PATH. Added installed Git Bash to PATH; the complete check then passed.
- Pre-code inspection: partly implemented. Existing descent steering was a fixed correction around launch velocity. No independent hanging/grab state existed; existing edge contacts were swept one-way landings. Kept that path and added a bounded fallback using the same landing event/recovery behavior, without changing animation code.

## 4. Deviations from the plan

- Wax is automatically spawned collectible rewards in this codebase, rather than a resource-consuming player placement tool. Applied the restriction to actual spawn selection and resumed active drops. Existing drops are not removed merely because the player subsequently climbs above them.
- Ice was explicitly excluded by the existing candidate builder; removed that exclusion to satisfy the requested slippery-ledge support while retaining platform capability checks.

## 5. Changes

- Files changed: game config, optional GameConfig contract, movement, wax rewards, game index; descent/movement/wax tests and new ledge-catching tests; this report.
- Contract/config schema: optional `falling` object with accelerationX (1600 px/s²), speedX (300 px/s), ledgeReachPx (4 px). Configs without it retain the legacy path. No state/save/event changes.
- New dependencies: None.
- Outside game lane: two optional contract lines in `src/shared/contracts/config.ts`, needed for typed descent tuning, and this report.
- INDEX.md updated: yes; movement description only, no new public exports.

## 6. Follow-ups and questions for humans

- Optional: playtest the subjective descent feel on the demo keyboard. No blocking questions.

## 7. Can a teammate explain this?

Wax chooses ledges using the character's feet height, so new rewards do not appear below the player. During descent, held direction smoothly changes horizontal momentum without changing gravity or any upward jumping behavior. A tiny edge margin helps near misses become ordinary landings, preserving the existing landing and recovery events.
