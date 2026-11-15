# Fuel-only visibility

Neil requested one simple relationship: fuel alone controls sight in both worlds; max fuel in corruption must remain wide. Remove corruption caps, wax radius bonuses and airborne holds from final light composition. Use linear60px empty to280px full curve, with the same opaque darkness in both worlds. Corruption still burns fuel faster and keeps visuals. Existing fuel refill rules, ember and victory conditions remain. This supersedes the previous temporary wax visibility pulse; only actual fuel refill changes sight. No movement changes.

Pre-code check: partly done; extends lantern fuel and replaces layered final-radius logic. Files: fuel config/module, scene, fuel tests. No shared contract/dependency/assets. Human hardware tasks don't block. Acceptance: same fuel gives same radius irrespective of corruption, preview, base radius, wax boost or flight; normal/corrupted burn rates still differ. Regression verifies curve and source independence. Manual visual/headset playthrough remains unverified. Confidence high in simple deterministic curve; subjective radius tuning left to playtesting. No abandoned approaches. Other lanes touched only for scene integration.

Validation: TypeScript,472 tests/71 files and production build pass; existing pieeg.js warning remains. Replaced obsolete cap/hold tests with fuel-only behavior coverage.
