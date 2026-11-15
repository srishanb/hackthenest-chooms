# Corruption visibility cap

Neil requested implementation, push and merge on 2026-11-15. Existing PR78 fuel and wax suppression does not cap the final rendered radius under visual preview or held airborne bonuses. Add a final config-based visual ceiling, using the stronger of actual input and the current rendered corruption. Full corruption caps radius at80px; smaller existing light stays smaller. Preserve preview resource isolation and player physics.

Files: lantern-fuel config, climb scene and regression tests. Acceptance: boosted/held radius cannot bypass cap, normal radius unchanged, current-frame preview honored, check/build pass. No shared contract or dependency change. Human hardware tasks do not block simulator/render logic. Risk: stronger visibility penalty; near landing marks remain protected.
