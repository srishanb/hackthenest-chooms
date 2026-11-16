# After-job report: background life, HUD stats without a card, the no-generative-AI rule (game-only variant)

- Agent: claude
- Branch and PR: `game-only`, https://github.com/srishanb/lighten-up/pull/151
- Phase and plan: asked for by Srishan in the session ("improve background by finding asset packs and give it more liveliness", "do not use any generative AI to generate art or images or music. this should be a project wide rule", "elevenlabs is the only exception", and the HUD stats request); no plan file
- Started and finished: 11:20 to 16:00 Eastern (with pauses)

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| The height, wax, highscore and fuel stats have no card, a drop shadow on text and icons, and sit in the top right corner; the pause button is to their left | Pass | High |
| Project-wide rule: no generative AI for art, images or music, ElevenLabs narrator speech the one exception (AGENTS.md rule 5, CREDITS.md, GAME_ONLY.md, Decision D-29) | Pass | High |
| Every new asset is human-made with evidence, licensed for game use, and credited | Pass: each asset page fetched; all four state "No generative AI was used" | High |
| Birds sit on ledges ahead of the candle, fidget, and fly away from it when it comes near | Pass | High |
| Far flocks, fireflies and spores, single falling leaves, swaying grass, waterfalls on far garden ledges | Pass | Medium (look judged from still frames) |
| The life thins as the forest corrupts (birds leave, leaves redden, grass withers) and the waterfalls freeze in snow | Pass for corruption; snow freeze by reading | Medium |
| Nothing in it touches physics, fuel or score; no network at run time | Pass | High |
| No frame-rate cost | Pass in the headless browser | Medium |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 95 files, 675 tests pass (7 new in `src/game/__tests__/wildlife.test.ts`) |
| Build | `npm run build` | built |
| Licence and human-made evidence | `curl` of each itch.io page, text extracted | CC0 stated for inmenus and Casual Garage Coder and Foozle; reodesuxz's bundled licence permits game use; all four pages: "Content: No generative AI was used" |
| Files unchanged | test compares each file's SHA-256 with `public/assets/wildlife/inventory.json` | match |
| The game with a bot | headless Chromium, `?bot=1&seed=42` and `seed=7`, screenshots at 5 to 22 s | birds on ledges, one caught flying off as the candle landed, a flock crossing, leaves, fireflies, grass, a waterfall behind the ledges; no page errors |
| Snow band and corrupted forest | `&startChunk=5`, `&fuel=0.05` | snow: life dimmed; corrupted (0.89): birds gone, leaves red; no errors |
| Classic climb | `?climb=classic` | runs, no errors |
| Frame rate | same scene, this commit against the commit before, two runs each | snow scene 16.6 to 19.0 fps without, 16.9 to 19.6 with; default scene about 24.5 both |

**Not verified:** any of it by a person or on a real GPU; how the birds' animation reads in motion (only still frames were looked at); reduced motion (by reading only: birds stand still and vanish instead of flying, leaves hidden, flocks off); moving ledges carrying a bird; the stats panel at the dev size tuner's other scales.

## 3. Problems, workarounds and dead ends

- The grass art fills only the top of its 16 x 32 cell, so tufts floated until the origin was set to row 17.
- The far flock at native 8 px was too small to read; it is drawn at twice that.
- No human-made, verified pack was found for light shafts, butterflies or ground animals; they are not included.
- kenney.nl is not reachable from the build session (403); not needed.

## 4. Deviations from the plan

- The variant's feature freeze (docs/GAME_ONLY.md) was lifted by Srishan's requests in this session.
- Fireflies are drawn under the night's darkness, so they do not show outside the candle's light at night. Putting them above it risked being read as wax.

## 5. Changes

- Files changed: new `src/config/wildlife.config.ts`, `src/game/forest/bird-behaviour.ts`, `perching-birds.ts`, `ambient-life.ts`, `grass-tufts.ts`, `src/game/__tests__/wildlife.test.ts`, `public/assets/wildlife/` (13 art files, two licence texts, `license-source.md`, `inventory.json`); edited `forest-world.ts`, `backdrop-gardens.ts`, `textures.ts`, `endless-scene.ts`, `climb-scene.ts` (one call each), `src/ui/components/hud/hud.css`, `src/ui/theme/tokens.css`, `AGENTS.md`, `CREDITS.md`, `docs/DECISIONS.md` (D-29, D-30), `docs/GAME_ONLY.md`, both `INDEX.md` files.
- Contract or config-schema changes requested: `ForestWorld.setCandle(x, y)` added (game lane only; both scenes call it).
- New dependencies requested: None
- Edits outside my lane: this variant crosses lanes on purpose.
- `INDEX.md` updated for new exports: Yes

## 6. Follow-ups and questions for humans

- [ ] Srishan: play it and say whether the grass tufts suit the ledges; they are the least matched of the new art.
- [ ] Srishan: the branch cleanup (Decision D-30) is blocked from agent sessions by the Claude Code hook; 132 merged branches are listed for you to delete yourself.
- [ ] A procedurally generated backdrop was raised; see the session for the assessment.

## 7. Can a teammate explain this?

Small animals and motion were added behind the climb, all from free human-made packs. A bird is a little state
machine: it stands, sometimes pecks or chirps, and flies away from the candle when it gets close. Everything else is
a fixed set of sprites moved each frame. None of it can be touched by the candle, and it all fades as the forest turns.
