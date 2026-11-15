# After-job report: noisy-pin-preset

- Agent: claude
- Branch and PR: claude/noisy-pin-preset (see PR list)
- Phase and plan: small follow-up to #91 on Srishan's instruction: no scripted data, simulator output only
- Started and finished: about 09:35 to 09:50 Eastern

## 1. What I believe is complete

| Requirement | Result | Confidence |
|---|---|---|
| No scripted signal field in the built-in presets | Pass: "Poor contact" (contact fraction set by hand to 5/16) replaced by "Noisy pin" (simulator events only) | High |
| Other four presets unchanged | Pass: regenerated files identical | High |

## 2. How I verified it

| Check | Command | Result |
|---|---|---|
| Type check and tests | `npm run check` | 76 files, 493 tests pass |
| Build | `npm run build` | passes |
| Regenerate | `npm run presets:build` | 5 presets plus manifest, only noisy-pin.jsonl added and poor-contact.jsonl removed |

**Not verified:** Settings in a browser with the new preset; the real board.

## 3. Problems, workarounds and dead ends

- The simulator's noisy pin never lowers `getContactQuality` (the check runs after the 1-40 Hz filter), so a preset that goes invalid from poor contact cannot come from simulator output. Noisy pin stays valid by design. Poor-contact behaviour is still covered by `src/signal/__tests__/pipeline.test.ts`.

## 4. Deviations from the plan

- Preset id `poor-contact` is now `noisy-pin` (`?preset=poor-contact` no longer exists; `run/audio-mix.mjs` updated).

## 5. Changes

- Files changed: `tools/presets/presets.ts`, `tools/presets/presets.test.ts`, `public/recordings/presets/*`, `run/signal-presets.mjs`, `run/audio-mix.mjs`.
- Contract or config-schema changes: None. New dependencies: None. Edits outside my lane: None.
- `INDEX.md` updated: not needed (no new exports).

## 6. Follow-ups and questions for humans

- [ ] Record a real Octopus 16 session and add it as a built-in; that is the only honest way to get a poor-contact preset (Srishan).

## 7. Can a teammate explain this?

Every built-in preset is now exactly what PiEEG's simulator outputs when we trigger its own events. The old "Poor contact" preset needed a hand-set number, so it became "Noisy pin", which just uses the simulator's noisy-pin button.
