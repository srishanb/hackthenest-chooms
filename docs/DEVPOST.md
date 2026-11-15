# Devpost submission copy

Paste-ready text for the Hack The Nest 2026 Devpost page, Mind and Machine (BCI) track. Each heading below matches a
Devpost field. Checked against `origin/main` at commit `93915b4` (Sun 15 Nov 2026, about 11:30 AM Eastern).

---

## Project name

Lighten Up

## Tagline

Climb a dark forest tower by candlelight. Your composure, read by an EEG board, shapes the light, fog and music.

---

## Inspiration

We like hard climbing games such as *Jump King*, where one missed jump can cost minutes of progress. Those games
make you tense, and tension makes you play worse. We wanted a game that shows you that loop while you play.

The rule we set on day one: the brain signal must never touch the controls. A BCI game that makes your jump weaker
when you are tense would feel unfair. So the signal changes the world around you, not your body in it.

## What it does

You carry a candle up one tall forest tower: five stages (Tutorial, Normal, Snow, Windy, Snowy and Windy), ten
ledges each. You hold Space to charge a jump and release to launch. You cannot die. A missed jump only costs height.

A PiEEG Octopus 16 EEG board reads a signal we call **composure**: calm versus tension. It is personalised to each
player by a short resting and active calibration. Muscle activity, such as a clenched jaw, is part of that signal,
and we say so in the game.

The signal changes:

- **Light.** How far your candle's light reaches.
- **Atmosphere.** Fog, shadows and a "corruption" look on the world at high tension.
- **Music.** Four local tracks that crossfade from a calm forest piece toward a heavier one as tension rises.
- **Recovery.** You can place one ember on a safe ledge (E). After a fall, R returns you to it. In calibrated play,
  the return needs about four seconds of valid, relaxed signal, with a progress meter. Brief spikes pause progress
  and never reset it. Bad or stale data never advances it.

The signal never changes gravity, friction, jump strength, speed or steering. A test fails the build if the player
physics code imports the composure contract.

Other parts of the game:

- A candle fuel meter that drains with playing time (faster at high tension) and refills when you collect wax.
  Low fuel shrinks the light, never your movement.
- A narrator with short pre-recorded clips for real events (a long fall, a new stage, a height milestone, low fuel,
  the finish), with captions and a 30-second cooldown. It comments on what happened, never on the player.
- A source badge that always says which input is active: `LIVE EEG`, `SIMULATED INPUT` or `RECORDED REPLAY`.
- A keyboard simulator (keys 1 to 4: alpha boost, jaw clench, eye blink, noisy pin), recording replay, and a
  fixed-light mode (`/?mode=fixed`), so the game is fully playable without a board.
- Settings for key remapping, captions, reduced motion, effect strength and separate volumes.
- A debug overlay (backtick key) showing the feature value, signal quality, sample age, intensity and ember progress.

The HUD describes composure in words (lower, midrange, higher). It never shows a composure score, percentage or
ranking.

## How we built it

- **Game:** Phaser 4 and TypeScript in strict mode, built with Vite. Code-drawn candle player, licensed free forest
  art and audio (all listed in `CREDITS.md`).
- **Signal pipeline (`src/signal/`):** a source (simulator, replay or the live board) feeds band powers through a
  quality check, feature extraction, calibration and time-based smoothing. The only thing the game may read is a
  `ComposureState` object. The default algorithm is `intensity-v2`; algorithms are swappable from a registry.
- **Hardware:** the live source talks to the PiEEG Octopus 16 over Web Bluetooth (Chrome or Edge) through the
  vendored `pieeg.js` SDK.
- **Effects as data:** most signal-driven effects are rows in `src/config/effects.config.ts`, each with a cap, a
  smoothing time and a written rule about what it may never do.
- **Lanes:** the code is split into folders (signal, game, UI, audio, content). A lane may import only shared
  contracts and config, never another lane. A test enforces this.
- **Narrator:** lines were drafted with Gemini, edited, and voiced once with ElevenLabs stock voices by an offline tool
  (`tools/narrator/`). The game plays the saved files. Nothing on the play path calls the network.
- **Testing:** Vitest unit tests (`npm run check`), a level checker that proves every authored jump is reachable
  (`npm run check:levels`), and an offline eval tool that scores an algorithm against a recording (`npm run eval`).
- **Team process:** four people and several AI coding agents (Claude, Codex, Antigravity) worked in parallel, each in
  its own git worktree and branch, with a reviewer agent running the checks on every pull request.

## Challenges we ran into

- **No board until late.** Most of the signal work had to be built and tested against a simulator and a fake SDK. We
  designed the simulator to produce the same kind of band-power data the board sends, so the pipeline is the same.
- **Keeping the signal honest.** It is easy to overclaim what EEG can measure. We kept the language to "composure",
  stated that muscle activity is part of it, and made poor signal ease every effect back to neutral instead of guessing.
- **Fairness.** A recovery mechanic gated by the signal can feel like a punishment. We made progress forgiving: it pauses
  on spikes, never resets, and fixed-light or uncalibrated play gets a labelled direct return.
- **Many parallel contributors.** Over 100 pull requests in 24 hours. Lane rules, a shared contract file and tests that
  fail on cross-lane imports kept merges from breaking each other.

## Accomplishments that we're proud of

- The signal provably never touches movement or physics: it is enforced by a test, not only a promise.
- The game is complete and playable start to finish on the simulator, with a summit finish on the last ledge.
- The whole demo runs offline: libraries from the lockfile, the SDK vendored, every sound and narrator clip a local file.
- Graceful failure: if the board or the signal drops, the game keeps running and says so.

## What we learned

- Personal calibration matters more than any fixed threshold. A short resting and active calibration per player is the
  core of the design.
- Signal quality has to be tracked separately from the signal value, or bad contact looks like tension.
- A simulator and a recording format early on let a whole team build against a device most of them never touched.

## What's next

- **Real-board testing.** Run the full flow on the PiEEG Octopus 16 with several players, record sessions, and tune
  the thresholds from real data (the checklist is in `docs/OCTOPUS_TEST.md`).
- **Optional eyes-closed recovery.** An eyes-closed interaction with audio cues for the ember, explaining that closing
  your eyes is not proof of calm.
- **More platforming.** Disappearing platforms with clear warnings, and an optional landing shake setting.
- **Playtesting** with people outside the team, including the offline built version.

## Honest status

- **Built and tested:** the game, the simulator, recording replay, the signal pipeline, calibration screens, the
  recovery ember, the narrator clips and the offline build. Tested with unit tests and simulator runs.
- **Not yet verified on a real board:** the live PiEEG Octopus 16 source is written and tested against a fake SDK only.
  As of this writing, `recordings/` holds only a simulated fixture (`sim-fixture.jsonl`) and no report in
  `docs/agent-reports/` records a run on a real board. The calibration flow and the signal-gated recovery have not
  been exercised with a real EEG signal.
- Lighten Up is an experimental game prototype. It is not a medical device and makes no health claims.

## Built with

phaser, typescript, vite, vitest, tsx, node.js, web-bluetooth, pieeg, pieeg-octopus-16, eeg, elevenlabs, gemini,
html, css

## Links

- Repository: https://github.com/srishanb/hackthenest-chooms
- Play online: https://srishanb.github.io/hackthenest-chooms/ (best in Chrome or Edge; Web Bluetooth for the board
  needs a Chromium browser)
