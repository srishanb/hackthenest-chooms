# After-job report: no-history-deletion

- Agent: claude
- Branch and PR: claude/no-history-deletion, https://github.com/srishanb/hackthenest-chooms/pull/23
- Phase and plan: integrator task from Srishan's chat instruction (no plan file; shared files, a human merges)
- Started and finished: 22:58 to 23:05 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| `.githooks/pre-push` refuses branch/tag deletion and non-fast-forward pushes, has no override | Pass | High |
| `npm ci` installs the hook (`prepare` runs `install-git-hooks.mjs`) | Pass | High |
| `no-history-rewrite.mjs` blocks the listed commands, allows harmless look-alikes, `--self-test` with 76 cases | Pass | High for the listed forms, Medium in general (see limits) |
| `.claude/settings.json` has the PreToolUse Bash entry, Stop hook kept | Done | High (file), Not verified firing |
| `test-pre-push.sh` | Pass | High |
| `wt.sh sync` merges; `wt.sh new` sets `core.hooksPath` | Done | Medium (sync not run for real) |
| ai-review no longer deletes branches; ci runs both tests; history-guard workflow added | Done | Medium (YAML not executed on GitHub) |
| AGENTS.md rule, PR template, README, D-17, H-25 | Done | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Self-test | `node scripts/hooks/no-history-rewrite.mjs --self-test` | `76/76 self-test cases passed`, exit 0 |
| Hook blocks force push | `echo '{"tool_input":{"command":"git push --force origin main"}}' \| node scripts/hooks/no-history-rewrite.mjs` | message on stderr, exit 2 |
| Hook allows normal push | same with `git push -u origin claude/x` | silent, exit 0 |
| Garbage input | `echo garbage \| node ...` | exit 0 |
| Pre-push test | `bash scripts/hooks/test-pre-push.sh` | 10 checks ok: first push, fast-forward, new branch, force push (rewritten), `+main`, force-with-lease, `--delete`, `:feature`, force over a remote commit not known locally, push after merge; "all pre-push checks passed", exit 0 |
| Check | `npm run check` | typecheck ok; 17 test files, 103 tests passed |
| Build | `npm run build` | built ok |
| Install | `npm ci` prints the `prepare` script; `git config core.hooksPath` | `.githooks` |

**Not verified:** the Claude Code PreToolUse hook firing in a real session (only run by piping JSON); the history-guard
workflow on a real forced push or deletion (deliberately not tested); the ci.yml and ai-review.yml edits on GitHub;
Windows (Git Bash) behaviour of the pre-push hook and test script; `scripts/wt.sh sync` merge run for real.
Codex and Antigravity have no command-level hook here (their PreToolUse formats are unverified, so none was added).

## 3. Problems, workarounds and dead ends

- First `test-pre-push.sh` run had a bug in my own test (a stray reset discarded the second clone's commit, so the "unknown commit" case was a fast-forward). Fixed the test, not the hook.
- `chmod +x scripts/hooks/*.mjs` also flipped the mode of `report-check.mjs`; reverted.

## 4. Deviations from the plan

- Beyond the list, the Claude Code hook also blocks `gh pr merge|close --delete-branch` (and `-d`), consistent with the rule and the ai-review change.
- README line `scripts/wt.sh sync  # rebase ...` updated to say merge, since it would otherwise contradict the rule.
- `git -c core.hooksPath=.githooks` and `git config core.hooksPath .githooks` are allowed; any other value or an unset is blocked.
- Unbalanced quotes in a command are retokenised ignoring quotes (fail closed, may false-positive on prose).

## 5. Changes

- Files changed: `.githooks/pre-push`, `scripts/hooks/{install-git-hooks,no-history-rewrite}.mjs`, `scripts/hooks/test-pre-push.sh`, `package.json` (prepare script only), `scripts/wt.sh`, `.claude/settings.json`, `.github/workflows/{ai-review,ci,history-guard}.yml`, `.github/pull_request_template.md`, `AGENTS.md`, `README.md`, `docs/DECISIONS.md`, `docs/HUMAN_TASKS.md`, this report.
- Contract or config-schema changes requested: None
- New dependencies requested: None (lockfile untouched)
- Edits outside my lane: all are integrator/shared files, as intended
- `INDEX.md` updated for new exports: not applicable

## 6. Follow-ups and questions for humans

- [ ] Srishan: H-25, turn on the GitHub ruleset once the repo is public. Confirm "delete head branches on merge" is off (D-17 says it was).
- [ ] Teammates with existing clones: run `npm ci` (or `node scripts/hooks/install-git-hooks.mjs`) after this merges.

## 7. Can a teammate explain this?

Pushed history can never be erased: a git hook refuses force pushes and deletions before they leave the laptop,
and a Claude Code hook blocks the dangerous commands before they run. To update a branch you merge instead of
rebasing. A workflow shouts if anything ever slips through to GitHub.

Limits: the pre-push hook only exists in clones that ran `npm ci` or `wt.sh new` after this merges, and only on
branches that contain `.githooks/`. The GitHub web interface can still delete a branch until the ruleset in H-25 is
on. Squash merges keep each PR's individual commits only on the PR and its branch, which is why branches must stay.
The Claude hook is a guardrail against honest mistakes (it does not follow aliases, scripts or variables), not a sandbox.
