/**
 * Tuning for the generated backdrop: the forest painted behind the endless climb from the run's seed.
 *
 * Why it exists: the old backdrop repeated the same bark and the same two crowns at every height.
 * The generated one paints a horizon of mountains or hills, then trunks, cliffs, floating islands,
 * waterfalls and whole trees from the seed, in layers that pass at different speeds, and changes
 * kind, shape and colour with height. Each forest flavour has a "recipe" below that says what grows
 * there, so a flavour is a different composition and not only a different palette.
 *
 * Sizes are in art pixels (one art pixel is drawn as `pixelScale` screen pixels) unless a name
 * says otherwise. Presentation only: none of these numbers reach movement, fuel or scoring.
 */

/** The look of a stretch of forest. Every flavour turns into the cold (pines, rock, snow) as it gets cold. */
export type BackdropFlavour = 'broadleaf' | 'autumn' | 'mushroom' | 'blossom' | 'jungle';

/** The shape of a tree's leaves (see backdrop/foliage.ts). */
export type CrownStyle = 'clump' | 'tiers' | 'umbrella' | 'weeping' | 'fronds' | 'bigleaf' | 'sparse' | 'column' | 'boughs';

/** What stands on a floating island. */
export type IslandTreeKind = 'broadleaf' | 'mushroom' | 'palm' | 'pine';

/** Relative weights: an entry twice as large is picked twice as often. Missing entries are never picked. */
export type Weights<K extends string> = Partial<Record<K, number>>;

/** What grows in one forest flavour. Chances are per thing (0..1); lengths are art pixels at layer scale 1. */
export interface FlavourRecipe {
  /** Crown shapes for island trees and branch tips. */
  crowns: Weights<CrownStyle>;
  /** Kinds of tree on a warm island. */
  trees: Weights<IslandTreeKind>;
  /** Floating islands as a multiple of the layer's own count (1 = as configured). */
  islands: number;
  /** Most small mushrooms on one island top. */
  smallMushrooms: number;
  /** Chance of a shelf fungus in each stretch of trunk. */
  shelfFungus01: number;
  /** Chance of a liana sagging between two neighbouring trunks, per `lianaSpacing` of height. */
  lianas01: number;
  /** Chance that a branch end trails vines, and their longest length. */
  vines01: number; vineLength: number;
  /** Chance that an island spills a waterfall, and the fall's width and length range. */
  waterfall01: number; waterfallWidth: readonly [number, number]; waterfallLength: readonly [number, number];
  /** Drifting petals or falling leaves painted around each crown (a count; 0 for none). */
  petals: number;
  /** Sky colours: `top` of the screen and `fog`, the colour far things fade toward (also the bottom of the sky). */
  sky: { top: number; fog: number };
}

/** What the cold looks like, whatever the flavour below it. */
export interface ColdRecipe {
  crowns: Weights<CrownStyle>;
  /** Chance that an island in the cold is a rock crag with strata and snowy ledges rather than a grassy island. */
  crag01: number;
  /** Chance that a crag spills a frozen fall (an icefall), and its length range. */
  icefall01: number; icefallLength: readonly [number, number];
  sky: { top: number; fog: number };
}

/** One depth layer of the backdrop. */
export interface BackdropLayer {
  /** `horizon` paints far ridges of mountains or hills; `forest` paints trunks, islands and branches. */
  kind: 'horizon' | 'forest';
  /** Share of the camera's climb this layer follows: 0 would stand still, 1 would move with the ledges. */
  parallax: number;
  /** How far the layer's colours are pulled toward the fog colour (0..1): distant things are paler. */
  fog01: number;
  /** Size of everything in this layer, as a multiple of the base sizes below. */
  scale: number;
  /** Trunks that run the whole height of the forest: how many, and the width range of the thick ones (art pixels). */
  trunks: number; trunkMinWidth: number; trunkMaxWidth: number;
  /** Keep the middle of the screen clear of trunks (the nearest layer only), so ledges stay easy to read. */
  trunksAtEdges: boolean;
  /** Share of trunks (0..1) that give way to a rock cliff where it is cold. */
  rockLanes01: number;
  /** Floating islands per `islandCellHeight` of height (a seeded 0..this count). */
  islandsPerCell: number;
  /** Chance (0..1) of a branch in each `branchSegmentHeight` of trunk. */
  branchChance01: number;
  /** Multiplies every waterfall chance in this layer (0 for none). */
  waterfalls01: number;
  /** True to paint soft bands of mist into this layer's empty air, which veils the layers behind it. */
  mist: boolean;
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
  /** Rock cliffs: how much wider than the trunk they replace, and the height of one ledge step (art pixels at scale 1). */
  rock: { widen: number; ledgeStep: number; strataStep: number };
  /** Height between liana slots (art pixels at scale 1) and how far a liana sags at most. */
  lianaSpacing: number; lianaSag: number;
  /** Mist bands: one every `spacing` art pixels of layer height, `thickness` deep at the middle. */
  mistBands: { spacing: number; thickness: number };
  /** Horizon ridges: one range every `rangeSpacing` rows; peaks up to `peakHeight`; the back ridge sits `backRaise` higher. */
  horizon: { rangeSpacing: number; peakHeight: readonly [number, number]; backRaise: number; fillDepth: number; fadeDepth: number };
  flavours: ReadonlyArray<{ flavour: BackdropFlavour; weight: number }>;
  recipes: Readonly<Record<BackdropFlavour, FlavourRecipe>>;
  cold: ColdRecipe;
  /** Animated waterfall strips drawn over the painted falls: how many per layer, and how opaque (0..1). */
  waterfallView: { pool: number; alpha01: number; frameMs: number };
  /** Sky colour the whole sky is pulled toward as the forest goes wrong (see sceneryCorruption). */
  skyCorrupted: number;
}

export const BACKDROP_CONFIG: BackdropConfig = {
  /** Screen pixels per art pixel, the same as the ledge art. */
  pixelScale: 2,
  /** One painted chunk, in art pixels. The width covers the 960 px game. */
  chunkWidth: 480, chunkHeight: 320,
  /** Chunks kept painted per layer. Enough to cover the screen plus one ahead in each direction. */
  chunksPerLayer: 4,
  /** Back to front: horizon ridges, far forest, middle forest, near forest. Far layers are paler (fog) and slower (parallax). */
  layers: [
    { kind: 'horizon', parallax: 0.07, fog01: 0.52, scale: 1, trunks: 0, trunkMinWidth: 0, trunkMaxWidth: 0, trunksAtEdges: false, rockLanes01: 0, islandsPerCell: 0, branchChance01: 0, waterfalls01: 0, mist: true, depth: -34 },
    { kind: 'forest', parallax: 0.18, fog01: 0.66, scale: 0.5, trunks: 5, trunkMinWidth: 10, trunkMaxWidth: 16, trunksAtEdges: false, rockLanes01: 0.6, islandsPerCell: 3, branchChance01: 0.5, waterfalls01: 1, mist: true, depth: -30 },
    { kind: 'forest', parallax: 0.38, fog01: 0.44, scale: 0.78, trunks: 3, trunkMinWidth: 26, trunkMaxWidth: 42, trunksAtEdges: false, rockLanes01: 0.5, islandsPerCell: 2, branchChance01: 0.7, waterfalls01: 1, mist: true, depth: -26 },
    { kind: 'forest', parallax: 0.62, fog01: 0.27, scale: 1.1, trunks: 2, trunkMinWidth: 60, trunkMaxWidth: 84, trunksAtEdges: true, rockLanes01: 0.5, islandsPerCell: 1, branchChance01: 0.85, waterfalls01: 0.6, mist: false, depth: -22 },
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
  /** A cliff is 1.7 times as wide as its trunk, steps out or in every 16 rows, with a thin darker stratum every 11. */
  rock: { widen: 1.7, ledgeStep: 16, strataStep: 11 },
  lianaSpacing: 90, lianaSag: 46,
  mistBands: { spacing: 280, thickness: 34 },
  /** A range every 150 rows (about 4300 px of climb at the horizon's parallax), leaving sky and haze between ranges. */
  horizon: { rangeSpacing: 150, peakHeight: [30, 80], backRaise: 18, fillDepth: 22, fadeDepth: 16 },
  /** Flavours a forest band can have, with how often each is picked. The first band is always the first entry. */
  flavours: [
    { flavour: 'broadleaf', weight: 0.26 }, { flavour: 'autumn', weight: 0.18 },
    { flavour: 'mushroom', weight: 0.18 }, { flavour: 'blossom', weight: 0.16 }, { flavour: 'jungle', weight: 0.22 },
  ],
  recipes: {
    /** Leafy forest: lumpy clumps, cedar-like tiers, the odd willow and umbrella crown. */
    broadleaf: {
      crowns: { clump: 4, tiers: 2, weeping: 1.2, umbrella: 1, column: 0.8 }, trees: { broadleaf: 1 },
      islands: 1, smallMushrooms: 1, shelfFungus01: 0.04, lianas01: 0, vines01: 0.4, vineLength: 30,
      waterfall01: 0.34, waterfallWidth: [6, 10], waterfallLength: [60, 130], petals: 0,
      sky: { top: 0x0b1d24, fog: 0x1d4845 },
    },
    /** Autumn: poplar columns and thinning twiggy crowns, leaves falling around them. */
    autumn: {
      crowns: { clump: 2, sparse: 2.5, column: 2, tiers: 0.6 }, trees: { broadleaf: 1 },
      islands: 1, smallMushrooms: 2, shelfFungus01: 0.08, lianas01: 0, vines01: 0.2, vineLength: 22,
      waterfall01: 0.3, waterfallWidth: [5, 8], waterfallLength: [50, 110], petals: 5,
      sky: { top: 0x15141f, fog: 0x3a3236 },
    },
    /** Mushroom stretch: tall and many mushrooms, shelf fungi on every trunk, weeping crowns. */
    mushroom: {
      crowns: { clump: 1.5, weeping: 2, column: 1 }, trees: { mushroom: 3, broadleaf: 1 },
      islands: 1.1, smallMushrooms: 5, shelfFungus01: 0.55, lianas01: 0, vines01: 0.3, vineLength: 26,
      waterfall01: 0.3, waterfallWidth: [5, 8], waterfallLength: [60, 120], petals: 0,
      sky: { top: 0x0d0e24, fog: 0x292b4a },
    },
    /** Blossom: airy twigs and wide umbrellas, petals drifting off them. */
    blossom: {
      crowns: { sparse: 3, umbrella: 2, clump: 1, weeping: 0.8 }, trees: { broadleaf: 1 },
      islands: 0.9, smallMushrooms: 0, shelfFungus01: 0, lianas01: 0, vines01: 0.15, vineLength: 20,
      waterfall01: 0.34, waterfallWidth: [5, 8], waterfallLength: [60, 120], petals: 9,
      sky: { top: 0x1a1327, fog: 0x45334d },
    },
    /** Jungle: palm fronds and broad leaves, lianas between trunks, long vines, and many big waterfalls. */
    jungle: {
      crowns: { fronds: 3, bigleaf: 3, clump: 1, weeping: 0.6 }, trees: { palm: 2.2, broadleaf: 1 },
      islands: 1.25, smallMushrooms: 0, shelfFungus01: 0.06, lianas01: 0.55, vines01: 0.8, vineLength: 60,
      waterfall01: 0.68, waterfallWidth: [9, 15], waterfallLength: [100, 210], petals: 0,
      sky: { top: 0x08201f, fog: 0x274c43 },
    },
  },
  /** The cold: drooping snow-laden boughs and narrow spruces; most islands are rock crags. */
  cold: {
    crowns: { boughs: 4, column: 1 }, crag01: 0.75, icefall01: 0.22, icefallLength: [30, 70],
    sky: { top: 0x121d33, fog: 0x354b63 },
  },
  waterfallView: { pool: 5, alpha01: 0.62, frameMs: 120 },
  skyCorrupted: 0x24192f,
};
