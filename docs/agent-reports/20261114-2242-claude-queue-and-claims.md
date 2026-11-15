# After-job report: queue-and-claims

- Agent: claude (Sonnet 5.5 subagent executing a design written by the Fable orchestrator at Srishan's instruction)
- Branch and PR: claude/queue-and-claims, see the PR for this branch
- Phase and plan: none. Integrator docs change requested by Srishan in chat ("remove the headset, it is no longer borrowable... I want one sonnet 5.5 chat to be continually developing, going task by task... immediately commit and push saying it is doing a task so no other agents attempt it"). No plan file.
- Started and finished: 22:45 to 23:00 Eastern (approx.)

## 1. What I believe is complete

| Acceptance test (from the request) | Result | Confidence |
|---|---|---|
| docs/QUEUE.md added verbatim | Pass | High |
| AGENTS.md: claims section after After-job report, `sonnet` agent name, QUEUE.md in shared files and read list, hardware bullet | Pass | High |
| DECISIONS.md: D-13 to D-16 added, R-08 and O-01 removed | Pass | High |
| HUMAN_TASKS.md: H-20 removed, H-01 ticked | Pass | High |
| PLAN.md: Unicorn references removed or marked Removed | Pass | High |
| STATUS.md and onboarding/ali.md updated | Pass | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Files touched | `git diff --stat` | Only the listed docs files and QUEUE.md |
| No stale Unicorn mentions | `grep -rn -i unicorn AGENTS.md docs/PLAN.md docs/HUMAN_TASKS.md docs/DECISIONS.md` | Only the D-14 row and the PLAN.md "Removed" row |

**Not verified:** nothing here is code; no command beyond git/grep was run; the claim protocol has not been exercised yet.

## 3. Problems, workarounds and dead ends

- None. `docs/onboarding/ali.md` also had stale "Do first tonight" and "Ask your agent" text about PROVISIONAL, which I updated along with the P4 line.

## 4. Deviations from the plan

- This PR changes how approval works for queue tasks, so it must be merged by a human, and that merge is the approval.
- The FEATURES.md status line was written by a teammate directly on main, not by an agent. Its format "FINAL (10:31 PM)" lacks the name and date the file's comment asks for; left as is.
- AGENTS.md binding rule 7 (feature gate wording) left unchanged as instructed; it only applies while PROVISIONAL.
- docs/PLAN.md line 430 (7-Zip, g.tec dataset archives) left as is; it does not present the Unicorn as an option.

## 5. Changes

- Files changed: AGENTS.md, docs/QUEUE.md (new), docs/DECISIONS.md, docs/HUMAN_TASKS.md, docs/PLAN.md, docs/STATUS.md, docs/onboarding/ali.md, this report.
- Contract or config-schema changes requested: None.
- New dependencies requested: None.
- Edits outside my lane: all are integrator-lane docs and shared files, requested by the integrator.
- `INDEX.md` updated for new exports: not applicable.

## 6. Follow-ups and questions for humans

- [ ] A human must merge this PR; the merge approves the tasks in docs/QUEUE.md (Srishan).
- [ ] FEATURES.md status line could be changed to the "FINAL (<name>, <date>)" form (team).

## 7. Can a teammate explain this?

This adds a task list that one builder agent works through, and a rule that every agent claims a task with a pushed branch and draft PR before building so nobody duplicates work. It also records that the Unicorn headset is gone and the feature list is final.
