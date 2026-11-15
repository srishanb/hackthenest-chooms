# src/audio — public exports

Owner: Amrit. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createAudio(deps, environment?)`, `AudioDeps`, `AudioEnvironment`, `AudioHandle` | `index.ts` | Gesture-unlocked local music, live settings/effects mix, ready/dispose/diagnostics; SFX/narrator still pending. |
| `computeMix`, `MixInput`, `MixGains`, `MIX_SCALES` | `mix-rules.ts` | Pure equal-power music crossfade, phase scales and bounded per-bus gains. Gains include master once. Engine wiring is P5.4.2. |
| `createAudioEngine`, `AudioBus`, `AUDIO_BUSES` | `engine.ts` | Silent gain buses, smooth bounded targets, master applied only by computeMix. |
| `createAudioLoader` | `loader.ts` | Cached local-file decoding with silent fallback and abort support. |
| `startMusicLayers` | `music-layers.ts` | Synchronized available loops and cleanup. |
| `MUSIC_ASSETS`, `MusicAssets` | `asset-list.ts` | Licensed ambient path; tense stem is absent/null. |
