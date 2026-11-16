# Lighten Up, hands-only edition

A variant of Lighten Up with **no EEG**: no headset, no simulator, no calibration. It lives on the branch
`claude/keen-keller-my69oo` and is not meant to merge into `main`, where the EEG game stays as it is.

What is different from `main`:

| | `main` | This branch |
|---|---|---|
| Input | Keyboard, plus the PiEEG Octopus 16 for lantern, fog and music | Keyboard only |
| World | Five authored stages with a top | An endless climb, generated as you go |
| What drives the mood | The composure signal | The candle's fuel: the forest darkens as the flame gets low |
| How a run ends | Landing on the last ledge | The flame goes out |
| Recovery | A placed ember (E and R) | A full-width landing at the start of every stretch catches any fall |
| The candle | A plain wax block with a flame | A face with ten moods, a reacting flame, emotes and a detailed close-up portrait |

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

## The candle

- **Moods.** `src/game/candle/expression.ts` picks one mood at a time from what the body is doing and from short
  events: content, focused (charging), soaring, alarmed (a fast fall), ouch (a hard landing, with a longer daze after a
  very long fall), relieved (wax relit a glowing wick), delighted (wax), proud (a new best, or a new landing), uneasy
  (sliding on ice), worried (low fuel), sleepy (long idle) and fading (the flame is out). It blinks, glances about and
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

## Rules that still hold

The binding rules in [AGENTS.md](../AGENTS.md) apply here too: nothing changes gravity, walking or jump strength; no
network at run time; no AI-generated art (the candle is drawn by code); height and a personal best only, with no
ranking; history is never rewritten.

## Where the work is tracked

`.handoff/plan.md` has the phases, `.handoff/backlog.md` the ordered list the loop works through, and
`docs/agent-reports/` one report per phase.
