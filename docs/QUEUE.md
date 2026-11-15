# Task queue

The ordered list of work for the **continuous builder** (one Claude Sonnet 5.5 session working for Srishan in the
signal and integrator lanes). Only the integrator adds, removes or reorders tasks, in a PR a human merges.

**Current focus (Decision D-15):** reach a state where we can build and test on a real Octopus 16.
Hardware is the Octopus 16 plus test data (the simulator and recordings). There is no other headset (D-14).

**A task in this file is already approved** (see AGENTS.md, "Task queue and claims"): do not write a separate plan
file or wait for an approval line. Put a short plan in the draft PR body instead.

## How to take a task

1. `git fetch origin --prune`. A task is **taken** if `git ls-remote --heads origin "*/<id>-*"` prints a branch, or
   `gh pr list --state all --search "<id> in:title"` shows a pull request. Skip it.
2. Take the first task that is not taken and whose "Needs" column is satisfied.
3. **Claim it before writing any code:**
   `scripts/wt.sh new <agent> <id>-<slug>` → `git commit --allow-empty -m "chore(claim): <agent> starts <id>"` →
   `git push -u origin <agent>/<id>-<slug>` → `gh pr create --draft --title "[claim] <id>: <title>"`.
4. Build, run `npm run check`, write the after-job report, retitle the PR without `[claim]`, mark it ready.
5. Do not wait for a merge. Take the next task. If it needs an unmerged branch, start its worktree from that branch
   with `BASE_BRANCH=<branch> scripts/wt.sh new …` and say so in the PR.

If two claims for the same id ever exist, the pull request created first wins; the other closes theirs.

## Queue

| ID | Task | Lane and files | Needs | Done when |
|---|---|---|---|---|
| Q-01 | **Live board source (P3.1).** `connect('LIVE_EEG')` works. | Signal. New `src/signal/sources/pieeg-source.ts` (a `Source` over the existing adapter's `connect('ble')`); `src/signal/index.ts`; debug overlay gets **Connect Octopus 16** and **Disconnect** buttons; strings in `src/ui/strings.ts`. | Nothing. No board needed to build. | Unit tests with a fake SDK: `connectBLE` is called with `device: 'octopus-16'` from the button's click handler; frames are tagged `LIVE_EEG`; an SDK disconnect or error stops the source and `signal_lost` fires once the data is stale. `?source=live` starts with no source running and the overlay says the board is not connected. A missing Web Bluetooth gives a readable message, not a crash. The report lists the exact steps a human runs with a real board, marked Not verified. |
| Q-02 | **Recorder wired in (P1.5 leftover).** A browser recording can be replayed. | Signal: `src/signal/index.ts`, `src/signal/recorder.ts`, debug overlay. Integrator: add `exportRecording(): string` to `SignalHandle` in `src/shared/contracts/signal-api.ts` (a contract change, so the PR needs a human merge). | Nothing. | Test: run a fixture through `createSignal`, export, and `parseRecording` returns the same number of frames. Browser, on the simulator: record 20 s, download, reload with `?source=replay&replay=<file>` and the overlay shows `RECORDED REPLAY` with moving values. Recordings hold band powers, quality and events only. |
| Q-03 | **Algorithm `intensity-v2`.** Active calibration can pass, so the lantern responds. | Signal: new `src/signal/algorithms/intensity-v2.ts`, one registry line, tests; `src/config/signal.config.ts` (`defaultAlgo`); `src/signal/stages/calibration.ts` only if the separation rule must differ for a log-scale feature. | Nothing. | **Measure first** on the real vendored simulator (see `src/signal/__tests__/real-sdk.test.ts`): today's feature `beta/(theta+alpha+beta)` reads 0.523 relaxed and 0.502 during repeated clench, so it cannot separate. Candidate: the amount of fast activity (log of absolute power from 13 Hz to the bandpass edge). Put the measured table in the PR. An integration test against the real simulator shows relaxed and clench windows pass `calibrateBaseline` for the active step, and the alpha boost does not raise the active feature by more than 20 %. Browser: Calibrate resting ok, Calibrate active ok, then `valid=true` and repeated `Digit2` presses raise intensity and shrink the lantern. Switch `defaultAlgo` only if all of that passes. `intensity-v1` stays registered. |
| Q-04 | **Octopus test kit (P3.2, P3.3 tooling).** Everything a person needs to test on a head. | Signal: debug overlay (contact share, packet loss, a guided checkpoint: eyes open 15 s, eyes closed 15 s, twice, recorded); `tools/eval` gains a resting-separation metric per labelled segment; new `docs/OCTOPUS_TEST.md`. | Q-01, Q-02. | On the simulator, with the alpha key standing in for eyes closed, the guided checkpoint reports a closed/open ratio above 1.3 and saves a replayable recording. `docs/OCTOPUS_TEST.md` gives numbered steps: flash, 5 V power bank only on a head, close the cloud.pieeg.com tab (BLE allows one connection), connect, check quality, run the checkpoint, where to save the file. |
| Q-05 | **Process fixes.** | Integrator (shared files, human merge): `scripts/hooks/report-check.mjs` reads `cwd` from the hook input instead of the script's folder; `scripts/wt.sh` creates branches with `--no-track` so a bare `git push` cannot reach `main`; `.github/workflows/ai-review.yml` stops failing when the bot's own `needs-human` label re-triggers it (verify the fix in the action's docs first); refresh `docs/STATUS.md`. | Nothing. | Each fix has a test or a reproduced before and after in the report. |
| Q-06 | **On the real board.** Tune quality thresholds and band edges on real data; run the checkpoint; commit the recordings. | Signal: `src/config/signal.config.ts`, `recordings/`. | **A board and a human** (H-02, H-03, H-04), and Q-04. | The builder only prepares this. A human runs `docs/OCTOPUS_TEST.md`; the builder then tunes from the saved recordings with `npm run eval`. |

When the queue is empty or every remaining task needs a human, stop and report. Do not invent tasks, and do not
take work in another person's lane (`src/game`, `src/ui` outside the debug overlay, `src/audio`, `src/content`).
