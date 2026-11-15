# Brief wax brightness during corruption

Neil requested a brief brightness benefit followed by rapid return to corrupted visibility, superseding uncollectable wax. Existing final radius cap and wax timer reused. Pickups trigger 1.2s visual relief: 0.6s hold then0.6s fade. Full-corruption radius increases by80px temporarily; no fuel refill, growth/count or sustained boost at full corruption. Current visual preview also receives the pulse. Pause freezes its timer, reset clears it; airborne holds cannot retain it. Physics and victory gate unchanged. No shared contracts/dependencies/assets.

Acceptance: pulse fades/expires, cap restored, no permanent high-corruption growth/fuel. Check/build required. Hardware tasks do not block. Manual headset/complete climb-through not verified. Risk: timing may need play tuning.

Verified: TypeScript and428 tests/64 files pass; production build passes (existing pieeg.js warning). Regression verifies pulse timing, restored80px cap, no sustained boost/count. Confidence high for logic; manual visual tuning outstanding. No new dependencies or shared contracts.
