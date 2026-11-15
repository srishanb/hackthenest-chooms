/** Real fuel consumes playing time only. Uses actual composure, never the visual preview override. */
import { LANTERN_FUEL_CONFIG as C } from '../../config/lantern-fuel.config';
import { unit } from '../../config/atmosphere.config';
export function burnFuel(fuel: number, corruption: number, dtMs: number): number {
  const rate = 1 / C.calmBurnSeconds + unit(corruption, 0.2) * (1 / C.corruptedBurnSeconds - 1 / C.calmBurnSeconds);
  return Math.max(0, unit(fuel) - rate * (Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0) / 1000);
}
export function createLanternFuel() {
  let fuel = 1, heldRadius: number | null = null;
  return {
    get value() { return fuel; },
    update(corruption: number, dtMs: number) { fuel = burnFuel(fuel, corruption, dtMs); },
    refill() { fuel = Math.min(1, fuel + C.waxRefill01); },
    reset() { fuel = 1; heldRadius = null; },
    lightRadius(base: number, airborne: boolean) {
      const desired = Math.max(C.minimumRadiusPx, base * (C.emptyRadiusScale + (1 - C.emptyRadiusScale) * fuel));
      if (!airborne || heldRadius === null) heldRadius = desired;
      return heldRadius;
    },
  };
}
