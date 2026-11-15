# src/content — public exports

Owner: Neil. Content is data; `src/main.ts` hands it to the game and the narrator.

| Export | File | What it is |
|---|---|---|
| `SECTIONS` | `sections/index.ts` | Continuous five-stage climb: Tutorial, Normal, Snow, Windy, Snowy and Windy. Fifty unique platforms, landing completion and no automatic checkpoints. |
| `TUTORIAL_STAGE` | `sections/tutorial.ts` | Original ten tutorial ledges, moving shuttle, ice/wind previews and concise lesson markers. |
| `STAGE_LAYOUTS`, `buildStage` | `sections/stage-layouts.ts` | Independent per-stage geometry, traction and wind data for the four later stages. |
| `SECTION_DRAFTS` | `sections/drafts.ts` | Two geometry-checked P8.2 drafts, kept for reference and tests. The runtime uses `SECTIONS`, not these. |
| `SECTION_ONE_DRAFT` | `sections/section-1.ts` | Lower climb: wide ledges and a full-width bottom catch. |
| `SECTION_TWO_DRAFT` | `sections/section-2.ts` | Upper climb: larger gaps, narrower ledges, matching entry. |
| `NARRATOR_LINES` | `narrator/lines.ts` | Twelve original run-intro lines (six for each of two stock voices, generated offline by `tools/narrator/build.mjs`; clips are local files). Not an event-driven narrator. |
