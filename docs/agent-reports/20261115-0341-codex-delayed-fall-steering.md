# After-job report: delay stronger descent steering

- Agent: codex
- Branch and PR: codex/wax-falling-controls, https://github.com/srishanb/hackthenest-chooms/pull/75
- Phase and plan: direct user request to delay faster falling movement so short jumps cannot exploit it.
- Started and finished: approximately 03:38 to 03:42 Eastern, 15 November 2026.

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Wait 200 ms of descent before stronger horizontal steering | Pass, below-threshold state equals the original steering path and threshold state activates acceleration | High |
| Short vertical and diagonal uncharged hops cannot exploit stronger control | Pass, complete position/velocity/state trace equals the original path through landing | High |
| Established falls retain responsive A/D and nearby-platform landings | Pass, existing late-fall and reversal tests | High |
| Landing, teleport and ascent reset eligibility naturally | Pass, downward-velocity threshold resets with vertical motion | High |
| Jump ascent, ground speed, vertical trajectory, wax, catch margin and environmental/checkpoint behavior remain intact | Full regression suite passes; no edits to those mechanics | High for automated behavior |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Types and complete tests | `npm run check` with Node and Git Bash on PATH | Exit 0; 59 files, 399 tests pass |
| Production build | `npm run build` | Exit 0; existing vendor script warning |
| Five authored stages | `node --import tsx tools/levels/check-levels.ts` | All reachable, exit 0 |
| Patch | `git diff --check` | Exit 0 |

**Not verified:** Subjective user feel of the new delay; no additional browser keyboard playtest. Existing branch preview remains on port 5190 and Vite reloads source changes.

## 3. Problems, workarounds and dead ends

- None. Existing enhanced steering activated immediately when vy became positive. Added a threshold to that branch only.
- Constant gravity makes downward speed / gravity equal elapsed descent time since the apex. Used that relation to avoid adding timer state, persistence fields or reset paths.

## 4. Deviations from the plan

- No separate timer is needed; the equivalent downward-speed threshold automatically clears eligibility on landing, upward launch and teleport.

## 5. Changes

- Files: `src/config/game.config.ts`, `src/shared/contracts/config.ts`, `src/game/player/movement.ts`, `src/game/__tests__/descent-control.test.ts`, this report.
- Contract: `falling.activationDelayMs`, set to 200. Existing stronger acceleration/speed and four-pixel ledge reach unchanged.
- Shared contract change kept in its own commit. No dependencies or other lane edits except the report.
- INDEX.md: not applicable; no new exports.

## 6. Follow-ups and questions for humans

- Optional: feel-check the 200 ms threshold in the existing port 5190 preview.

## 7. Can a teammate explain this?

Fast horizontal steering now waits until the player has descended for about a fifth of a second. Small jumps finish before that point, so their movement stays the same. Longer falls still let the player steer toward a lower platform without changing gravity or jump ascent.
