/**
 * Shared shapes for painting the backdrop: the biome at a height, a request for one chunk, and a
 * waterfall. Kept apart so the painters, the palette and the view can all use them without
 * importing one another. Types only.
 */
import type { BackdropFlavour } from '../../config/backdrop.config';

/** What grows at a height: how cold it is (0 forest .. 1 deep snow) and the forest's flavour there. */
export interface BackdropBiome { cold01: number; flavour: BackdropFlavour }

export interface ChunkRequest {
  seed: number;
  /** Which layer (0 is the farthest) and which chunk of it; chunk 0 starts at height 0 and chunks above are negative. */
  layerIndex: number; chunk: number;
  /** The biome at a height of this layer, in art pixels. */
  biomeAt(y: number): BackdropBiome;
  /** Height of the forest floor in this layer, in art pixels. Everything below it is ground. */
  groundY: number;
}

/**
 * One waterfall in a layer, in that layer's art pixels: it pours from (`x`, `topY`), `width` wide,
 * for `length` rows, then thins into mist. `cold01` is how cold it is at its lip: cold falls are frozen.
 */
export interface Waterfall {
  id: number; layerIndex: number;
  x: number; topY: number; width: number; length: number;
  cold01: number; biome: BackdropBiome;
}
