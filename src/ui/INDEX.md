# src/ui — public exports

Owner: Amrit (`components/debug-overlay/` is Srishan's). Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `mountUi(root, deps, config)`, `COMPONENTS` | `registry.ts` | Registers and mounts every component into its slot; shows and hides by game phase. |
| `UiComponent`, `UiDeps` | `types.ts` | The shape of a component and what it is given. |
| `STRINGS`, `t(key)`, `StringKey` | `strings.ts` | All player-facing text. |
| `createSettingsStore`, `loadSettings`, `mergeWithDefaults`, `SETTINGS_STORAGE_KEY` | `settings-store.ts` | Load, validate, apply live and save settings. |
| `sourceBadge` | `components/source-badge/` | Always-visible input source label. |
| `debugOverlay` | `components/debug-overlay/` | Backtick-toggled signal numbers. |
| `mainMenu`, `pauseMenu`, `settingsPanel`, `hud`, `captions`, `calibration`, `emberPrompt` | `components/<id>/` | **P0 stubs:** registered, render nothing. |
| `createCalibrationFlow`, `stepFlow`, `messageKey`, `preferCalibrationFallback`, flow types | `components/calibration/calibration-flow.ts` | Pure calibration navigation, timed halfway instructions, ordered commands and reviewed failure wording. Screens are P6.1.2. |

Styling: only `var(--…)` from `theme/tokens.css`. Layout slots are in `theme/layout.css`.
