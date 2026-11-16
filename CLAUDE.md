@AGENTS.md

## Harness: Lighten Up

**Goal:** build, fix, verify and ship changes to Lighten Up with a small agent team: a written brief, a
builder or fixer, an independent QA pass, then the lead verifies and handles git.

**Entry point — applies to every prompt in this repo:** You MUST invoke the `lighten-up-orchestrator`
skill *before* responding to any request — new work, a follow-up, a re-run, a question, or a change to a
previous result. It is the single entry point; do not craft a response outside it. The orchestrator
decides what happens next: it answers trivial or off-topic requests directly and runs the full team only
when the work warrants it.

**Change history:**
| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-11-16 | Initial setup | All | approved by Srishan |
