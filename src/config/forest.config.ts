/** Forest presentation tuning only; none of these values enter movement or recovery. */
export const FOREST_CONFIG = {
  pixelScale: 2,
  characterScale: 1,
  characterFrame: { width: 64, height: 48, feetY: 46 },
  parallax: [0.12, 0.28] as const,
  maxProps: 280,
  spores: 24,
  sporeDriftPx: 12,
  sporePeriodMs: 9000,
  mistMaxAlpha: 0.17,
  darknessAlpha: { calm: 0.28, corrupted: 1 },
  sky: { calm: 0x183e3d, corrupted: 0x24192f },
  terrain: { calm: 0xd4e3ba, corrupted: 0xba83a6 },
  rim: { calm: 0xd3e5a0, corrupted: 0xffcaad },
  neutralCorruption: 0.2,
} as const;

export const FOREST_PREVIEW_EVENT = 'lighten-forest-preview';

/** Explicit dev query only. Missing, malformed and out-of-range values never affect the real signal. */
export function forestPreviewValue(search: string, development: boolean): number | null {
  if (!development) return null;
  const raw = new URLSearchParams(search).get('forestDemo');
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}
