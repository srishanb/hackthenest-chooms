# src/ui — public exports

Owner: Amrit (`components/debug-overlay/` is Srishan's). Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `mountUi(root, deps, config)`, `COMPONENTS` | `registry.ts` | Registers and mounts every component into its slot; shows and hides by game phase. |
| `UiComponent`, `UiDeps` | `types.ts` | The shape of a component and what it is given. |
| `STRINGS`, `t(key)`, `StringKey` | `strings.ts` | All player-facing text. |
| `createSettingsStore`, `loadSettings`, `validateSettings`, `mergeWithDefaults`, `SETTINGS_STORAGE_KEY`, `CAPTION_SCALE_RANGE` | `settings-store.ts` | Load, validate types/ranges/key codes, apply live and save settings; caption scale 0.75–2. |
| `sourceBadge` | `components/source-badge/` | Always-visible input source label. |
| `debugOverlay` | `components/debug-overlay/` | Backtick-toggled signal numbers. |
| `mainMenu` | `components/main-menu/` | First-launch controls tutorial, persistent completion and replay button; publishes pause/resume through the bus. |
| `hasSeenTutorial`, `rememberTutorial`, `TUTORIAL_STORAGE_KEY` | `components/main-menu/tutorial-storage.ts` | Safely remember the completed/skipped guide independently of checkpoint saves. |
| `captions`, `calibration` | `components/<id>/` | **P0 stubs:** registered, render nothing. |
| `emberPrompt` | `components/ember-prompt/` | Recovery progress, labelled ordinary-input rescue, cancellation and a new-run button after finish. |
| `pauseMenu`, `settingsPanel` | `components/pause-menu/`, `components/settings-panel/` | Pause/resume bus controls and live settings; main-menu start route remains pending. |
| `createUiActions`, `UiActions` | `ui-actions.ts` | UI-local settings visibility shared by menu components. |
| `remapKey` | `components/settings-panel/settings-editor.ts` | Swap existing bindings on a duplicate choice. |
| `hud` | `components/hud/hud.ts` | Read-only ember availability/progress, signal quality, safe prompts and optional qualitative signal intensity. |
| `hudState`, `percent`, `intensityLabel` | `components/hud/hud-state.ts` | Presentation mapping and bounded percentage formatting. |
| `createCalibrationFlow`, `stepFlow`, `messageKey`, `preferCalibrationFallback`, flow types | `components/calibration/calibration-flow.ts` | Pure calibration navigation, timed halfway instructions, ordered commands and reviewed failure wording. Screens are P6.1.2. |

Styling: only `var(--…)` from `theme/tokens.css`. Layout slots are in `theme/layout.css`.
