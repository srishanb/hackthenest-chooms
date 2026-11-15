/** Renderer-only environment settings. These never enter player forces or signal processing. */
export interface VisualEnvironment {
  windEnabled: boolean; wind01: number; direction: number;
  snowEnabled: boolean; snow01: number;
}
export const ATMOSPHERE_CONFIG = {
  seed: 'lighten-forest-v2', chunkPx: 640, crownSlots: 10, trunksPerLayer: 7,
  gardenSlots: 8, gardenSpacingPx: 260,
  weatherTauMs: 700, windPxPerSecond: 80, snowOpacity: 0.26,
  leavesOpacity: 0.38, fogOpacity: 0.14,
} as const;
export const DEFAULT_ENVIRONMENT: VisualEnvironment = {
  windEnabled: false, wind01: 0.5, direction: 1, snowEnabled: false, snow01: 0.5,
};
export const unit = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
export function normalizeEnvironment(value: Partial<VisualEnvironment>): VisualEnvironment {
  return { windEnabled: value.windEnabled === true, snowEnabled: value.snowEnabled === true,
    wind01: unit(value.wind01), snow01: unit(value.snow01),
    direction: typeof value.direction === 'number' && Number.isFinite(value.direction) ? Math.max(-1, Math.min(1, value.direction)) : 1 };
}
