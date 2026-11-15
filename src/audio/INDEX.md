# src/audio — public exports

Owner: Amrit. Search here before adding a function.

| Export | File | What it does |
|---|---|---|
| `createAudio(deps)`, `AudioDeps` | `index.ts` | **P0 stub:** does nothing. P5.4 and P7 fill it in. |
| `computeMix`, `MixInput`, `MixGains`, `MIX_SCALES` | `mix-rules.ts` | Pure equal-power music crossfade, phase scales and bounded per-bus gains. Gains include master once. Engine wiring is P5.4.2. |
