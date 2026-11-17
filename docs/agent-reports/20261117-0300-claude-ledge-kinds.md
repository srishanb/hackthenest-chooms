# After-job report: bounce mushrooms, crumbling ledges and updraft columns (ledge kinds)

- Agent: claude
- Branch and PR: claude/ledge-kinds (based on game-only at 1d35cbb), no PR (the lead handles git)
- Phase and plan: second of three movement-variety tasks after D-35 set pieces; brief from the lead, Decision D-36 recorded for Srishan
- Started and finished: 17 Nov 2026, about 01:00 to 03:00 UTC

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| Bounce cap: lands never, throws about twice a full jump, sideways speed carries, held jump does nothing | Pass (`ledge-kinds.test.ts`) | High |
| Crumbling ledge: holds 400 ms from first standing, falls, not solid, grows back after 3 s once clear; a charge on it is lost | Pass (`ledge-kinds.test.ts`) | High |
| Updraft column: terminal sink/rise, floats a jump higher and longer, gravity restored on leaving, nothing while standing | Pass (`ledge-kinds.test.ts`) | High |
| State shared by game and replay (crumble timers in `stepWorld`; columns passed to `stepPlayer`) | Pass | High |
| Pieces: mushroom launch, crumbling run, updraft rise, updraft crossing; each appears over many seeds, needs its kind, unlocks one at a time | Pass (`endless-ledge-kinds.test.ts`) | High |
| Every stored step replays with previous and next chunks present (columns included) | Pass (16 seeds x 18 chunks in tests; 60 seeds x 25 chunks in a scratch sweep, 0 bad) | High |
| Random access and termination | Pass (existing and new tests) | High |
| Crumbling route never needs standing longer than it holds | Pass (static check plus the replay runs the timer) | High |
| Route bot gets through every new piece | Pass (tests on the world step; headless bot 400 to 500 s on 5 seeds, 0 stalls; browser bot runs) | High |
| Drawing on the grid, readable at night, reduced motion and pause | Pass (pixel-grid guard passes; screenshots read) | Medium (night readability seen only in screenshots) |
| Events for audio, tutorial line | Done (`bounce`, `ledge_crumbled`; one sentence in `tutorial.terrain.tip`) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 102 files, 750 tests pass (was 100 / 732) |
| Build | `npm run build` | built, no errors |
| Generation time | `npx tsx tools/endless/chunk-map.ts --time` | before (1d35cbb, same machine): mean 3.27 ms, median 1.99, 99th 25.0, worst 62.6. After: mean 6.02 ms, median 4.03, 99th 28.4, worst 96.2 |
| Headless bot | `chunk-map.ts --seed <s> --bot 500 --start 5` for 42, 7, 11, 1234, 99 | 32 000 to 34 000 px in 500 s, 0 stalls each |
| Browser bot | play-verify `smoke.cjs` on port 3018: `?bot=1&seed=11&startChunk=11` (mushroom), `seed=11&startChunk=6` (crumbling), `seed=7&startChunk=11` (rise), `seed=42&startChunk=15` (crossing), `?bot=1&seed=42`, `?climb=classic` | heights kept growing, bounces / crumbles / in-column steps counted, 0 page errors |
| Deliberate failures | scratch Playwright script, a key takes over from the bot | stood on a crumbling ledge: it fell, candle dropped 74 px to a lower ledge; walked off before a cap: no bounce, fell 485 px; short hop under a drift column: missed it, fell 74 px; full jump through it: rode it 76 steps and crossed. 0 errors |

**Not verified:** frame rate (headless software WebGL runs at 7 to 13 fps even at chunk 0, so no fair number);
a person playing with a real keyboard at full speed; night readability on a real display; audio for the new
events (no sound is mapped); a "fall from above into an updraft" in the browser (the timing of keys at low fps
missed it; it is covered by the unit tests).

## 3. Problems, workarounds and dead ends

- Traced placement put a ledge just above the apex: spots now record the whole pixel the feet cross and require
  the apex to clear it by `apexClearancePx`, as traced arcs do.
- Updraft crossing failed most tries: from the anchor the asked height was outside the chunk; widened the rise
  range and replaced a fixed distance with "beyond any ordinary jump at that height".
- The route bot fell where a drop walked into a rise column: the walk-off point depends on the walk's phase.
  Drops may no longer cross a column or a cap. Flights that bounce or cross a column must also land from takeoffs
  2 px either side, and their swept region covers those paths (a test caught a later column changing one).
- The bot hand-over in the browser could fire a jump the bot had charged: the hand-over now drops the charge.

## 4. Deviations from the plan

- Unlock chunks: bounce 5, crumbling 6, updraft rise 7, updraft crossing 8 (the brief left them to me).
- A small dev-only change to the bot: any game key during a `?bot=1` run hands the candle to the keyboard (needed
  for the deliberate failure runs). Dev readout gains `endlessPlayer` and `endlessKinds`.

## 5. Changes

- Files changed: player (`movement.ts`, `types.ts`, new `bounce.ts`, `crumble.ts`, `updraft.ts`, `world-step.ts`),
  endless (`route-replay.ts`, `jump-arcs.ts`, `generator.ts`, `chunk-stream.ts`, pieces `kit.ts`, `types.ts`,
  `features.ts`, `registry.ts`, new `mushroom-launch.ts`, `crumbling-run.ts`, `updraft-rise.ts`,
  `updraft-crossing.ts`, `columns.ts`), `forest/forest-world.ts`, new `forest/ledge-kinds-view.ts`,
  `scenes/endless-scene.ts`, configs (`game.config.ts`, `endless-pieces.config.ts`, new `ledge-kinds-view.config.ts`),
  `tools/endless/chunk-map.ts`, tests (new `ledge-kinds.test.ts`, `endless-ledge-kinds.test.ts`; existing endless
  tests pass the chunk's columns to the replay).
- Contract changes (shared files, small and typed): `GameConfig.ledgeKinds?: LedgeKindsConfig`;
  `UpdraftData` in `content.ts` (and the `type` comment of `PlatformData`); two events in `events.ts`:
  `bounce` and `ledge_crumbled`. Every caller updated.
- New dependencies requested: None.
- Edits outside my lane: `src/ui/strings.ts` (one sentence in `tutorial.terrain.tip`), `tools/endless/chunk-map.ts`.
- `INDEX.md` updated for new exports: yes (game and config).

## 6. Follow-ups and questions for humans

- [ ] Srishan: generation got slower, mean 3.3 to 6.0 ms and worst 63 to 96 ms per chunk. Acceptable? (Knobs:
  `flightAttempts`, `COLUMN_TRIES`, piece weights.)
- [ ] Amrit: map the `bounce` and `ledge_crumbled` events to sounds if wanted (`src/audio/sfx-map.ts`).
- [ ] Wall slide and wall jump task: see the lead's report notes.

## 7. Can a teammate explain this?

Higher up the climb, three new things appear: red mushroom caps that throw you up high, cracked ledges that fall
away 0.4 s after you land, and columns of rising air that slow your fall or carry you up. They are part of the
same movement code the generator uses to check every route, so any climb it builds with them can really be done.
