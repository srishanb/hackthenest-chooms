# src/config: public exports

Every tunable number lives here. Search here before adding a constant. Lane owners come from the Lanes table in
[AGENTS.md](../../AGENTS.md); files not named in that table say so, and use the header comment where it names a person.

| Export | File | Owner lane | What it tunes |
|---|---|---|---|
| `SIGNAL_CONFIG` | `signal.config.ts` | Signal (Srishan) | Every number in the signal pipeline, with units. Starting guesses, not checked on a real head. |
| `GAME_CONFIG` | `game.config.ts` | Game (Ali) | Movement and world constants, and `ledgeKinds`: the rules of bounce caps, crumbling ledges and updraft columns (D-36). The EEG never changes these. |
| `LEDGE_KINDS_VIEW_CONFIG` | `ledge-kinds-view.config.ts` | Game | How bounce caps, crumbling ledges and updraft columns are drawn (colours, sizes, shake, streaks). Drawing only. `updraftSnow`: the palette that reads against snow. |
| `EMBER_CONFIG` | `ember.config.ts` | Game (Ali) | Recovery ember timing, such as the activation duration. |
| `UI_CONFIG`, `HUD_WORLD_PIXELS_PER_METRE`, `HUD_LANTERN_FULL_RADIUS_PX`, `UI_SIZE_PREVIEW` | `ui.config.ts` | UI (Amrit) | Which UI components are on, where they sit, HUD scale and the UI size range. |
| `AUDIO_CONFIG`, `INTRO_MUSIC_DUCK`, `NARRATOR_VOICES`, `DEFAULT_NARRATOR_VOICE`, `NARRATOR_VOICE_STORAGE_KEY`, `NARRATOR_VOICE_EVENT`, `NARRATOR_LEVELS`, `WORLD_AUDIO_CONFIG`, `NARRATOR_MOMENTS` | `audio.config.ts` | Audio and narrator (Amrit) | Music gain, intro ducking, narrator voices and loudness, world audio and narrator moments. |
| `EFFECTS_TABLE` | `effects.config.ts` | Content and tuning (Neil) | One row per signal-driven effect: cap, smoothing time and a written never-rule. |
| `ACTIVE_RESPONSE_CONFIG`, `responsiveActivity` | `active-response.config.ts` | Not in the Lanes table | Gain and attack/release for the calibrated activity response. Zero stays zero; invalid input is not boosted. |
| `ATMOSPHERE_CONFIG`, `DEFAULT_ENVIRONMENT`, `VisualEnvironment`, `unit`, `normalizeEnvironment` | `atmosphere.config.ts` | Not in the Lanes table | Wind and snow render settings. Renderer only. |
| `CORRUPTION_SCREEN_CONFIG`, `screenCorruption` | `corruption-screen.config.ts` | Not in the Lanes table | Caps for the corruption frame: fog, shake, shift, noise, lightning. Presentation only. |
| `ENVIRONMENT_ASSETS` | `environment-assets.config.ts` | Not in the Lanes table | Which tile and plant skins the forest and winter stages use. |
| `FOREST_CONFIG`, `FOREST_PREVIEW_EVENT`, `forestPreviewValue` | `forest.config.ts` | Not in the Lanes table | Forest presentation: pixel scale, character frame, parallax. Not used by movement or recovery. |
| `FUEL_VISIBILITY_CONFIG`, `sceneryCorruption` | `fuel-visibility.config.ts` | Not in the Lanes table | Visual sight curve: shadow, glow and vignette alpha, minimum radius. Fuel and movement unchanged. |
| `LANDING_PUFF_CONFIG` | `landing-puff.config.ts` | Not in the Lanes table | Landing dust and snow particles. Renderer only. |
| `LANTERN_FUEL_CONFIG`, `waxBenefit01` | `lantern-fuel.config.ts` | Not in the Lanes table (header: requested by Neil) | Candle fuel: full radius, burn times, wax refill. Does not alter movement or recovery. |
| `STAGES_CONFIG` | `stages.config.ts` | Game presentation (header) | Stage preview, blend span and snow settings, in logical pixels and seconds. |
| `BACKDROP_CONFIG`, `BackdropConfig`, `BackdropLayer`, `BackdropFlavour`, `FlavourRecipe`, `ColdRecipe`, `CrownStyle`, `IslandTreeKind`, `Weights` | `backdrop.config.ts` | Not in the Lanes table | The generated backdrop: chunk size, the depth layers (horizon plus three forest layers: parallax, fog, scale, trunks, rock, islands, waterfalls, mist), horizon ranges, per-flavour recipes (crowns, trees, lianas, waterfalls, petals, sky) and the cold's recipe. Decoration only. |
| `WILDLIFE_CONFIG`, `WildlifeConfig`, `BirdClip` | `wildlife.config.ts` | Not in the Lanes table | Background life: birds, far flocks, fireflies, falling leaves, grass and far waterfalls. Decoration only. |
| `ENDLESS_CONFIG`, `EndlessConfig` | `endless.config.ts` | Game (header) | The endless climb: chunk size, anchors, ledge widths and rises over the difficulty ramp, side ledges, moving ledges, ice, fuel, composure, night. |
| `ENDLESS_PIECES_CONFIG`, `EndlessPiecesConfig` | `endless-pieces.config.ts` | Game (header) | The endless climb's set pieces (D-35): each piece's weight, unlock chunk and own numbers (steps, rises, widths, charge levels), the pacing fade-in, and the bounds on retries that keep generation fast; since D-36 also when bounce caps, crumbling ledges and updrafts unlock and their four pieces. Only where ledges go, never movement. |
| `WAX_CONFIG` | `wax.config.ts` | Not in the Lanes table | Optional wax rewards: growth cap, respawn delay, light bonus. |
