/** Tracks the real corruption (never the visual preview override) so wax weakens as it rises. There is no fuel. */
import { waxBenefit01 } from '../../config/lantern-light.config';
import { unit } from '../../config/atmosphere.config';

export function createLanternLight() {
  let corruption = 0.2;
  return {
    get waxBenefit() { return waxBenefit01(corruption); },
    update(value: number) { corruption = unit(value, 0.2); },
    reset() { corruption = 0.2; },
  };
}
