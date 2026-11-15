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
- Pausing, menus, calibration and mute park speech and clear its caption; returning resumes the exact audio offset and re-emits the remaining caption duration.
- The narrator and master volume sliders use the existing audio bus. Music ducks during speech; SFX are unaffected.
- Missing/unavailable clips produce captions instead of a game error. No runtime Gemini, ElevenLabs, browser speech synthesis, CDN or key is needed.
- `/src/audio/__tests__/intro-browser.html` exercises actual local audio, captions and transitions. Root game path uses the same player.

## Sources verified

- Gemini generateContent: https://ai.google.dev/api/generate-content
- ElevenLabs create speech / MP3 response: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- George stock voice: https://elevenlabs.io/docs/eleven-api/quickstart
- AudioBufferSourceNode (single-use sources and offset restart): https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode

## Current voice comparison (2026-11-15)

George was rejected by Amrit. Current game defaults to conversational Chris; mature Bill is the alternative. Settings → Narrator voice → Preview voice plays the same short opening for a fair comparison. Choose a voice to save it locally; Stop preview or closing Settings stops the audition. Preview uses existing master/narrator volumes, captions and music ducking, and does not consume the next intro. Six shorter lines per voice are 3–5.6 seconds each. Decoded levels are balanced once, with peak headroom and capped amplification; no per-frame analysis or live synthesis.

Generation commands (API key remains in private env file):

```
node --env-file=.env.local tools/narrator/build.mjs audition chris
node --env-file=.env.local tools/narrator/build.mjs audition bill
node --env-file=.env.local tools/narrator/build.mjs build chris
node --env-file=.env.local tools/narrator/build.mjs build bill
```

The current default is Eleven v4 using only stability/similarity_boost parameters supported by that model. Short auditions reuse the exact first final clip. Full builds combine completed profile manifests into the active content bank. `custom` uses the private ELEVENLABS_VOICE_ID if a different approved stock voice is desired. Default build profile is Chris; the old George id need not be changed in the private env file. Old generated files are preserved rather than removed. There are no generation credits spent during gameplay or Preview.

## Selected game moments (baseline)

Amrit selected six excerpts from a transcript he supplied and stated was authorized
for reuse. They are not original Gemini text. The current selected voice ID is
`zwn3aE3GYziMwjvo74dv`, supplied by Amrit; we do not infer the speaker's identity
from an opaque voice ID. No voice clone was created by this tool.

`tools/narrator/moment-pack.json` is the reviewed script. Generate the six local clips:

```
node --env-file=.env.local tools/narrator/build.mjs moments baseline
```

The baseline voice is the default and appears as Selected narrator · baseline in
Settings. A new voice preference key applies this explicitly selected default;
Chris and Bill remain optional legacy banks. Old files and history are preserved.
Welcome replaces random opening selection for baseline. Tutorial means completion
of the actual playable tutorial stage, not skipping/closing the control guide.
Large falls use the game's `big` flag; intermediate stages play the later milestone
line. Height requires 256 pixels beyond the saved personal best and another 256
pixels before requesting again. Finish queues the closing line, which may play on
the finished screen with captions, without cutting a currently playing line.

There is a 30-second global and 120-second same-line cooldown. Duplicate pending
moments collapse; stale incidental events expire after 15 seconds. Tutorial/finish
may wait through pause. Jump precision and Ember recovery never interrupt speech.
Actual pause or mute parks the exact audio offset; resume continues it. Session
restart, voice switching and explicit preview controls keep normal lifecycle behavior.
The game only uses downloaded local files; keys and runtime API calls are absent.
