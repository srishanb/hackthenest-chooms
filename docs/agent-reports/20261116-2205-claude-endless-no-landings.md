# After-job report: endless climb without full-width landings (D-33)

- Agent: claude
- Branch and PR: worktree-agent-ad6191ea7b737ddd1, no PR (the lead merges the branch)
- Phase and plan: owner request from Srishan via the lead; no plan file
- Started and finished: about 21:45 to 22:05 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| No ledge except chunk 0's ground spans the screen or is wider than the widest ordinary ledge | Pass (40 seeds x 8 chunks) | High |
| Every stored jump, including each chunk's last jump onto the next anchor, lands when replayed with `stepPlayer`, also with the whole next chunk present | Pass (60 seeds x 8 chunks in the suite; 300 seeds x 40 chunks in a scratch run, 0 failures) | High |
| Random access: `floor(i)` equals the generated anchor; a chunk built alone equals one built after its neighbours | Pass | High |
| A long fall through the real stream lands exactly where it does with every ledge loaded; the window stays at 3 chunks | Pass (24 walk-offs and 105 drops; longest fall 8276 px, one reaches the ground) | High |
| `?bot=1`, `?startChunk=`, `?climb=classic` still work | Pass in a headless browser | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 97 files, 687 tests passed |
| Build | `npm run build` | Built, no errors |
| Bot climb | headless `?bot=1&seed=42` at 6, 20, 40 s | height 0, 582, 1456 px, no page errors |
| Later start | `?bot=1&seed=7&startChunk=4` at 4, 20 s | 3840, 4377 px, no errors |
| Classic | `?climb=classic` | plays, no errors |
| Deliberate fall | `?seed=98765&startChunk=11`, hold left | fell from 10560 px to 2284 px and came to rest on a ledge, no errors |

**Not verified:** a human playing; how hard the climb now feels; chunk build time on a slow laptop (about 2.5 ms on average here, 143 ms at worst).

## 3. Problems, workarounds and dead ends

- A narrow anchor needs the path to arrive near it: the generator leans the last ledges toward the anchor and takes back a ledge when the anchor is out of reach.
- The last jump could be caught by the next chunk's first ledge. Fixed by capping that jump's peak below `rise.minPx` above the anchor.
- A side ledge could catch an earlier side ledge's jump (this was already possible before). Fixed: each new side ledge must keep earlier side jumps landing.

## 4. Deviations from the plan

- None.

## 5. Changes

- Files changed: `src/game/endless/generator.ts`, `src/game/endless/chunk-stream.ts`, `src/game/scenes/endless-scene.ts`, `src/config/endless.config.ts`, endless tests, `docs/GAME_ONLY.md`, `docs/DECISIONS.md`, `src/game/INDEX.md`.
- Contract or config-schema changes requested: `ENDLESS_CONFIG` gains `anchor` and loses `belowViewPx` (game-lane config).
- New dependencies requested: None.
- Edits outside my lane: `src/ui/strings.ts` (the tutorial said a landing catches any fall) and a comment in `src/ui/components/pause-menu/pause-menu.ts`.
- `INDEX.md` updated for new exports: yes (descriptions only).

## 6. Follow-ups and questions for humans

- [ ] Ledges move for every existing seed, so a seeded climb's saved best no longer matches its ledges (Srishan).
- [ ] Amrit may want to reword the tutorial text changed in `src/ui/strings.ts`.

## 7. Can a teammate explain this?

The endless climb used to have a floor across the whole screen every 960 px, so a slip never cost much. Now only
the starting ground is that wide: each stretch begins on a normal ledge whose place comes from the seed, so the
game can still rebuild any stretch, and a missed jump falls until something below catches it.
