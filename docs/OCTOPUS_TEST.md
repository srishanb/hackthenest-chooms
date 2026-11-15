# Octopus 16 test: first run on a head

Goal: confirm the board sends usable data and that eyes-closed shows more alpha than eyes-open. Takes about 10 minutes.
Written for a person with the board; the builder has not run these steps on real hardware.

1. **Flash** (once): `octobridge.pieeg.com/flash` in desktop Chrome or Edge, USB-C data cable (H-03 in `docs/HUMAN_TASKS.md`).
2. **Power:** on a head, run the board from a 5 V power bank only, not a laptop USB port.
3. **Fit:** board at Pz, part the hair, pins straight down, headband snug.
4. **Close `cloud.pieeg.com`** and any other tab that talks to the board. Bluetooth allows one connection.
5. **Start the game:** `npm ci` once, then `npm run dev`. Open `http://localhost:<port>/?source=live` in Chrome or Edge (port is `PORT` in your worktree's `.env.local`, or the one Vite prints).
6. Press `` ` `` to open the debug overlay. It reads `source LIVE_EEG` and `(board not connected)`.
7. Click **Connect Octopus 16** and pick the board in the Bluetooth list. The `sample age` should drop below 500 ms.
8. **Check quality:** `quality` should be above 0.5 and `contact` close to 1.00. If a `link` line says contact is low or packets are lost, re-seat the pins, wet them slightly or move the board closer to the laptop, then wait 10 s.
9. Click **Run checkpoint** and follow the prompts: eyes open 15 s, eyes closed 15 s, twice. Sit still, jaw relaxed. The first 3 s of each segment are ignored.
10. The overlay shows `closed/open <ratio>`. Above 1.3 counts as a clear separation. A labelled recording downloads (`lighten-recording-<time>.jsonl`).
11. **Save the file** into `recordings/` in the repo and tell Srishan. Name it with the date and who wore it.
12. Check it offline: `npm run eval -- intensity-v2 recordings/<file>.jsonl`. The `Resting separation` section lists each label and the closed/open ratio.
13. Optional: **Calibrate resting** then **Calibrate active** (clench the jaw in the second half). A failed step prints a reason in the overlay.

Replay a recording in the browser: copy it into `public/recordings/` and open `/?source=replay&replay=<file>.jsonl`.

If it does not connect: the picker shows no board (power, other tab still connected, or the browser has no Web Bluetooth; the overlay prints which). If the ratio is below 1.3 with good contact, save the file anyway; it is the data we tune from.

What the numbers mean: this is a composure signal and muscle activity is part of it. It is not a medical measurement.
