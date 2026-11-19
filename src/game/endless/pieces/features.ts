/**
 * Which piece features a chunk has: snow (ice allowed) in the snow bands, moving ledges once they unlock,
 * and bounce caps, crumbling ledges and updraft columns once each unlocks (Decision D-36). Walls (Decision D-37)
 * only when the `?walls=1` switch is on (`walls`), from `walls.fromChunk`; with it off no chunk has them.
 *
 * Why its own file: a later piece that needs a new ledge kind or a wall says here where it is allowed,
 * and the generator and the pacing rules pick it up without an edit.
 */
import type { EndlessConfig } from '../../../config/endless.config';
import { ENDLESS_PIECES_CONFIG, type EndlessPiecesConfig } from '../../../config/endless-pieces.config';
import { biomeOf } from '../biome';
import type { PieceFeature } from './types';

export function featuresAt(index: number, config: EndlessConfig, tuning: EndlessPiecesConfig = ENDLESS_PIECES_CONFIG, walls = false): ReadonlySet<PieceFeature> {
  const features = new Set<PieceFeature>();
  if (biomeOf(index, config) === 'snow') features.add('snow');
  if (index >= config.moving.fromChunk) features.add('moving');
  if (index >= tuning.ledgeKinds.bounceFromChunk) features.add('bounce');
  if (index >= tuning.ledgeKinds.crumbleFromChunk) features.add('crumble');
  if (index >= tuning.ledgeKinds.updraftFromChunk) features.add('updraft');
  if (walls && index >= tuning.walls.fromChunk) features.add('walls');
  return features;
}
