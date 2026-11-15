# After-job report: start menu with Play and Settings

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/start-menu, https://github.com/srishanb/hackthenest-chooms/pull/58
- Phase and plan: none; Srishan's direct request ("implement a start menu with play and a basic settings button"), relayed by his builder session. UI lane (Amrit's) plus small game and shared edits.
- Started and finished: 01:57 to 02:06 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| On launch: title "Lighten Up", Play and Settings | Pass (browser) | High |
| No physics steps and no input to the player before Play | Pass: arrows, E and R did nothing in the browser; unit tests show the phase controller is not running in `'menu'` | High |
| Enter starts Play | Pass: a real Enter key on the focused Play button; unit tests cover Enter with nothing focused | High |
| Settings opens the existing settings panel and returns to the menu | Pass: panel shown, button reads "Back to start", Escape returns with Settings focused | High |
| Removing the component does not break gameplay | Pass by design: `main.ts` boots into `'playing'` when `start-menu` is disabled in `ui.config.ts` | Medium (not run in a browser with it disabled) |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Type check and tests | `npm run check` | exit 0, 40 files, 263 tests |
| Build | `npm run build` | exit 0 |
| Run tooling | `node run.mjs selftest` | passed (23 files) |
| Browser | Worktree served on port 3050 (a fresh origin, so the tutorial counts as unseen), `?algo=passthrough-v0` | Menu shown with Play focused and no tutorial; arrows, E and R before Play moved nothing; Settings → panel → Escape → back to menu; Enter on Play → menu gone, tutorial opened and paused the game; Skip → HUD shown and the character walked. No console errors. |

**Not verified:** a browser run with `start-menu` disabled in `ui.config.ts`; mouse-only use; screen readers; Windows; calibration opened from the start menu (it has no button there yet).

## 3. Problems, workarounds and dead ends

- Setting `INITIAL_GAME_SNAPSHOT.phase` to `'menu'` would have broken the finish and recovery tests and anything else that assumes a running game. `main.ts` instead starts the snapshot in `'menu'` only when the start menu is enabled.
- The `main-menu` id was already used by Ali's first-launch tutorial, so the start menu is a new `start-menu` component.

## 4. Deviations from the plan

- Order chosen: start menu → Play → first-launch tutorial (pauses the climb) → climb. The tutorial used to open on load; it now opens on the first switch to `'playing'`, so it never covers the start menu. Calibration stays where it is: the pause menu's Recalibrate and the HUD.

## 5. Changes

- Files changed: new `src/ui/components/start-menu/` (`start-menu.ts`, `start-menu-state.ts`, `start-menu.css`), `src/ui/__tests__/start-menu-state.test.ts`, `src/game/__tests__/phase-start.test.ts`, `run/ui-start-menu.mjs`; edited `src/ui/registry.ts`, `src/ui/strings.ts`, `src/ui/INDEX.md`, `src/ui/components/settings-panel/settings-panel.ts`, `src/ui/components/main-menu/main-menu.ts`, `src/game/world/phase-controller.ts`, `src/game/scenes/climb-scene.ts`.
- Contract or config-schema changes (own commit): `{ type: 'start' }` in `GameEvent`; `'start-menu'` in `UiComponentId`; one line in `src/config/ui.config.ts`; `src/main.ts` boot phase.
- New dependencies requested: None.
- Edits outside my lane: all of it (UI is Amrit's, game is Ali's, shared is Srishan's), at Srishan's request; each edit is a few lines.
- `INDEX.md` updated for new exports: yes (UI).

## 6. Follow-ups and questions for humans

- [ ] Amrit: a "Light the lantern" (calibration) button on the start menu would fit; `CalibrationOrigin` already has `'start'`.
- [ ] Nobody returns to the start menu after Finish; a "Play again" on a finished screen is still missing.
- [ ] The tab title still says "lighten" on this branch; PR #56 renames it.

## 7. Can a teammate explain this?

The game now waits on a title screen. Nothing moves until you press Play, which sends one `start` message; the game hears it and begins. Settings reuses the same panel as the pause menu, and the controls guide shows after Play instead of over the title.
