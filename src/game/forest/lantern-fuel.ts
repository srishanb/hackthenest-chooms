/** Real fuel consumes playing time only. Uses actual composure, never the visual preview override. */
import { LANTERN_FUEL_CONFIG as C, waxBenefit01 } from '../../config/lantern-fuel.config';
import { unit } from '../../config/atmosphere.config';
export function burnFuel(fuel: number, corruption: number, dtMs: number): number {
  const c = unit(corruption, 0.2);
  const extra = Math.max(0, (c - C.normalWorldMax01) / (1 - C.normalWorldMax01));
  const rate = 1 / C.calmBurnSeconds + c * (1 / C.baselineCorruptedBurnSeconds - 1 / C.calmBurnSeconds)
    + extra * (1 / C.corruptedBurnSeconds - 1 / C.baselineCorruptedBurnSeconds);
  return Math.max(0, unit(fuel) - rate * (Number.isFinite(dtMs) ? Math.max(0, dtMs) : 0) / 1000);
}
export function createLanternFuel() {
  let fuel = 1, corruption = 0.2;
  return {
    get value() { return fuel; },
    get isLit() { return fuel > 0; },
    get waxBenefit() { return waxBenefit01(corruption); },
    update(value: number, dtMs: number) { corruption = unit(value, 0.2); fuel = burnFuel(fuel, corruption, dtMs); },
    refill() { if (corruption > C.normalWorldMax01) return; fuel = Math.min(1, fuel + C.waxRefill01 * waxBenefit01(corruption)); },
    reset() { fuel = 1; corruption = 0.2; },
    lightRadius(_base?: number, _airborne?: boolean) {
      return C.minimumRadiusPx + (C.fullRadiusPx - C.minimumRadiusPx) * fuel;
    },
  };
}
