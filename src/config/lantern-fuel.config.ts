/** Actual candle resource, requested by Neil. Never alters movement or recovery requirements. */
export const LANTERN_FUEL_CONFIG = {
  calmBurnSeconds: 240, corruptedBurnSeconds: 80, waxRefill01: 0.35,
  emptyRadiusScale: 0.3, minimumRadiusPx: 70,
} as const;
