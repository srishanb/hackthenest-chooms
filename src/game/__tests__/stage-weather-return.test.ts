/** Weather must recover when descending: no cached snow biome or preview-offset sampling. */
import { expect, it } from 'vitest';
import type { SectionData } from '../../shared/contracts/content';
import { stageWeatherAt } from '../world/stage-weather';
const section = (id: string, y: number, snow01: number, wind01: number): SectionData => ({
  id, spawn: { x: 480, y: y - 28 }, refuge: null, finish: null,
  platforms: [{ id, x: 480, y, width: 200, height: 20, type: 'static' }],
  stage: { kind: snow01 ? 'snow-windy' : 'normal', finalPlatformId: id, snow01, wind01 },
});
it('removes snow again when returning below its transition and restores it on re-entry', () => {
  const sections = [section('forest', 0, 0, 0), section('winter', -1000, 1, 1)];
  expect(stageWeatherAt(sections, 300)).toEqual({ snow01: 0, wind01: 0 });
  expect(stageWeatherAt(sections, -1500)).toEqual({ snow01: 1, wind01: 1 });
  expect(stageWeatherAt(sections, 300)).toEqual({ snow01: 0, wind01: 0 });
  expect(stageWeatherAt(sections, -1500)).toEqual({ snow01: 1, wind01: 1 });
});
