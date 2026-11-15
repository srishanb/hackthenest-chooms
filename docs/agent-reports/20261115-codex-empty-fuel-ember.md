# Empty fuel ember

Neil approved zero fuel as a tiny ember, red in corruption, normal-world wax required to relight, no automatic refill on leaving corruption, and no victory until relit. Existing fuel/wax pulse implementation partly covers this. Added60px empty radius (including airborne expiration), single-pixel wick instead of full flame, and fuel-lit condition to both final landing and pending finish. Existing1.2s corruption wax glimpse remains. No movement/death/reset changes or shared contracts/dependencies.

Verification: resource regression covers empty radius, corruption refusal, normal transition without refill, and wax relight. Full checks/build required. Manual headset and end-to-end climb not verified; ember artwork needs user play review. Hardware tasks do not block. Files: lantern-fuel, candle-view, climb scene, UI strings and fuel tests. Confidence high for resource logic; visual polish remains subjective. No abandoned approaches or new assets. Small cross-lane integration requested by Neil.

Validation: TypeScript,472 tests/71 files and production build pass (existing pieeg.js warning).
