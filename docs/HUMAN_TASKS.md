# Human tasks

Things only a person can do. Humans tick items here (`[x]`) and may add rows. Agents: read this before every phase
and copy the open rows that touch your phase into your plan file.

All times are Eastern. Event rules behind several rows: partner keys are never committed or posted in public
channels; borrowed hardware goes back; only public, synthetic or our own data.

## Blocking the next phase

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-14 | Review the architecture PR and approve `docs/plans/P0.md` by changing its status line to `Status: APPROVED by <name>` | Srishan | Sat 8:45 PM | Nothing can be scaffolded. Every lane waits. |
| [x] | H-01 | Give the **finalised feature list** (edit or confirm `docs/FEATURES.md`, change its status to `FINAL`, add a line to `DECISIONS.md`) | Team | Sat 10:15 PM (with the P0 merge) | Only P0 to P3 may be built. The game core (P4) and everything after it wait, and the Core list will not fit before the 9 AM freeze. |
| [ ] | H-08 | On your own laptop: install Node 26 LTS, `gh`, Chrome or Edge; Windows users also Git for Windows. Run the "verify your setup" list in the README after P0 merges | Each person | Sat 10:15 PM | That person can only edit docs and content; their agents cannot run tests. |

## Hardware

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-02 | Borrow an Octopus 16 (help desk in Halle Library or the track Discord; only a few exist). **Ask if we can keep it through the 2:15 PM demo.** | Neil | Sat 9:00 PM | All signal work continues on the simulator and replay. The demo falls back to the simulator plus a recorded real-signal clip; risk to *Does it work*. |
| [ ] | H-03 | First-time firmware flash at `octobridge.pieeg.com/flash` (desktop Chrome or Edge, USB-C **data** cable). Verify 16 live channels on `cloud.pieeg.com`, then **disconnect there** (BLE allows one connection). Fit the board at Pz: part the hair, pins straight down, headband snug | Neil, Srishan | Sat 10:30 PM | P3 cannot start; the midnight checkpoint is missed. |
| [ ] | H-04 | Have a charged 5 V power bank. **On a head, power the board only from the power bank**, never from a laptop or the wall | Neil | Sat 10:30 PM | The board must not be worn. No live signal. |
| [ ] | H-05 | Pair the board over Web Bluetooth from each of the four laptops once (Chrome or Edge) | Each person | Sun 2:00 AM | We may discover on demo day that the demo laptop cannot pair. |
| [ ] | H-19 | Midnight checkpoint: confirm a clear eyes-closed rise on a real head, twice, and save the recordings under `recordings/` (band powers only, no names in the file) | Srishan, Neil | Sun 12:00 AM | Team rule: everything else pauses until it works. |
| [ ] | H-18 | Return the borrowed board | Neil | Sun 2:15 PM | Event rule broken. |

## Questions to ask people

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-06a | Ask PiEEG (Discord or in person): which channels or placement they recommend for alpha with dry pins; whether the 30–100 Hz "Gamma" band in `pieeg.js` is meaningful with the default 1–40 Hz bandpass; interference when many boards share a room; whether gain can be changed | Srishan | Sat 11:00 PM | We tune blind; P3.2 takes longer. |
| [ ] | H-06b | Ask g.tec (track lead): the judging criteria; whether the device choice (PiEEG, not g.tec) matters; **whether a simulated or replayed signal counts if hardware fails** | Ali | Sat 11:00 PM | We cannot judge how much the fallback demo is worth. |
| [ ] | H-06c | Ask the organisers what Best Beginner is judged on | Amrit | Sat 11:00 PM | We cannot aim the pitch at it. |

## Accounts, keys and content

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-09 | Get the ElevenLabs event key and a Gemini API key. Share them privately; put them in `.env.local` only (variable names are in `.env.example`) | Amrit | Sun 12:30 AM | P7.1 falls back to hand-written lines; P7.2 cannot generate clips, so the narrator ships as captions only. |
| [ ] | H-10 | Pick the narrator voice (an ElevenLabs stock or designed voice; never a clone or imitation of a real person). Write or approve the narrator's personality and ten sample lines. Lines needle the climb and the fall, never the player | Neil, Amrit | Sun 1:00 AM | The narrator is generic, or late. |
| [ ] | H-07 | Choose free art, music layers and SFX (Kenney and Poly Haven are CC0; check each Freesound and OpenGameArt item). **No AI-generated textures or models.** Log every item in `CREDITS.md` | Neil | Sun 12:00 AM | The game ships with coloured boxes; risk to *Design and usability*. |
| [ ] | H-11 | Decide the final project name ("lighten" is temporary) and check the domain and Devpost title. Claim the free GoDaddy domain through MLH if we want it | Team | Sun 9:00 AM | The submission uses the working title. |
| [ ] | H-21 | Trust the repo's hooks once per tool: accept the workspace trust dialog in Claude Code; run `/hooks` in Codex and trust the Stop hook; check Settings → Customizations → Hooks in Antigravity | Each person | First session after the merge | The after-job report reminder does not fire for that tool. The `AGENTS.md` rule and the PR check still apply. |

## Reviewing, testing and explaining

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-15 | Approve each phase plan in your lane; merge `needs-human` PRs promptly | Lane owners; Srishan for shared files | Ongoing | Agents sit idle; branches go stale and conflict. |
| [ ] | H-22a | Walkthrough 1: each owner explains their files to the others; simplify or remove what nobody can explain | All | Sun 12:15 AM | A judge may ask any of us about any file. |
| [ ] | H-22b | Walkthrough 2 | All | Sun 9:30 AM | Same. |
| [ ] | H-12 | Playtest the full loop on all four heads and on one stranger | All | Sun 6:00 – 9:00 AM | Thresholds tuned on one head fail on the next; calibration copy is untested. |
| [ ] | H-13 | Offline test: `npm run build && npm run preview`, Wi-Fi off, full run including narrator clips | Srishan | Sun 8:30 AM | A ballroom Wi-Fi failure could break the demo. |

## Submission

| Done | ID | Task | Owner | Deadline | If it is not done |
|---|---|---|---|---|---|
| [ ] | H-16 | Devpost draft (attend the 9:00 PM workshop in Student Center 310AB) | Amrit | **Sun 12:00 AM** | Event deadline missed. |
| [ ] | H-23 | Make the GitHub repo **public** and check that no key was ever committed (`git log -p -S "API_KEY"`) | Srishan | Sun 11:00 AM | The submission needs a public repo. |
| [ ] | H-25 | Turn on a GitHub ruleset for all branches that blocks force pushes and deletions (GitHub refuses rulesets on a private free repo) | Srishan | when the repo is made public (H-23), Sun 11:00 AM | History is protected only on machines that ran `npm ci`; a web-interface deletion or a clone without the hook can still remove a branch. |
| [ ] | H-17 | Demo video, 3 minutes or less (workshop 10:00 AM, Halle Library) | Amrit + one | Sun 11:00 AM | MLH prizes need it. |
| [ ] | H-24 | Final Devpost submission: repo link, README with one line on what worked and what did not, video, all four teammates, tracks and prizes, AI tools used (Claude, Antigravity, Gemini, Codex, ChatGPT) | Amrit, checked by Srishan | **Sun 12:00 PM, no late entries**; aim for 11:30 AM | No entry. |
