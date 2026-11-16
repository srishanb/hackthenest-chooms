# Lighten Up, game-only edition

A variant of Lighten Up with **no EEG**: no headset, no simulator, no calibration. It was built on the branch
`game-only` and merged into `main` on 16 Nov 2026 (Decision D-31), so `main` and the hosted page are now this
edition. The EEG game as shown at the hackathon is kept at the tag `demo-ready`. New work still goes to `game-only`
first (the desktop releases are cut from it) and reaches `main` through a pull request.

What is different from `main`:

| | The EEG game (tag `demo-ready`) | This edition |
|---|---|---|
| Input | Keyboard, plus the PiEEG Octopus 16 for lantern, fog and music | Keyboard only |
| World | Five authored stages with a top | An endless climb, generated as you go |
| What drives the mood | The composure signal | The candle's own composure, from play: falls shake it, standing still steadies it. Low fuel darkens the forest too |
| How a run ends | Landing on the last ledge | The flame goes out |
| Recovery | A placed ember (E and R) | A full-width landing at the start of every stretch catches any fall |
| Desktop app | A Windows installer, built by hand | Windows, Linux and macOS apps built by the release workflow; Windows and Linux update themselves |
| Backdrop | Two layers of repeating bark and two crown pictures | Painted from the run's seed in three layers that pass at different speeds: wandering trunks, branches, vines and floating islands with trees. It turns to pines and snow with height, and each forest stretch has a seeded flavour (leafy, autumn, mushroom or blossom). Drawn by code, like the candle |
| Background life | None | Birds sit on ledges and fly off as the candle nears, flocks cross far behind, fireflies blink, leaves fall, grass sways and far ledges spill waterfalls. All of it fades as the forest corrupts |
| The candle | A plain wax block with a flame | A face with fourteen moods, a reacting flame, emotes and a detailed close-up portrait |

## Play it

```bash
npm ci
```

```bash
npm run dev
```

Open the address Vite prints. Arrow keys or A and D move; hold Space to charge a jump, hold a direction, release.

The menu has **Today's climb** (the same ledges for everyone on the same day, from the date, with no network) and
**Classic climb** (the authored five stages). Both just change the address below.

| URL | What it does |
|---|---|
| `?seed=1234` | Play one particular climb. The same number always gives the same ledges |
| `?climb=classic` | The authored five-stage climb, with the still signal (fixed light) |
| `?bot=1` | Development builds only: a bot climbs by following the generator's route. Never saves a best height |
| `?startChunk=4` | Development builds only: start higher up. Never saves a best height |
| `?candleSeed=7` | Development builds only: pick the candle |
| `?fuel=0.05` | Development builds only: the first run starts nearly out of fuel, to look at the flame going out |
| `?shaken=0.9` | Development builds only: the first run starts with a shaken candle, to look at the forest turning |

Dev pages for looking at the candle: `/src/game/__tests__/candle-faces.html` (every mood on the hero) and
`/src/game/__tests__/candle-close-up.html` (every mood in the portrait close-up).

## How the endless climb is made

1. The climb is cut into chunks 960 px tall. Each chunk starts with a landing that spans the whole width.
2. A chunk depends only on the run's seed and its own number, so a chunk below can be rebuilt after a fall.
3. Each ledge is placed under a jump arc traced with the game's own `stepPlayer`. The jump is then replayed against
   the finished chunk, and a ledge the replay does not land on is thrown away. The test suite replays every jump of
   480 chunks.
4. Side ledges hold extra wax. They can be reached, but getting back may mean dropping down. From chunk 4 up some
   of them slide left and right, carrying their wax; they move only as far as their jump still lands on them, and
   the main path never moves.
5. Ledges get narrower and the steps taller over the first 14 chunks. The candle also burns faster with height, and
   keeps burning a little faster after that, so every run ends.
6. Forest and snow alternate every three chunks. In the snow about a third of the ledges are ice (a bright blue sheet
   with icicles): walking slides, the jump itself is unchanged.

7. Night falls with height. Low down the whole screen is visible; from about chunk 10 the view is the candle's own
   circle of light, wide with a full candle and small with an empty one. Reachable ledges are still outlined inside it.

`npx tsx tools/endless/par.ts` prints how long the route bot needs per chunk and what that means for fuel. Tuning
numbers are in `src/config/endless.config.ts`.

## Composure without a headset

In the EEG game a tense signal corrupted the forest, narrowed the view, tensed the music and burned the candle
faster, and calming down brought the forest back. This variant keeps that loop and drives it from play
(`src/game/endless/composure.ts`, numbers in `composure` in `src/config/endless.config.ts`):

- **A fall shakes the candle.** Landing 60 px or more below the takeoff shakes it, more the further it fell. A fall
  of about two ledges is enough for the forest to start turning; half a chunk shakes it badly. Falls add up.
- **While it is shaken** the same effects table as on `main` runs: the forest corrupts, the music turns tense and the
  view narrows as the fuel drops. The candle also burns faster, up to 1.7 times at its worst.
- **Standing still steadies it.** After a third of a second without walking or charging, the candle shuts its eyes
  and breathes, and it is steady again within about two and a half seconds. This is the choice the mechanic asks
  for after a fall: spend a moment to steady the candle, or push on while it burns faster and the forest is dark.
- **Clean jumps and wax steady it too**, and on the move it settles slowly by itself (about half a minute).
- A flame that is running low still darkens the forest as before. Whichever cause is stronger wins.

It never changes gravity, walking, jump strength or steering. It is the candle's state, a reaction to what happens
in the game, and not a reading of the player; nothing shows it as a number or a rank. The HUD shows one line while
the candle is shaken ("Your candle is shaken. Stand still for a moment to steady it."), and the quick start has a
page on it. Not judged by a person yet: whether the amounts feel fair, and how the tense music sounds.

## The candle

- **Moods.** `src/game/candle/expression.ts` picks one mood at a time from what the body is doing and from short
  events: content, focused (charging), soaring, alarmed (a fast fall), ouch (a hard landing, with a longer daze after a
  very long fall), relieved (wax relit a glowing wick), delighted (wax), proud (a new best, or a new landing), uneasy
  (sliding on ice), shaken (after a fall: wide darting eyes), steadying (standing still to get over it: eyes shut, a
  slow breath), worried (low fuel), sleepy (long idle) and fading (the flame is out). It blinks, glances about and
  looks up at its own flame, in a rhythm set by the candle's seed.
- **Awareness.** `awareness.ts` turns the eyes toward wax within reach and over the edge of a ledge.
- **Face and close-up.** `face.ts` draws the hero's face; `close-up.ts` draws the same candle at three times the
  resolution for the portrait circle, and `run-candle.ts` shows it, flame out, on the end screen.
- **Flame.** `flame.ts` makes the flame react: it leaps on wax, is pressed flat by a landing and gathers while a jump
  charges. The candle trembles at full charge.
- **Small signs.** `emotes.ts` adds sparkles, an exclamation mark, circling stars, a bead of wax, z's, a puff of
  relief, wax knocked off by a hard landing and breath in the snow. `ground-shadow.ts` puts a shadow under the candle.
- **One of a kind.** Each candle has its own wax tone (ten), face features and often a trait: a coloured band, a
  dipped base, a tuft of wax, or (about one in 36) soft swirl stripes. Drips grow as it burns through a run.
- **The menu candle** waits, gathers, hops, lands and looks pleased, and grins toward the menu while Play has focus.

A mood is a reaction to the game (a fall, low fuel). It is never a reading of the player. Under reduced motion the
blinking, bouncing and drifting parts stop and the still parts remain.

## Desktop app

`desktop/` wraps the built game in an Electron window that keeps itself up to date: on Windows and Linux it
downloads a newer release in the background and installs it when the game is closed; on macOS (unsigned) it says a
new version exists and offers the download page. The app asks GitHub once at start for the list of releases. That
is the only network use, it is outside the game window (which has none), and `--no-update` switches it off.
This is the one place the variant steps away from "nothing on the demo path uses the network": it was asked for by
Srishan on 2026-11-16, and the game itself still never uses the network. Details: [desktop/README.md](../desktop/README.md).

## Releases

A release of this variant is a notes file: `docs/releases/game-only-v<version>.md` on this branch. When a push adds
one that has no release yet, `.github/workflows/release-game-only.yml`:

1. builds the game at that commit, creates the tag `game-only-v<version>` there and publishes a GitHub pre-release
   with the zipped game and the file as its notes;
2. packages the desktop app around that same zip on Windows, Linux and macOS and attaches the installers;
3. builds an older copy of the Linux app and checks that it updates itself to the new release.

Installed desktop apps find the new release by themselves. Tags are never moved or deleted: a fix is a new version
with its own notes file. When the workflow file changes and there is nothing to release, it still packages the app
on all three systems as a rehearsal and attaches nothing.

## Rules that still hold

The binding rules in [AGENTS.md](../AGENTS.md) apply here too: nothing changes gravity, walking or jump strength; no
network at run time; no generative AI for art, images or music (the candle is drawn by code; ElevenLabs narrator speech is the one exception); height and a personal best only, with no
ranking; history is never rewritten.

## Where the work is tracked

`.handoff/plan.md` has the phases, `.handoff/backlog.md` the ordered list the loop works through, and
`docs/agent-reports/` one report per phase.
