/**
 * What the backdrop grows at a height of the endless climb: how cold it is, and the forest's flavour.
 *
 * The climb already alternates forest and snow in bands (biome.ts). This gives the backdrop the
 * same bands, but as a smooth 0..1 "cold" that rises before a snowy band and falls after it, so the
 * painted forest turns to pines and snow gradually. Each forest band also gets a seeded flavour
 * (leafy, autumn, mushroom, blossom or jungle); the flavour changes in the middle of a snowy band, where
 * everything is pine and the change cannot be seen. Presentation only.
 */
import { BACKDROP_CONFIG, type BackdropConfig, type BackdropFlavour } from '../../config/backdrop.config';
import type { EndlessConfig } from '../../config/endless.config';
import type { BackdropBiome } from '../backdrop/paint-chunk';
import { hash } from '../backdrop/pixel-grid';

const smooth = (t: number): number => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** The flavour of forest band `band` (0, 2, 4...). The first band is always the plain leafy forest. */
export function flavourOfBand(seed: number, band: number, backdrop: BackdropConfig = BACKDROP_CONFIG): BackdropFlavour {
  if (band <= 0) return backdrop.flavours[0]!.flavour;
  const total = backdrop.flavours.reduce((sum, entry) => sum + entry.weight, 0);
  let pick = hash(seed, 7700 + band) * total;
  for (const entry of backdrop.flavours) { pick -= entry.weight; if (pick < 0) return entry.flavour; }
  return backdrop.flavours[0]!.flavour;
}

export function backdropBiomeAt(worldY: number, seed: number, config: EndlessConfig, backdrop: BackdropConfig = BACKDROP_CONFIG): BackdropBiome {
  const perBand = config.biome.chunksPerBand;
  // Height in chunks above the start, and which band that is. Below the start counts as the first band.
  const chunks = Math.max(0, (config.baseFloorTopPx - worldY) / config.chunkHeightPx);
  const band = Math.floor(chunks / perBand), into = chunks - band * perBand;
  const blend = Math.max(0.05, config.biome.blendPx / config.chunkHeightPx);
  const snowy = band % 2 === 1;
  // How far inside a snowy band this height is, in chunks: negative outside one.
  const inside = snowy ? Math.min(into, perBand - into) : -Math.min(band >= 2 ? into : Infinity, perBand - into);
  const cold01 = smooth((inside + blend) / (blend * 1.6));
  const forestBand = !snowy ? band : into < perBand / 2 ? band - 1 : band + 1;
  return { cold01, flavour: flavourOfBand(seed, forestBand, backdrop) };
}
