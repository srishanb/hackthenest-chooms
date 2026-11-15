# Features

Status: PROVISIONAL

<!-- A human changes the line above to "Status: FINAL (<name>, <date>)" when the list is finalised (H-01),
     and the integrator adds a line to DECISIONS.md. Until then only P0 to P3 may be built. -->

Source: the team's feature specification of 14 Nov 2026. Priorities, in build order: **Core**, Core presentation,
Core production, Core polish, BCI option, Expansion, Polish. Features considered and not scheduled are listed in
[PLAN.md](PLAN.md#considered-not-scheduled).

To change this list: edit the table (add, remove, or change a priority), then tell the integrator, who re-plans the
affected phases. Removing a row never requires code outside one lane (see PLAN.md §3.1).

| ID | Category | Mechanic | Final behaviour | Priority | Phase |
|---|---|---|---|---|---|
| MOV-1 | Movement | Walking | Left and Right move the character on platforms. | Core | P4.1 |
| MOV-2 | Movement | Charge jump | Hold Space to charge up to a fixed maximum; release to launch. Directional input sets the launch direction. | Core | P4.1 |
| MOV-3 | Movement | Limited air steering | Small airborne corrections that cannot fully reverse a poor launch. | Core | P4.1 |
| MOV-4 | Movement | Consistent physics | EEG never changes gravity, friction, jump strength, speed or steering. Environmental effects follow fixed rules. | Core | P4.1, lane-boundary test |
| PLT-1 | Platforming | Vertical climb | Ascend an authored sequence of increasingly difficult sections. | Core | P4.2, P8.2 |
| PLT-2 | Platforming | Stationary platforms | The foundation of the climb. | Core | P4.2 |
| PLT-3 | Platforming | Moving platforms | Predictable, visible cycles independent of EEG. | Expansion | P11 |
| PLT-4 | Platforming | Disappearing platforms | Clear warning before disappearing on fixed cycles; introduced above catch platforms. | Expansion | P11 |
| PLT-5 | Platforming | Wind section | Visible direction cues and predictable gusts in a dedicated section; independent of EEG. | Expansion | P11 |
| PLT-6 | Platforming | Slippery surfaces | Distinct-looking surfaces with consistent reduced friction. | Expansion | P11 |
| FAL-1 | Falling | No death system | Missed jumps lose height. No health bar, lives or death screen. | Core | P4.3 |
| FAL-2 | Falling | Bounded progress loss | Falling below the active section boundary returns the player to its checkpoint. | Core | P4.3 |
| LAN-1 | Lantern | EEG-driven intensity | A personalised EEG feature controls environmental intensity. Not presented as verified stress detection. | Core | P1, P5.1 |
| LAN-2 | Lantern | Adaptive light radius | Higher intensity reduces distant illumination; lower restores it. No fuel depletion. | Core | P5.2 |
| LAN-3 | Lantern | Protected visibility | The current platform, immediate reachable landing edges and nearby hazards stay readable. | Core | P5.2 |
| LAN-4 | Lantern | Smooth, bounded changes | Gradual transitions within limits. Light radius is fixed from takeoff to landing. | Core | P5.1 |
| ATM-1 | Atmosphere | Adaptive audio | Crossfade tense and quieter music layers without excessive loudness or masking gameplay cues. | Core | P5.4 |
| ATM-2 | Atmosphere | Reversible EEG effects | Signal-driven fog, shadows and background motion ease during recovery; penalties never accumulate. | Core | P5.3 |
| ATM-3 | Atmosphere | Progression-based world changes | Scenery grows darker and stranger with altitude; authored, independent of EEG. | Core presentation | P8.3 |
| ATM-4 | Atmosphere | Visual instability | Lantern flicker, swaying scenery, restrained distant distortion. The gameplay camera stays stable. | Core polish | P8.4 |
| CHK-1 | Checkpoints | Automatic saving | Entering a refuge saves immediately, with no EEG requirement. | Core | P4.4 |
| CHK-2 | Checkpoints | Safe refuges | Full local visibility, quieter audio, a place to pause. | Core | P4.4, P5 |
| CHK-3 | Checkpoints | Local persistence | Checkpoint and ember ownership persist between sessions. | Core | P4.4 |
| EMB-1 | Recovery ember | Earn through progress | Start with one ember. First arrival at a new checkpoint refills capacity to one; revisits do not. | Core | P4.4 |
| EMB-2 | Recovery ember | Request after a fall | After landing lower down, press R to begin recovery if an ember and a useful destination exist. | Core | P6.2 |
| EMB-3 | Recovery ember | Safe return anchor | Return to the last eligible stationary ledge before the fall; never moving, disappearing or unsafe platforms. | Core | P6.2 |
| EMB-4 | Recovery ember | Safe activation state | Freeze gameplay and hazards; stabilise the view, improve visibility, simplify audio. | Core | P6.3 |
| EMB-5 | Recovery ember | EEG-gated activation | Accumulate about four valid target seconds against a personalised resting calibration; duration adjustable. | Core | P6.3 |
| EMB-6 | Recovery ember | Forgiving accumulation | Brief fluctuations pause progress, never reset it. Invalid or stale data never advances it. | Core | P6.3 |
| EMB-7 | Recovery ember | Optional eye closure | Offer an eyes-closed interaction with audio cues where suitable; explain that eye closure is not proof of calmness. | BCI option | P10 |
| EMB-8 | Recovery ember | Successful return | Teleport safely, clear velocity and held jump input, then consume the ember. | Core | P6.5 |
| EMB-9 | Recovery ember | Cancel or assistance | Cancel without consuming it, recalibrate, or use a labelled ordinary-input rescue that consumes the same ember. | Core | P6.4 |
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
| END-1 | Completion | Reach the finish | Win by completing the physical climb, independent of physiological performance. | Core | P4.5 |

Counts (48 rows): 37 Core, 3 Core presentation, 1 Core production, 1 Core polish, 1 BCI option, 4 Expansion, 1 Polish.
