# Plans: review and approve them all at once

Every phase now has a written plan, so nobody waits for one to be generated. Each plan is `Status: PROPOSED` until
its owner approves it. Written Sat 14 Nov 2026, 11:15 PM Eastern. Feature freeze is Sun 9:00 AM.

## How to approve a plan (two minutes)

1. Read your plan. Look hardest at **Goal**, **Contract changes requested**, **Cut line** and the acceptance tests.
2. If it is right, change line 3 to `Status: APPROVED by <your name>`. On GitHub: open the file on `main`, click the
   pencil, edit line 3, commit. Or do it in a branch and open a pull request. **A person writes this line. Agents
   never do.**
3. If it is wrong, edit the plan first (or tell your agent what to change), then approve it.
4. Tell your agent: "the plan is approved, claim the first task". Each sub-phase (P4.1, P4.2, …) is one claimable task.

Pull requests need no human review: the reviewer agent merges them (AGENTS.md, "Review and merge"). Only this
approval line is yours.

## The plans

| Plan | Approver | What it covers | Needs first | Fits before 9 AM? |
|---|---|---|---|---|
| [P2](P2.md) (Amrit's own, PR 20) | Amrit | UI shell: tokens, strings, registry, settings, menus, HUD, captions | P0 | Yes |
| [P4](P4.md) | **Ali** | Game core: movement, sections, falling, refuges, saving, finish | P0 | Yes, with two agents. **Critical path** |
| [P5](P5.md) | **Ali** | Lantern, protected visibility, fog, shadows, failure handling | P4.1, P4.2 for the real lantern | Yes |
| [P5.4](P5.4.md) | **Amrit** | Adaptive audio: mixer, music layers, sound effects | P0 | Yes |
| [P6](P6.md) | **Ali** | Recovery ember: state machine, EEG-gated activation, rescue, return | P4.1, P4.3, P4.4 | Tight. P6.2 can start now |
| [P6.1](P6.1.md) | **Amrit** | Calibration screens, Connect button, fallback choice | P1 (merged); PR 17 for Connect | Yes |
| [P7](P7.md) | **Amrit** | Narrator: draft lines, build clips, director and player | Keys (H-09) for clips only | Director yes; clips if keys arrive |
| [P8.1](P8.1.md) (Neil's own, PR 18) | Neil | Choosing and logging free assets | — | Yes |
| [P8](P8.md) | **Neil** | Two sections, world look, visual instability, narrator lines, tuning | P4.2 for final sections | Sections yes; polish maybe |
| [P9](P9.md) | **Srishan** | Submission: README, credits, Devpost, demo script, video, public repo | A playable build | Sunday morning |
| [P10](P10.md) | **Srishan** | Optional eyes-closed ember interaction | Every Core feature done | Unlikely |
| [P11](P11.md) | **Ali** | Moving and disappearing platforms, wind, slippery surfaces | Every Core feature done | Unlikely |
| [P12](P12.md) | **Ali** | Optional landing shake | Every Core feature done | Only if time is left |

P3 (real board) has no plan file: its tasks are in [docs/QUEUE.md](../QUEUE.md) and are already approved.

## Approve in this order

1. **Ali: P4 now.** Everything in the game waits on P4.1 and P4.2.
2. **Amrit: P2, then P6.1 and P5.4.** None of them waits on the game.
3. **Neil: P8.1, then P8.** Draft the two sections now; finish them when P4.2 lands.
4. **Ali: P6 and P5** while P4 is being built. P6.2 (the pure ember machine) can start before P4 lands.
5. **Amrit: P7.** The director needs no keys. The clip tools wait for H-09.
6. **Srishan: P9** by Sunday 8:00 AM. P10, P11 and P12 only at the 6:00 AM decision point.

## Contract changes the plans ask for

Since Decision D-18 a lane agent may make a small contract change in its own pull request. Where a plan says "one
integrator PR (Srishan)", the first task of that plan may make the change instead. Two plans touching the same type
should agree first: the list below is everything requested, so overlaps are visible.

| File in `src/shared/contracts/` | Change | Asked by |
|---|---|---|
| `content.ts` | New `AreaData { x; y; width; height }`; `SectionData` gains `refuge`, `finish` | P4 |
| `content.ts` | `SectionData.look?` (sky colours, platform tint, `strangeness01`) | P8 |
| `content.ts` | `NarratorLine.trigger` and a `NarratorTrigger` union | P7 (P8.5 uses it) |
| `content.ts` | `PlatformData.motion?`, `vanish?`; `SectionData.wind` | P11 |
| `config.ts` | `GameConfig.player`, `stepHz` | P4 |
| `config.ts` | `EmberConfig.maxStateAgeMs` | P6 |
| `config.ts` | `AudioConfig.mix` (refuge, ember and paused music scales) | P5.4 |
| `config.ts` | `GameConfig.surfaces`, `landingShake` | P11, P12 |
| `game-state.ts` | `GameSnapshot.inRefuge` | P4 and P5.4 (same field; make it once) |
| `events.ts` | `recalibrate_requested` | P6 |
| `events.ts` | `narrator_line` gains `text` and `durationMs` | P7 |
| `settings.ts` | `KeyBindings.assist`, `recalibrate` | P6 |
| `settings.ts` | `Settings.landingShakeStrength` | P12 |
| `src/main.ts` | Pass `storage` and `emberConfig` into `createGame` | P4, P6 |
| `package.json` | Script `check:levels`; dev dependencies for the narrator tools | P4, P7 |

## One thing changed when the feature list was finalised

The team removed **FAL-2** (falling below a section's boundary returns you to its checkpoint) when it set
`docs/FEATURES.md` to FINAL. The plans follow that: a fall keeps going until you land, the world has a solid floor, and
the recovery ember is the only way back up. A "checkpoint" is now only where a saved game resumes after a reload.
The `section_reset` event stays in the contract but nothing emits it.

## Decisions the plans leave to people

| Question | Who decides | Raised in |
|---|---|---|
| Own fixed-step physics instead of Phaser Arcade, so the level checker runs the identical maths | Ali | P4.1 |
| How captions get their text: a lookup passed to the UI (P2.4) or text on the `narrator_line` event (P7) | Amrit | P2, P7 |
| The Core ember may in practice need closed eyes, because resting calibration uses an eyes-closed window. The feature list cuts a *mandatory* eyes-closed interaction | Srishan | P6, P10 |
| Whether the board can leave the booth for the ballroom demo (P8.1 says no; the timeline assumes yes) | Neil, Srishan | P8.1, P9 |
| After a second fall from a lower ledge, does the ember return to that ledge (as written) or to the highest ledge not yet returned to? | Ali | P6.2 |
| May ice and windy ledges be ember return points? | Ali | P11 |
| Who owns the darkness sheet's alpha: P5 says shadows set it and P8.4's flicker multiplies on top | Ali, Neil | P5.3, P8.4 |
| The `shadowDepth` row's neutral (0.4) is too thin to be the darkness: Neil changes it before P5.3 starts | Neil | P5.3 |
| The settings panel plan has no landing-shake control and no fixed-mode toggle | Amrit | P2, P5.5, P12 |
| The project name: "lighten" on `main`, "Lighten Up" in PR 12 and P8.1 | Team (H-11) | P9 |
| List ElevenLabs separately from the AI tools on Devpost? | Srishan | P9 |

## What the plans assume or could not verify

Each plan marks its own unverified items. The ones that matter most: Web Audio API details (P5.4), the Gemini and
ElevenLabs SDK APIs (P7 makes checking them its first task), how Phaser 4 filters look on screen (P8.4), and that
`npm run build` does not copy `recordings/` (P9: the board-failure fallback should run on `npm run dev` or copy the
recording into `public/`).
