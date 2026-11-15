# Lighten Up

A 2D charge-jump climbing game built in 24 hours for Hack The Nest 2026 (Nov 14-15), Mind and Machine (BCI) track.
You carry a candle up a tall forest tower. You cannot die: a missed jump only costs height. A PiEEG Octopus 16 EEG
board reads composure (calm versus tension) and changes how far your light reaches, how corrupted the forest looks
and how the music sounds. It also gates a recovery ember that returns you to a ledge you chose. Muscle activity (a
clenched jaw, for example) is part of the signal, and we say so openly. This is an experimental game prototype, not
a medical device, and it does not diagnose anything. **The signal never touches the controls or physics.**

## Play online

https://srishanb.github.io/hackthenest-chooms/

Use Chrome or Edge if you want to connect the real board: it needs Web Bluetooth, which only Chromium browsers have.
The simulator and the replay presets need no board (untested in Safari and Firefox).

## Controls

| Key | Action |
|---|---|
| Left / Right, or A / D | Walk |
| Hold Space or Up, then release | Charge and launch a jump. Hold a direction to aim. |
| E | Place your ember on a safe, still ledge, or pick it up when you stand beside it |
| R | After a fall, recover to your placed ember |
| Escape or P | Pause menu (settings, calibration) |
| Backtick (`` ` ``) | Show or hide the signal debug overlay |
| 1 / 2 / 3 / 4 | Simulator only: alpha boost, jaw clench, eye blink, noisy pin |

Walk, jump, recover, pause and the debug overlay can be remapped in Settings. E is fixed.

The climb is one continuous tower of five stages (Tutorial, Normal, Snow, Windy, Snowy and Windy). Landing on the last
ledge of the final stage wins the run.

## How the composure signal is used

```
PiEEG board / simulator / recording
        |  band powers
        v
src/signal/   quality check, features, calibration, smoothing
        |  ComposureState (the only thing the game may read)
        v
src/game/     lantern radius, forest corruption, recovery gate   --> never movement or physics
src/audio/    music mix
src/ui/       HUD wording, input badge
```

- **Composure** is a 0 to 1 `intensity` value, personalised by a short resting and active calibration. Higher means
  more tension. The HUD shows it as words, never as a score or a ranking.
- **What it changes:** the lantern radius, the forest corruption and the music mix. These are the three enabled rows
  in `src/config/effects.config.ts`. Each row has a cap, a smoothing time and a written never-rule, so effects move
  smoothly and ease back when you relax.
- **Candle fuel:** fuel drains with playing time, faster under high tension, and wax refills it. Low fuel shrinks the
  light, never your movement. Its numbers are in `src/config/lantern-fuel.config.ts`.
- **Recovery ember:** in calibrated play, recovering needs a few seconds of valid, relaxed signal, shown by a progress
  meter. Brief changes pause progress and never reset it. Invalid or stale data never advances it. Without
  calibration, or in fixed-light mode, recovery works directly and is labelled as ordinary-input assistance.
- **Poor signal:** quality is tracked apart from the value. Bad contact eases effects toward neutral.
- **What it never touches:** gravity, friction, jump strength, speed and steering. `src/game/player/` must not import
  the composure contract, and a lane-boundary test fails the check if it does.

The game always shows which input is active (`LIVE EEG`, `SIMULATED INPUT` or `RECORDED REPLAY`).

## Quick start

You need Git, Node.js 22.12 or newer (npm comes with it) and Chrome or Edge.

```bash
git clone https://github.com/srishanb/hackthenest-chooms.git
cd hackthenest-chooms
npm ci
node run.mjs doctor   # checks Node, dependencies and the history guard
node run.mjs dev      # starts the game and opens it
```

`npm run dev` also works; it prints a `localhost` address to open. You should see the start menu. Press Play, then
walk and jump. The input badge reads `SIMULATED INPUT`.

`npm ci` may warn that esbuild's install script was not run. That is harmless. If `npm ci` fails with a cache
permission error, run `npm_config_cache="$TMPDIR/npm-cache" npm ci` once.

### Run, check and build

| Command | What it does |
|---|---|
| `node run.mjs` | Lists every command and feature |
| `node run.mjs dev` | Start the game and open it. Add a query in quotes: `node run.mjs dev "?mode=fixed"` |
| `npm run check` (or `node run.mjs check`) | Type check plus every unit test |
| `npm run build` | Vite build into `dist/` |
| `node run.mjs build` | Full build into `dist/` with an audit that nothing needs the internet |
| `node run.mjs preview` | Build, then serve the built game the way the demo runs |
| `node run.mjs all` | Automated checks of every feature, with a pass/fail table |
| `node run.mjs <feature>` | One feature: its tests, then a guided hands-on check (for example `game-movement`) |
| `npm run check:levels` | Checks that every jump in the authored stages is reachable |
| `npm run eval -- intensity-v2 recordings/<file>.jsonl` | Score a signal algorithm against a recording |

Details: [run/README.md](run/README.md).

### Choose an input with the address

| Address | Effect |
|---|---|
| `/` or `/?source=sim` | Simulator (default) |
| `/?source=live` | Real Octopus 16 over Web Bluetooth |
| `/?source=replay&replay=<file>.jsonl` | Replay a recording from `recordings/` |
| `/?mode=fixed` | Fixed-light mode: intensity stays neutral |
| `/?algo=<id>` | Pick a signal algorithm (`intensity-v2` is the default) |

### Run on the real board

Follow [docs/OCTOPUS_TEST.md](docs/OCTOPUS_TEST.md). In short: power the board from a 5 V power bank while it is on a
head (never from a laptop or the wall), open `/?source=live`, press backtick for the debug overlay, click
**Connect Octopus 16**, then calibrate. Close any other tab that talks to the board: Bluetooth allows one connection.

## Playing without a headset

- **Simulator (default).** A keyboard-driven fake EEG. Keys 1 to 4 add an alpha boost, a jaw clench, an eye blink
  or a noisy pin, so you can watch the light, the forest and the music react.
- **Replay presets in Settings.** Five built-in recordings of band powers: Calm climb, Rising tension, Jaw clench
  bursts, Mixed climb and Noisy pin. A preset runs through the same signal pipeline as a live board. You can also
  save the last stretch of your own signal as a preset, then replay or export it. Presets stay in your browser;
  nothing is uploaded. The built-in files are in `public/recordings/presets/`.
- **Fixed light.** `/?mode=fixed` keeps intensity neutral for play with no signal at all.

## Architecture

- **Lanes.** Code is split into folders, one per lane. A lane imports only `src/shared/` and `src/config/`, never
  another lane, and a test enforces this. Each lane has an `INDEX.md` listing its public exports.
- **Stores and bus.** Signal and game code publish state to stores and events to a typed bus in `src/shared/`. UI,
  audio, narrator and recorder subscribe. The game never imports a device; it reads `ComposureState` through the
  reader it is given.
- **Effects as data.** Every signal-driven effect is a row in `src/config/effects.config.ts`. All tunable numbers
  live in typed config files with units.
- **Offline.** Nothing on the play path uses the network. Libraries come from the lockfile, `pieeg.js` is vendored in
  `public/vendor/`, and music, sound effects and narrator clips are files in `public/assets/`.

Stack: Vite 8.3.8, TypeScript 7.0.2 (strict), Phaser 4.2.1, Vitest 5.1.0. No backend.

## Repo map

| Path | What is in it | Owner |
|---|---|---|
| `src/shared/` | Contracts (types), event bus, stores | Srishan |
| `src/signal/` | Sources (simulator, replay, real board), pipeline, calibration, algorithms, presets, recorder | Srishan |
| `src/game/` | Phaser scenes, player physics, ember, candle, wax, forest, stage editor | Ali |
| `src/ui/` | HTML and CSS layer: menus, HUD, settings, calibration, captions | Amrit |
| `src/audio/` | Music mix, sound effects, narrator playback | Amrit |
| `src/content/` | Stage layouts, narrator lines | Neil |
| `src/config/` | Every tunable number, typed, with units | Lane that owns each file |
| `tools/` | Offline tools: signal eval, level checker, presets, narrator generator, build pipeline | Per lane |
| `run/`, `run.mjs` | One run file per feature, and the menu for all of them | Srishan |
| `public/` | Local art, audio, preset recordings and the vendored `pieeg.js` | Neil, Srishan |
| `recordings/` | EEG recordings (band powers only). Currently one simulated fixture. | Srishan |
| `docs/` | Plan, status, features, decisions, plans, agent reports | Srishan |

## Documentation

| Read this | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Architecture, stack, phases, risks |
| [docs/STATUS.md](docs/STATUS.md) | What is done, in progress or unverified |
| [docs/FEATURES.md](docs/FEATURES.md) | The feature list, with "As built" notes |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What was decided, when and by whom |
| [docs/OCTOPUS_TEST.md](docs/OCTOPUS_TEST.md) | First run on a real board |
| [docs/STAGE_EDITOR.md](docs/STAGE_EDITOR.md) | The in-game stage editor |
| [docs/DEMO.md](docs/DEMO.md) | The demo script |
| [docs/DEVPOST.md](docs/DEVPOST.md) | The Devpost submission text |
| [CREDITS.md](CREDITS.md) | Every third-party asset and library, with its licence |
| [AGENTS.md](AGENTS.md) | Rules for every contributor and coding agent |

## Known limitations

- **The real board is not proven in this repo.** The Web Bluetooth path is written and tested against a fake SDK.
  No recording from a real PiEEG Octopus 16 is in `recordings/`, and no agent report records a real-board run.
- The signal is not pure brain activity. Jaw, face and eye muscles change it, and so does poor electrode contact.
- Built-in presets use fixed baselines. They show how the game reacts; they are not real brain recordings and do not
  replace calibration.
- Only three effects are enabled (lantern radius, forest corruption, music mix). Fog, shadow and background-motion
  rows exist in the effects table but are switched off.
- Tested mainly in Chrome. Safari and Firefox are untested.

## Team

| Person | Lane | GitHub |
|---|---|---|
| Srishan | Integrator and signal | `srishanb` |
| Ali | Game | `avinculado` |
| Amrit | UI, audio and narrator | `prabhuamritkrishna-beep` |
| Neil | Content and tuning | `LordGlichter` |

The charge-jump climb is in the style of *Jump King*, and the narrator's tone is in the spirit of *Getting Over It*.
No code, levels or assets are reused from either. AI tools used: Claude, Antigravity, Gemini, Codex, ChatGPT.

## Licence

The project's own code and documentation are released under the [MIT License](LICENSE). Third-party assets keep their
own licences, listed in [CREDITS.md](CREDITS.md).

## Contributing

Read [AGENTS.md](AGENTS.md) first. The most important rule: never delete git history. No force pushes, no rebasing
pushed commits, no deleting branches or tags. `npm ci` installs a `pre-push` hook (in `.githooks/`) that refuses force
pushes and deletions. Each task gets its own worktree (`scripts/wt.sh new <agent-or-name> <task>`); update it with
`scripts/wt.sh sync`, which merges `origin/main`.
