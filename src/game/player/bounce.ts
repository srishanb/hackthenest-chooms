/**
 * Bounce caps: a big mushroom cap that throws the candle upward instead of letting it stand.
 *
 * Why a fixed launch with a small extra: the bounce must be learnable (the same cap always throws about
 * as high) but still reward how you arrive, so a hard landing bounces a little higher, up to a cap.
 * Horizontal speed carries straight through (movement.ts), so the player aims the bounce by how they
 * arrive and by normal air steering afterwards. A held jump key does nothing at the bounce: the candle
 * never stands on the cap, so it cannot charge there, and the key stays latched until released (the
 * existing rule for a press in the air). Pure numbers; never the signal (binding rule 2).
 */
import type { LedgeKindsConfig } from '../../shared/contracts/config';

/** Platform type id of a bounce cap. */
export const BOUNCE_TYPE = 'bounce';

/** Upward launch speed (px/s, positive) for a landing at `impactVy` px/s downward. */
export function bounceSpeed(impactVy: number, rules: LedgeKindsConfig['bounce']): number {
  const impact = Number.isFinite(impactVy) ? Math.max(0, impactVy) : 0;
  return Math.min(rules.maxLaunchSpeed, rules.launchSpeed + rules.impactGain * impact);
}
