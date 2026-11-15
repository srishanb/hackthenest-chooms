# Original local intro narrator

Six intros for Lighten Up: a warm, dry storyteller with ironic encouragement. Jokes target gravity, ledges and the climb, not the player's worth or health. No imitation of a real person's voice or copied game quotations. Gemini drafts were edited by the agent; Amrit should listen and review the final bank.

## Generate privately (build-time only)

Requires installed Node 22.12+; no SDK/dependency installation. Save secrets in this worktree's ignored `.env.local`, never in chat, source files or a `VITE_` variable:

```
GEMINI_API_KEY=your_private_key
ELEVENLABS_API_KEY=your_private_key
ELEVENLABS_VOICE_ID=your_stock_voice_id
```

The current stock voice is George, `JBFqnCBsd6RMkjVDRZzb`. The ElevenLabs key needs Text to Speech access only. Voice IDs are not secret. Do not clone or imitate a real person.

```
node --env-file=.env.local tools/narrator/build.mjs check
node --env-file=.env.local tools/narrator/build.mjs draft
```

`check` prints presence only, never values. `draft` asks Gemini for six candidates in `draft-intros.json`. Read and edit candidates, then copy the selected six into `intro-pack.json` before generating audio:

```
node --env-file=.env.local tools/narrator/build.mjs build
```

This sends selected text to ElevenLabs and consumes account credits. It downloads MP3s into `public/assets/audio/narrator/`, writes a public non-secret manifest and updates `src/content/narrator/lines.ts`. Identical text/voice/model/settings hashes reuse files, so reruns do not spend credits again. Changing text or settings creates new files and preserves older generated assets. No secret is written to the manifest or bank. Failed API calls print HTTP status without response bodies. Optional model settings are `GEMINI_MODEL` and `ELEVENLABS_MODEL`; the tested defaults are Gemini 3 Flash preview and Eleven Multilingual v2. Model listing may include retired models: Gemini 2.5 Flash returned 404 in this run, so it is not preferred.

## Game behavior

- Audio loads from bundled files, unlocks on a player gesture, then plays one random intro per new run after the guide closes.
- Continuing from Main Menu does not repeat an intro. Global 8 s / same-line 120 s cooldowns use existing config.
- Pausing, menus, calibration, jump precision and mute park speech and clear its caption; returning resumes the exact audio offset and re-emits the remaining caption duration.
- The narrator and master volume sliders use the existing audio bus. Music ducks during speech; SFX are unaffected.
- Missing/unavailable clips produce captions instead of a game error. No runtime Gemini, ElevenLabs, browser speech synthesis, CDN or key is needed.
- `/src/audio/__tests__/intro-browser.html` exercises actual local audio, captions and transitions. Root game path uses the same player.

## Sources verified

- Gemini generateContent: https://ai.google.dev/api/generate-content
- ElevenLabs create speech / MP3 response: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- George stock voice: https://elevenlabs.io/docs/eleven-api/quickstart
- AudioBufferSourceNode (single-use sources and offset restart): https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
