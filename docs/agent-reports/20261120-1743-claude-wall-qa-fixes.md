# After-job report: wall prototype QA fixes (findings 1, 2, 4; smaller 6 and 7)

- Agent: claude
- Branch and PR: claude/wall-qa-fixes (from game-only at 7f2a567), no PR (the lead merges)
- Phase and plan: QA round on D-37 (`07_game-qa_wall-moves_findings.md`), brief from the lead
- Started and finished: 20 Nov 2026, about 17:05 to 17:45 UTC

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| Finding 4: no stored takeoff inside a wall, no ledge split by a wall (placement fixed both orders and across chunk borders; replay refuses such steps) | Pass | High |
| Finding 4: the six QA seeds clean, a sweep clean, the route bot does not stall on seed 5 from chunk 0 and chunk 4 | Pass (tests fail on 7f2a567 first) | High |
| Finding 1: wall steps proved from takeoff shift and press offset together; docs promise equals the proof | Pass, with a coarser combined grid (see 4) | High that the grid is proved; the grid is not the full 0.25 px cross |
| Finding 1: independent cross test on a sweep of seeds | Pass (fails on 7f2a567 with QA's exact cases) | High |
| Finding 2: a stored chimney or wall kick landing never reports a fall unless its ledge is lower; a long fall after a kick still counts; grip rule unchanged | Pass (tests fail on 7f2a567 first) | High |
| Switch off: every chunk and the classic climb bit-identical to 7f2a567 | Pass | High |
| Finding 7c grip edge test, 7f wider bot seeds, 7d pinned classic hash | Done | High |
| Finding 6: switch-off speed recovered | Not recovered (measured, one attempt, see 3) | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | exit 0, 111 files, 810 tests |
| Build | `npm run build` | exit 0 |
| New tests on the unfixed code first | the new test files copied into `git archive 7f2a567` | wall-standing: 3 of 3 fail (14 problems in the six seeds; seed 5 waits 45 s); wall-cross: fails with 9 misses (seed 118798 c5 shift 2 press -2, 158393 c8 shift 1 press -6, ...); wall-flow: 20 wall-step landings report a fall (up to 69.8 px); wall-moves: the two fall-after-kick tests fail; endless-walls bot test fails on seed 5 |
| Switch-off identity | scratch `hash.mts` on 7f2a567 and head: 40 seeds x 25 chunks (default and `{walls:false}`), 400,000 classic `stepPlayer` steps, 300,000 endless `stepWorld` steps without walls | identical sha256 for all three |
| Classic pinned hash | 60,000-step random-key run | same sha256 on c7dca6f (before walls), 7f2a567 and head |
| Takeoffs inside walls | QA's `inside5.mts` on head, seeds 1..160, chunks 1..14 | 1,393 wall chunks, 17,720 steps: 0 inside, 0 blocked walks (QA: 8) |
| Fine cross (0.25 px x every press offset, neighbours loaded) | scratch `cross.mts`, seeds `s*7919+13`, s 1..160, chunks 1..14 | head: 2 of 672 wall steps miss at an off-grid combination (shift -0.5 / +1.25 with press -6, both land on a wall top); 7f2a567 seeds 1..20: 4 of 88 |
| Route bot | `chunk-map.ts --walls --bot 300` seeds 5, 41, 61, 66, 70, 119, 166, 1, 2, 3, 42, 99 from starts 0, 1, 6 | 36 runs, 0 stalls, 2 to 24 kicks each |
| Generation time | `chunk-map.ts --time` with and without `--walls`, 7f2a567 and head interleaved, two runs each | off: base 5.31 / 5.58 ms mean, head 5.53 / 5.75 (99th 24.8-25.7 vs 25.6-27.1); walls: base 7.76 / 7.80 ms, head 10.62 / 11.24 (99th 27.9 / 26.7 vs 45.9 / 49.5) |
| Switch off vs before walls (finding 6) | scratch `bench.mts`, 30 seeds x 40 chunks, interleaved, 3 rounds | c7dca6f 5.8-6.1 s, b5206dd 6.2-6.6 s, 7f2a567 6.7-6.9 s, head 6.6-6.9 s |
| Browser | dev server 3007, play-verify `smoke.cjs`, `?walls=1&bot=1&seed=5&startChunk=4`, 10/40/90 s | 0 page or console errors; 3 kicks, 20 slide steps, height 4,204 to 6,738 px (past chunk 4); 9 to 15 fps headless; walls and HUD drawn. Server stopped |

**Not verified:** a person playing with a keyboard (feel of the headroom under a wall, a chimney with no streak break);
the production build in a browser (only `npm run build`); the wall step combinations between the grid points
(2 of 672 miss there); grown movement (wax growth) for the combined grid (the chunk-map bot runs with growth and did
not stall); the work-bound fraction of wall chunks after the change; seeds beyond 160 and chunks beyond 14 for the
surveys.

## 3. Problems, workarounds and dead ends

- Finding 4 root cause is QA's reading: `keepsClear` compared twice the box gap with 60 px, so a 30 px gap passed
  under a 36 px body; and the replay teleports to the takeoff, so it could not see it. Both ends fixed. Cross-chunk:
  a neighbour's wall is at least 144 px from this chunk's ledges by the chunk bounds (rise.minPx 64 + finalRise.minPx
  56 - apexClearance 14 + body 38), and the tests check with neighbours loaded.
- Finding 1 cost: the full 0.25 px x 1 step cross raised walls-on mean generation to 23 ms (99th 124 ms), 2.5 times.
  Tried 1 px x 2 steps (cheap, but odd press offsets land on side ledges: 7 of 523 steps miss the fine cross),
  0.5 px x 1 step (+55%, 1 of 668 miss) and 1 px x 1 step (+35%, 2 of 668). Chose 1 px x every step.
- Finding 6: a CPU profile shows `findLanding` and a filter callback in `movement.ts` no longer inlined into
  `stepPlayer` (about 300 ms of 3.6 s). Moving the kick and slide into helpers in `wall.ts` did not change it, so I
  reverted it (keeps `movement.ts` edits small for the other builder). About +10% of switch-off generation vs
  c7dca6f comes from the wall code (b5206dd), another few percent from the arrival-cache fix (not walls).

## 4. Deviations from the plan

- The combined proof is a coarser grid (takeoffs 1 and 2 px either side x every press offset 1..6), not the full
  0.25 px cross; D-37 and `docs/GAME_ONLY.md` say exactly that, with the measured residual.
- The scene file was not changed: the fall height is fixed in `stepPlayer`, so every consumer (streak, shake, sound,
  `fall` events, bounces) gets it.
- Commit trailer names the model of this session, not the one in the brief's example lines.

## 5. Changes

- Files changed: `src/game/endless/pieces/kit.ts` (`keepsClear` real box gap, wall headroom), `src/game/endless/generator.ts`
  (passes the headroom), `src/game/endless/route-replay.ts` (`wallInTheWay`, the cross variants), `src/game/player/movement.ts`
  and `types.ts` (`standBottomY`), `src/config/endless-pieces.config.ts` (`walls.headroomPx`, `crossShiftPx`,
  `crossOffsetSteps`), tests `wall-standing`, `wall-cross`, `wall-flow` (new), `wall-moves`, `endless-walls`; docs.
- Contract or config-schema changes requested: None (`PlayerState.standBottomY?` is a game-lane type, optional, only in worlds with walls).
- New dependencies requested: None.
- Edits outside my lane: `docs/DECISIONS.md` D-37 row and `docs/GAME_ONLY.md` wall section, as the brief asked.
- `INDEX.md` updated for new exports: yes (`wallInTheWay`, `standBottomY`, `keepsClear` headroom).

## 6. Follow-ups and questions for humans

- [ ] Srishan: walls on now costs 10.6 to 11.2 ms mean, 99th 46 to 50 ms (was 7.8 / 27 ms). Acceptable for the prototype, or narrow the promise further?
- [ ] Ali (owner): 4 px of headroom under a wall over a ledge is the least; say if it should be more.
- [ ] Ali: findings 3 and 5 (wall tops and sides as landings, a wall top as a stepping stone) are left as they were.
- [ ] Integrator: switch-off generation stays about 10% slower than before walls (finding 6); a fix would mean restructuring `stepPlayer`.

## 7. Can a teammate explain this?

A stone pillar may no longer hang so low over a ledge that the candle cannot walk under it, and the route checker
now refuses any step where a pillar stands in the candle's way. Every wall route is now also tested with the
candle a little off at the takeoff and a little early or late at the press at the same time. And climbing a chimney
no longer counts as a fall, because the fall is measured from where the candle last stood.
