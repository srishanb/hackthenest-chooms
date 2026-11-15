# After-job report: Play again after the finish

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/play-again, https://github.com/srishanb/hackthenest-chooms/pull/65
- Phase and plan: END-1 follow-up, from Srishan via the builder session ("Play again after the finish", button plus a key, no reload).
- Started and finished: 02:20 to 02:42 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| A finish screen shows only in phase 'finished', with a title and Play again | Pass (unit, browser fixture) | High |
| Play again (button) and Enter restart without a reload, exactly once per press | Pass (unit, browser fixture) | High |
| Enter mid-climb does nothing; Space stays the jump key | Pass (unit, browser fixture) | High |
| After a restart the run is back at the start: spawn position, no ember anchor, save cleared, phase 'playing', and it can be finished again | Pass (game unit test with the real ember and phase controller) | High |
| The game boots with the screen mounted and hidden, no console errors | Pass (browser) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | exit 0, 312 tests |
| Build | `npm run build` | exit 0 |
| Run files | `node run.mjs selftest` | passed (23 files) |
| Browser fixture | `src/ui/__tests__/finish-browser.html` on the worktree dev server | 7 of 7 PASS: hidden while playing, Enter mid-climb ignored, shows when finished, Play again focused, click restarts once, Enter restarts once, unmount cleans up |
| Real game page | `?algo=passthrough-v0` | title "Lighten Up", start menu shows, finish screen mounted and hidden, no console errors |

**Not verified:** climbing to the real finish and pressing Play again in the full game: the browser pane was hidden, which pauses the game loop, so I could not play the climb there. The reset itself is the existing `run_restart` handler (Ali's), covered by the new game test. The camera pans back down with its follow lerp rather than snapping; not checked by eye.

## 3. Problems, workarounds and dead ends

- Pre-code check found a "Start a new run" button already on main inside `ember-prompt` (visible when finished). I moved Play again into its own `finish-screen` component, as the UI rules ask, and returned `ember-prompt` to an empty registered component.
- Ali's draft PR #60 mentions "victory and restart"; I commented there that I build only the finish screen on the existing `run_restart`, and leave the finish condition and stages to Ali.

## 4. Deviations from the plan

- None. Play again goes straight back to the climb (phase 'playing'), not to the start menu: the player already pressed Play once.

## 5. Changes

- Files changed: new `src/ui/components/finish-screen/` (component, pure state, CSS), `src/ui/__tests__/finish-screen-state.test.ts`, `src/ui/__tests__/finish-browser.html`, `src/game/__tests__/play-again.test.ts`; `src/ui/registry.ts`, `src/ui/strings.ts` (finish.* strings; removed the unused `ember.newRun`), `src/ui/components/ember-prompt/ember-prompt.ts`, `src/ui/INDEX.md`, `run/game-finish.mjs`.
- Contract or config-schema changes: `UiComponentId` gains `'finish-screen'` (own commit), with its line in `src/config/ui.config.ts`.
- New dependencies: None.
- Edits outside my lane: UI lane (Amrit's) at Srishan's request; no game code changed.
- `INDEX.md` updated: yes.

## 6. Follow-ups and questions for humans

- [ ] Ali: when the five-stage climb lands (#60), its victory should keep using `phase.finish()` and `run_restart`, so this screen works unchanged.
- [ ] Optional: a "Back to start menu" button on the finish screen, if the team wants the title shown between players.

## 7. Can a teammate explain this?

When you reach the top, a screen says "You reached the top" with a Play again button. Clicking it, or pressing Enter, sends one message on the event bus; the game hears it and puts you back at the bottom with a fresh run, without reloading the page. Your settings and calibration are kept.
