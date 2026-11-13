# hackthenest-chooms

Hack The Nest 2026 (Nov 14–15, Eastern Michigan University). Idea and stack: **TBD**.

Multiple coding agents (Claude Code, Codex, Antigravity) work on this repo in parallel, each in its own
git worktree. Rules for agents live in [AGENTS.md](AGENTS.md).

## Setup

### Requirements

| What | Why | Check |
|------|-----|-------|
| Git 2.20+ | Clone, branches, worktrees | `git --version` |
| Repo access | Private repo — accept the GitHub collaborator invite | — |
| Git auth | SSH key or `gh auth login`, so you can push | `gh auth status` |
| Bash | `scripts/wt.sh` is bash. Built in on macOS/Linux; **Windows: use Git Bash or WSL** (not PowerShell) | `bash --version` |
| Git identity | Commits show who made them | `git config --global user.name` / `user.email` |
| A coding agent | Claude Code, Codex, or Antigravity — each reads `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` automatically | — |

Once the stack is chosen (likely): Node.js LTS + pnpm/npm, Python 3.11+ with `uv`/`pip`, and the Vercel /
Firebase CLI for whoever deploys.

### First-time clone

Clone into its own parent folder — worktrees are created **next to** the repo, not inside it.

```bash
mkdir hackathon && cd hackathon
git clone git@github.com:srishanb/hackthenest-chooms.git codebase
cd codebase
```

Copy `.env.example` to `.env.local` and fill in keys shared privately by the team. Never commit `.env*`
files (other than `.env.example`).

### Working in parallel

```bash
scripts/wt.sh new <agent-or-name> <task>   # creates ../wt-<agent>-<task> on branch <agent>/<task>
scripts/wt.sh ls                           # list worktrees
scripts/wt.sh sync                         # rebase current branch onto origin/main
scripts/wt.sh rm <agent-or-name> <task>    # remove a worktree (branch kept)
```

Open the new `wt-*` folder in your agent, install dependencies there, and use the `PORT` in its
`.env.local` for dev servers. Finish each task with a PR into `main`.

```
hackathon/
  codebase/          main (integration)
  wt-claude-<task>/  claude/<task>
  wt-codex-<task>/   codex/<task>
  wt-ag-<task>/      ag/<task>
```
