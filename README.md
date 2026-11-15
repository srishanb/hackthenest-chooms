# Lighten Up

Hack The Nest 2026 (Nov 14–15, Eastern Michigan University), Mind and Machine (BCI) track.

A 2D charge-jump climbing game played in Chrome or Edge. You carry a lantern up a tower and cannot die; a missed
jump only costs height. A PiEEG Octopus 16 EEG board drives how far the lantern reaches, the fog and the music, and
gates a "recovery ember" that returns you to the ledge you fell from. The signal never changes your controls.

It is composure practice and an experimental prototype. It is **not** a medical device, and it does not claim to
detect emotion or stress; muscle activity is part of the signal.

- **What worked / what didn't:** _to be written before submission (Sun 12:00 PM)._
- **Stack:** Vite 8.3.8, TypeScript 7.0.2 (strict), Phaser 4.2.1, Vitest 5.1.0, `pieeg.js` (vendored). No backend.
- **Credits:** the charge-jump climb is in the style of *Jump King*; the narrator's tone is in the spirit of
  *Getting Over It*. Assets are listed in `CREDITS.md`.
- **AI tools used:** Claude, Antigravity, Gemini, Codex, ChatGPT.

## Where things are

| Read this | For |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Architecture, tech stack, phases, timeline, risks |
| [docs/STATUS.md](docs/STATUS.md) | What is proposed, approved, in progress, done |
| [docs/HUMAN_TASKS.md](docs/HUMAN_TASKS.md) | Things only a person can do, and what breaks if they are skipped |
| [docs/FEATURES.md](docs/FEATURES.md) | The feature list and its status (provisional or final) |
| [docs/DECISIONS.md](docs/DECISIONS.md) | What was decided, when, by whom |
| [AGENTS.md](AGENTS.md) | Rules for every coding agent |

Multiple coding agents (Claude Code, Codex, Antigravity) work on this repo in parallel, each in its own
git worktree.

## Never delete git history

The most important rule here: no force pushes, no rebasing pushed commits, no deleting branches or tags. Read the
full rule in [AGENTS.md](AGENTS.md). `npm ci` installs a `pre-push` hook (in `.githooks/`) that refuses force pushes
and deletions. If a push is rejected, do not force it: `git fetch origin`, then `git merge origin/<branch>`, then
push again. To undo a pushed change, add a `git revert` commit.

## Setup

### Requirements

| What | Why | Check |
|------|-----|-------|
| Git 2.20+ | Clone, branches, worktrees | `git --version` |
| Repo access | Accept the GitHub collaborator invite | — |
| Git auth | SSH key or `gh auth login`, so you can push | `gh auth status` |
| Bash | `scripts/wt.sh` is bash. Built in on macOS/Linux; **Windows: use Git Bash or WSL** (not PowerShell) | `bash --version` |
| Git identity | Commits show who made them | `git config --global user.name` / `user.email` |
| Node.js 26 LTS (includes npm) | Runs the game, tests and tools. Install from [nodejs.org](https://nodejs.org) | `node --version` / `npm --version` |
| Chrome or Edge | Web Bluetooth (the EEG board) works only in Chromium browsers, on `localhost` | — |
| A coding agent | Claude Code, Codex, or Antigravity — each reads `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` automatically | — |

Per-OS install commands and optional tools are in [docs/PLAN.md §5](docs/PLAN.md#5-install-list).

### First-time clone

Clone into its own parent folder — worktrees are created **next to** the repo, not inside it.

```bash
mkdir hackathon && cd hackathon
git clone git@github.com:srishanb/hackthenest-chooms.git codebase
cd codebase
```

Copy `.env.example` to `.env.local` and fill in keys shared privately by the team. Never commit `.env*`
files (other than `.env.example`).

### Verify your setup

Run these in the repo folder (Git Bash on Windows):

```bash
npm ci
```

```bash
npm run check
```

```bash
npm run dev
```

`npm run check` is the type check plus unit tests. `npm run dev` prints a `localhost` URL; open it in Chrome or Edge
and confirm you see a box standing on a platform inside a pool of light, and a `SIMULATED INPUT` badge. Left and
Right move the box; the backtick key (`` ` ``) toggles the signal debug overlay.

`npm ci` prints a warning that esbuild's install script was not run. That is npm 11's default and is harmless here.
If `npm ci` fails with a cache permission error, run it once as `npm_config_cache="$TMPDIR/npm-cache" npm ci`.

### Run and test

`run.mjs` is the one file to start from. It works the same in a Mac terminal, Git Bash, PowerShell and cmd.

```bash
node run.mjs doctor
```

```bash
node run.mjs
```

`doctor` checks your computer. `node run.mjs` lists every command and every feature you can try. The most useful:

| Command | What it does |
|---|---|
| `node run.mjs dev` | Start the game and open it |
| `node run.mjs check` | Type check plus every automated test |
| `node run.mjs all` | Automated checks of every feature, with a pass/fail table |
| `node run.mjs <feature>` | One feature: its tests, then a guided hands-on check (for example `game-movement`) |
| `node run.mjs build` | Full build into `dist/`, with an audit that nothing needs the internet |
| `node run.mjs preview` | Build, then serve the built game the way the demo will run |

Each feature has its own file under [run/](run/README.md). Add one when you build something new.

### Working in parallel

```bash
scripts/wt.sh new <agent-or-name> <task>   # creates ../wt-<agent>-<task> on branch <agent>/<task>
scripts/wt.sh ls                           # list worktrees
scripts/wt.sh sync                         # merge origin/main into the current branch
scripts/wt.sh rm <agent-or-name> <task>    # remove a worktree (branch kept)
```

Open the new `wt-*` folder in your agent, install dependencies there (`npm ci`), and use the `PORT` in its
`.env.local` for dev servers. Finish each task with a PR into `main`.

```
hackathon/
  codebase/          main (integration)
  wt-claude-<task>/  claude/<task>
  wt-codex-<task>/   codex/<task>
  wt-ag-<task>/      ag/<task>
```

### How a task flows

1. The agent writes `docs/plans/<phase-id>.md` and opens a draft PR.
2. The plan's owner reads it and approves it: they change its status line to `Status: APPROVED by <name>`, or tell
   their own agent to record that approval. No other agent may approve it.
3. The agent builds, runs `npm run check`, and writes an after-job report in `docs/agent-reports/`.
4. The PR is marked ready. The reviewer agent (an Opus 5.5 session) reviews it, runs the checks, and squash-merges it or comments with what to fix. No human review is needed.

### Hooks (once per tool)

A Stop hook reminds an agent once if its branch has work but no after-job report. Trust it once: accept the workspace
trust dialog in Claude Code; run `/hooks` in Codex; check Settings → Customizations → Hooks in Antigravity.

## The EEG board

- First-time flash: `octobridge.pieeg.com/flash` in desktop Chrome or Edge with a USB-C **data** cable.
- **While it is on a head, power it only from a 5 V power bank**, never from a laptop or the wall.
- No board? Run with `?source=sim` (the default) to use the built-in simulator.
- Borrowed hardware goes back before we leave.
