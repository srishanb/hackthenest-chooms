# After-job report: remove lantern fuel, tense music layer

- Agent: sonnet
- Branch and PR: sonnet/audio-tense-no-fuel, https://github.com/srishanb/hackthenest-chooms/pull/100
- Phase and plan: requested by Srishan in chat ("lantern fuel doesn't need to exist; enable audio effect, find a tense stem, tune the audio scaling"). No plan file.
- Started and finished: 09:10 to 09:45 Eastern

## 1. What I believe is complete

| Request | Result | Confidence |
|---|---|---|
| Remove the lantern fuel mechanic | Done: no fuel drain, no Fuel HUD stat, no relight requirement, no `lanternFuel01` | High |
| Enable the audio effect | `musicTenseMix` is enabled in `effects.config.ts` | High |
| Find a tense stem | "Insistent: background loop" by yd, CC0, downloaded with Srishan's OK, logged in CREDITS, inventory and licence evidence | High (licence), Medium (musical fit: not listened to) |
| Tune the audio scaling | Mapping 0 to 0.8 over the whole intensity range, neutral 0.15, level trim 1.74 on the tense layer | Medium: values chosen from measurements, not by ear |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | 72 files, 483 tests pass |
| Build | `npm run build` | see PR |
| Loudness of both loops | Decoded in the browser, whole-file RMS | calm bed -19.4 dB, tense loop -24.2 dB, so +4.8 dB trim (1.74); tense peak 0.52 stays under 1 after trim |
| Real engine in the browser | `src/audio/__tests__/tense-browser.html`: real `createAudio`, both files, an analyser on the output, mix 0 to 0.8 | bus gains quiet 0.336 to 0.104 and tense 0 to 0.32; both loops loaded; context running; output loudness within about 6 dB across steps, peaks 0.08 to 0.14 |

**Not verified:** anything by ear (I cannot listen); the loop seam of the tense file (it starts and ends near silence, so a loop passes through a quiet moment); whether the tense track feels right in the game; the full game with a preset playing (the harness drives the mix value directly, and the signal to mix chain is covered by tests).

## 3. Problems, workarounds and dead ends

- The two loops differ in length (137.0 s and 128.7 s) and are not tempo-synchronised, so they drift apart; fine for an equal-power crossfade of ambient beds.
- The tense file has near-silent stretches (windowed RMS 0.001 at the start). The mix is capped at 0.8 so a little calm bed stays underneath and the music never drops out.
- A trim in `mix-rules` would break its tested equal-power invariant, so the trim is a gain node in `music-layers.ts`.
- Lantern fuel was entangled with the corruption light dimming; I kept the dimming (it is corruption, not fuel) and removed the rest.
- `web fetch` of OpenGameArt returns 403; I read the item page in the browser pane to confirm the licence.

## 4. Deviations

- None from the request. Wax still exists; it just no longer refills anything (it keeps its brightening pulse and count).

## 5. Changes

- Game: `forest/lantern-fuel.ts` renamed `lantern-light.ts` (`createLanternLight`), `config/lantern-fuel.config.ts` renamed `lantern-light.config.ts`, `climb-scene.ts`, `snapshot-writer.ts`, test renamed and rewritten.
- Contract: `GameSnapshot.lanternFuel01` removed (`shared/contracts/game-state.ts`, optional field, one reader removed from the HUD).
- UI: Fuel stat removed from the HUD; strings `hud.fuel` and `stage.relightRequired` removed.
- Audio: `asset-list.ts` (tense path, `MUSIC_LEVEL_TRIM`), `music-layers.ts`, `index.ts`; `effects.config.ts` row; `public/assets/audio/music/insistent.ogg` (1.77 MB), inventory, CREDITS, README, licence evidence.
- Tests and tools: `tools/audio/tense-scaling.test.ts`, `src/audio/__tests__/tense-browser.html`, `run/audio-mix.mjs`.
- Docs: `docs/FEATURES.md`, both INDEX files. Old plan files that mention fuel are history and untouched.
- Edits outside my lane: game lane (Ali), UI lane (Amrit), content (Neil's config and assets), shared contract. All needed by the request.

## 6. Follow-ups and questions for humans

- [ ] Srishan or Amrit: a listening pass on the tense loop, its seam and the trim value (1.74) in the real game.
- [ ] Neil: effect numbers (`max` 0.8, `neutral` 0.15, `tauMs` 4000) are mine; adjust by ear.

## 7. Can a teammate explain this?

The game now has two music loops: a calm forest bed and a darker tense loop. The tension signal sets a number from 0 to 0.8 that blends between them smoothly, and the tense loop is made as loud as the calm one so the blend does not get louder. The candle no longer burns down; corruption still dims its light.
