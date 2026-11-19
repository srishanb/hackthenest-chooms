# After-job report: wall slide and wall jump (prototype behind `?walls=1`)

- Agent: claude
- Branch and PR: claude/wall-moves (from game-only at c7dca6f), no PR (the lead merges)
- Phase and plan: movement variety, third task after D-35 set pieces and D-36 ledge kinds; brief from the lead, Decision D-37 recorded as a prototype behind a switch
- Started and finished: 17 Nov 2026, about 04:00 to 05:15 UTC

## 1. What I believe is complete

| Acceptance test (from the brief) | Result | Confidence |
|---|---|---|
| A wall: solid upright piece, code-drawn on the 2x grid, reads as different from a ledge by day and at night; only walls grip, never the world's edges | Pass (`wall-moves.test.ts`, `endless-walls.test.ts` grid check, screenshots) | High (night look seen in two screenshots only) |
| Wall slide; a long fall is never saved by a wall | Pass: grip only within 96 px below the last takeoff or kick (unit tests, and every wall of 168 chunks with a fall from 200 px above) | High |
| Wall jump: fixed kick on a fresh press, less height than a full charge jump, no same wall twice in a row, jump latch unchanged | Pass (`wall-moves.test.ts`) | High |
| Chimney and wall kick pieces; every step replayed with the real player step, same takeoff tolerance, neighbouring chunks, work bound | Pass (`endless-walls.test.ts`) | High |
| Each piece needs its walls | Pass: target higher than any charge jump rises; no plain jump (9 takeoffs x 3 directions x 12 levels) lands on a wall kick's ledge; chimneys kick 3 or 4 times, alternating | High |
| Route bot plays them | Pass (per-chunk test, a 150 s headless climb on 2 seeds, `chunk-map --walls --bot 300` on 6 seeds: 0 stalls) | High |
| Night outlines find the targets | Pass (test over the first 8 of each piece) | High |
| Chunk map tool shows them | Pass (`--walls`: `|` walls, `K` and `H` ledges, `(n kicks)` on steps) | High |
| Switch off: every chunk identical; classic climb bit-identical | Pass: hash of 30 seeds x 20 chunks equals base c7dca6f; 1.5 M classic steps hash-identical to base; tests compare against a generator without wall pieces or rules | High |
| `?walls=1` in production builds; wall runs never save a best; dev readout line | Pass (`walls:Rp.get('walls')==='1'` is in the built bundle; `persist` false; `endlessWalls`) | High |
| Tuning in typed config with units and comments | Done (`game.config.ts` `wallMoves`, `endless-pieces.config.ts` `walls`, `wallKick`, `chimney`) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 107 files, 798 tests pass (base 769). An earlier run had 7 timeouts at 5 s in unrelated files while another agent's sweeps held the 4 cores at load 12; rerun clean |
| Build | `npm run build` | built, no errors |
| Switch off equals base | scratch `hash.mts` on base and head, 30 seeds x chunks 0..19 | identical sha256 |
| Classic climb | scratch `classic.mts`: every section, 300,000 random-key steps each, JSON of every step output hashed, base vs head | identical (1,500,000 steps) |
| Generation time | `chunk-map.ts --time` (and `--walls`), base and head run back to back | base 7.16 ms mean / 35.9 99th / 94.6 worst; head off 7.19 / 35.1 / 110 (noise); head with walls 10.17 / 40.0 / 101.6 |
| Headless bot | `chunk-map.ts --walls --seed S --bot 300` for 36, 6, 1, 42, 99, 1234 | 0 stalls each; 4 to 16 kicks; about 18,000 px in 300 s |
| Browser, day | dev server 3066, `?walls=1&bot=1&seed=36` from the ground, and `&startChunk=1` | bot passed the wall kick (kick 1) and the chimney (kicks 2 to 5) and stood on e1:p6 above it; 0 page errors |
| Browser, night and snow | `?walls=1&bot=1&seed=6&startChunk=10` | wall kick and chimney passed, climbed past chunk 14; 0 errors |
| Production preview | `vite preview`, `?walls=1&seed=36` | plays, 0 errors (the walls are in chunk 1, above the first screen) |

Screenshots (canvas grabbed in the frame the readout changed): `wall-day-slide.png`, `wall-day-kick.png`,
`wall-day-chimney.png`, `wall-night-slide.png`, `wall-night-chimney.png` in the session scratchpad `shots/`.

**Not verified:** a person playing with a keyboard (the feel is the owner's call); frame rate (headless software
WebGL at 4 to 5 fps on a loaded machine); night readability on a real display; whether a person's press timing
really spreads less than 50 ms.

## 3. Problems, workarounds and dead ends

- A chimney landing was not monotonic in the press time (a press 1 step early carried the flight onto a higher
  ledge while 3 and 6 steps early were fine), so every offset in +-6 steps is checked, not the ends.
- That made the chimney expensive (about 25,000 replayed steps per try). Two fixes: the kit puts a wall step's
  ledge only where every proved variant comes down within its width, and the route checker keeps a wall step's
  downward moves so a later ledge that crosses none of them does not re-run it. Fewer retries for both pieces.
- Scanning the platforms for walls every physics step slowed switch-off generation by about 14%; the scan is now
  remembered per platform list and switch-off generation is back to base speed.
- Screenshots taken by Playwright lagged the game by a second at 5 fps; the moments are grabbed from the canvas
  inside the page in the frame the readout changes (so the HUD is not in them).

## 4. Deviations from the plan

- The kick press emits the existing `jump` bus event (charge 0) so it plays the jump sound; no new event.
- No tutorial line was added (see section 6).

## 5. Changes

- New files: `src/game/player/wall.ts`, `src/game/endless/wall-kicks.ts`, `src/game/endless/pieces/{wall-kick,chimney,walls}.ts`,
  `src/game/forest/wall-view.ts`, tests `wall-moves.test.ts`, `endless-walls.test.ts`.
- Changed: `player/movement.ts`, `player/types.ts`, `endless/route-replay.ts`, `route-bot.ts`, `generator.ts`,
  `pieces/kit.ts`, `pieces/types.ts`, `pieces/features.ts`, `pieces/registry.ts`, `world/reachable-ledges.ts`,
  `effects/protected-visibility.ts`, `forest/ledge-kinds-view.ts`, `forest/forest-world.ts`, `scenes/endless-scene.ts`,
  `game/index.ts`, configs, `tools/endless/chunk-map.ts`, one line in `endless-pieces.test.ts`.
- Contract changes (small, typed, optional): `GameConfig.wallMoves?: WallMovesConfig` (`src/shared/contracts/config.ts`).
  Game-lane types: `PlayerState.kickWallId?`, `wallLockMs?`, `StepEvents.wallKicked?`, `RouteStep.kicks?`, `walls?`,
  `PieceFeature` gains `walls`, `PieceKit` gains `plainApexPx`, `wallFloorPx`, `wallId`, `addWall`, `GeneratorOptions`,
  `EndlessSceneDeps.walls?`, `GameDeps.endless.walls?`. The platform type id `wall` (content `PlatformData.type` is a string; no change).
- Edits outside my lane: `src/main.ts` (one line parsing `?walls=1`), `src/shared/contracts/config.ts`, `src/shared/INDEX.md`, docs.
- New dependencies: none. New art files: none (code-drawn). `INDEX.md` updated: yes (game, config, shared).

## 6. Follow-ups and questions for humans

- [ ] Owner: try `?walls=1&seed=166` (chunk 1 has a wall kick then a chimney) and tune `wallMoves` by feel.
- [ ] Owner: one wall is not a ladder (`sameWallTwice: false`). Celeste allows the same wall; say if you want it.
- [ ] Owner: proposed tutorial line if the switch is turned on for everyone: "Hold toward a stone pillar to slide; press jump to kick off it."
- [ ] Srishan: with walls on, generation mean rises from 7.2 to 10.2 ms (99th 35 to 40 ms). Acceptable for a prototype?
- [ ] Amrit: a distinct kick sound, if wanted (it plays the jump sound now).

## 7. Can a teammate explain this?

With `?walls=1` the climb gets stone pillars. Press toward one in the air and you slide down it slowly; press jump
and you kick off it up and away, a little, so two facing pillars can be climbed. A pillar only grips just after
you jumped, so it never saves a long fall, and every climb through them is proved with the game's own physics.
