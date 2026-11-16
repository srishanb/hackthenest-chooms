# Backlog: game-only endless Lighten Up

> **Feature freeze (Srishan, 2026-11-16): do not overdevelop.** No new features and no big changes until Srishan
> says what he wants next. Until then the loop only fixes bugs and optimizes what is already built. Open feature
> items below stay open and wait for him; do not start them. When a pass finds nothing worth fixing, stop the loop
> and wait.

**State on 2026-11-16, 15:25 UTC: the fix list below is done and the loop has stopped. It is waiting for Srishan.** Since then, at his request: releases (v0.1.0) and the desktop app that updates itself (v0.2.0).

While the freeze holds, a loop tick is: look for a real bug or a measured slow spot in what exists, fix it with a
test, run `npm run check` and `npm run build`, check it in the browser where it can be seen, commit, push. New ideas
still go at the end of this list, as ideas only.

## Fixes and optimization (allowed during the freeze)

- [x] #F1 Play a few ledges of the classic climb (`?climb=classic`) by keyboard in the browser and fix anything broken (was #63). Done: eight jumps, falls, walking, pause and resume; the candle, ember panel and hints all show; no errors. Nothing to fix.
- [x] #F2 Remove the old unused `rasterPortrait` if nothing uses it (was #25). Closed without a change: it is `main`'s code, its file still supplies types and constants in use, it has its own test and gallery, and the bundler already drops it from the build.
- [x] #F3 Time the test suite and keep every sweep test under one second (was #37). Done: the wax-ball sweep went from 1.8 s to a few ms (one check per picture). The generator sweep (1.5 s) already has its own 60 s limit. The two slow signal tests are `main`'s and untouched.
- [x] #F4 Review the composure change for bugs: restart, pause, moving ledges, ice, the bot, the flame-out moment (read through: restart resets it, pause freezes it, a moving ledge counts as standing still, sliding on ice does not, the flame-out look wins; nothing to fix)
- [x] #F5 Profile a frame in the endless scene and remove avoidable per-frame work. Measured with a CPU profile of the route bot: about 89% of the time is the browser drawing, and no game function is above 0.5%, so the scene code was left alone. One waste found and fixed: the menu candle kept redrawing 12 times a second while hidden during a run. Also fixed: the menu candle and the end-screen candle stayed frozen if reduced motion was switched off without a reload.

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

- [x] #9 Moving ledges and ice in later height bands, covered by the route replay test (only optional side ledges move; their wax rides along)
- [x] #10 Biomes by height (forest and snow bands) with matching platform skins and weather
- [ ] #11 Break up the full-width landings into staggered wide ledges that still catch every fall
- [x] #12 Tune fuel and wax with a route-following bot (par time per chunk) so a clean run is sustainable and a sloppy one is not (first pass; `tools/endless/par.ts`)
- [x] #13 Run summary on the finish screen: height, best, wax, seed, "new best" moment
- [x] #14 Daily seed on the menu ("Today's climb"; a typed seed field is left out: `?seed=` covers it)
- [ ] #15 Height markers in the world every 25 m and a marker at the personal best
- [x] #16 Menu choice between Endless and the classic authored climb

## Feel and polish

- [x] #17 Landing shake and squash tied to fall height (off by default; toggle in Settings)
- [x] #18 Flame-out sequence: light closes in, ember glows and smokes, HUD hint, relight on wax
- [ ] #19 Narrator lines for endless moments (new height band, low flame, new best) from existing clips only
- [x] #20 Tutorial hints for the first chunk in endless
- [x] #21 Performance check over a 144 s bot climb: 1,000 to 1,600 live objects, heap flat at 81 MB, no errors. Frame rate in the headless browser is 13 to 21 fps and tracks the snow layer, not the object count; real hardware still unmeasured (#26)
- [x] #22 README and docs for the game-only branch (`docs/GAME_ONLY.md`)

## Added during the loop

- [x] #23 Ice ledges in snow bands, with their own look (a bright blue sheet and icicles) so they can be told apart
- [x] #24 Night falls with height, so the candle's own light (its fuel) decides how far you see
- [ ] #25 Remove the old small `rasterPortrait` once nothing else needs it as the reference
- [ ] #26 Check the frame rate on real hardware: the headless check runs at 13 to 24 fps with software rendering
- [ ] #27 A wind band (third biome) only if wind can be made part of the route replay
- [x] #28 Candle idle fidgets: looks up at its own flame now and then (no hop: a hop without a jump would mislead)
- [x] #29 Drips that slowly grow over a run, with a bead of wax running down one now and then
- [ ] #30 Height markers every 25 m and a marker at the personal best (needs a UI component id, or a game-drawn mark with no text)
- [x] #31 Close-up portrait reacts to the flame events too (flare on wax, duck on landing), like the hero
- [x] #32 Each candle gets one trait of its own (a coloured band, a dipped base or a tuft of wax) so candles are told apart at a glance
- [x] #33 The end screen shows the run's candle (its close-up, cold) so the player sees who they played
- [x] #34 More wax tones (ten in all); the rare special candle moved to #38
- [x] #35 A short moment between the flame going out and the end screen (the candle slumps, its eyes close, the world goes dark) instead of a cut
- [x] #36 Relight moment: when wax saves a glowing wick, the flame bursts back with a flare and the candle breathes out, then smiles
- [ ] #37 Keep sweep tests under one second each so the slower CI runner never times out (time them after any candle change)
- [x] #38 A rare special candle (about one in 36): soft diagonal stripes, like a twisted party candle
- [x] #39 The candle reacts to what is near it: looks toward wax within reach, peers down over the edge of its ledge
- [x] #40 An uneasy look while sliding on ice (wide eyes on the ground, wavering mouth, a bead of wax)
- [x] #41 Give the classic climb (`?climb=classic`) the same awareness and cheer calls, so both modes have the full candle
- [ ] #42 Srishan to judge by playing: is the night too dark at low fuel (radius 130 px empty, 330 px full, full night from chunk 10)?
- [x] #43 Wax drops glow in the dark a little beyond the light, so the player can plan toward them at night (not yet seen in a screenshot: no drop was past the edge)
- [x] #44 Capture a screenshot that shows a wax beacon past the edge of the light (seen at the edge of the light at chunk 12; left as it is)
- [x] #45 The close-up portrait shows the melted drips and the running bead too
- [x] #46 See a moving side ledge in motion in the browser and check its wax rides with it (sampled eight times: the wax x equals the ledge x every time)
- [ ] #47 Let the route bot optionally detour to side ledges, so par.ts measures a wax-hungry run too
- [x] #48 The swirl candle shows on the end screen (checked with ?candleSeed=146&fuel=0.02)
- [ ] #49 Candle voice without words: tiny pitch-shifted sfx for hop, land and relief, from the sfx already in the repo only (parked: nothing here can listen to it; do it when Srishan can hear the result)
- [ ] #50 The snow weather layer is the slowest thing in the headless check: measure it on a real GPU before changing it
- [x] #51 The candle trembles at full charge, so the player can see the charge has reached its cap
- [x] #52 Each new landing reached is a small milestone: the candle looks proud, once per landing
- [x] #53 A longer daze after a very long fall (stars keep circling for up to 1.1 s more, eyes half open), still with no death and no lost control
- [x] #54 The menu candle is eager (grins toward the menu) while Play has the pointer or the focus
- [x] #55 The menu footer says which climb is selected (endless, today's, a numbered climb, or classic)
- [x] #56 A climb picked by its seed (today's climb or `?seed=`) keeps its own best height
- [x] #57 The eager menu face is in the faces gallery (seen: grin, eyes toward the menu); the daze has a gallery column
- [x] #58 Only the latest 30 seeded climbs keep a best height; older ones are forgotten
- [x] #59 A soft shadow under the candle on the ledge below; it stays on that ledge and shrinks while the candle is in the air
- [x] #60 In the snow the candle's breath shows: a small puff every few seconds while it stands or walks
- [x] #61 The classic climb gets the ground shadow too
- [x] #62 Rare flame colours (a blue, green or violet flame, about one candle in twelve); the portrait's halo takes the flame's colour
- [ ] #63 The classic climb is not smoke-tested beyond booting: climb a few ledges with keyboard input in the browser and check the candle there
- [x] #64 Flow: after four clean jumps in a row (each landing no lower than its takeoff) the candle hums, with small notes floating up and a little colour in its cheeks, until it falls
- [ ] #65 The light on the world (the halo round the candle and the wax pulse) takes a rare flame's colour too
- [ ] #66 A short, soft reaction when flow breaks (the note pops, a small sigh), so the fall is felt but not punished
- [x] #67 Composure from play: falls shake the candle, the forest corrupts, the music tenses and the flame burns faster; standing still steadies it (asked for by Srishan: keep the corruption mechanic without brain data)
- [x] #68 The candle shows it: a shaken look (wide darting eyes, shiver marks) and a steadying look (eyes shut, a slow breath), on the hero and in the portrait
- [ ] #69 The classic climb (`?climb=classic`) still runs on the still signal: give it composure from play as well, checking its stage-finish rule ("the forest must be calm to finish") still makes sense
- [ ] #70 The flame itself should show composure: gutter and flicker while shaken, burn tall and even while steadying
- [ ] #71 A sound for steadying (a soft breath from the sfx already in the repo), parked with #49 until Srishan can listen
- [ ] #72 Srishan to judge by playing: do the composure amounts feel fair (a two-ledge fall starts to turn the forest; 2.5 s of standing still clears the worst)?
- [ ] #73 Narrator lines for being shaken and for steadying (gentle, never judging), if the content lane has matching moments
- [x] #74 Releases cut by a workflow from a notes file (`docs/releases/game-only-v<version>.md`); v0.1.0 published (asked for by Srishan)
- [x] #75 Desktop app (`desktop/`, Electron) for Windows, Linux and macOS that updates itself on Windows and Linux; v0.2.0 published (asked for by Srishan)
- [ ] #76 An app icon for the desktop app, drawn from the game's own candle (the default Electron icon is used now)
- [ ] #77 Srishan or a teammate: run the Windows installer and the macOS disk image once and report what happens
- [ ] #78 Sign the apps (needs paid certificates from Srishan): removes the first-start warnings and lets the Mac build update itself

