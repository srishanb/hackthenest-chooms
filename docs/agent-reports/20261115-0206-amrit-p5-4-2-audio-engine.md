# After-job report: P5.4.2 local audio engine

- Agent: amrit (Codex)
- Branch and PR: amrit/p5-4-2-audio-engine; linked in PR body
- Phase and plan: P5.4.2, docs/plans/P5.4.md APPROVED by Amrit
- Started and finished: about 02:00–02:06 Eastern, Nov 15, 2026

## 1. What I believe is complete

| Acceptance test | Result | Confidence |
|---|---|---|
| Gesture unlock with retry | Pass: fake-context tests and real browser context reaches running after a click | High |
| Local asset decoding and safe missing-file fallback | Pass: browser decodes licensed loop; unit tests cache missing assets and reject external/traversal paths | High |
| Synchronized layer start | Pass with fixture buffers; both start at one context time | High |
| Actual quiet/tense adaptive soundtrack | Partial: only quiet ambient asset exists; tense is deliberately null/silent | High |
| Live volume/mute and phase scales | Pass: unit tests and browser music mute | High |
| No double master multiplication, bounded/smoothed gains | Pass: engine consumes precomputed gains directly; tests confirm targets and mute ramp | High |
| Cleanup, late loading and absent audio | Pass: tests cover dispose-before-load, stopped loops/timers, retries and unsupported context | High |

## 2. How I verified it

| Check | Command / steps | Actual result |
|---|---|---|
| Pre-code | Remote PR search, current audio INDEX/stub/mix rules, asset inventory/README | No competing engine; one ambient track, explicitly not quiet/tense stems |
| Install | npm ci | Exit 0, no dependency changes |
| Checks | npm run check && npm run build | Typecheck and 280 tests across 42 files pass; build passes with existing classic vendor-script warning |
| Engine/loader tests | engine.test.ts | Eight cases: ramps/master, synchronized loops, gesture retries, late-load mute/dispose, ten-Hz effects, unavailable context, local cached decode, blocked external/missing files |
| Browser | /src/audio/__tests__/audio-browser.html on Vite 3002 | loaded=true; after gesture state=running; Mute music sets quiet/tense targets to 0; Dispose reports closed |
| Diff hygiene | git diff --check | Pass |

**Not verified:** audible playback/loop seams/masking by ear, a real tense stem, offline Wi-Fi-disabled full run, Chrome/Edge-specific behavior (used Codex in-app browser), Windows, hardware-driven crossfade, SFX and narration (not implemented here). Browser diagnostic targets are not measurements of acoustic loudness.

API sources checked: [decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData), [AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode), [setTargetAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime), and the previously checked [AudioContext.resume](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume). These verify API usage, not audible quality.

## 3. Problems, workarounds and dead ends

- Neil's handoff explicitly says the ambient file is one mixed track, not stems. Do not duplicate it and call it adaptive layered music: MUSIC_ASSETS.tense stays null. The available quiet loop can fade into silence at the tense endpoint until a genuine second layer arrives.
- An early test mock had a zero-argument signature, so TypeScript rejected inspecting its recorded URL argument. Added the actual fetch argument types before final checks.
- A muted setting may arrive while decoding; the engine reapplies current settings before starting buffers and never starts them after disposal.
- Gesture resume can initially be refused; listeners remain until a successful resume. No busy retry loop.

## 4. Deviations from the plan

- Four final gain buses are connected directly to the destination. computeMix already includes master, so a second master multiplier would reduce volumes twice.
- Normal gains ease with musicCrossfadeMs/3; zero targets use a 5 ms time constant for prompt mute. Effect/snapshot changes flush at 10 Hz; explicit settings edits apply immediately.
- GameSnapshot.inRefuge now exists on main, so the event fallback is unnecessary. Existing lane-local phase scale constants remain until AudioConfig.mix is agreed.
- No actual tense stem exists; this is the planned silent-layer fallback, not completion of ATM-1's two real layers.

## 5. Changes

- Files: src/audio/{index.ts,engine.ts,loader.ts,music-layers.ts,asset-list.ts,INDEX.md}, __tests__/{engine.test.ts,audio-browser.html}, this report.
- Contract or config-schema changes requested: AudioConfig.mix remains a future request; none changed here.
- New dependencies requested: None.
- Edits outside my lane: None. Main already calls createAudio, so no composition-root change needed.
- INDEX.md updated for new exports: Yes.

## 6. Follow-ups and questions for humans

- [ ] Neil: supply a licensed tense layer matched for looping; paths live in asset-list.ts. Current handoff remains one ambient track.
- [ ] P5.4.3: map game events and add SFX playback; narrator bus is available for later P7 integration.
- [ ] Team: listen for seamless looping, acceptable balance and prompt mute on actual demo speakers; run offline before submission.
- [ ] Integrator: run/audio-mix.mjs may need its implementation-status descriptor updated; this PR stays in the audio lane.

## 7. Can a teammate explain this?

The browser loads licensed audio files from the same local game server and waits for a key or click before it can play. Existing settings and game effect values choose smooth bounded gains, with master applied once. Missing files stay silent, and cleanup stops every timer, listener and loop.
