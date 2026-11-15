# After-job report: stronger A/D response during short falls

- Agent: codex
- Branch and PR: codex/wax-falling-controls, https://github.com/srishanb/hackthenest-chooms/pull/75
- Phase and plan: direct user follow-up that A/D still barely moves the falling character.
- Started and finished: approximately 03:30 to 03:38 Eastern, 15 November 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Real KeyA and KeyD bindings reach a nearby ledge during a fast fall with about 140 ms remaining | Pass, both directions; previous 1600/300 tuning fails this scenario | High |
| Reverse opposing launch momentum within 100 ms, attain opposite target speed within 200 ms | Pass, both directions | High |
| Keep launch, ascent, apex, ground movement, gravity and vertical trajectory unchanged | Existing regression tests pass; production change only updates falling parameters | High |
| Preserve bounded edge recovery, wax restrictions, collisions, wind/ice and checkpoints | All existing tests and five-stage reachability pass | High for automated behavior |
| Make the updated branch available in a running preview | Preview at http://127.0.0.1:5190/; verified served config contains 4200/420 tuning | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Full validation | `npm run check` with Node and Git Bash on PATH | Exit 0, 59 files / 395 tests |
| Production build | `npm run build` | Exit 0, existing vendor script warning |
| Authored levels | `node --import tsx tools/levels/check-levels.ts` | All five stages reachable, exit 0 |
| Correct running preview | Vite launched from this worktree; inspected served `/src/config/game.config.ts` | Correct descent acceleration 4200 px/s² and target speed 420 px/s |
| Whitespace | `git diff --check` | Exit 0 |

**Not verified:** Subjective keyboard feel by the user. Opened the browser preview and exercised keyboard input, but timing/snapshots did not provide a reliable isolated measurement of descent; deterministic input-to-physics tests provide the quantitative verification.

## 3. Problems, workarounds and dead ends

- PR #75 was still open; none of the six existing Vite servers was serving this worktree. Existing previews therefore lacked even the earlier descent-control implementation. Opened a dedicated preview on 5190 without changing other worktrees or servers.
- The first tuning took about 0.43 seconds to reverse from 366 to -300 px/s. A 100-pixel drop can leave much less time. Increased descent acceleration and speed, then verified late input on actual keyboard bindings rather than only testing a long fall.

## 4. Deviations from the plan

- None. Limited production changes to the existing falling-only configuration.

## 5. Changes

- Files: `src/config/game.config.ts`, `src/game/__tests__/descent-control.test.ts`, this report.
- Descent acceleration: 1600 to 4200 px/s²; target speed: 300 to 420 px/s. Four-pixel catch reach unchanged.
- Contract/schema changes, dependencies and edits outside game lane: None, except this report.
- INDEX.md: no new exports, not applicable.

## 6. Follow-ups and questions for humans

- Optional user feel check on the correct preview at http://127.0.0.1:5190/.

## 7. Can a teammate explain this?

The falling controls needed to react within the short time before passing a nearby ledge. A/D now changes horizontal momentum much faster during descent, with a higher horizontal target speed. Jumping upward and vertical falling speed use the same unchanged code and values.
