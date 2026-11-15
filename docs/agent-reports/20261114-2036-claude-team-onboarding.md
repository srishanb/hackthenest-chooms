# After-job report: team onboarding guides

- Agent: claude (Sonnet 5.5 orchestrating; a Sonnet subagent drafted the files to save tokens)
- Branch and PR: `claude/team-onboarding`, see the PR this file is part of
- Phase and plan: none (docs-only request from Srishan: "add instruction to repo for Amrit, Neil and Ali")

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| `docs/onboarding/README.md`: task flow, commands, per-tool start prompts, hard rules | Done | High |
| `docs/onboarding/{amrit,neil,ali}.md`: lane, phases, first tasks, owned human tasks, off-limits files | Done | Medium: content copied from PLAN, AGENTS and HUMAN_TASKS by the subagent; I read README and ali.md fully and spot-checked the other two |

## 2. How I verified it

Read `README.md` and `ali.md` in full; grepped `amrit.md` and `neil.md` for deadlines, tools and key rules. No code, so no tests.

**Not verified:** every ID and deadline in `amrit.md` and `neil.md` against `HUMAN_TASKS.md` line by line; that Antigravity auto-reads `AGENTS.md` and `GEMINI.md` (the docs page we read says it does for workspace rules).

## 3. Problems and workarounds

- The subagent flagged that `docs/plans/P1.md` is not on `main` (PR 5 is unmerged), so the Codex and Antigravity assignment points to that PR.
- Neil's H-02 and H-03 deadlines (Sat 9:00 and 10:30 PM) are copied as written and may already be late.
- `HUMAN_TASKS.md` says the Devpost draft is due Sun 12:00 AM; `PLAN.md` §7 says submit it by Sat 11:30 PM. Amrit's guide says aim for 11:30 PM, hard deadline 12:00 AM.

## 4. Deviations from the plan

None; no plan file. Docs only, in a new folder (`docs/onboarding/`), touching no shared file.

## 5. Changes

Files: the four above plus this report. No contract, config or dependency changes.

## 6. Follow-ups

- [ ] Each teammate: read your own file and tell Srishan what is wrong or missing.
- [ ] Srishan: approve and merge P1 (PR 5) so the P1 references resolve.

## 7. Can a teammate explain this?

These four pages tell each person what they own, what to do first tonight, and the exact prompt to paste into their AI tool so it plans first and waits for approval.
