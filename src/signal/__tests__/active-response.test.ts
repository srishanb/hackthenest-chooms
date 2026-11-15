/** Subtle normalized activity gets stronger response without moving the calm baseline. */
import { expect,it } from 'vitest';
import { responsiveActivity } from '../../config/active-response.config';
it('keeps baseline and bounds while amplifying smaller calibrated changes',()=>{
 expect(responsiveActivity(0)).toBe(0); expect(responsiveActivity(.3)).toBeCloseTo(.54);
 expect(responsiveActivity(.6)).toBe(1); expect(responsiveActivity(NaN)).toBe(0);
});
