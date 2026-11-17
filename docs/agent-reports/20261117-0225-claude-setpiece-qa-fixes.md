# After-job report: setpiece-qa-fixes

- Agent: claude (bug-fixer)
- Branch and PR: claude/setpiece-qa-fixes (cut from game-only at 823bb20), no PR; the lead merges
- Phase and plan: none (fix of QA findings in `_agents_workspace/03_game-qa_findings.md`)
- Started and finished: 02:00 to 02:35 Eastern (approx.)

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| 1 Route bot loops with a grown candle | Pass: bot replays its hold under current growth, tries neighbours, remembers failed holds; sweep result in section 2 | High for the sweep, Medium for the browser (not run) |
| 2 Night outlines miss level/lower route targets | Pass: reach 60 px lower in the endless scene only; 28 of 439 missed before, 9 after (all updrafts) | High |
| 3 Fall test weaker | Pass: ground check needs a fall from chunk 2+, drop test must see more than 3 chunks (measured 3.9) | Medium: the generator itself now catches long falls (see 6) |
| 4a..d notes | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Stall reproduces on head | `chunk-map.ts --seed 1 --bot 400 --start 6` | 4 STALLs (e6:p12 traverse, then null). Seed 29 start 25 no longer stalls on head (generator changed with D-36) |
| Bot test fails before fix | `endless-route-bot.test.ts` with route-bot.ts stashed | seed 1 start 6: longest wait 174 s, fails; passes after |
| Bot sweep before (partial) | 240 of 480 runs | 17 stalled runs (all with growth), 0 errors |
| Bot sweep after | seeds 1..60, start 0/6/12/25, growth and no-growth, 400 s (restartable script, results in /tmp/claude-0/sweep/after2) | 480 runs, 0 stalled, 0 errors (before: 17 of the first 240 stalled, all but a few with growth; old bot also stalled 4 no-growth cases) |
| Outline measure | `outline.mts`, chunks 10..15, 6 seeds | 28 of 439 not outlined at reach 0; 9 at reach 60 (updraft-rise 6, updraft-crossing 3) |
| Fall data | walk-offs from chunk 1,2,3,4 with 4 and 40 seeds; straight drops from chunk 3, 6, 10 | ground from chunk 2: 2 of 78; none from 3+; longest drop 3.9 chunks |
| Check and build | `npm run check`, `npm run build` | check exit 0, 103 files, 760 tests passed; build ok |

**Not verified:** the bot or the night outline in a browser; the outline of updraft targets (not fixed); frame rate.

## 3. Problems, workarounds and dead ends

- The QA seed-29 stall no longer reproduces on head, but the same bug shows at seed 1 start 6 (many seeds), so the fix was tested there.
- The first full `npm run check` while the sweep ran failed 7 to 8 tests by the 5 s timeout (backdrop, signal); they pass alone.
- Seed 4 start 0, no growth: the bot fell after e18:p1 to e18:p2, a hop through an updraft column that lands on p2's edge from the stored takeoff 564 and from +-1.5/2 px, but misses from 0.5 to 1 px beside it (stepLands checks only the two end shifts). The bot now replays every step not on a moving ledge from where it stands. The generator proof gap is not fixed (see follow-ups).
- My first bot-sweep script printed a wrong label column; counts are unaffected.

## 4. Deviations from the plan

None.

## 5. Changes

- Files: `src/game/endless/route-bot.ts`, `src/game/scenes/endless-scene.ts`, `tools/endless/chunk-map.ts`, `src/game/world/reachable-ledges.ts`, `src/game/effects/protected-visibility.ts`, `src/config/endless.config.ts` (`outlineLowerReachPx`, stale comment), `src/game/candle/growth.ts` (comment), tests `endless-route-bot`, `reachable-ledges`, `endless-fall`, `endless-generator`, `src/game/INDEX.md`.
- Contract or config-schema changes requested: None (one new tunable in endless.config.ts, game lane).
- New dependencies requested: None.
- Edits outside my lane: None.
- `INDEX.md` updated for new exports: yes.

## 6. Follow-ups and questions for humans

- [ ] Night outlines still miss updraft targets (updraft-rise 6 of 6, crossing 3 of 6): the reach search has no updraft columns. Fix means passing columns into `reachableLedges`. Lead decides.
- [ ] D-33 "falls are unbounded": on the current generator no walk-off or straight drop from chunk 3 or higher reaches the ground (longest 3.9 chunks). Test guards are set to what is measured; whether the game should be harder here is a design call.

- [ ] Updraft and bounce flights can miss from a takeoff 0.5 to 1 px off the stored one, while the +-2 px ends pass (seed 4 chunk 18, p1 to p2). A player at the stored point lands, but a landing margin that thin is a generator matter (check interior shifts in `stepLands`, route-replay.ts); not changed here because it raises generation cost.

## 7. Can a teammate explain this?

The test bot used to press jump for a rounded number of ticks, which with a bigger candle sometimes landed on the wrong ledge and repeated forever. Now it tries the jump in a copy of the physics first, picks a hold that lands on the right ledge, and never retries a hold that failed. At night we also light ledges that are level or a little lower, because some set pieces ask you to jump down or across.
