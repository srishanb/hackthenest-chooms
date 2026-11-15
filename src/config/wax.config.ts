/** Optional wax rewards. Supply is uncapped; light and existing candle-growth bonuses are capped. */
export const WAX_CONFIG = {
  /** Collection has no run limit. Preserve the existing +6% maximum candle growth. */
  growthCapWax: 3,
  respawnMinMs: 8000,
  respawnMaxMs: 14000,
  spawnRangePx: 540,
  retireRangePx: 810,
  /** Each of the first growthCapWax pickups adds +2% candle growth, as before. */
  growthPerWax: 0.02,
  corruptionPulseMs: 1200,
  corruptionFadeMs: 600,
  boostMs: 10000,
  lightMultiplier: 1.5,
  maxLightRadiusPx: 420,
  pickupRadiusPx: 13,
  dropWidthPx: 13,
  dropHeightPx: 19,
  hoverPx: 4,
  hoverPeriodMs: 1400,
  pickupPulseMs: 400,
  toastMs: 1500,
  waxColor: 0xffd46a,
  highlightColor: 0xfff3c4,
};
