# Demo runbook

The presenter's guide for the live demo of Lighten Up at 1:15 PM, Sun 15 Nov 2026.
Every key, label and command here was checked against `main` (`src/ui/strings.ts`, `src/signal/`,
`package.json`, `run.mjs`, `run/README.md`). Labels in **bold** are the exact on-screen text.

## Before you start

- [ ] Laptop on power. Desktop **Chrome or Edge** (the live board needs Web Bluetooth; other browsers cannot connect it).
- [ ] Sound on, volume up. Test it once: in Settings, **Preview voice** plays the narrator.
- [ ] Open the game (one of the two ways below) and reach the start menu, which reads **Lighten Up**.
- [ ] Close any `cloud.pieeg.com` tab. Bluetooth allows one connection to the board.
- [ ] In Pause (Escape), then **Settings**, check:
  - **Master volume**, **Music volume**, **Narrator volume** are up.
  - **Captions enabled** is on (judges may not hear well in the room).
  - **Show signal status** and **Show signal intensity** are on, so the audience can see the signal.
  - **Signal source** is set to what you plan to show (see "The board path" and "The fallback").
- [ ] Have `docs/OCTOPUS_TEST.md` open in a second tab if you plan to use the board.

## Two ways to run

**1. Hosted page:** https://srishanb.github.io/lighten-up/
Open it once before the demo so the browser has it loaded. Unverified by this runbook's author: that the
latest `main` is deployed there. Check the start menu loads before 1:15.

**2. Local** (from the repo folder, Node 22.12 or newer):

```
npm ci                    # once
node run.mjs doctor       # checks this computer can run the game
node run.mjs preview      # builds, then serves the built game the way the demo will run
```

`node run.mjs dev` starts the development server instead (it opens the game in the browser). A URL query can be
passed in quotes, for example `node run.mjs dev "?source=live"`. The port is `PORT` from `.env.local`, or 5173.
Press Ctrl-C in the terminal to stop.

**No network during play.** Libraries, art, music and narrator clips are files in the build. `run/README.md`
says: for the demo, run `node run.mjs preview`, then turn the Wi-Fi off and reload;
`node run.mjs demo-offline` lists the steps. The live board uses Bluetooth, not the network.

## Three-minute script

| Time | On screen | What to say |
|---|---|---|
| 0:00 | Start menu, **Lighten Up**. | "Lighten Up is a climbing game. You carry a small candle up a long climb. A PiEEG Octopus 16 board shapes the light, the forest and the music. It never touches the controls." |
| 0:20 | Press **Play** / **Start climbing**. Show the tutorial ledges. | "Hold Space or the up arrow to charge, aim with A and D or the arrows, release to jump. Full power takes 0.6 seconds." |
| 0:45 | Climb a few ledges. Pick up wax. | "Wax keeps the candle burning. Gold wax briefly boosts the light." |
| 1:00 | Stand on a safe ledge, press **E**. | "E places your Ember, the only checkpoint. You choose where it goes." |
| 1:15 | Change the signal (board, simulator key, or a preset; see below). Point at the lantern, the forest and the HUD. | "This is the composure signal: calm versus tension. As tension rises, the light dims, the forest takes on a corrupted look and the music gets heavier. Muscle activity, like a jaw clench, is part of the signal. We say that openly." |
| 1:45 | Fall on purpose. Land below the Ember, press **R**. | "After a fall, R starts a return to the Ember. With resting calibration, about four seconds of valid resting signal brings you back. Without it, there is a labelled ordinary-input rescue." |
| 2:15 | Press **`** (backtick) to show the debug overlay. | "This is the raw pipeline: source, sample age, quality and contact. The same pipeline runs for the live board, the simulator and recordings." |
| 2:40 | Press **`** again to hide it. Keep climbing. | "The signal only changes atmosphere. Gravity, jump strength, speed and steering are the same for everyone. Thank you." |

## The board path

Full steps are in [docs/OCTOPUS_TEST.md](OCTOPUS_TEST.md). In short:

1. Power the board from a 5 V power bank, fit it at Pz, close `cloud.pieeg.com`.
2. Open the game with `?source=live`, for example `http://localhost:5173/?source=live`
   (parsed in `src/signal/url-params.ts`), or pick **Live board (Octopus 16)** in Settings under **Signal source**.
3. Press `` ` `` for the debug overlay, click **Connect Octopus 16**, and choose the board in the Bluetooth list.
4. Wait for **Board connected**. Quality should be above 0.5. If the overlay says
   "check electrodes: contact is low" or "many packets lost: move closer or check power", re-seat the pins and wait 10 s.
5. Calibrate from the pause menu with **Recalibrate**, or from the overlay with **Calibrate resting** and
   **Calibrate active**. A failed step says why. "A failed step says nothing about you."

The start menu shows **Octopus 16 · Signal ready** once usable samples arrive, or
**Octopus 16 · Waiting for usable signal** before that.

No recording under `recordings/` comes from the real board (only `sim-fixture.jsonl` is there), and
`docs/OCTOPUS_TEST.md` says its steps have not been run on real hardware by the builder. Treat the live board as
untested until someone runs it before the demo.

## The fallback when the board does not connect

Do not debug on stage. Switch to the simulator or a preset; both run through the same signal pipeline as the board.

**Simulator.** In Settings, **Signal source**, choose **Simulator (keys 1 to 4)**. The start menu reads
**Simulator · No headset needed**. Keys (from `src/config/signal.config.ts`):

| Key | Simulator effect |
|---|---|
| 1 | alpha boost (toggle), the calmer, eyes-closed pattern |
| 2 | jaw clench |
| 3 | eye blink |
| 4 | noisy pin (toggle) |

**Replay presets.** In Settings, **Signal source**, pick a preset. **Loop the preset** keeps it running.
The start menu reads **Recorded replay · Not live input**, so the audience knows it is not live.
Each preset is about one minute (`public/recordings/presets/manifest.json`). They can also be opened by URL with
`?preset=<id>`.

| Preset | id | What it shows |
|---|---|---|
| Calm climb | `calm-climb` | A steady, low-activity signal: alpha boost on, no muscle activity. Clear light. |
| Rising tension | `rising-tension` | Tension rises over a minute while jaw clenching grows from none to continuous. Best single preset to show the effects. |
| Jaw clench bursts | `jaw-clench-bursts` | Four-second bursts of jaw clenching with rests between. Shows that muscle activity is a large part of the signal. |
| Mixed climb | `mixed-climb` | Low activity for twenty seconds, then rising tension, then settling again: the whole range in one run. |
| Noisy pin | `noisy-pin` | A relaxed signal while one pin picks up interference, then the pin is reseated. Contact stays good, so the reading stays usable. |

If even that fails, the game plays fine with no signal: **Use steady light** in calibration keeps the lighting fixed.

## What to say about the signal

- It is a **composure** signal: calm versus tension. It is not a measure of feelings, health or ability.
- **Muscle activity is part of it.** A jaw clench raises it. We show that on purpose with the presets and key 2.
- It changes only the lantern, the forest's corrupted look and the music, and gates the Ember return when resting calibration has passed.
- It **never changes controls or physics.** The player code does not import the signal contract.
- Nothing is uploaded. The game needs no network to play.
- Do not describe it as measuring feelings, and make no health claim, when answering questions.

## Likely judge questions

| Question | Short honest answer |
|---|---|
| Is this really EEG, or just muscle? | Both. A forehead or jaw movement shows up strongly. We say muscle activity is part of the signal. |
| Did you test it on a real head? | Only say yes if someone ran `docs/OCTOPUS_TEST.md` before the demo. Otherwise: "The pipeline is tested with the PiEEG simulator and recordings; the board path follows the vendor's library." |
| Does the signal make the game easier or harder? | No. Jump, gravity, speed and steering never change. It changes the atmosphere and the Ember return. |
| What if someone has no headset? | The simulator, replay presets and **Use steady light** all work without one. |
| How is it calibrated? | Two short steps: resting (eyes open, then closed) and active (relaxed jaw, then a gentle clench), 12 seconds each. |
| Does it need the internet? | No. Everything ships in the build. Bluetooth is used only for the board. |
| What algorithm? | The channels are band-pass filtered with a 60 Hz notch, the result is smoothed over about 3 seconds and scaled by your own calibration. Settings are in `src/config/signal.config.ts`; the code is in `src/signal/`. |
| What would you do next? | Record more real sessions on the board and tune from them. |

## Known limitations

- The live board path has not been verified on a real PiEEG Octopus 16 in this repo (see "The board path").
- Live board needs desktop Chrome or Edge with Web Bluetooth.
- Muscle activity and movement affect the signal; it cannot separate them fully.
- Eye closure is not proof of calm. The calibration screen says so.
- `?replay=<file>.jsonl` needs that file under `/recordings/`. The full build copies `recordings/*.jsonl` into `dist/recordings/` (`tools/pipeline/build.mjs`); `src/signal/url-params.ts` still says dev server only (unverified in a browser). Presets work everywhere.
- That the hosted page runs the latest `main` is unverified here.
