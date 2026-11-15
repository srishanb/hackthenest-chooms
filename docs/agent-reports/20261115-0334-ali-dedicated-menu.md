# After-job report: dedicated main menu and translucent UI

- Agent: codex for Ali
- Branch / PR: ali/dedicated-menu, https://github.com/srishanb/hackthenest-chooms/pull/72
- Plan: direct menu request, followed by Ali's request for borderless translucent UI; short plan in draft PR.
- Timing: 15 Nov 2026, approximately 03:14–03:34 Eastern.

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| Distinct launch screen with Play/Continue, Settings, How to Play and Credits | Pass | High |
| Reuse current phase/start event, settings and guide; no new save or level selector | Pass | High |
| Arrows/Enter/Escape, focus return, duplicate activation guard and cleanup | Pass | High |
| Responsive layouts, reduced motion and honest signal source indicator | Pass | High |
| Borderless translucent menu/HUD styling requested during implementation | Pass | Medium |
| Gameplay logic unchanged | Pass | High |

## 2. How I verified it

`npm run check`: 58 files / 385 tests pass. `npm run build` and `git diff --check`: pass; existing classic vendor-script warning remains. Main merged through 8939f0c.

Browser fixture launch-browser.html: all 15 assertions pass, covering Continue from existing navigation, Settings/escape/focus, arrows, existing guide, credits, reduced motion, double activation, preserved resume position/stage, return to menu and handler cleanup. Responsive fixture passes at intrinsic 1440×900 and 375×812, verifying horizontal fit and zero panel borders. Real app: Settings, reduced motion, keyboard guide navigation, Credits/back and four-step journey/BCI instructions inspected. Continue-label and arrow wrapping are unit tested. Production menu uses only existing local images/fonts and fourteen CSS embers, no network assets.

**Not verified:** Live BCI hardware, every browser or subjective contrast under every game background. Real gameplay was active concurrently during inspection; the automated resume-preservation check uses production UI with memory state, not an end-to-end hardware/game save session.

## 3. Problems, workarounds and dead ends

- Early autofocus scrolled the narrow launch screen; prevented initial focus scrolling and stopped hero flex shrink.
- A timing-sensitive existing simulator test delivered 15 frames against its >15 expectation on one full run. An unchanged rerun passed all 385 tests; signal code/tests were not altered.
- Responsive viewport override interacted with the active preview. Reset it and used isolated intrinsic-size iframe fixtures instead, preserving the user's active game.

## 4. Deviations from the plan

Ali broadened the visual scope to UI boxes generally. Applied shared glass styling, including HUD decorative frames, without changing HUD logic. Subsequent template research is recorded separately; no external template assets imported or chosen.

## 5. Changes

Only src/ui: existing start-menu, guide, UI actions/registry, text, tokens, shared glass CSS, credits helper, index and tests. No gameplay, stages, physics, ember, signal, shared contracts or dependency changes. New menu background reuses licensed forest textures and Pixelify Sans already in the repo. UI is outside Ali's usual lane, explicitly requested by Ali.

## 6. Follow-ups and questions for humans

Ali is choosing a UI reference direction. Current functional menu and translucent cleanup remain independent of that choice. Live connection status is not inferred: the indicator reports source and usable-signal validity only.

## 7. Can a teammate explain this?

The game waits on a separate forest-themed launch screen. Its buttons open the existing settings and guide or continue the same game state; Credits uses actual project names. Decorative frames are removed while keyboard focus stays visible.
