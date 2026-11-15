# Public forest preview

Status: requested by Neil Pawar on 2026-11-15; existing D-22 advisory workflow.

Expose the existing renderer-only forest preview through a clearly labeled checkbox in every build, without URL flags. Off by default; enabling exposes the visual target slider; disabling/Restore normal input returns to the existing signal-driven visual effect. Existing source labels and effect-strength/reduced-motion policies remain authoritative. No signal processing, physics, recovery, assets or shared contract changes.

Files: source-badge/forest-preview.ts and CSS, strings, minimal ClimbScene listener gate removal, existing docs. Public controls use the same window event as the prior preview; legacy URL opt-in stays development-only. Check open claims before implementation: no forest-preview claim found; PR #62 claimed this change.

Human tasks: live hardware and demo-laptop playtest remain open for team; neither blocks this UI change. No human-only task marked complete.

Validation: npm run check/build; actual production preview with no query: Play, toggle on, move slider, toggle off/restore; retain readable source label. Preview must affect only forestCorruption, as covered by existing policy/isolation tests. Main gameplay modules stay untouched except enabling the existing visual listener in production.