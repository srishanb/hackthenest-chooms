/** Actual candle resource, requested by Neil. Never alters movement or recovery requirements. */
export const LANTERN_FUEL_CONFIG = {
  corruptedVisibilityRadiusPx: 80,
  normalWorldMax01: 0.35,
  calmBurnSeconds: 240, corruptedBurnSeconds: 45, waxRefill01: 0.35,
  emptyRadiusScale: 0.3, minimumRadiusPx: 60,
} as const;
/** Real corruption weakens wax smoothly; strongest corruption completely suppresses its benefit. */
export function waxBenefit01(corruption: number): number {
  if (!Number.isFinite(corruption)) return 1;
  const t = Math.max(0, Math.min(1, (corruption - 0.6) / 0.35));
  return 1 - t * t * (3 - 2 * t);
}

/** Final visual ceiling: wax, full fuel and held airborne bonuses cannot bypass corruption. */
export function corruptionVisibilityRadius(radius: number, corruption: number): number {
  const benefit = waxBenefit01(corruption);
  return Math.min(radius, LANTERN_FUEL_CONFIG.corruptedVisibilityRadiusPx +
    Math.max(0, radius - LANTERN_FUEL_CONFIG.corruptedVisibilityRadiusPx) * benefit);
}
