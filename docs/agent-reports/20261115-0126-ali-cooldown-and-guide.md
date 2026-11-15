# After-job report: concise guide and recovery cooldown

- Agent: Ali (Codex)
- Branch and PR: ali/manual-ember, https://github.com/srishanb/hackthenest-chooms/pull/45
- Phase and plan: explicit user follow-up to the reusable ember; tutorial simplification, cooldown and no recovery popup
- Started and finished: approximately 01:18–01:26 Eastern, November 15, 2026

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Tutorial is shorter and clearer | Three concise pages; browser verified the new movement page | High |
| Each completed return starts a five-second cooldown | Unit test and visible browser countdown | High |
| Pickup/replacement/reload cannot bypass cooldown | Regression test passes with a fake clock and persisted save | High |
| No popup before returning | Recovery component now only renders after finish; R directly returns in fixed/uncalibrated play | High |
| Calibrated adaptive recovery retains valid-time gating | Existing timing/frozen-signal tests pass; progress is HUD-only | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Full validation | npm run check | TypeScript and 244 tests across 37 files passed |
| Level safety | npm run check:levels | Both test sections all reachable |
| Production/format | npm run build; git diff --check | Pass; existing vendored classic-script warning remains |
| Browser | Refresh preview, open/skip concise guide, reach ledge, E place, walk off, R | Returned directly with no popup; HUD showed Ember ready in 5s and assistance-used label |

**Not verified:** real-board recovery, every browser/OS, real-world system clock changes during cooldown, or a complete final-level playthrough. Cooldown timing/reload behavior uses a fake-clock regression test.

## 3. Problems, workarounds and dead ends

- Main had merged the base PR and qualitative HUD wording. Merging main caused conflicts with manual-ember changes; retained both the current manual behavior and main's unrelated HUD changes, in a new merge commit.
- Removed the previous recovery panel rather than hiding it behind another confirmation.

## 4. Deviations from the plan

- Chose a five-second cooldown as a reasonable default for the user's unspecified duration; it lives in ember.config.ts.
- Fixed-light or uncalibrated play uses the clearly labelled ordinary-input return directly. Calibrated adaptive mode still freezes gameplay and counts valid target time, shown only in the HUD; R cancels that pending recovery.
- Pickup remains available during cooldown, but the cooldown follows the ember and persists through reload.

## 5. Changes

- Files changed: recovery controller/tests/save schema, native recovery input, EmberConfig values, two small optional shared fields, HUD countdown, finished-only ember component, tutorial strings, UI INDEX, FEATURES.md, this report.
- Shared fields: optional EmberConfig.cooldownMs and EmberSnapshot.cooldownRemainingMs. Backwards compatible; committed separately.
- New dependencies: None.
- Edits outside my lane: minimal UI and shared fields required by Ali's request. FEATURES.md updated to keep behavior aligned.
- INDEX updated: Yes; HUD replaces the recovery popup.

## 6. Follow-ups and questions for humans

- Ali: R in the fixed preview returns immediately to a placed ember after landing below it. Watch the HUD countdown before using it again.
- Reviewer: validate cooldown persistence and the labelled fixed/uncalibrated fallback; no input or physics depends on signal values.

## 7. Can a teammate explain this?

The guide uses short instructions for moving, jumping and placing an ember. Returning no longer opens a panel, and each completed return starts a five-second cooldown in the HUD. The ember still has unlimited uses and can be picked up while cooling down.
