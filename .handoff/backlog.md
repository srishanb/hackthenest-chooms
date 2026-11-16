# Backlog: hands-only endless Lighten Up

Ordered. The loop takes the first open item, builds it, runs `npm run check` and `npm run build`, takes a browser
screenshot where the change is visible, commits, pushes, then moves on. Add new ideas at the end.

## Candle (the focus)

- [ ] #1 Face: eyes, blink, gaze toward aim and motion, mouth; a pure expression state machine with tests
- [ ] #2 Expressions from play: determined while charging, wide-eyed in a fall, squeezed on a hard landing, happy on wax, worried on low fuel, sleepy when idle
- [ ] #3 Body detail: rounded shoulders, melt pool around the wick, warm rim light from the flame, extra shade tone
- [ ] #4 Portrait close-up shows the same face larger, with its own detail (tear of wax when nearly out, glint in the eyes)
- [ ] #5 Living wax: drips that grow and fall, droplets shaken off on a hard landing
- [ ] #6 Small limbs or feet that react (brace on charge, reach in the air), only if they read well at 2 px per art pixel
- [ ] #7 Menu emblem greets the player (looks around, blinks, hops)
- [ ] #8 Candle gallery page updated with every expression, for visual review

## Endless mode

- [ ] #9 Moving ledges and ice in later height bands, covered by the route replay test
- [ ] #10 Biomes by height (forest, snow, wind) with matching platform skins and weather
- [ ] #11 Break up the full-width landings into staggered wide ledges that still catch every fall
- [ ] #12 Tune fuel and wax with a route-following bot (par time per chunk) so a clean run is sustainable and a sloppy one is not
- [ ] #13 Run summary on the finish screen: height, best, wax, seed, "new best" moment
- [ ] #14 Daily seed and a seed field on the menu
- [ ] #15 Height markers in the world every 25 m and a marker at the personal best
- [ ] #16 Menu choice between Endless and the classic authored climb

## Feel and polish

- [ ] #17 Landing shake and squash tied to fall height (the `landingShake` setting exists and nothing reads it)
- [ ] #18 Flame-out sequence: light closes in, ember glows, relight on wax
- [ ] #19 Narrator lines for endless moments (new height band, low flame, new best) from existing clips only
- [ ] #20 Tutorial hints for the first chunk in endless
- [ ] #21 Performance check: object counts and frame time after ten minutes of climbing
- [ ] #22 README and docs for the hands-only branch
