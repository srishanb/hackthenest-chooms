# After-job report: QA fixes for bounce caps, crumbling ledges and updraft columns (D-36)

- Agent: claude
- Branch and PR: claude/ledge-kinds-qa-fixes (from game-only at 9f2ef3b), no PR (the lead merges)
- Phase and plan: QA hold and should-fixes from `_agents_workspace/05_game-qa_ledge-kinds_findings.md`, items 1 to 8 of the lead's brief
- Started and finished: 17 Nov 2026, about 03:00 to 04:30 UTC

## 1. What I believe is complete

| Item (brief) | Result | Confidence |
|---|---|---|
| 1 Hold: a later column or cap moved the landing on a crumbling ledge | Fixed: such an addition is refused (`kit.ts` `arrivalsHold`); invariant test over 16 seeds x 18 chunks plus seeds 780 and 829 | High |
| 2 Thin landing margins | Column and bounce flights land from every takeoff 0.25 px apart within +-2 px; crumbling-from steps from +-2 px | High (residual: windows under 0.25 px were not seen, not ruled out) |
| 3 Columns as a safety net | A column holds the candle only within 24 px under its takeoff | High |
| 4 Fall onto a cap not counted | The bounce reports the fall's full height; fall events, shake, composure, clean jumps | High |
| 5 Night outlines miss updraft targets | The reach search gets the columns | High |
| 6 Crumbling reaction time | Hold 600 ms, 250 ms reaction allowance in every proof, hops of level 3..5, run ends on a firm ledge | High |
| 7 Stutter when chunks are generated | Prefetch (one chunk per frame at most) and a deterministic work bound per chunk | Medium (browser frame not re-measured) |
| 8 Columns hard to see in snow | Deep blue palette in snow bands | Medium (two screenshots) |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check, tests, build | `npm run check`, `npm run build` | 105 files, 769 tests pass; build passes |
| Finding 1 repro | `chunk-map.ts --seed 780 --bot 150 --start 23 --no-growth`, same for 829 from 25 | before: 4 stalls; after: 0 |
| Shifts | scratch `qa3/shifts.ts`, 80 seeds x chunks 5..29, 0.05 px across +-2 px | before: 5 of 2,150 sensitive steps miss somewhere (narrowest failing window 0.25 px); after (40 seeds): 0 of 1,133 |
| Falls | QA `falls.mts`, 600 falls, with and without columns | before: columns changed 63 (59 shorter, 10 by over a chunk, 21 ended higher); after: 30, every one starting inside or just above a column from rest; 0 of the 564 others |
| Classic climb | QA `classic-diff.ts` | 2,400,000 steps, 14,078 jumps, 0 differences |
| Outlines | QA `outline2.ts`, 20 seeds x chunks 5..25 | updraft-rise 0 -> 104 of 104, crossing 32 -> 61 of 61; others unchanged |
| Reaction | QA `windows.ts`, 25 seeds | steps with a working hold at 0/150/200/250/300/350 ms: 133/133 at every delay (before: 88, 88, 62, 32, 17 of 88 at 0, 150, 200, 250, 300) |
| Generation time | `chunk-map.ts --time` | before (9f2ef3b) mean 4.88, 99th 23.5, worst 79.8 ms; after item 2 alone 8.42 / 40.8 / 169; final 6.13 / 28.1 / 72.6. Scratch bench of 1,200 chunks: worst 75 -> 48 ms |
| Frames in a long fall | scratch `qa3/ff2.ts`, 40 falls of 14 chunks in Node, scene-like frames | never more than one chunk built per frame, before or after; worst frame 57 to 63 ms without prefetch, 105 to 107 with (GC; the extra prefetched chunks) |
| Snow look | dev server 3018, `?bot=1&seed=7&startChunk=11`, `seed=42&startChunk=15` | deep blue dashed sides and streaks read on snow at night |
| Bot sweep | `chunk-map.ts --bot 400`, seeds 1..60 x starts 0, 6, 12, 25, with and without growth (480 runs) | 0 stalls, 0 errors, all exit 0; mean height at 400 s from chunk 0 with growth 24,381 px |
| Independent replay | QA `replay2.ts`, 60 seeds x chunks 0..29 | ISO: 26,857 steps, 0 failures; CHAIN: 22,875 steps, 1 failure (a plain traverse hop landing on a higher route ledge, QA note 7's class, out of scope) |

**Not verified:** the worst frame in a real browser long fall (the machine was loaded by the sweep); a person
playing; failing windows narrower than 0.25 px.

## 3. Problems, workarounds and dead ends

- A shorter hop budget for item 6 made crumbling runs almost vanish: the next piece could not leave the last
  crumbling ledge in time. The run now ends with a hop onto a firm ledge.
- Fine shift sampling doubled generation time; crumbling-from plain arcs only need the two ends (their landing
  moves smoothly with the takeoff), and the slow part was those world-step replays.
- Prefetch did not lower the Node worst frame: a fall already builds one chunk per frame there; the worst frame
  is one slow chunk, so the per-chunk work bound is what lowers it.

## 4. Deviations from the plan

- Item 3 uses fall distance below the takeoff, not fall speed: a speed rule still let falls that start near a
  column be caught, and every route ride stays within 4 px of its takeoff height inside the column.
- Item 6: the conservative version, the lead's call; the owner may prefer a shorter hold.

## 5. Changes

- Files: `src/game/endless/pieces/kit.ts`, `route-replay.ts`, `generator.ts`, `chunk-stream.ts`,
  `pieces/crumbling-run.ts`, `src/game/player/movement.ts`, `updraft.ts`, `crumble.ts`, `types.ts`,
  `src/game/world/fall-tracker.ts`, `reachable-ledges.ts`, `src/game/effects/protected-visibility.ts`,
  `src/game/forest/ledge-kinds-view.ts`, `src/game/scenes/endless-scene.ts`, configs, tests, docs.
- Contract change: `LedgeKindsConfig.updraft.holdBelowTakeoffPx` (config.ts). `StepEvents.bounced` gains `fallHeightPx`.
  `EndlessGenerator.isBuilt`. `ChunkStream.prefetch`.
- New dependencies: none. Edits outside my lane: none beyond the game lane and its configs.
- `INDEX.md` updated: yes.

## 6. Follow-ups and questions for humans

- [ ] Srishan / owner: crumbling ledges now hold 600 ms with a 250 ms reaction allowance (D-36a); shorter is harder.
- [ ] Srishan: generation mean is 6.1 ms against 4.9 before these fixes, the price of finer landing checks.

## 7. Can a teammate explain this?

The generator now checks the tricky jumps from many nearby starting points, refuses anything placed later that
would change where you land on a crumbling ledge, and gives you a quarter second to react on one. Updraft
columns help jumps but never catch a fall, and chunks are built a few at a time ahead of need.
