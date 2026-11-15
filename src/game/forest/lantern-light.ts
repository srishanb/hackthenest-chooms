/** How corruption dims the candle's light. Uses actual composure, never the visual preview override. */
import { LANTERN_LIGHT_CONFIG as C, waxBenefit01 } from '../../config/lantern-light.config';
import { unit } from '../../config/atmosphere.config';

export function createLanternLight() {
  let corruption = 0.2, heldRadius: number | null = null;
  return {
    get waxBenefit() { return waxBenefit01(corruption); },
    update(value: number) { corruption = unit(value, 0.2); },
    reset() { corruption = 0.2; heldRadius = null; },
    /** The light reach for this frame; held from takeoff to landing so it never changes mid-jump. */
    lightRadius(base: number, airborne: boolean) {
      const desired = Math.max(C.minimumRadiusPx, base * (0.55 + 0.45 * waxBenefit01(corruption)));
      if (!airborne || heldRadius === null) heldRadius = desired;
      return heldRadius;
    },
  };
}
