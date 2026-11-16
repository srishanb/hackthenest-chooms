# Backlog: hands-only endless Lighten Up

Ordered. The loop takes the first open item, builds it, runs `npm run check` and `npm run build`, takes a browser
screenshot where the change is visible, commits, pushes, then moves on. Add new ideas at the end.

## Candle (the focus)

- [x] #1 Face: eyes, blink, gaze toward aim and motion, mouth; a pure expression state machine with tests
- [x] #2 Expressions from play: determined while charging, wide-eyed in a fall, squeezed on a hard landing, happy on wax, worried on low fuel, sleepy when idle
- [x] #3 Body detail: rounded shoulders, melt pool around the wick, warm rim light from the flame, extra shade tone
- [x] #4 Portrait close-up shows the same face larger, with its own detail (tear of wax when nearly out, glint in the eyes)
- [ ] #5 Living wax: drips that grow and fall, droplets shaken off on a hard landing
- [x] #6 Body language instead of limbs (decided: arms and feet do not read at 2 px per art pixel): reacting flame, emotes, impact squash, cooling wax
- [ ] #7 Menu emblem greets the player (looks around, blinks, hops)
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

- [ ] #17 Landing shake and squash tied to fall height (the `landingShake` setting exists and nothing reads it)
- [ ] #18 Flame-out sequence: light closes in, ember glows, relight on wax
- [ ] #19 Narrator lines for endless moments (new height band, low flame, new best) from existing clips only
- [x] #20 Tutorial hints for the first chunk in endless
- [ ] #21 Performance check: object counts and frame time after ten minutes of climbing
- [x] #22 README and docs for the hands-only branch (`docs/HANDS_ONLY.md`)

## Added during the loop

- [ ] #23 Ice ledges in snow bands, with their own look (pale blue rim) so they can be told apart
- [ ] #24 Darker baseline at great height, so the candle's own light matters before the fuel is low
- [ ] #25 Remove the old small `rasterPortrait` once nothing else needs it as the reference
- [ ] #26 Check the frame rate on real hardware: the headless check runs at 13 to 24 fps with software rendering
- [ ] #27 A wind band (third biome) only if wind can be made part of the route replay
- [ ] #28 Candle idle fidgets: a little hop or a look up at its flame after a long wait, before it gets sleepy
