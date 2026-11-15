# Team onboarding

Four people, several AI agents, one repo. Read this page, then your own file: [amrit.md](amrit.md),
[neil.md](neil.md), [ali.md](ali.md). Srishan is the integrator (root config, `src/shared/`, signal lane).
Rules every agent follows are in [AGENTS.md](../../AGENTS.md); the schedule and phases are in
[PLAN.md](../PLAN.md); open human jobs are in [HUMAN_TASKS.md](../HUMAN_TASKS.md).

## How a task flows

1. Your agent writes `docs/plans/<phase-id>.md` (model: [P0.md](../plans/P0.md)) and opens a **draft PR**. It then stops.
2. You read the plan. If it is right, **you** change its status line to `Status: APPROVED by <your name>`.
   Agents never write that line, and nothing else counts as approval.
3. The agent builds, runs `npm run check`, and writes an after-job report in `docs/agent-reports/`.
4. The PR is marked ready. AI review merges it if clean, or adds the `needs-human` label.

You approve plans for your own lane. Srishan approves anything that touches a shared file.

## Commands (Git Bash on Windows)

| Command | Does |
|---|---|
| `scripts/wt.sh new <agent> <task>` | New worktree `../wt-<agent>-<task>`, branch `<agent>/<task>`. `<agent>` = `claude`, `codex`, `ag`, or your name |
| `scripts/wt.sh sync` | Rebase your branch onto `origin/main`. Run before a new task |
| `scripts/wt.sh ls` / `rm <agent> <task>` | List or remove worktrees |
| `npm ci` | Install exact dependencies (once per worktree) |
| `npm run check` | Type check and unit tests. Must pass before a PR |
| `npm run dev` | Dev server on the `PORT` in your worktree's `.env.local` |

One agent, one worktree. Never edit another `wt-*` folder or `codebase/`. Put keys only in `.env.local`.

## Which agent reads which file

| Tool | Reads automatically |
|---|---|
| Claude Code | `CLAUDE.md` (which imports `AGENTS.md`) |
| Codex | `AGENTS.md` |
| Antigravity | `AGENTS.md` and `GEMINI.md` (which points to `AGENTS.md`) |

Current assignment (humans may reassign): Claude Code on Opus 5.5, medium effort, does integration and sensitive
work. The Codex instance takes the P1 stages (agent B in `docs/plans/P1.md`, which is in [PR 5](https://github.com/srishanb/hackthenest-chooms/pull/5) until Srishan approves and merges it). The Antigravity instance takes the P1 tools
(agent C in the same plan). Pick whichever tool is free for UI, content and game tasks.

## Start prompts (copy, fill in the angle brackets)

Claude Code:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new claude <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

Codex:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new codex <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

Antigravity:
```
Read AGENTS.md, docs/PLAN.md, docs/STATUS.md and docs/plans/<plan-file>.md. My task: <task>. Create a worktree
with scripts/wt.sh new ag <task>. Write docs/plans/<phase-id>.md using docs/plans/P0.md as the model, open a
draft PR, then STOP. Do not build anything until I change the plan's status line to "Status: APPROVED by <my name>".
Never write that line yourself.
```

## Hard rules (all of AGENTS.md applies; these four bite most)

- **Framing:** the signal is "composure" (calm versus tension). Never "emotion", "stress" (in text players or judges
  see), diagnosis, or medical claims. Say muscle activity is part of it.
- **EEG never changes physics:** gravity, friction, jump, speed and steering are fixed.
- **No AI-generated art.** Free existing assets only, each logged in `CREDITS.md`.
- **Never commit keys.** `.env.local` only, never a `VITE_` prefix.
