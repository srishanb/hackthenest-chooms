# src/shared — public exports

Owner: integrator (Srishan). **Frozen after P0:** changes go through an integrator PR.

| Export | File | What it is |
|---|---|---|
| `ComposureState`, `ComposureReader`, `InputSourceKind`, `SignalMode` | `contracts/composure.ts` | The one signal contract the game reads. |
| `SignalHandle`, `SignalControl`, `SignalDiagnostics`, `CalibrationStep`, `CalibrationResult` | `contracts/signal-api.ts` | What the UI may ask of the signal lane. Never given to the game. |
| `BandFrame`, `BandPowers`, `Source`, `Features`, `Baseline(s)`, `Scores`, stage types, `Algorithm` | `contracts/signal-internal.ts` | Pipeline shapes for the signal lane and its tools. |
| `GameEvent`, `GameEventType`, `GameEventOf`, `EventBus` | `contracts/events.ts` | Every game moment and the bus interface. |
| `GameSnapshot`, `GamePhase`, `EmberSnapshot`, `INITIAL_GAME_SNAPSHOT` | `contracts/game-state.ts` | The game's public state. `netplayKey`: the two-player status line's string key (D-38). |
| `EffectId`, `EFFECT_IDS`, `EffectRule`, `EffectsFrame` | `contracts/effects.ts` | Effects as data. |
| `Settings`, `KeyBindings`, `Volumes`, `DEFAULT_SETTINGS` | `contracts/settings.ts` | Player settings schema and defaults. |
| `SignalConfig`, `GameConfig`, `EmberConfig`, `UiConfig`, `UiComponentId`, `UiSlot`, `AudioConfig`, `LedgeKindsConfig`, `WallMovesConfig`, `VersusConfig` | `contracts/config.ts` | Types of the files in `src/config/`. `WallMovesConfig`: wall slide and wall jump (D-37, optional `GameConfig.wallMoves`). `VersusConfig`: two candles meeting in the two-player climb (D-38, optional `GameConfig.versus`). `UiComponentId` includes `netplay-status`. |
| `SectionData` (with `refuge`, `finish`), `PlatformData`, `AreaData`, `NarratorLine` | `contracts/content.ts` | Authored content shapes (starting shape). |
| `Stores` | `contracts/app.ts` | The three stores `main.ts` creates. |
| `createEventBus(now?)` | `bus.ts` | Typed event bus. |
| `createStore(initial)`, `Store<T>` | `store.ts` | Observable value. |
| `getLocalStorage(scope)`, `createMemoryStorage()` | `safe-storage.ts` | `localStorage` read in a try/catch (undefined when blocked) and an in-memory fallback. |

`__tests__/lane-boundaries.test.ts` fails the build if a lane imports another lane.

Also exported (not listed above):

| Export | File | What it is |
|---|---|---|
| `KeyValueStorage` | `safe-storage.ts` | The `getItem`/`setItem`/`removeItem` shape both storages satisfy. |
| `Baselines`, `Preprocess`, `FeatureExtractor`, `QualityEstimator`, `Calibrator`, `Scorer`, `Smoother` | `contracts/signal-internal.ts` | Pipeline stage interfaces for the signal lane. |
| `PresetInfo`, `SourceChoice`, `SignalPresets` | `contracts/signal-api.ts` | Replay presets: list entry, source choice (sim, live or preset id) and the runtime preset controls. |
| `WorldViewSnapshot` | `contracts/world-view.ts` | Camera coordinates published after rendering (`Stores.worldView`). |
| `NavigationSnapshot` | `contracts/game-state.ts` | Read-only world coordinates for UI. |
| `NarratorMoment`, `StageKind` | `contracts/content.ts` | Narrator moment names and stage kinds (tutorial, normal, snow, windy, snow-windy). |
