# Landing soil puff

Neil requested subtle soil effect when landing. Add bounded48-fleck pool,7 tiny2/3px flecks per collision landing, fading over360ms. Pale snow tint on authored winter platforms. Render under darkness, no physics/collision writes. Pauses with game and clears/disables in Reduced Motion. Files: landing puff config/module and climb scene. No shared contracts/dependencies/assets. Pre-code check: not done. Hardware tasks don't block. Acceptance: landing triggers once per collision event, bounded pool, no particles when Reduced Motion. Typecheck/tests/build required. Manual visual playtest outstanding; confidence high for event wiring/pool, density subjective. No abandoned approaches.

Validation: TypeScript,500 tests/77 files and production build pass. Existing Vite/pieeg warnings remain.
