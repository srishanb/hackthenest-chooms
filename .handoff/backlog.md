# Backlog: hands-only endless Lighten Up

Ordered. The loop takes the first open item, builds it, runs `npm run check` and `npm run build`, takes a browser
screenshot where the change is visible, commits, pushes, then moves on. Add new ideas at the end.

## Candle (the focus)

- [x] #1 Face: eyes, blink, gaze toward aim and motion, mouth; a pure expression state machine with tests
- [x] #2 Expressions from play: determined while charging, wide-eyed in a fall, squeezed on a hard landing, happy on wax, worried on low fuel, sleepy when idle
- [x] #3 Body detail: rounded shoulders, melt pool around the wick, warm rim light from the flame, extra shade tone
- [x] #4 Portrait close-up shows the same face larger, with its own detail (tear of wax when nearly out, glint in the eyes)
- [x] #5 Living wax: droplets knocked off on a hard landing (growing drips moved to #29)
- [x] #6 Body language instead of limbs (decided: arms and feet do not read at 2 px per art pixel): reacting flame, emotes, impact squash, cooling wax
- [x] #7 Menu emblem greets the player (looks around, blinks, hops, lands and sparkles)
- [x] #8 Candle gallery page updated with every expression, for visual review

## Endless mode

- [ ] #9 Moving ledges and ice in later height bands, covered by the route replay test
- [x] #10 Biomes by height (forest and snow bands) with matching platform skins and weather
- [ ] #11 Break up the full-width landings into staggered wide ledges that still catch every fall
- [x] #12 Tune fuel and wax with a route-following bot (par time per chunk) so a clean run is sustainable and a sloppy one is not (first pass; `tools/endless/par.ts`)
- [x] #13 Run summary on the finish screen: height, best, wax, seed, "new best" moment
- [ ] #14 Daily seed and a seed field on the menu
- [ ] #15 Height markers in the world every 25 m and a marker at the personal best
- [ ] #16 Menu choice between Endless and the classic authored climb

## Feel and polish

- [x] #17 Landing shake and squash tied to fall height (off by default; toggle in Settings)
- [x] #18 Flame-out sequence: light closes in, ember glows and smokes, HUD hint, relight on wax
- [ ] #19 Narrator lines for endless moments (new height band, low flame, new best) from existing clips only
- [x] #20 Tutorial hints for the first chunk in endless
- [ ] #21 Performance check: object counts and frame time after ten minutes of climbing
- [x] #22 README and docs for the hands-only branch (`docs/HANDS_ONLY.md`)

## Added during the loop

- [x] #23 Ice ledges in snow bands, with their own look (a bright blue sheet and icicles) so they can be told apart
- [ ] #24 Darker baseline at great height, so the candle's own light matters before the fuel is low
- [ ] #25 Remove the old small `rasterPortrait` once nothing else needs it as the reference
- [ ] #26 Check the frame rate on real hardware: the headless check runs at 13 to 24 fps with software rendering
- [ ] #27 A wind band (third biome) only if wind can be made part of the route replay
- [x] #28 Candle idle fidgets: looks up at its own flame now and then (no hop: a hop without a jump would mislead)
- [ ] #29 Drips that slowly grow over a run and fall as the candle burns down
- [ ] #30 Height markers every 25 m and a marker at the personal best (needs a UI component id, or a game-drawn mark with no text)
- [x] #31 Close-up portrait reacts to the flame events too (flare on wax, duck on landing), like the hero
- [x] #32 Each candle gets one trait of its own (a coloured band, a dipped base or a tuft of wax) so candles are told apart at a glance
- [x] #33 The end screen shows the run's candle (its close-up, cold) so the player sees who they played
- [x] #34 More wax tones (ten in all); the rare special candle moved to #38
- [x] #35 A short moment between the flame going out and the end screen (the candle slumps, its eyes close, the world goes dark) instead of a cut
- [x] #36 Relight moment: when wax saves a glowing wick, the flame bursts back with a flare and the candle breathes out, then smiles
- [ ] #37 Keep sweep tests under one second each so the slower CI runner never times out (time them after any candle change)
- [ ] #38 A rare special candle (about one in forty): a two-tone swirl or a honeycomb pattern
- [x] #39 The candle reacts to what is near it: looks toward wax within reach, peers down over the edge of its ledge
- [x] #40 An uneasy look while sliding on ice (wide eyes on the ground, wavering mouth, a bead of wax)
- [ ] #41 Give the classic climb (`?climb=classic`) the same awareness and cheer calls, so both modes have the full candle
