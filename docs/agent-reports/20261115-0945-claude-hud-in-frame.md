# After-job report: hud-in-frame

- Agent: claude
- Branch and PR: claude/hud-in-frame (PR titled fix(ui): keep hud inside the game frame and hide stage details by default)
- Phase and plan: urgent request from Srishan (no plan file), UI lane
- Started and finished: 09:28 to 09:50 Eastern

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Stage info card hidden by default, shown by a Settings toggle, persisted | Pass | High |
| Candle emblem, ember panel, top-right HUD unchanged and visible | Pass | High |
| UI layer equals the scaled canvas rectangle; HUD and overlays inside the frame | Pass (wide and tall window) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Types and tests | `npm run check` | 75 files, 491 tests pass |
| Build | `npm run build` | built |
| Frame lock | dev server, windows 2000x1000 and 1000x1200, compared `#ui` rect with canvas rect and checked every HUD element | identical rects, no element outside |
| Toggle | clicked "Show stage details" in the pause settings | card appears, saved in `lighten.settings.v1` as `hud.showStageDetails: true` |

**Not verified:** start menu, finish screen, calibration and tutorial panels visually inside the frame (CSS changed from fixed or vw to frame-relative but each screen was not inspected); narrow phone widths; real EEG hardware.

## 3. Problems, workarounds and dead ends

- The screenshot tool framing did not match the emulated viewport, so numeric rect checks were the main evidence.

## 4. Deviations from the plan

- None (no plan).

## 5. Changes

- Files changed: see PR diff. Notable: `src/ui/theme/layout.css`, `src/ui/components/hud/hud.css`, `hud.ts`, `settings-panel.ts`, `src/ui/strings.ts`, `src/main.ts`.
- Contract or config-schema changes: `Settings.hud.showStageDetails` added to `src/shared/contracts/settings.ts` (default false; old saves fall back to false).
- New dependencies requested: None
- Edits outside my lane: `src/shared/contracts/settings.ts` and `src/main.ts` (two lines setting `--game-width` and `--game-height`).
- `INDEX.md` updated: not applicable

## 6. Follow-ups and questions for humans

- [ ] Amrit: check the start menu, finish screen and tutorial at a wide window.

## 7. Can a teammate explain this?

The UI layer is sized to the largest 16:9 box that fits the window, which is exactly where the game canvas is drawn, so every HUD element sits inside the game picture. The stage info card is hidden unless the player turns on "Show stage details" in Settings.
