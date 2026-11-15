# After-job report: minimal tutorial controls

- Agent: codex
- Branch: `codex/tutorial-background`
- Phase: user-requested tutorial presentation, with successive corrections incorporated into the final implementation.
- Date: 15 November 2026, Eastern.

## 1. What I believe is complete

| Acceptance | Result | Confidence |
|---|---|---|
| One short reminder: move, charge/release jump, E place/pickup, return, pause | Pass | High |
| Transparent lettering at top-left, below Controls; no cards or background panel | Pass, browser screenshot | High |
| Text stays steady through jumps/camera movement | Pass, camera cancellation test; no player position used | High |
| Visible only in the actual tutorial region during play/recovery | Pass, unit tests; normal-stage browser check | High |
| Detailed explanations remain in the guide, including ember pickup and relocation | Pass, source review | High |
| Full checks and production build | Pass | High |

## 2. How I verified it

- `npm run typecheck`: pass.
- `npm test -- --maxWorkers=2 --testTimeout=20000`: 493 tests, 76 files passed after merging latest main at `02d1966`.
- `npm run build`: pass. Existing Vite extensionless/native-loader and vendored PiEEG script warnings remain.
- In-app browser at port 5193: Play enters gameplay without an automatic guide interruption. Screenshot confirms five transparent rows at top-left with no frame/background and no overlap with the Controls button or candle portrait.
- Normal-stage `editorTest=1` browser check showed no tutorial notes. The final version uses the same stage/phase visibility rule, covered by tests including custom tutorial IDs, absent stages, paused/menu/finished phases and remapped keys.
- Camera projection tests show constant screen coordinates despite changing scroll positions. Character jump coordinates never enter the positioning calculation.

**Not verified:** a full final-game climb, real EEG, or every screen size/device. Production rendering was built but this browser visual check used the dev server. No gameplay physics, assets or signal behavior were changed.

## 3. Problems, workarounds and dead ends

- The initial implementation had too much explanatory text. At the user's direction, replaced it with five short control labels and moved detailed terrain/recovery information into the on-demand guide.
- A player-following version moved with jumps; removed that input and anchored the reminder in the camera view. Final placement is top-left, overriding the user's briefly requested top-right placement.
- Merged team changes without rewriting history. Updated the newly added terrain copy to match removal of the fuel mechanic.

## 4. Deviations from the plan

- Final reminder is camera-stable rather than a set of platform-anchored world notes, per the user's corrections.
- No new phase approval gate: Decision D-22 applies. No new dependencies.

## 5. Changes

- UI: registered `world-tutorial`, transparent styling, small presentation helpers/tests, on-demand five-step guide, explicit ember pickup/replace instructions, removed automatic guide opening and duplicate tutorial HUD lesson text.
- Shared/main/game: optional read-only camera presentation stream and canvas/section dependencies to align the UI to the actual scaled canvas. The stream has no gameplay consumers or effects on physics.
- UI/game indexes updated. Shared contract additions are optional for existing callers; the new UI component is configurable/disableable.
- No new network calls, art, credentials, packages, signal scoring or movement changes.

## 6. Follow-ups and questions for humans

- Review/merge the PR and reload a new tutorial run to see the final reminder.
- Check on the final demo display; long explanations remain accessible through Controls/How to Play.

## 7. Can a teammate explain this?

The tutorial now has a short list of keys written directly over the forest. It stays in the top-left instead of bouncing with the candle and disappears outside the tutorial. The full guide explains how to stand beside the ember, pick it up with E, carry it higher, and place it again.
