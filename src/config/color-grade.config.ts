/**
 * The whole-screen colour grade (src/game/forest/color-grade.ts): one shader pass after the
 * scene is drawn that gives every scene the same mood. Shadows lean cool, highlights lean warm
 * (the candle), contrast is lifted a little and the corners fall off gently.
 *
 * Visual only and never signal-driven: these numbers are fixed, not effects rows, and nothing
 * here touches controls or physics. Set `enabled: false` to compare against the ungraded look.
 */
export const COLOR_GRADE_CONFIG = {
  enabled: true,
  /** 1 = unchanged. Above 1 spreads tones away from mid grey. */
  contrast: 1.1,
  /** 1 = unchanged. Above 1 makes colours richer. */
  saturation: 1.1,
  /** RGB (0..1 each) added to dark tones, scaled by `shadowAmount`. Cool blue. */
  shadowTint: [0.1, 0.16, 0.32],
  shadowAmount: 0.2,
  /** RGB (0..1 each) added to bright tones, scaled by `highlightAmount`. Warm candle gold. */
  highlightTint: [0.32, 0.2, 0.06],
  highlightAmount: 0.14,
  /** Vignette: starts at `vignetteInner` and is darkest at `vignetteOuter` (fractions of the half-diagonal). */
  vignetteInner: 0.55,
  vignetteOuter: 1.15,
  /** 0 = no darkening at the corners, 1 = black corners. */
  vignetteStrength: 0.45,
} as const;
