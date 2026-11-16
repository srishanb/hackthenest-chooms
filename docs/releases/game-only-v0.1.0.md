First release of **Lighten Up (game-only)**: the charge-jump climbing game with no EEG and no headset, built from the branch `game-only`.

This is a pre-release. It passes its automated checks and was played by keyboard in a headless browser, but **no person has played this build yet**, so the tuning is a first guess.

It is a variant. The EEG game on `main` (the Hack The Nest 2026 entry, release "Demo Ready") is unchanged.

## Play it

Download `lighten-up-game-only-v0.1.0.zip` below. It is the built game. Unzip it and serve the folder with any static file server, then open the address in Chrome or Edge. For example, from inside the unzipped folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Nothing in play uses the network. Opening `index.html` straight from the disk does not work; it has to be served.

From source: check out the tag, then `npm ci` and `npm run dev`.

| Key | Action |
|---|---|
| Left and right arrows, or A and D | Move |
| Space or Up (hold, aim, release) | Charge and jump |
| Esc | Pause |

## What is in it

- **An endless climb.** The ledges are generated as you go, and every jump on the way up can be made: each one is replayed with the game's own movement code before its ledge is kept. A full-width landing every stretch catches any fall. Height is the score, and the best height is kept on this device.
- **Fuel is the timer.** The candle burns down with time and height, wax refills it, and the run ends when the flame goes out.
- **Composure from play.** The corruption mechanic of the EEG game, with no brain data. A fall shakes the candle. While it is shaken the forest corrupts, the music turns tense, you see less and the flame burns faster. Standing still for a moment steadies it; clean jumps and wax help. It is the candle's state, not a reading of the player, it is never shown as a number, and it never changes the controls or the physics.
- **Variety with height.** Forest and snow bands, ice ledges in the snow, optional side ledges that slide and carry wax, and night that closes the view to the candle's own light.
- **An expressive candle.** A face with fourteen moods, eyes that follow nearby wax and peer over edges, a flame that reacts, a detailed close-up portrait, and a different candle every run.
- **Menu.** Today's climb (the same ledges for everyone on the same day, from the date), the endless climb, and the classic five-stage climb.

More detail: [docs/GAME_ONLY.md](https://github.com/srishanb/lighten-up/blob/game-only/docs/GAME_ONLY.md).

## State of this build

- Type check, 658 tests in 92 files, and the production build pass.
- The production build was smoke-tested in a headless browser: menu, play, pause and resume, with no console errors and no request leaving the page.
- Not verified: a person playing it; sound, including the tense music; frame rate on real hardware; whether the fuel, the composure amounts and the darkness at night feel fair.
- The classic climb in this variant runs with a fixed light and does not have the composure mechanic yet.

This is a game, not a medical or wellness tool, and it makes no health claims.
