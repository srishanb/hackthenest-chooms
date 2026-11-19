/**
 * The list of set pieces the endless generator may use, with how often, from which chunk, and what
 * each one needs. The numbers live in src/config/endless-pieces.config.ts.
 *
 * Adding a piece: write its file in this folder and add one line here. The generator never names a
 * piece; it asks pacing.ts to choose from this list.
 */
import { ENDLESS_PIECES_CONFIG as T } from '../../../config/endless-pieces.config';
import { BIG_LEAP } from './big-leap';
import { CHIMNEY } from './chimney';
import { CRUMBLING_RUN } from './crumbling-run';
import { DETOUR } from './detour';
import { FORK } from './fork';
import { ICE_RUN } from './ice-run';
import { LADDER } from './ladder';
import { MOVING_CROSSING } from './moving-crossing';
import { MUSHROOM_LAUNCH } from './mushroom-launch';
import { PILLARS } from './pillars';
import { STAIRCASE } from './staircase';
import { TRAVERSE } from './traverse';
import type { Piece, PieceFeature } from './types';
import { UPDRAFT_CROSSING } from './updraft-crossing';
import { UPDRAFT_RISE } from './updraft-rise';
import { WALL_KICK } from './wall-kick';
import { ZIGZAG } from './zigzag';

export interface PieceEntry {
  piece: Piece;
  /** How often it is chosen, relative to the others available. */
  weight: number;
  /** The first chunk it may appear in. */
  fromChunk: number;
  /** After a demanding piece the next one is always calm. */
  demanding: boolean;
  /** Features the chunk must have (snow, moving ledges, ...). */
  needs: readonly PieceFeature[];
}

const line = (piece: Piece, tuning: { weight: number; fromChunk: number; demanding: boolean }, needs: readonly PieceFeature[] = []): PieceEntry =>
  ({ piece, weight: tuning.weight, fromChunk: tuning.fromChunk, demanding: tuning.demanding, needs });

export const PIECES: readonly PieceEntry[] = [
  line(LADDER, T.ladder),
  line(STAIRCASE, T.staircase),
  line(TRAVERSE, T.traverse),
  line(ZIGZAG, T.zigzag),
  line(DETOUR, T.detour),
  line(PILLARS, T.pillars),
  line(BIG_LEAP, T.bigLeap),
  line(FORK, T.fork),
  line(ICE_RUN, T.iceRun, ['snow']),
  line(MOVING_CROSSING, T.movingCrossing, ['moving']),
  // The special ledges of Decision D-36, each once its kind has unlocked (features.ts).
  line(MUSHROOM_LAUNCH, T.mushroomLaunch, ['bounce']),
  line(CRUMBLING_RUN, T.crumblingRun, ['crumble']),
  line(UPDRAFT_RISE, T.updraftRise, ['updraft']),
  line(UPDRAFT_CROSSING, T.updraftCrossing, ['updraft']),
  // Wall slide and wall jump (Decision D-37): only with the `?walls=1` switch (features.ts), never otherwise.
  line(WALL_KICK, T.wallKick, ['walls']),
  line(CHIMNEY, T.chimney, ['walls']),
];
