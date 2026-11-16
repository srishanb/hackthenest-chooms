# After-job report: expressive, detailed candle (phase 2) and first loop items

- Agent: claude
- Branch and PR: `claude/keen-keller-my69oo`, https://github.com/srishanb/lighten-up/pull/150 (variant branch, not for `main`)
- Phase and plan: phase 2 of `.handoff/plan.md`, plus backlog items 10, 12, 13, 20 and 22
- Started and finished: 05:25 to 05:46 UTC, 16 Nov 2026

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| The candle has a face that shows one of ten moods, chosen from play | Pass | High |
| It blinks and glances on a seeded rhythm; still under reduced motion | Pass | High |
| The body has more detail (shoulders, melt pool, flame light, four tones, drip beads) | Pass | High |
| The flame, the squash and small emotes react to wax, landings, charging and falls | Pass | High |
| The portrait is a detailed close-up that follows the earlier portrait's light rules | Pass | High |
| Forest and snow alternate with height | Pass | High |
| Fuel is tuned from a measured par time | Partial | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 91 files, 608 tests pass |
| Build | `npm run build` | succeeds |
| Every mood, hero | `candle-faces.html` in a browser, screenshot | all ten moods read differently |
| Every mood, close-up | `candle-close-up.html` in a browser, screenshot | eyes, brows, teeth, cheeks and lids visible |
| In the game | dev server, `?bot=1`, screenshots | hero and portrait show the same mood; snow band appears from chunk 3 |
| Par time | `npx tsx tools/endless/par.ts` | the bot needs 11 to 19 s a chunk |

**Not verified:** a person playing it; how the face reads on a small or low-resolution screen; audio; frame rate on
real hardware (the headless browser used software rendering and ran at 13 to 24 fps, slowest in snow); whether the
fuel numbers feel fair to a human (they come from a bot and a guessed slowdown of 2 to 3 times).

## 3. Problems, workarounds and dead ends

- A broken reaction value (not a number) made the flame draw nothing. The flame now treats that as "no reaction". A test covers it.
- The first close-up framing cut the mouth off at the edge of the circle for some candles. The body now sits higher and the flame is drawn at 1.7 times, not 2.
- Arms and feet were considered and left out: at two world pixels per art pixel they do not read. Body language comes from the flame, the squash and emotes instead.
- The first close-up test asserted once per pixel (over a million assertions) and timed out. It now asserts once per picture.

## 4. Deviations from the plan

- The small full-body `rasterPortrait` is no longer drawn by the scene; `close-up.ts` replaced it there. It is kept as the reference for the light rules and still has its tests (backlog item 25 removes it later).
- Biomes are forest and snow only. Wind is left out because wind changes jumps and is not part of the route replay yet.

## 5. Changes

- Files changed: see PR diff. New: `candle/expression.ts`, `candle/face.ts`, `candle/emotes.ts`, `candle/close-up.ts`, `endless/biome.ts`, `tools/endless/par.ts`, `docs/HANDS_ONLY.md`, three dev gallery pages and four test files.
- Contract or config-schema changes: none in this phase.
- New dependencies requested: None
- Edits outside my lane: UI wording and the world-tutorial reminder (this variant crosses lanes on purpose).
- `INDEX.md` updated for new exports: yes

## 6. Follow-ups and questions for humans

- [ ] Srishan: should the run end when the flame goes out (as built), or do you want a different fail state?
- [ ] Srishan: play a few runs and say whether the fuel is too generous or too tight.

## 7. Can a teammate explain this?

The candle picks one mood from what is happening to it, for example "alarmed" in a fast fall or "delighted" after
wax, and draws that mood as a few pixels of eyes and mouth. The portrait in the corner draws the same candle three
times larger so the face is easy to read. None of it affects how the candle moves.
