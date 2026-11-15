## What

<!-- one or two lines -->

## Lane

- Agent / person:
- Phase and plan file: <!-- e.g. P1.2, docs/plans/P1.2.md -->
- Directories touched:

## After-job report

- Report file: <!-- docs/agent-reports/<YYYYMMDD-HHMM>-<agent>-<task>.md (required; a plan-only draft PR may say "plan only") -->
- Not verified: <!-- copy the "Not verified" line from the report, or "nothing" -->

## Checklist

- [ ] The plan file reads `Status: APPROVED by <name>`, written by a human
- [ ] Pre-code check done: this task was not already on `main` or in another PR (result: <!-- not done / partly done: what existed -->)
- [ ] After-job report added in this PR and linked above
- [ ] Stayed in my lane (or explained why not below)
- [ ] Any change to a shared file (deps, lockfiles, `src/shared/`, root config, AGENTS.md, .github, hook configs) is small and explained below
- [ ] No git history deleted or rewritten: no force push, no rebase of pushed commits, no branch or tag deleted
- [ ] No secrets committed; `.env.example` updated if I added env vars
- [ ] `npm run check` passes <!-- once P0 is merged -->
- [ ] Ran it locally / tested: <!-- how -->

> The reviewer agent reviews every ready PR and squash-merges it if it passes. No human review is needed. Keep it a draft, title it `[claim] …`, or add `no-automerge` to hold it back.
