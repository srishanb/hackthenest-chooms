/** Full fuel clears every corner; corruption steepens loss without penalizing a full tank. */
import { FUEL_VISIBILITY_CONFIG as C } from '../../config/fuel-visibility.config';
export function fuelVisibilityRadius(fuel01: number, corruption01: number, width: number, height: number): number {
  const fuel = Number.isFinite(fuel01) ? Math.max(0, Math.min(1, fuel01)) : 1;
  const corruption = Number.isFinite(corruption01) ? Math.max(0, Math.min(1, corruption01)) : 0;
  const full = Math.hypot(width, height);
  return C.minimumRadiusPx + (full - C.minimumRadiusPx) * Math.pow(fuel,
    C.normalExponent + (C.corruptedExponent - C.normalExponent) * corruption);
}
