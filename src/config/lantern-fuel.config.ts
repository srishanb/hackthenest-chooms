/** Actual candle resource, requested by Neil. Never alters movement or recovery requirements. */
export const LANTERN_FUEL_CONFIG = {
  corruptedWaxRadiusPx: 160,
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
export function corruptionVisibilityRadius(radius: number, corruption: number, waxPulse01 = 0): number {
  const benefit = waxBenefit01(corruption);
  const baseline = Math.min(radius, LANTERN_FUEL_CONFIG.corruptedVisibilityRadiusPx);
  const pulse = Math.max(0, Math.min(1, waxPulse01));
  const bonus = (LANTERN_FUEL_CONFIG.corruptedWaxRadiusPx - LANTERN_FUEL_CONFIG.corruptedVisibilityRadiusPx) * pulse;
  return radius * benefit + (baseline + bonus) * (1 - benefit);
}
