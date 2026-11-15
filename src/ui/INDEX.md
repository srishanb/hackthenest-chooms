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
| `mainMenu` | `components/main-menu/` | Reused four-step controls/journey/BCI guide, menu How to Play route and in-game replay; publishes pause/resume through the bus. |
| `hasSeenTutorial`, `rememberTutorial`, `TUTORIAL_STORAGE_KEY` | `components/main-menu/tutorial-storage.ts` | Safely remember the completed/skipped guide independently of checkpoint saves. |
| `captions` | `components/captions/` | Shows `narrator_line` text for `durationMs`; follows Settings (on/off, size). Dev: `?captionDemo`, `window.lightenCaption(text)`. Helpers `captionDurationMs`, `captionText` in `captions-state.ts`. |
| `emberPrompt` | `components/ember-prompt/` | Registered, renders nothing: recovery uses the HUD; Play again moved to the finish screen. |
| `finishScreen`, `finishScreenVisible`, `restartsOnKey` | `components/finish-screen/` | Shown in phase 'finished': Play again (button or Enter) emits `run_restart`. |
| `pauseMenu`, `settingsPanel` | `components/pause-menu/`, `components/settings-panel/` | Pause/resume bus controls and live settings; main-menu start route remains pending. |
| `createUiActions`, `UiActions` | `ui-actions.ts` | UI-local settings, guide and calibration navigation; hides unavailable menu routes. |
| `remapKey` | `components/settings-panel/settings-editor.ts` | Swap existing bindings on a duplicate choice. |
| `startMenu` | `components/start-menu/start-menu.ts` | Dedicated forest launch screen; existing Play/Continue, Settings and guide routes, Credits, signal-source indicator and keyboard navigation. |
| `canContinue`, `menuSelection` | `components/start-menu/start-menu-state.ts` | Resume-label detection from existing validated game state and wrapping arrow-key focus selection. |
| `createCredits` | `components/start-menu/credits.ts` | Menu-only credit card drawn from actual project/asset attribution. |
| `startMenuVisible`, `startsOnKey` | `components/start-menu/start-menu-state.ts` | Pure show/hide and Enter-to-play rules. |
| `hud` | `components/hud/hud.ts` | Ember status, running wax count/boost timer/pickup feedback, stage progress, signal quality and qualitative signal intensity. |
| `hudState`, `percent`, `intensityLabel` | `components/hud/hud-state.ts` | Presentation mapping and bounded percentage formatting. |
| `calibration`, `createCueTone` | `components/calibration/` | Pause-entry modal, timed instructions, source connect, safe fallback and local sound cues. |
| `createCalibrationFlow`, `stepFlow`, `messageKey`, `preferCalibrationFallback`, flow types | `components/calibration/calibration-flow.ts` | Pure calibration navigation, timed halfway instructions, ordered commands and reviewed failure wording. Screens are P6.1.2. |

Styling: only `var(--…)` from `theme/tokens.css`. Layout slots are in `theme/layout.css`.

Forest presentation: tokens.css themes existing UI surfaces. Source badge mounts an opt-in development-only forest preview (source-badge/forest-preview.ts); it sends a visual event defined in config, never mutates signal/recovery stores. Strings remain in strings.ts; it is absent in production.

Reference redesign: `navigationView` (`components/hud/navigation.ts`) chooses the nearest finite world checkpoint and derives screen-space needle angle plus distance. `HUD_WORLD_PIXELS_PER_METRE` in UI config explicitly defines 32 world px/m; `HUD_LANTERN_FULL_RADIUS_PX` defines the gauge range. The game publishes optional read-only navigation telemetry; UI never reaches into the scene. `icon` in icons.ts creates local SVG interface symbols. HUD stores only the player's physical height best (world pixels), not a signal score. Pause emits game-owned checkpoint/menu requests. No death/life economy or Lost state exists. The original player/platform/forest art remains unchanged; only the placed Ember's circle is replaced with a code-drawn shrine. Pixelify Sans and its OFL license are bundled under theme/fonts.
