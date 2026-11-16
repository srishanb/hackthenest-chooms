/**
 * Tuning for the generated backdrop: the forest painted behind the endless climb from the run's seed.
 *
 * Why it exists: the old backdrop repeated the same bark and the same two crowns at every height.
 * The generated one paints trunks, branches, floating islands and whole trees from the seed, in
 * three layers that pass at different speeds, and changes kind and colour with height.
 *
 * Sizes are in art pixels (one art pixel is drawn as `pixelScale` screen pixels) unless a name
 * says otherwise. Presentation only: none of these numbers reach movement, fuel or scoring.
 */

/** The look of a stretch of forest. `pine` is what every flavour turns into as it gets cold. */
export type BackdropFlavour = 'broadleaf' | 'autumn' | 'mushroom' | 'blossom';

/** One depth layer of the backdrop. */
export interface BackdropLayer {
  /** Share of the camera's climb this layer follows: 0 would stand still, 1 would move with the ledges. */
  parallax: number;
  /** How far the layer's colours are pulled toward the sky colour (0..1): distant things are paler. */
  fog01: number;
  /** Size of everything in this layer, as a multiple of the base sizes below. */
  scale: number;
  /** Trunks that run the whole height of the forest: how many, and the width range of the thick ones (art pixels). */
  trunks: number; trunkMinWidth: number; trunkMaxWidth: number;
  /** Keep the middle of the screen clear of trunks (the nearest layer only), so ledges stay easy to read. */
  trunksAtEdges: boolean;
  /** Floating islands per `islandCellHeight` of height (a seeded 0..this count). */
  islandsPerCell: number;
  /** Chance (0..1) of a branch in each `branchSegmentHeight` of trunk. */
  branchChance01: number;
  /** Depth the layer is drawn at. All are behind the ledges. */
  depth: number;
}

/** The shape of the backdrop's tuning. The values are below, with what each one means. */
export interface BackdropConfig {
  pixelScale: number;
  chunkWidth: number; chunkHeight: number;
  chunksPerLayer: number;
  layers: readonly BackdropLayer[];
  branchSegmentHeight: number; islandCellHeight: number;
  trunkWanderPx: number; trunkWanderHeight: number;
  /** Chance (0..1) that a full-height trunk is a slender one, and how wide it is as a share (0..1) of the layer's `trunkMinWidth`. */
  slenderTrunkChance01: number; slenderTrunkWidth01: number;
  /** Widest a branch may be, in art pixels at layer scale 1, so thick trunks do not grow slab-like limbs. */
  branchMaxGirth: number;
  /** Trunk (or stalk) width of an island tree as a share of its height, per kind. Crowns are sized to match. */
  treeGirth01: { broadleaf: number; pine: number; mushroom: number };
  /** Crown size of an island broadleaf as a multiple of its old size, so a thicker trunk does not look top-heavy. */
  broadleafCrownScale: number;
  flavours: ReadonlyArray<{ flavour: BackdropFlavour; weight: number }>;
  sky: { forest: number; cold: number };
}

export const BACKDROP_CONFIG: BackdropConfig = {
  /** Screen pixels per art pixel, the same as the ledge art. */
  pixelScale: 2,
  /** One painted chunk, in art pixels. The width covers the 960 px game. */
  chunkWidth: 480, chunkHeight: 320,
  /** Chunks kept painted per layer. Enough to cover the screen plus one ahead in each direction. */
  chunksPerLayer: 4,
  layers: [
    { parallax: 0.16, fog01: 0.74, scale: 0.5, trunks: 6, trunkMinWidth: 10, trunkMaxWidth: 16, trunksAtEdges: false, islandsPerCell: 3, branchChance01: 0.5, depth: -30 },
    { parallax: 0.36, fog01: 0.5, scale: 0.78, trunks: 3, trunkMinWidth: 26, trunkMaxWidth: 42, trunksAtEdges: false, islandsPerCell: 2, branchChance01: 0.7, depth: -26 },
    { parallax: 0.62, fog01: 0.27, scale: 1.1, trunks: 2, trunkMinWidth: 60, trunkMaxWidth: 84, trunksAtEdges: true, islandsPerCell: 1, branchChance01: 0.85, depth: -22 },
  ],
  /** Height of trunk (before the layer's scale) that may carry one branch, and of one cell of islands. */
  branchSegmentHeight: 110, islandCellHeight: 230,
  /** How far a trunk's middle wanders from side to side, and over what height it does so. */
  trunkWanderPx: 14, trunkWanderHeight: 300,
  /** About one trunk in four or five is slender (half the layer's minimum width); the rest are thick. */
  slenderTrunkChance01: 0.22, slenderTrunkWidth01: 0.55,
  /** Branch width cap, art pixels. */
  branchMaxGirth: 9,
  /** Island trees: broadleaf trunk 0.13 of height (was 0.07), pine 0.10 (was 0.05), mushroom stalk 0.16 (was 0.09). */
  treeGirth01: { broadleaf: 0.13, pine: 0.1, mushroom: 0.16 },
  broadleafCrownScale: 1.2,
  /** Flavours a forest band can have, with how often each is picked. The first band is always the first entry. */
  flavours: [
    { flavour: 'broadleaf', weight: 0.34 }, { flavour: 'autumn', weight: 0.24 },
    { flavour: 'mushroom', weight: 0.22 }, { flavour: 'blossom', weight: 0.2 },
  ],
  /** Sky colour the fog pulls toward, in the forest and in the cold. */
  sky: { forest: 0x183e3d, cold: 0x263a4d },
};
