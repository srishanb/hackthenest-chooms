# After-job report: relax the approval gate (agents may record their owner's approval)

- Agent: claude (Fable 5.2 orchestrator, integrator rule change)
- Branch and PR: `claude/approval-by-agent`, see the PR this file is part of
- Phase and plan: none. Srishan was shown both options (keep the rule, or let an agent record an approval when its
  owner tells it to) and answered in chat: "Relax it".
- Started and finished: 23:45 to 23:52 Eastern, Sat 14 Nov 2026

## 1. What I believe is complete

| Item | Result | Confidence |
|---|---|---|
| `AGENTS.md` approval gate, step 3: the approver may type the line or tell their own agent to record it, with an approval note, from the approver's own GitHub account | Done | High |
| Step 4: lane owners approve their own plans, including ones asking for a small contract change; Srishan approves integrator work | Done | High |
| A person, lane and GitHub account table, so the reviewer can check who recorded an approval | Done | Medium: `avinculado` = Ali is inferred from PR 31's title, `LordGlichter` = Neil from PR 18's first title |
| Matching wording in "Review and merge", `README.md`, `docs/onboarding/README.md`, `docs/plans/README.md`; Decision D-20 | Done | High |

## 2. How I verified it

Pre-code check: no PR or text on `main` relaxes the approval rule (PR 31 records one approval; it does not change the
rule). Read the full diff: five files. No plan file was edited.

**Not verified:** how the reviewer applies the new rule to the held PRs (18, 24, 26, 27, 30, 31). The account mapping
for Ali and Neil is inferred, not confirmed by them.

## 3. Problems, workarounds and dead ends

- Every plan file carries the comment "Agents never write that line". Editing that comment in each plan would
  conflict with the open PRs that change line 3 of those files, so `AGENTS.md` states that the comment is superseded.

## 4. Deviations from the plan

- Step 4 was also updated, beyond the literal "relax it": the old text said Srishan approves plans touching shared
  files, which contradicted Decision D-18 and would have put P4 back behind Srishan.
- Approvals already written by agents before this rule (PRs 18, 27, 31) lack the approval note. The rule asks for
  the note; the reviewer decides whether to ask for it or accept the commit's account as evidence.

## 5. Changes

- Files: `AGENTS.md`, `README.md`, `docs/onboarding/README.md`, `docs/plans/README.md`, `docs/DECISIONS.md`, this
  report. No code, contract or dependency change.

## 6. Follow-ups and questions for humans

- [ ] Ali, Neil: confirm your GitHub account in the new table is right.
- [ ] Everyone: to approve a plan, tell your own agent "approve plan P<n>", or edit line 3 yourself.

## 7. Can a teammate explain this?

Before, only a person could type the line that approves a plan. Now you can tell your own agent to type it for you,
and it adds a note saying you told it to. Nobody else's agent can approve your plan.
