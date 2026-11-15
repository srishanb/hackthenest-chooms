# Run files: try one feature at a time

Every file in this folder runs and checks **one feature**. Each does two things:

1. runs that feature's automated tests, and
2. starts the game, opens it at the right address, and prints what to press and what you should see.

`run.mjs` at the repo root is the menu for all of them.

## Start here

```bash
npm ci
```

```bash
node run.mjs doctor
```

```bash
node run.mjs
```

`doctor` checks this computer (Node, dependencies, the history guard). `node run.mjs` with nothing after it lists
every command and every feature. All of it works the same in a Mac terminal, Git Bash, PowerShell and cmd.

## Everyday commands

| Command | What it does |
|---|---|
| `node run.mjs dev` | Start the game and open it. Add an address query in quotes: `node run.mjs dev "?mode=fixed"` |
| `node run.mjs check` | Type check plus every automated test |
| `node run.mjs all` | The automated checks of every feature, with a pass/fail table |
| `node run.mjs <feature>` | One feature: its tests, then the guided hands-on check |
| `node run.mjs build` | The full build into `dist/` (see below) |
| `node run.mjs preview` | Build, then serve the built game the way the demo will run |

A feature file can also be started directly: `node run/game-movement.mjs`.

Flags for a feature: `--tests-only` (no browser), `--no-tests` (browser only), `--no-open` (print the address
instead of opening it). Press Ctrl-C in the terminal when you are done; that also stops the dev server it started.

## The features

Run `node run.mjs` for the live list. Each one is marked:

- **READY**: built; test it now.
- **PARTIAL**: some of it is built; the file says what is missing.
- **PLANNED**: not built yet; the file is the checklist for when it is, and names the plan.

| Group | Files |
|---|---|
| Signal | `signal-simulator`, `signal-calibration`, `signal-fixed-mode`, `signal-replay`, `signal-recording`, `signal-checkpoint`, `signal-eval`, `signal-live-board` |
| Game | `game-movement`, `game-falling`, `game-save-refuge`, `game-finish`, `game-lantern`, `game-levels`, `game-ember` |
| Interface | `ui-hud`, `ui-pause-settings`, `ui-calibration-screens` |
| Audio | `audio-mix`, `narrator` |
| Repo and demo | `process-guards`, `demo-offline` |

Keys in the game: Left and Right walk, hold Space to charge a jump and release to leap, Escape pauses, the backtick
key (`` ` ``) opens the signal debug overlay. Simulator keys: 1 alpha boost, 2 jaw clench, 3 eye blink, 4 noisy pin.

## Add a run file for your feature

1. Copy a file in this folder and rename it, for example `run/game-wind.mjs`.
2. Edit the object: `id` (the same as the file name), `title`, `status`, the `tests` it should run, the `query` to
   open, the `steps` to follow and the `expect` list of what proves it works.
3. Run `node run.mjs selftest`. It checks that every file is well formed.

Nothing else needs editing: `run.mjs` finds the file by itself. Keep the wording to what a person can see on screen,
and follow the framing rule in `AGENTS.md` (the self-test rejects the banned words).

## The build

`node run.mjs build` runs `tools/pipeline/build.mjs`, which stops at the first step that fails:

| Step | What it proves |
|---|---|
| preflight | Node is new enough, dependencies are installed, and which commit is being built |
| typecheck, tests, levels | The code is sound (skipped with `--fast`; never ship a `--fast` build) |
| bundle | Vite builds the game into a fresh `dist/` |
| recordings | `recordings/*.jsonl` are copied in, so `?source=replay` works in the built game |
| audit | The built page loads nothing from the internet and every file it names exists |
| stamp | `dist/build-info.json` records the commit, the time and every file's size |

To add a step, add one entry to `STEPS` in `tools/pipeline/build.mjs`.

For the demo: `node run.mjs preview`, then turn the Wi-Fi off and reload (`node run.mjs demo-offline` lists the steps).
