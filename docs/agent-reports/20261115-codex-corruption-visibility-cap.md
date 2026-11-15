# Corruption visibility cap report

## Completed and verification
Added a final visual ceiling after wax, fuel and airborne holds. Uses maximum of actual valid non-fixed corruption and current visual frame, so preview also shows the smaller view.80px maximum at full corruption, smoothly blended below it. Normal radius unchanged and already smaller radii never grow. Regression covers boosted/full/held radii and neutral return. No physics or resource-preview coupling introduced.

## Limitations
No manual headset or complete climb-through performed. Stronger darkness may need play tuning. Existing protected landing marks remain.

## Changes and deviations
Config helper and value, minimal scene integration, regression tests. No shared contracts, dependencies, assets or other agents' files changed. Small follow-up to PR78 requested by Neil. No abandoned approaches.

## Follow-ups and confidence
High confidence in tested cap and wiring; manual visual tuning remains for Neil in live localhost3019. Teammates can explain this as a final cap that collectible bonuses cannot bypass.

Validation: TypeScript and427 tests/64 files pass; production build passes with existing pieeg.js warning.
