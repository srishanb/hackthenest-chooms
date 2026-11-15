/** The corruption boundary for the "normal world", and how corruption weakens wax. Never alters movement or recovery. */
export const LANTERN_LIGHT_CONFIG = {
  normalWorldMax01: 0.35,
} as const;
/** Real corruption weakens wax smoothly; strongest corruption completely suppresses its benefit. */
export function waxBenefit01(corruption: number): number {
  if (!Number.isFinite(corruption)) return 1;
  const t = Math.max(0, Math.min(1, (corruption - 0.6) / 0.35));
  return 1 - t * t * (3 - 2 * t);
}
