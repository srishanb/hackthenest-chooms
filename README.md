# Lighten Up

A 2D charge-jump climbing game for Hack The Nest 2026 (Nov 14-15, Eastern Michigan University), Mind and Machine
(BCI) track. It runs in Chrome or Edge.

You carry a candle up a tall forest tower. You cannot die: a missed jump only costs height. A PiEEG Octopus 16 EEG
board changes how far your light reaches, how thick the fog is and how the music sounds. It also gates a recovery
mechanic: a placed ember that returns you to the ledge you fell from.

**The signal never touches the controls.** Gravity, friction, jump strength, speed and steering are the same whether
you are calm or tense, and whether the input is a real board, the simulator or a recording. This is enforced by a
test, not only by a promise (see [How the signal is used](#how-the-signal-is-used)).

It is composure practice and an experimental prototype. It is **not** a medical device and it does not diagnose
anything. The signal is a measure of calm versus tension, and muscle activity (a clenched jaw, for example) is part
of it. We say that openly.

- **Play online:** https://srishanb.github.io/hackthenest-chooms/ (live once GitHub Pages is enabled). Best in Chrome or
  Edge, which the real board needs for Web Bluetooth. The simulator and presets should work in any modern browser
  (untested in Safari and Firefox).
- **What worked / what didn't:** _to be written before submission (Sun 12:00 PM)._
- **Stack:** Vite 8.3.8, TypeScript 7.0.2 (strict), Phaser 4.2.1, Vitest 5.1.0, `pieeg.js` (vendored). No backend.
- **Credits:** see [CREDITS.md](CREDITS.md). The charge-jump climb is in the style of *Jump King*; the narrator's tone
  is in the spirit of *Getting Over It*. No code, levels or assets are reused from either.
- **AI tools used:** Claude, Antigravity, Gemini, Codex, ChatGPT.

## Hardware status, plainly

| Input | Status |
|---|---|
| Simulator (default) | Built and tested. Keyboard-driven fake EEG, so the game is fully playable with no board. |
| Recorded replay | Built and tested. Plays a saved `.jsonl` recording through the same pipeline. |
| PiEEG Octopus 16 over Web Bluetooth | Code is written and tested against a fake SDK. **It has not yet been run on a real board.** The first-run steps are in [docs/OCTOPUS_TEST.md](docs/OCTOPUS_TEST.md). |

The game always shows which input is active (`LIVE EEG`, `SIMULATED INPUT` or `RECORDED REPLAY`). If the board or
the signal fails, the game keeps working: effects ease toward neutral and a fixed-light mode is available.

## How to play

| Key | Action |
|---|---|
| Left / Right, or A / D | Walk |
| Hold Space or Up, then release | Charge and launch a jump. Direction keys set the direction. |
| E | Place your ember on a safe ledge, or pick it up when you stand beside it |
| R | After a fall, recover to the placed ember (press again to cancel) |
| Escape | Pause, settings, calibration |
| Backtick (`` ` ``) | Toggle the signal debug overlay |

Keys can be remapped in Settings. In simulator mode: 1 alpha boost, 2 jaw clench, 3 eye blink, 4 noisy pin.

The climb is one continuous tower of five stages (Tutorial, Normal, Snow, Windy, Snowy and Windy), ten ledges each.
Landing on the last ledge of the final stage wins the run.

## How the signal is used

```
PiEEG board / simulator / recording
        |  band powers
        v
src/signal/   quality check, features, calibration, smoothing
        |  ComposureState (the only thing the game may read)
        v
src/game/     lantern radius, fog, shadows, recovery gate     --> never movement or physics
src/audio/    music mix (one ambient loop; no separate tense stem yet)
src/ui/       HUD wording, status
```

- **Composure** is a 0 to 1 `intensity` value personalised to each person by a short resting and active calibration.
  Higher means more tension. The HUD shows it as words (lower, midrange, higher), never as a score or a percentage.
- **Lantern, fog, shadows, music:** the music mix is bounded and plays one local ambient loop; a separate tense layer is not
  included yet. Most effects are rows in `src/config/effects.config.ts`, each with a cap, a smoothing
  time constant and a written never-rule. Effects move smoothly and ease back when you relax.
- **Candle fuel:** the one effect that does not fully reverse. Fuel drains with playing time, up to about five times
  faster under high tension, and wax refills it. Low fuel shrinks the light, never your movement. Its numbers are in
  `src/config/lantern-fuel.config.ts`; the HUD shows it as a percentage of fuel left, not a composure value.
- **Recovery ember:** in calibrated play, recovery needs about four seconds of valid, relaxed signal, with a visible
  progress meter. Brief fluctuations pause progress and never reset it. Invalid or stale data never advances it. With
  fixed-light play or no calibration, recovery works directly and is labelled as ordinary-input assistance.
- **Physics are protected:** `src/game/player/` must not import the composure contract, and a lane-boundary test fails
  the build if it does.
- **Poor signal:** quality is tracked separately from the value. Bad contact eases effects toward neutral and pauses
  ember progress.

Full design: [docs/PLAN.md](docs/PLAN.md). Feature list: [docs/FEATURES.md](docs/FEATURES.md).

## Quick start

You need Git, Node.js 22.12 or newer (the team uses Node 26 LTS; npm comes with it) and Chrome or Edge. Web Bluetooth
works only in Chromium browsers.

```bash
git clone https://github.com/srishanb/hackthenest-chooms.git
cd hackthenest-chooms
npm ci
```

```bash
node run.mjs doctor
```

```bash
node run.mjs dev
```

`doctor` checks Node, dependencies and the history guard. `dev` starts the game and opens it. Prefer plain npm?
`npm run dev` prints a `localhost` URL to open instead. You should see the start menu; press Play, then walk and jump.
The source badge reads `SIMULATED INPUT`.

`npm ci` may print a warning that esbuild's install script was not run. That is npm's default and is harmless.
If `npm ci` fails with a cache permission error, run it once as `npm_config_cache="$TMPDIR/npm-cache" npm ci`.

### Choose an input with the URL

| Address | Effect |
|---|---|
| `/` or `/?source=sim` | Simulator (default) |
| `/?source=live` | Real Octopus 16 over Web Bluetooth (not yet run on a real board) |
| `/?source=replay&replay=<file>.jsonl` | Replay a recording from `recordings/` (dev server and built game) |
| `/?mode=fixed` | Fixed-light fallback: intensity stays neutral |
| `/?algo=<id>` | Pick a signal algorithm (`intensity-v2` is the default) |

### Run on the real board

Follow [docs/OCTOPUS_TEST.md](docs/OCTOPUS_TEST.md). In short: flash the board once, power it from a 5 V power bank
while it is on a head, open `/?source=live`, press backtick for the debug overlay, click **Connect Octopus 16**, then
run the guided eyes-open / eyes-closed checkpoint. Close any other tab (such as `cloud.pieeg.com`) that talks to the
board: Bluetooth allows one connection. Never power the board from a laptop or the wall while it is on a head.

### Tests and build

| Command | What it does |
|---|---|
| `npm run check` | Type check plus every unit test |
| `npm run check:levels` | Checks that every jump in the authored stages is reachable |
| `npm run eval -- intensity-v2 recordings/<file>.jsonl` | Score an algorithm against a recording |
| `node run.mjs all` | Automated checks of every feature, with a pass/fail table |
| `node run.mjs <feature>` | One feature: its tests, then a guided hands-on check (for example `game-movement`) |
| `node run.mjs build` | Full build into `dist/` with an audit that nothing needs the internet |
| `node run.mjs preview` | Build, then serve the built game the way the demo runs |

`node run.mjs` with no arguments lists every command and feature. Details: [run/README.md](run/README.md).

### Offline

Nothing on the play path uses the network. Libraries come from the lockfile, `pieeg.js` is vendored in
`public/vendor/`, and music, sound effects and narrator clips are files in `public/assets/`. Narrator lines are drafted
and voiced once at build time by `tools/narrator/` (see [tools/narrator/README.md](tools/narrator/README.md)); the game
never calls an API while you play. To check: `node run.mjs preview`, turn Wi-Fi off, reload, play.

## Project structure

Code is split into lanes (folders). A lane imports only `src/shared/` and `src/config/`, never another lane; a test
enforces it. Each lane has an `INDEX.md` listing its public exports.

| Path | What is in it | Owner |
|---|---|---|
| `src/shared/` | Contracts (types), event bus, store. Frozen after P0. | Srishan |
| `src/signal/` | Sources (simulator, replay, real board), pipeline, calibration, algorithms, recorder | Srishan |
| `src/game/` | Phaser scenes, player physics, ember, forest presentation, stage editor | Ali |
| `src/ui/` | HTML/CSS layer: menus, HUD, settings, calibration, captions | Amrit |
| `src/audio/` | Music mix, sound effects, narrator playback | Amrit |
| `src/content/` | Stage data, narrator lines | Neil |
| `src/config/` | Every tunable number, typed, with units | Lane that owns each file |
| `tools/` | Offline tools: signal eval, level checker, narrator generator, build pipeline | Per lane |
| `run/`, `run.mjs` | One run file per feature, and the menu for all of them | Srishan |
| `public/assets/`, `public/vendor/` | Local art, audio, and the vendored `pieeg.js` | Neil, Srishan |
| `recordings/` | EEG recordings (band powers only, no names). Currently only a simulated fixture. | Srishan |
| `docs/` | Plan, status, features, decisions, plans, agent reports | Srishan |

## Where to read more

| Read this | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Architecture, tech stack, phases, timeline, risks |
| [docs/STATUS.md](docs/STATUS.md) | What is done, in progress, or unverified |
| [docs/FEATURES.md](docs/FEATURES.md) | The feature list, with "As built" notes where the build moved on |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What was decided, when, by whom |
| [docs/HUMAN_TASKS.md](docs/HUMAN_TASKS.md) | Things only a person can do |
| [docs/OCTOPUS_TEST.md](docs/OCTOPUS_TEST.md) | First run on a real board |
| [CREDITS.md](CREDITS.md) | Every third-party asset and library, with its licence |
| [AGENTS.md](AGENTS.md) | Rules for every coding agent |

## Team

| Person | Lane | GitHub |
|---|---|---|
| Srishan | Integrator, signal | `srishanb` |
| Ali | Game | `avinculado` |
| Amrit | UI, audio and narrator | `prabhuamritkrishna-beep` |
| Neil | Content and tuning | `LordGlichter` |

## Licence

The project's own code and documentation are released under the [MIT License](LICENSE). Third-party assets keep
their own licences, listed in [CREDITS.md](CREDITS.md).

## Contributing

Several coding agents (Claude Code, Codex, Antigravity) and four people work on this repo in parallel. Read
[AGENTS.md](AGENTS.md) first; it is the rulebook.

### Never delete git history

The most important rule: no force pushes, no rebasing pushed commits, no deleting branches or tags. `npm ci` installs a
`pre-push` hook (in `.githooks/`) that refuses force pushes and deletions. If a push is rejected, do not force it:
`git fetch origin`, then `git merge origin/<branch>`, then push again. To undo a pushed change, add a `git revert`
commit.

### Setup for contributors

| What | Why | Check |
|------|-----|-------|
| Git 2.20+ | Clone, branches, worktrees | `git --version` |
| Repo access and git auth | Push needs a GitHub invite and an SSH key or `gh auth login` | `gh auth status` |
| Bash | `scripts/wt.sh` is bash. Windows: use Git Bash or WSL, not PowerShell | `bash --version` |
| Node.js 22.12+ | Runs the game, tests and tools | `node --version` |

Copy `.env.example` to `.env.local` for the dev-server `PORT` and, only if you regenerate narrator clips, the API
keys shared privately by the team. Never commit `.env*` files other than `.env.example`, and never give a key a
`VITE_` prefix. Per-OS install commands are in [docs/PLAN.md](docs/PLAN.md#5-install-list).

### Working in parallel

Each task gets its own worktree, created next to the repo:

```bash
scripts/wt.sh new <agent-or-name> <task>   # creates ../wt-<agent>-<task> on branch <agent>/<task>
scripts/wt.sh ls                           # list worktrees
scripts/wt.sh sync                         # merge origin/main into the current branch
scripts/wt.sh rm <agent-or-name> <task>    # remove a worktree (branch kept)
```

Install dependencies in the new worktree (`npm ci`) and use the `PORT` in its `.env.local`. Always push with the branch
name: `git push -u origin <agent>/<task>`.

### How a task flows

1. Check the work is not already done or claimed (pre-code check in [AGENTS.md](AGENTS.md)).
2. Optionally write a plan in `docs/plans/`. Since Decision D-22 a plan is guidance, not a gate.
3. Build, run `npm run check`, and write an after-job report in `docs/agent-reports/`.
4. Open a pull request and mark it ready. The reviewer agent runs the checks and merges it unless it breaks something
   or goes against the game's rules (D-18, D-22). No human review is needed.

A Stop hook reminds an agent once if its branch has work but no after-job report. Trust it once per tool (Claude Code
workspace trust dialog; `/hooks` in Codex; Settings, Customizations, Hooks in Antigravity).
