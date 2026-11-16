/**
 * Which look a height has in the endless climb: forest or snow, in alternating bands.
 *
 * Why bands: an endless climb needs to feel like it goes somewhere. Every few chunks the forest
 * gives way to snow and back, with the weather fading in over a stretch before the first snowy
 * landing. Presentation only: a band changes platform art and weather, never how the candle moves.
 */
import type { EndlessConfig } from '../../config/endless.config';

export type Biome = 'forest' | 'snow';

/** The biome of a chunk. Bands alternate, starting with forest. */
export function biomeOf(chunkIndex: number, config: EndlessConfig): Biome {
  const band = Math.floor(Math.max(0, chunkIndex) / config.biome.chunksPerBand);
  return band % 2 === 1 ? 'snow' : 'forest';
}

/** The chunk index a generated platform id (`e12:p3`) belongs to, or 0 for anything else. */
export function chunkOfPlatform(id: string): number {
  const match = /^e(\d+):/.exec(id);
  return match ? Number(match[1]) : 0;
}

/**
 * Snowfall strength (0..1) at a height, for the weather layer. It fades in over `blendPx` below
 * a snowy band's first landing and fades out the same way above its last, so the change is seen
 * coming. Later snow bands snow harder, up to full strength.
 */
export function snowAt(feetY: number, config: EndlessConfig): number {
  const { chunksPerBand, blendPx, firstSnow01, snowStep01 } = config.biome;
  const height = config.baseFloorTopPx - feetY;
  if (!Number.isFinite(height)) return 0;
  const bandPx = chunksPerBand * config.chunkHeightPx;
  // Look at the band the height is in and the one above it (whose snow may already be fading in).
  let snow = 0;
  for (const band of [Math.floor(height / bandPx), Math.floor(height / bandPx) + 1]) {
    if (band < 1 || band % 2 === 0) continue;
    const start = band * bandPx;
    const end = start + bandPx;
    const fadeIn = Math.min(1, Math.max(0, (height - (start - blendPx)) / blendPx));
    const fadeOut = Math.min(1, Math.max(0, (end - height) / blendPx));
    const strength = Math.min(1, firstSnow01 + snowStep01 * ((band - 1) / 2));
    const t = Math.min(fadeIn, fadeOut);
    snow = Math.max(snow, strength * t * t * (3 - 2 * t));
  }
  return snow;
}
