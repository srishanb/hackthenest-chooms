# src/audio — public exports

Owner: Amrit. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createAudio(deps, environment?)`, `AudioDeps`, `AudioEnvironment`, `AudioHandle` | `index.ts` | Gesture-unlocked local music, live settings/effects mix, ready/dispose/diagnostics; Game-event SFX and downloaded narrator intros included. |
| `computeMix`, `MixInput`, `MixGains`, `MIX_SCALES` | `mix-rules.ts` | Pure equal-power music crossfade, phase scales and bounded per-bus gains. Gains include master once. |
| `createAudioEngine`, `AudioBus`, `AUDIO_BUSES` | `engine.ts` | Silent gain buses, smooth bounded targets, master applied only by computeMix. |
| `createAudioLoader` | `loader.ts` | Cached local-file decoding with silent fallback and abort support. |
| `startMusicLayers` | `music-layers.ts` | Starts the available loops at one clock time, each through a level-trim gain; cleanup. |
| `MUSIC_ASSETS`, `MUSIC_LEVEL_TRIM`, `MusicAssets` | `asset-list.ts` | Calm bed and tense loop (both CC0) and the level trim that matches their loudness. The tense mix follows the `musicTenseMix` effect row. |
| `createSfxPlayer`, `SfxAssets` | `sfx.ts` | Local one-shots, fallback tone, pause/cleanup and bounded voice count. |
| `sfxForEvent`, `SfxId` | `sfx-map.ts` | Pure event-to-cue mapping; big-fall threshold comes from ember config. |
| `SFX_ASSETS` | `asset-list.ts` | Existing licensed local cue paths; no new/generated assets. |

`createIntroPlayer` (`narrator/intro-player.ts`) preloads the supplied local intro bank, picks one per new run, enforces cooldowns, parks/resumes speech for phase/precision/mute, and emits matching caption events. Ready/dispose and diagnostics are wired through `createAudio`; music ducks by `INTRO_MUSIC_DUCK`. `tools/narrator/build.mjs` is an offline build-time Gemini/ElevenLabs generator with secret-safe diagnostics and hash-based clip reuse. Runtime never calls these APIs.

Voice polish: `createIntroPlayer` accepts a bank prefix and exposes `setVoice`, `preview`, `stopPreview`; previews can play in paused/menu Settings without consuming the next game intro. `narrationGain` (`narrator/level.ts`) measures decoded clips once and sets per-clip level with a peak/headroom and amplification cap. Local voice choice/events and two stock profiles live in audio config.

Narration continues through `precision_window`/jumps and phase `ember`; only actual pause/menu/calibration or explicit audio/session lifecycle controls interrupt it. Regression: `__tests__/intro-player.test.ts`.

startWorldSoundtrack / soundtrackPosition / metalPosition (world-soundtrack.ts): three-stage local music submix with Insistent transition underlay. createWorldAmbience (world-ambience.ts): quiet seasonal loops and cooldown cues through existing SFX bus. Audition: /src/audio/__tests__/world-audio-browser.html.
