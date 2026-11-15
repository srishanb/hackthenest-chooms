/** Normal-world sight stays wide at every fuel level; only corruption restricts fuel-driven sight. */
import { FUEL_VISIBILITY_CONFIG as C, sceneryCorruption } from '../../config/fuel-visibility.config';
export function fuelVisibilityRadius(fuel01: number, corruption01: number, width: number, height: number): number {
  const fuel = Number.isFinite(fuel01) ? Math.max(0, Math.min(1, fuel01)) : 1;
  const corruption = sceneryCorruption(corruption01);
  const full = Math.hypot(width, height);
  const depleted = C.minimumRadiusPx + (full - C.minimumRadiusPx) * Math.pow(fuel, C.corruptedExponent);
  return full + (depleted - full) * corruption;
}
