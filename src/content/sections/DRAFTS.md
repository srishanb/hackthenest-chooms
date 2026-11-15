# Section drafts: P8.2 handoff

Owner: Neil Pawar. Plan: P8 in PR #22. These files are drafts against the starting SectionData contract; the runtime SECTIONS export deliberately stays on p0-test.

- lower-corridors: nine platforms from y=500 to y=-380; full-width floor, broad alternating ledges, broad final resting ledge.
- upper-corridors: nine platforms from y=-380 to y=-1260; entry matches the preceding exit; narrower alternating ledges and wider summit.
- Shared global coordinate system: y increases downward. The duplicate transition geometry has different platform IDs. The P4.2 loader should instantiate it only once, or unload the preceding section.
- Spawn points are 40 px above the entry-platform centers. Recheck clearance with the final player collider.

Before runtime integration:
1. Confirm P4.2's SectionData and world bounds; the existing P0 viewport cannot display this tall climb.
2. Add the actual refuge area at the upper section entry and a finish above its summit using Ali's final types; no unverified fields invented here.
3. Replace SECTIONS with the two drafts only after the loader supports them.
4. Run the real check:levels collision/reachability tool, including launch clearance and underside collisions. The current test is only a ballistic feasibility screen.
5. Time a stranger's playthrough; tune platform positions to two–four minutes. No completion-time claim is verified yet.

P8.2 geometry tests guard unique IDs, finite/positive sizes, horizontal bounds, a full-width catch, matching transitions, supported spawns, rising difficulty and a full-charge ballistic upper bound. They do not simulate the player or prove a clear trajectory.
