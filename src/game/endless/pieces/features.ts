/**
 * Which piece features a chunk has: snow (ice allowed) in the snow bands, moving ledges once they unlock.
 *
 * Why its own file: a later piece that needs a new ledge kind or a wall says here where it is allowed,
 * and the generator and the pacing rules pick it up without an edit.
 */
import type { EndlessConfig } from '../../../config/endless.config';
import { biomeOf } from '../biome';
import type { PieceFeature } from './types';

export function featuresAt(index: number, config: EndlessConfig): ReadonlySet<PieceFeature> {
  const features = new Set<PieceFeature>();
  if (biomeOf(index, config) === 'snow') features.add('snow');
  if (index >= config.moving.fromChunk) features.add('moving');
  return features;
}
