# Features

Status: FINAL (10:31 PM)

Gameplay revision requested by Ali, 15 Nov 2026: one reusable, player-placed recovery ember with unlimited returns and a five-second cooldown after each return. E places it on a safe ledge or picks it up nearby. R recovers after a fall without a popup; fixed-light or uncalibrated play uses a labelled ordinary-input return, while calibrated adaptive recovery shows valid-time progress in the HUD. All automatic checkpoints and refuge-based saves/refills are removed. The placed ember is the only saved return point.

<!-- A human changes the line above to "Status: FINAL (<name>, <date>)" when the list is finalised (H-01),
     and the integrator adds a line to DECISIONS.md. Until then only P0 to P3 may be built. -->

Source: the team's feature specification of 14 Nov 2026. Priorities, in build order: **Core**, Core presentation,
Core production, Core polish, BCI option, Expansion, Polish. Features considered and not scheduled are listed in
[PLAN.md](PLAN.md#considered-not-scheduled).

To change this list: edit the table (add, remove, or change a priority), then tell the integrator, who re-plans the
affected phases. Removing a row never requires code outside one lane (see PLAN.md §3.1).

| ID | Category | Mechanic | Final behaviour | Priority | Phase |
|---|---|---|---|---|---|
| MOV-1 | Movement | Walking | A/D or Left/Right move the character on platforms. | Core | P4.1 |
| MOV-2 | Movement | Charge jump | Hold Space or Up to charge up to a fixed maximum; release to launch. Directional input sets the launch direction. Full charge takes 0.6 seconds. | Core | P4.1 |
| MOV-3 | Movement | Limited air steering | Original jump/ascent/apex steering is unchanged. Only strict descent gets a modest larger correction cap (0.24 × walking speed versus 0.15 during ascent), independent of wind and EEG. No vertical movement changes or additional jumps. | Core | P4.1 |
| MOV-4 | Movement | Consistent physics | EEG never changes gravity, friction, jump strength, speed or steering. Environmental effects follow fixed rules. | Core | P4.1, lane-boundary test |
| PLT-1 | Platforming | Continuous staged climb | One continuous 50-platform world: Tutorial, Normal, Snow, Windy, then Snowy and Windy, ten unique platforms each. Landing on a stage's last ledge completes it once and continues directly upward, without a reload, teleport or selection screen. Difficulty ramps through narrower ledges and independently authored stage rules. | Core | P4.2, P8.2 |
| PLT-2 | Platforming | Stationary platforms | The foundation of the climb. | Core | P4.2 |
| COL-1 | Exploration | Collectible wax | Replenishing gold wax has no per-run collection limit. At most one collectible is active/visible globally; after pickup, wait a random 8–14 gameplay seconds before choosing an unoccupied ordinary ledge near the player. Locations may be reused; missed distant drops are retired so they do not block later stages. HUD shows a running count. Count, active choice and cooldown persist across reloads; old finite saves migrate. Each pickup refreshes the capped ten-second light bonus; existing candle growth stays capped at +6%. Pause/recovery freeze timers, light remains stable in flight, and no reward depends on EEG. | Core presentation | P4 extension |
| PLT-3 | Platforming | Moving platforms | Tutorial introduces a broad green shuttle on a predictable visible cycle. It carries standing/charging riders; later sections may add harder cycles. Independent of EEG; no ember placement on moving ledges. | Expansion | P4 tutorial preview, P11 extension |
| PLT-4 | Platforming | Disappearing platforms | Clear warning before disappearing on fixed cycles; introduced above catch platforms. | Expansion | P11 |
| PLT-5 | Platforming | Wind stages | Tutorial previews mild wind. Windy and Snowy and Windy stages use stronger bounded airborne gusts, directional arrows and gradual zone-edge fades. Grounded players are unaffected; fixed cycles independent of EEG. | Expansion | P4 tutorial preview, P11 extension |
| PLT-6 | Platforming | Snow and slippery surfaces | Tutorial previews ice; Snow and Snowy and Windy ramp authored ice strength, changing acceleration and stopping distance. Charging stops drift. Stationary ordinary and slippery ledges permit manual ember placement. Snow particles gradually blend into the existing forest before stage boundaries; no automatic saves. | Expansion | P4 tutorial preview, P11 extension |
| FAL-1 | Falling | No death system | Missed jumps lose height. No health bar, lives or death screen. | Core | P4.3 |
| LAN-1 | Lantern | EEG-driven intensity | A personalised EEG feature controls environmental intensity. Not presented as verified tension detection. | Core | P1, P5.1 |
| LAN-2 | Lantern | Adaptive light radius | Higher intensity reduces distant illumination; lower restores it. No fuel depletion. | Core | P5.2 |
| LAN-3 | Lantern | Protected visibility | The current platform, immediate reachable landing edges and nearby hazards stay readable. | Core | P5.2 |
| LAN-4 | Lantern | Smooth, bounded changes | Gradual transitions within limits. Light radius is fixed from takeoff to landing. | Core | P5.1 |
| ATM-1 | Atmosphere | Adaptive audio | Crossfade tense and quieter music layers without excessive loudness or masking gameplay cues. | Core | P5.4 |
| ATM-2 | Atmosphere | Reversible EEG effects | Signal-driven fog, shadows and background motion ease during recovery; penalties never accumulate. | Core | P5.3 |
| ATM-3 | Atmosphere | Progression-based world changes | Scenery grows darker and stranger with altitude; authored, independent of EEG. | Core presentation | P8.3 |
| ATM-4 | Atmosphere | Visual instability | Lantern flicker, swaying scenery, restrained distant distortion. The gameplay camera stays stable. | Core polish | P8.4 |
| CHK-1 | Checkpoints | Manual recovery point only | No automatic checkpoints. Only a deliberately placed ember creates a saved return point. Walking into a refuge or a new section never saves. | Core | P4.4, P6.2 |
| CHK-2 | Checkpoints | Safe rest areas | Refuges are rest areas for visibility and quieter audio only; they never save, set a return point, or grant/refill an ember. No automatic-checkpoint markers are shown. | Core | P4.4, P5 |
| CHK-3 | Checkpoints | Manual-anchor persistence | The placed ember's validated ledge and position persist between sessions. Reload resumes there; with the ember carried or no valid marker, restart at the beginning. Legacy automatic-refuge saves are ignored. | Core | P4.4, P6.2 |
| EMB-1 | Recovery ember | One reusable ember | Start each run carrying exactly one ember. Returns are unlimited and never consume it. No progress-based refills or extra embers. | Core | P6.2 |
| EMB-2 | Recovery ember | Request after a fall | After landing below the placed ember, press R to begin recovery. Without a placed ember, there is no recovery destination. | Core | P6.2 |
| EMB-3 | Recovery ember | Player placement and pickup | Press E while grounded on a safe stationary ledge, including slippery ice, to place the carried ember. The marker stays fixed while the player slides. Stand beside it and press E to pick it up before placing it elsewhere. Only one marker exists; charging, airborne, moving, disappearing and unsafe platforms remain ineligible. | Core | P6.2 |
| EMB-4 | Recovery ember | Safe activation state | Freeze gameplay and hazards; stabilise the view, improve visibility, simplify audio. | Core | P6.3 |
| EMB-5 | Recovery ember | EEG-gated activation | In calibrated adaptive play, accumulate about four valid target seconds against a personalised resting calibration; show progress in the HUD, with no popup. Fixed-light or uncalibrated play returns directly through labelled ordinary-input assistance. | Core | P6.3 |
| EMB-6 | Recovery ember | Forgiving accumulation | Brief fluctuations pause progress, never reset it. Invalid or stale data never advances it. | Core | P6.3 |
| EMB-7 | Recovery ember | Optional eye closure | Offer an eyes-closed interaction with audio cues where suitable; explain that eye closure is not proof of calmness. | BCI option | P10 |
| EMB-8 | Recovery ember | Successful return | Teleport to the player-placed ember, zero velocity and clear held jump input. The ember stays reusable. Each return starts a five-second cooldown shown in the HUD; picking up, replacing or reloading the marker cannot bypass it. | Core | P6.5 |
| EMB-9 | Recovery ember | Cancel or assistance | Press R again to cancel an in-progress calibrated recovery. Direct returns in fixed-light or uncalibrated play use the same destination and are labelled as ordinary-input rescue in the source badge. No confirmation/recovery screen appears. | Core | P6.4 |
| BCI-1 | BCI | Octopus 16 integration | Hardware acquisition isolated from gameplay behind a common input interface. | Core | P1.1, P3.1 |
| BCI-2 | BCI | Personalised calibration | Active-play feedback and resting activation calibrated separately; check usable, repeatable responses. | Core | P1.3, P6.1 |
| BCI-3 | BCI | Signal quality handling | Check contact where available, artifacts, missing data and freshness. Quality is separate from feature magnitude. | Core | P1.2, P3.2 |
| BCI-4 | BCI | Stable processing | Time-based smoothing, valid-time accumulation, separate activation and deactivation thresholds. | Core | P1.4, P6.3 |
| BCI-5 | BCI | Failure recovery | Poor signal eases effects toward neutral and pauses activation; progress kept; reconnect and recalibration offered. | Core | P5.5 |
| BCI-6 | BCI | Active-play fallback | If continuous feedback is unreliable, use fixed lighting and audio intensity and keep the resting interaction. | Core | P1.4, P5.5 |
| NAR-1 | Narration | Original sarcastic narrator | Comments on observable events and situations, never on the player's emotions or worth. | Core presentation | P7.1 |
| NAR-2 | Narration | Gemini-assisted writing | Generate candidate lines beforehand; review and edit them before use. | Core production | P7.1 |
| NAR-3 | Narration | ElevenLabs voice | Essential clips generated beforehand and played locally; gameplay never waits for generation. | Core presentation | P7.2 |
| NAR-4 | Narration | Controlled playback | Captions, mute, repetition cooldowns, no new lines during precision jumps. | Core | P7.3, P2.4 |
| UX-1 | UX | Minimal HUD | Ember availability, connection and quality status, interaction prompts; optional signal display. | Core | P2.3 |
| UX-2 | UX | Pause and accessibility | Pause gameplay and scoring; remapping, captions, reduced motion, effect controls, separate audio volumes. | Core | P2.2 |
| UX-3 | UX | Optional landing shake | Brief, adjustable impact effect; off under reduced motion. | Polish | P12 |
| DIA-1 | Diagnostics | Transparent input source | Clearly label Live EEG, Simulated Input, Recorded Replay and ordinary-input assistance. | Core | P1.6 |
| DIA-2 | Diagnostics | Debug overlay | Feature value, quality, sample age, intensity, thresholds, ember progress. | Core | P1.6 |
| END-1 | Completion | Final landing victory | Landing on the final platform of Snowy and Windy completes Stage 5 and wins once. Freeze normal gameplay, show a clear summit message and a new-run button. No finish box or additional interaction; no victory at earlier stage boundaries. Independent of physiological performance. | Core | P4.5 |

## As built (Sun 15 Nov 2026, 8:30 AM Eastern)

The table above is the finalised list and is unchanged. This section records where the build differs from it or goes
past it, checked against `src/` on `origin/main` (commit `ff068bb`). Where a row is not mentioned, the build matches it
as far as the tests and a simulator run show. **Nothing here has been verified on a real EEG board.**

| ID | As built |
|---|---|
| LAN-1, LAN-2 | The light source is the player's candle flame (a code-drawn candle, not a box or a lantern). A close-up candle portrait in a gold-rimmed circle, bottom left, replaced the lantern strength bar. The signal sets the radius through the `lanternRadius` row of `src/config/effects.config.ts` (110 to 260 px, 90 to 280 px cap). The effective floor is lower: fuel can shrink it (never below 60 px) and high corruption caps visible radius at about 80 px (`corruptionVisibilityRadius` in `src/config/lantern-fuel.config.ts`), with a short wax pulse lifting it to about 160 px. |
| LAN-2 | **"No fuel depletion" is no longer true.** A lantern fuel resource (`src/game/forest/lantern-fuel.ts`, values in `src/config/lantern-fuel.config.ts`) drains with playing time and shrinks the light radius to as little as 30% of normal (never below 60 px). Drain is slower when calm (about 240 s for a full tank) and faster at high corruption (about 45 s). Each wax pickup refills 35%, weakened at high corruption. The HUD shows a Fuel meter, written as a percentage of fuel left (not a composure value). Fuel affects light radius only, never movement, and it is not persisted across reloads. |
| LAN-3 | Outlines of the ledge underfoot and reachable ledges fade out at the edge of the light (full inside the radius, gone at 1.5 times the radius), rather than always being fully visible. |
| ATM-1 | One local ambient loop plays with a bounded mix. There is no separate tense music stem, so there is nothing to crossfade to yet. Sound effects are event-driven and local. |
| ATM-2 | Fog, shadow and background motion are reversible. The fuel resource above is the exception: it accumulates over playing time, and wax replenishes it. |
| ATM-3, ATM-4 | A continuous forest with parallax, weather by height, and a "corruption" visual state driven by the signal. At high corruption the screen can show short bounded shake bursts and a glitch filter (WebGL only). Both are off under reduced motion and pause. This goes further than "the gameplay camera stays stable": camera follow is unchanged, but the rendered screen can move. |
| COL-1 | Wax also drives a short visual brightening and the fuel refill described above. Real high corruption weakens wax benefit. |
| BCI-1, BCI-3 | The live-board source (`src/signal/sources/pieeg-source.ts`) is written and tested against a fake SDK only. **Unverified on a real Octopus 16.** |
| BCI-5 | Poor signal eases effects to neutral (tested). Whether reconnect and recalibration are offered during a run is **unverified**. |
| NAR-1 to NAR-4 | The narrator is a set of twelve short original intro clips (six lines in each of two stock voices), generated once at build time and played locally at the start of a run, with captions. It is not event-driven: it does not comment on falls or jumps. Lines were drafted with Gemini and edited by an agent; the tool README asks Amrit to listen and review the bank, and **that human review is unverified**. Voices are ElevenLabs stock voices. Pause, menus, mute and precision jumps park the speech. A voice picker with preview is in Settings. |
| UX-1 | The HUD also shows a running wax count and boost timer, stage progress, an ember compass, a Fuel meter and a signal-intensity word (lower, midrange, higher). The only percentages are the Fuel meter, signal quality and ember progress; none is a score of composure. |
| UX-2 | Remapping, captions with a size setting, reduced motion, effect strength and four volumes exist. |
| UX-3 | **Not built.** A `landingShake` setting exists in the settings contract, but no code reads it. |
| PLT-4 | **Not built.** No disappearing platforms exist. |
| EMB-7 | **Not built** (P10). |
| Extra | A simple authored stage editor (`/?editor=1`) and a candle-appearance seed (`?candleSeed=`, dev only) exist. They are not in the list above and do not touch the signal. |

Counts (49 rows): 37 Core, 4 Core presentation, 1 Core production, 1 Core polish, 1 BCI option, 4 Expansion, 1 Polish.

## As built at submission (Sun 15 Nov 2026, 11:30 AM Eastern)

The FINAL table above is unchanged. This section gives one status per feature id for the submitted build, checked
against `src/` on `origin/main`. Status words: **Built** (matches the row), **Partly built** (part of the row exists),
**Changed** (built, but differently from the row), **Not built**. It adds to the 8:30 AM section above; where the two
differ, this one is newer. **Nothing here was verified on a real PiEEG Octopus 16.** The only recording in the repo is
`recordings/sim-fixture.jsonl`, which is simulated.

| ID | Status | Proof (file) and note |
|---|---|---|
| MOV-1, MOV-2 | Built | `src/game/player/movement.ts`, `src/game/player/charge-jump.ts`; test `src/game/__tests__/movement.test.ts`. |
| MOV-3 | Built | `src/game/player/movement.ts`; test `src/game/__tests__/descent-control.test.ts`. |
| MOV-4 | Built | `src/game/player/` does not import the composure contract (lane-boundary test). |
| PLT-1, PLT-2 | Built | `src/game/world/stage-progress.ts`, `src/game/world/section-loader.ts`; tests `stage-progress.test.ts`, `stage-layouts.test.ts`. |
| PLT-3, PLT-5, PLT-6 | Built | `src/game/world/environment.ts`, `src/game/world/stage-weather.ts`; test `environment.test.ts`. |
| PLT-4 | Not built | Only `src/game/world/platform-types/static.ts` exists; no disappearing platforms. |
| COL-1 | Built | `src/game/wax/rewards.ts`, `src/game/candle/wax-ball.ts`; tests `wax.test.ts`, `wax-ball.test.ts`. Wax also refills lantern fuel (see LAN-2). |
| FAL-1 | Built | `src/game/world/fall-tracker.ts`; test `falling.test.ts`. |
| LAN-1 | Changed | The light source is the candle flame; the signal sets its radius via `src/config/effects.config.ts`. Described as a composure feature, not verified tension detection. |
| LAN-2 | Changed | Fuel depletion exists: `src/game/forest/lantern-fuel.ts`, `src/config/lantern-fuel.config.ts`. Owner decision D-25: fuel stays. The row's "No fuel depletion" no longer holds. Fuel affects light radius only. |
| LAN-3 | Changed | `src/game/effects/outline-fade.ts`, `src/game/effects/protected-visibility.ts`; outlines fade at the edge of the light (test `outline-fade.test.ts`). |
| LAN-4 | Built | `src/game/effects/effects-engine.ts`; test `effects-engine.test.ts`. |
| ATM-1 | Partly built | `src/audio/music-layers.ts`, `src/audio/mix-rules.ts`; one ambient loop with a bounded mix, no separate tense stem. |
| ATM-2 | Changed | `src/game/forest/forest-effects.ts`; effects reverse, but fuel accumulates over play time. |
| ATM-3 | Built | `src/game/forest/atmosphere.ts`; test `atmosphere.test.ts`. |
| ATM-4 | Changed | `src/game/forest/corruption-screen.ts`, `src/game/forest/corruption-filter.ts`; bounded shake and glitch filter on the rendered screen, off under reduced motion. |
| CHK-1, CHK-2, CHK-3 | Built | `src/game/ember/recovery.ts`, `src/game/world/refuge.ts`, `src/game/save.ts`; tests `recovery.test.ts`, `refuge.test.ts`, `save.test.ts`. |
| EMB-1 to EMB-6, EMB-8, EMB-9 | Built | `src/game/ember/recovery.ts`, `src/ui/components/ember-prompt/`; test `recovery.test.ts`. Tested in the simulator and unit tests only. |
| EMB-7 | Not built | No eyes-closed interaction exists. |
| BCI-1 | Partly built | `src/signal/sources/pieeg-source.ts` is written against a fake SDK; `src/signal/__tests__/real-sdk.test.ts` exercises the vendored SDK. Not run against a real board. |
| BCI-2 | Built | `src/signal/pipeline.ts`, `src/ui/components/calibration/`; test `calibration.test.ts`. |
| BCI-3, BCI-4 | Built | `src/signal/pipeline.ts`; tests `quality.test.ts`, `pipeline.test.ts`. Real-board behaviour unverified. |
| BCI-5 | Partly built | Poor signal eases effects to neutral (tested). Whether reconnect and recalibration are offered during a run is unverified. |
| BCI-6 | Built | `src/signal/pipeline.ts`; test `active-response.test.ts`. |
| NAR-1 | Changed | `src/audio/narrator/intro-player.ts` plays original intro clips; `src/audio/narrator/moments.ts` adds sparse event-driven requests (for example height steps and low fuel). It never comments on the player's feelings or worth. |
| NAR-2, NAR-3 | Built | Clips are local files under `public/assets/`; generation tools are in `tools/narrator/`. Human listening review of the clip bank is unverified. |
| NAR-4 | Built | `src/audio/narrator/level.ts`, `src/ui/components/captions/`. |
| UX-1 | Built | `src/ui/components/hud/hud.ts`. The stage details card is hidden by default and shown by a Settings toggle (`showStageDetails` in `src/shared/contracts/settings.ts`); decision D-26. |
| UX-2 | Built | `src/ui/components/settings-panel/settings-panel.ts`, `src/ui/components/pause-menu/`. |
| UX-3 | Not built | `landingShake` exists in `src/shared/contracts/settings.ts` but no code reads it. |
| DIA-1 | Built | `src/ui/components/source-badge/`; the simulator is labelled Simulated Input. |
| DIA-2 | Built | `src/ui/components/debug-overlay/`. |
| END-1 | Built | `src/game/world/finish.ts`, `src/ui/components/finish-screen/`; test `finish.test.ts`. |

Beyond the list: tension replay presets (`src/signal/presets/`, `src/ui/components/signal-presets/`), a stage editor
(`src/ui/components/stage-editor/`, `src/game/editor/`) and a Settings voice picker. None changes controls or physics.
