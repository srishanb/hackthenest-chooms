# After-job report: candle flame flickers and oxidises when falling

- Agent: claude (Srishan's game-dev agent, Opus 5.5)
- Branch and PR: claude/candle-fall-flame, https://github.com/srishanb/hackthenest-chooms/pull/71
- Request (Srishan, in chat): "make the candle flame flicker and mimic oxidation when falling".
- Started and finished: 03:42 to 03:56 Eastern

## 1. What I believe is complete

| Check | Result | Confidence |
|---|---|---|
| Fall strength: 0 on the ground or going up or slow, rising to 1 at 800 px/s down | Pass (unit) | High |
| Not falling draws exactly the old flame (pixel for pixel) | Pass (unit) | High |
| Fast fall: taller, narrower flame with a blue base | Pass (unit), gallery | High |
| Fast fall: flicker clock up to 2.5x faster, ragged rim, licks above the tip | Pass (unit), gallery | High |
| Reduced motion: stretch and blue stay, no flicker or licks | Pass (unit) | High |

## 2. How I verified it

| Check | Command or steps | Actual result |
|---|---|---|
| Tests, build, run files | `npm run check`; `npm run build`; `node run.mjs selftest` | 383 tests pass; build and selftest pass |
| Gallery | `/src/game/__tests__/candle-gallery.html`, new last column "falling fast" | tall thin flame, blue base, licks breaking off, changes every frame |
| Game | Play, jump onto a ledge, walk off | no console errors; the fall itself was over before a screenshot, and the new HUD (#66) covers the candle at the bottom of the screen |

**Not verified:** the falling flame captured mid-fall in the game.

## 3. Problems, workarounds and dead ends

- Kept the resting tip jitter identical to before so a candle that is not falling looks exactly as it did.

## 4. Deviations

- "Oxidation" is shown as what a flame does in a strong draught: more air makes it burn hotter, so it stretches, turns blue at the base, tears and sheds licks.

## 5. Changes

- Changed: `src/game/candle/flame.ts` (`fall01` input, `fallIntensity`, `flickerRate`, `OXIDISED` colours, licks), `src/game/candle/candle-view.ts` (fall strength from the player's state; flicker clock speed), `src/game/__tests__/candle-direction.test.ts` (falling tests), gallery, `run/game-candle.mjs`, `src/game/INDEX.md`.
- Contracts, config schema, dependencies: None. Visual only; movement is untouched.

## 6. Follow-ups

- [ ] Note for the HUD owner: the new bottom-left HUD panel (#66) covers the candle when it stands on the floor near the left; worth a look.

## 7. Can a teammate explain this?

When the candle falls, air rushes past the flame like a strong draught. The flame flickers faster, stretches upward, turns blue at its base the way a well-fed flame does, and little bits break off above it. The faster you fall, the stronger it gets.
