# Corruption-only FOV contraction

Neil requested stable wide normal-world view regardless of fuel, with faint candle lighting retained. Change radius mapping to full camera-corner radius throughout normal boundary0–0.35 at every fuel level; smoothly blend toward existing fuel exponent4.5 only above that boundary. Full fuel still clears viewport in both worlds. Existing glow/vignette stay, as do fuel drain, wax refill, ember, victory and physics. No shared contracts/dependencies/assets. Pre-code check: partly done. Files: fuel-visibility helper/config/tests. Acceptance:50% and zero fuel retain normal map visibility; corruption contracts; returning to normal restores wide view. Regression verifies these boundaries. Hardware tasks don't block; manual visual playtest outstanding. Confidence high for deterministic mapping. No abandoned approaches.

Validation: TypeScript,500 tests/77 files and build pass with existing Vite/pieeg warnings.
