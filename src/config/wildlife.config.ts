/**
 * Tuning for the forest's background life: birds on the ledges, far flocks, fireflies, falling
 * leaves, swaying grass and distant waterfalls.
 *
 * Why it exists: the forest was still between the candle's jumps. These creatures and motions make
 * it feel inhabited. Everything here is decoration: nothing has a collision body, nothing can be
 * landed on or collected, and none of these numbers reach movement, fuel or scoring.
 *
 * Sheet layouts are fixed by the art (see public/assets/wildlife/license-source.md).
 */

/** One animation of a ledge bird: the sheet cells it shows, in order. */
export interface BirdClip { cells: readonly number[] }

export const WILDLIFE_CONFIG = {
  bird: {
    /**
     * Ledge birds use birb.png (8 x 8 px cells, 4 per row), drawn at the one pixel size like the rest
     * of the art. (The bigger bird.png, 32 x 21 cells, would stand taller than the candle at that size.)
     * Cells: 0 and 3 stand, 1 and 2 bend down to eat, 12 to 14 land (legs out), 4 to 11 fly.
     */
    sheet: 'wildlife-birb', frame: { width: 8, height: 8 }, columns: 4,
    clips: {
      stand: { cells: [0, 0, 0, 3] }, look: { cells: [0, 3, 0, 3, 3, 0] }, peck: { cells: [1, 2, 2, 1, 2, 2, 1, 0] },
      chirp: { cells: [3, 0, 3, 0, 3] }, takeoff: { cells: [0, 14, 13, 12, 4, 5, 6, 7] }, fly: { cells: [8, 9, 8, 7] },
    } satisfies Record<string, BirdClip>,
    /** How long one animation frame shows, in ms. Standing still breathes more slowly. */
    frameMs: 100, standFrameMs: 260,
    /** How many birds can be on screen at once. */
    pool: 3,
    /** Share of ledges (0..1) a bird may sit on. */
    perchChance01: 0.36,
    /** A bird flies off when the candle comes within this many px. */
    startleRadiusPx: 96,
    /** Flight speed across and up, in px per second. */
    flySpeedPxPerS: 170, climbPxPerS: 95,
    /** A standing bird waits between these many ms before it pecks, chirps or looks around. */
    idleMinMs: 900, idleMaxMs: 3400,
    /** Birds leave, and no new ones settle, once the forest's corruption (0..1) passes this. */
    leaveAtCorruption01: 0.55,
  },
  flock: {
    /** Cell size of birb.png in px, cells per row, and the cells of its flight cycle. */
    frame: 8, columns: 4, flightCells: [8, 9, 8, 7] as const, frameMs: 110,
    /** Birds in one flock, and the wait between flocks in ms. */
    size: 5, minGapMs: 9000, maxGapMs: 22000,
    speedPxPerS: 62, bobPx: 5, spacingPx: 26,
    /** How solid the silhouettes are. (They are drawn at the one pixel size, FOREST_CONFIG.pixelScale.) */
    alpha: 0.6,
  },
  firefly: {
    count: 12,
    /** How far a firefly wanders around its home, in px, and how long one wander and one blink take, in ms. */
    wanderPx: 26, wanderMs: 7000, blinkMs: 2600,
    /** How much of the camera's climb the fireflies follow (1 would pin them to the world). */
    parallax: 0.6,
    alpha: 0.85,
  },
  leaf: {
    count: 7,
    fallPxPerS: 26, swayPx: 22, swayMs: 3200,
    parallax: 0.85,
    alpha: 0.9,
    /** Corruption (0..1) at which the falling leaves turn orange, then red. */
    orangeAt01: 0.3, redAt01: 0.6,
  },
  grass: {
    /** Cell size of the grass sheets in px, and frames per sheet. */
    frame: { width: 16, height: 32 }, frames: 8, frameMs: 150,
    /** The row of the cell where the blades meet the ground (the art fills only the top of its cell). */
    rootYPx: 17,
    /** One tuft per this many px of ledge, up to `maxPerLedge`. */
    ledgePxPerTuft: 100, maxPerLedge: 2,
  },
  waterfall: {
    /** Cell size of the waterfall sheets in px, and frames per sheet. */
    frame: 16, frames: 8, frameMs: 120,
    /** Share of far garden ledges (0..1) that have a waterfall, and its length range in px. */
    chance01: 0.34, minLengthPx: 90, maxLengthPx: 190,
    alpha: 0.42,
  },
} as const;

export type WildlifeConfig = typeof WILDLIFE_CONFIG;
