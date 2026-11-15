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
| COL-1 | Exploration | Collectible wax | Randomly choose 1–3 optional gold drops per complete run, on safe stationary ledges. Only the next uncollected drop is active or visible. Each gives a capped, 10-second wider lantern glow and a pickup pulse; pickups refresh rather than stack. HUD shows the collection goal. Selection and pickups persist across reloads; a new run rerolls. Pause/recovery freeze timers and light stays fixed while airborne. No physics or EEG-dependent reward changes. | Core presentation | P4 extension |
| PLT-3 | Platforming | Moving platforms | Tutorial introduces a broad green shuttle on a predictable visible cycle. It carries standing/charging riders; later sections may add harder cycles. Independent of EEG; no ember placement on moving ledges. | Expansion | P4 tutorial preview, P11 extension |
| PLT-4 | Platforming | Disappearing platforms | Clear warning before disappearing on fixed cycles; introduced above catch platforms. | Expansion | P11 |
| PLT-5 | Platforming | Wind stages | Tutorial previews mild wind. Windy and Snowy and Windy stages use stronger bounded airborne gusts, directional arrows and gradual zone-edge fades. Grounded players are unaffected; fixed cycles independent of EEG. | Expansion | P4 tutorial preview, P11 extension |
| PLT-6 | Platforming | Snow and slippery surfaces | Tutorial previews ice; Snow and Snowy and Windy ramp authored ice strength, changing acceleration and stopping distance. Charging stops drift. Stationary ordinary and slippery ledges permit manual ember placement. Snow particles gradually blend into the existing forest before stage boundaries; no automatic saves. | Expansion | P4 tutorial preview, P11 extension |
| FAL-1 | Falling | No death system | Missed jumps lose height. No health bar, lives or death screen. | Core | P4.3 |
| LAN-1 | Lantern | EEG-driven intensity | A personalised EEG feature controls environmental intensity. Not presented as verified stress detection. | Core | P1, P5.1 |
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

Counts (49 rows): 37 Core, 4 Core presentation, 1 Core production, 1 Core polish, 1 BCI option, 4 Expansion, 1 Polish.
