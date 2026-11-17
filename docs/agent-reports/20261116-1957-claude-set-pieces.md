# After-job report: set pieces in the endless climb

- Agent: claude
- Branch and PR: claude/set-pieces, no PR (the lead merges the branch; not pushed)
- Phase and plan: task 1 of 3 of the owner's variety request (set pieces; then new ledge kinds, then a wall jump). Brief from the lead; recorded as Decision D-34.
- Started and finished: 16 Nov, interrupted by a usage limit and resumed; finished 19:57 Eastern

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| A chunk is assembled from pieces: anchor, a seeded sequence of pieces, then an approach ladder whose last jump lands on the next anchor | Pass | High |
| One file per piece, a typed `Piece` interface, a registry with weight, unlock chunk and needed features | Pass (`src/game/endless/pieces/`) | High |
| At least six clearly different shapes with today's rules only | Pass: ten (ladder, staircase, traverse, zigzag shaft, detour down, fork, pillar hops, big leap, ice run, moving crossing) | High |
| Pacing: no piece twice in a row, harder shapes unlock with height, calm after demanding, numbers in config with units | Pass (`pieces/pacing.ts`, `src/config/endless-pieces.config.ts`) | High |
| Random access; the cheap anchor equals the generated one | Pass (tests) | High |
| Every route step, jumps and drops, main way and the fork's other way, replays with `stepPlayer`, also with the next chunk present | Pass (tests over 24 seeds x 24 chunks) | High |
| A piece that cannot be completed is abandoned; generation always ends (falls back to the plain ladder) | Pass (test with a piece that never fits) | High |
| A drop is a route step (`kind: 'drop'`) that `replayStep` replays and the route bot follows | Pass (unit test of the bot through a detour; browser runs) | High |
| Only chunk 0's ground spans the screen; anchors firm; falls unbounded; the stream's fall handling works | Pass (existing fall tests, thresholds lowered, see 4) | High |
| Not easier on average | Partly: see section 3. Per chunk a player loses about 11% more height, but each single miss costs less | Medium |
| Generation time measured; average near today's; retries bounded | Measured; average higher than before (see 2) | High (measurement) |
| Dev tool under `tools/endless/` | Pass (`tools/endless/chunk-map.ts`) | High |
| Headless bot runs keep climbing, zero page errors | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 98 test files, 714 tests passed |
| Build | `npm run build` | built in 1.9 s (existing chunk-size warning only) |
| Generation time, same script as the baseline (40 seeds x chunks 0..29, no warm-up) | scratch bench | before: avg 3.03 ms, worst 80.4 ms; after: avg 4.07 to 4.15 ms, worst 57.6 to 74.6 ms |
| Generation time, dev tool (60 seeds x chunks 0..39, warmed up) | `npx tsx tools/endless/chunk-map.ts --time` | mean 3.44 ms, median 2.10 ms, 99th 30.6 ms, worst 75.5 ms. Plain ladder alone with today's checks: mean 1.10 ms |
| Difficulty against the plain ladder | `npx tsx tools/endless/chunk-map.ts --compare` | plain: 12.9 ledges, 10.4 jumps, 4.0 wax per chunk, 199 px lost per miss by one charge level, 2072 px per chunk; set pieces: 16.6 ledges, 14.2 jumps, 3.9 wax, 162 px per miss, 2299 px per chunk |
| Headless bot, 8 seeds x start chunks 0, 6, 12, 200 s each, with wax growth | `chunk-map.ts --seed S --bot 200 --start C` | 0 stalls in 24 runs (before the bot fix: 3 of 18 stalled, and 1 of 24 with the plain ladder) |
| Browser, `?bot=1&seed=42` | play-verify smoke, port 3053 | height 227 px at 10 s, 1170 at 25 s, 2312 at 45 s; errors [] |
| Browser, `?bot=1&seed=7` | same | 1193 px at 25 s, 2453 at 45 s; errors [] |
| Browser, `?bot=1&seed=42&startChunk=6` | same | 6358 px at 15 s, 7239 at 30 s; errors [] |
| Browser, `?climb=classic` | same | playing at 5 s, renders normally; errors [] |
| Screenshots read | scratchpad `shots/s42-25s.png`, `s42-45s.png`, `s42c6-30s.png`, `s7-45s.png`, `classic-5s.png` | staircase (seed 42 chunk 1), traverse row above a staircase (chunk 2), the fork's safe ledges and its narrow risky ledge with wax (chunk 7), matched against the dev tool's maps |
| The replay speed-ups change nothing | hash of 200 chunks with and without the early stop; state-by-state comparison of the charge shortcut against `launch` | identical hash; 0 differences in 240 cases |

**Not verified:** a person playing the pieces (feel, readability of each shape at speed); frame rate against `game-only` (headless Chromium showed about 15 fps, which I did not compare with the base branch); the production build in a browser; the night view at high chunks with pieces. I did not merge `game-only` (pixel grid, particle fix), so the combination is untested.

## 3. Problems, workarounds and dead ends

- **More ledges catch more falls.** Pieces like the traverse and pillar row gain little height per jump, so a chunk has about 14 jumps instead of 10 and 17 ledges instead of 13. A jump missed by one charge level now loses 162 px on average instead of 199 (217 against the old generator itself). I cut the traverse's weight and made its hops longer, and scaled the side-ledge and path-wax chances (`sideLedgeScale` 0.7, `pathWaxScale` 0.75) so side ledges and wax per chunk stay near the old numbers. Measured per chunk, a player who misses each jump with the same chance loses about 11% more height than on the plain ladder, because there are more jumps. Each single miss is still cheaper, and the long falls through many chunks are rarer.
- **Wax growth broke the bot on narrow ledges.** Wax makes the candle jump up to about 6% farther, so the bot's stored charges overshot pillars and stairs (3 stalls in 18 runs). This was already true of the plain ladder (1 in 24). Fix: `heldStepsFor` in the bot holds jump for the launch speed the route assumed. The scene now passes `{ base, current }` movement to the bot (one call site).
- **Cost.** The first version took 14 ms per chunk. I added a swept-region cache, so a new ledge re-checks only the steps it could catch, plus an exact shortcut for the still part of a charge and an early stop once a replay is past its target. The output is identical. It is still slower than before, because each chunk has more ledges and every one is replayed.
- I did not see a stalled piece in the browser runs.

## 4. Deviations from the plan

- The existing fall tests asserted that a walk-off falls more than 5 chunks and a straight drop more than 1. With pieces the longest walk-off from those anchors is about 2.2 chunks, and none reaches the ground from chunk 4 or higher. I changed them to "more than 2 chunks", added chunk 1 so the ground still catches one, and check the straight drop over three seeds (still more than a chunk). The stream-equals-full-list checks are unchanged.
- The chunk-stream test's ledge bound went from 80 to 100 (more ledges per chunk).
- The main path may now move, but only in a moving crossing; the moving-ledge test says so.
- A new rule beyond the brief: no main-path jump may peak where a ledge of the next chunk could be, which makes "the next chunk cannot catch this chunk's jumps" hold by construction, not only in tests.

## 5. Changes

- Files changed: new `src/game/endless/route-replay.ts`, `src/game/endless/pieces/*` (types, kit, registry, pacing, features, shared, ten piece files), `src/config/endless-pieces.config.ts`, `tools/endless/chunk-map.ts`, `src/game/__tests__/endless-pieces.test.ts`; rewritten `src/game/endless/generator.ts`; edited `route-bot.ts`, the three endless tests, `src/game/INDEX.md`, `src/config/INDEX.md`, `docs/GAME_ONLY.md`, `docs/DECISIONS.md` (D-34).
- Contract or config-schema changes requested: none in `src/shared/`. `EndlessChunk` gained `altRoute` and `pieces`; `RouteStep` gained an optional `kind` (game lane types).
- New dependencies requested: none.
- Edits outside my lane: `src/game/scenes/endless-scene.ts`, one call (the bot gets the movement in force). `docs/DECISIONS.md` and `docs/GAME_ONLY.md` (integrator registers) at the brief's request.
- `INDEX.md` updated for new exports: yes.

## 6. Follow-ups and questions for humans

- [ ] Srishan: is about 11% more height lost per chunk, with cheaper single misses, the right kind of "still hard"? Fewer side ledges (`sideLedgeScale`) or a lower traverse weight would push it further.
- [ ] Srishan: the average generation time rose from about 3 ms to about 4 ms (worst about 75 ms, as before). Acceptable?
- [ ] Next tasks (new ledge kinds, wall jump): add a `PieceFeature`, say in `features.ts` where it is on, write the piece, add a registry line. A new ledge kind that changes physics (bounce, updraft, crumble) must also be simulated by `stepPlayer` for the replay to prove it.
- [ ] Playtest with a person: the detour's drops are short (30 to 56 px) so they do not shake the candle; they may read as a small step down rather than a dramatic "down to go up".

## 7. Can a teammate explain this?

The endless climb used to be one long ladder. Now each chunk is built from short named shapes, such as a staircase, a traverse, a fork or a detour down, chosen by the seed so that the same shape never comes twice in a row. Every jump and drop in them is played through with the game's own physics before the ledge is kept, so every shape can be climbed.
