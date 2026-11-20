/**
 * How the special ledges of the endless climb look (Decision D-36). Owner: game lane.
 *
 * Drawing only: nothing here changes how they work (that is game.config.ts `ledgeKinds`). Everything is
 * drawn by code in whole art pixels (2 world px) on the one grid (Decision D-34). Colours are 0xRRGGBB;
 * sizes in world px; times in ms; speeds in px/s.
 */
export const LEDGE_KINDS_VIEW_CONFIG = {
  cap: {
    /** The cap's red, its lit top row, its shadowed rim, the white spots and the stem. */
    red: 0xc4463a, light: 0xe57a5e, rim: 0x7d2a26, spot: 0xf6ead6, stem: 0xe6d6b8, stemShade: 0xb9a688,
    /** Depth of the dome above the landing line's underside (px) and the stem below it (px). */
    domePx: 16, stemPx: 30,
    /** After a bounce the cap is drawn squashed (4 px lower, 8 px wider) for this long (ms). */
    squashMs: 140,
  },
  crumble: {
    /** Crack lines across the ledge, and their colour as it is about to fall (they warm toward it). */
    crack: 0x2b1d16, warn: 0xf0a04b,
    /** The pale cracked stone laid over its top (instead of grass), and the stone's darker seam. */
    stone: 0xa59682, seam: 0x6d6153,
    /** It starts to shake once this much of its hold time has gone (0..1), by up to `shakePx` either way. */
    shakeFrom01: 0.2, shakePx: 4,
    /** Bits that fall when it goes: how many, and how long they are drawn (ms), under this gravity (px/s^2). */
    debris: 9, debrisMs: 800, debrisGravity: 1400,
  },
  updraft: {
    /** The column's faint fill (alpha 0..1) and the streak colour. */
    fill: 0x9fdcf0, fillAlpha: 0.1, streak: 0xe4f7ff, streakAlpha: 0.7,
    /** One streak per this many square px of column, at least `minStreaks`; streak length range (px). */
    pxPerStreak: 5200, minStreaks: 6, streakPx: [10, 24] as const,
    /** How fast the streaks rise (px/s) in a rise column and in a drift column: faster means stronger lift. */
    riseSpeed: 150, driftSpeed: 55,
  },
  /**
   * Updraft columns in the snow bands: pale streaks vanish against snow (QA finding 8), so there the column
   * is drawn in a deep blue that reads against pale snow by day and the lit trunks at night, with each streak
   * given a pale 2 px core beside it so it still reads against dark rock. Elsewhere the pale look stays.
   */
  updraftSnow: { fill: 0x2c5f8c, fillAlpha: 0.16, streak: 0x1b5f9e, core: 0xe4f7ff, streakAlpha: 0.85, edge: 0x1b5f9e, edgeAlpha: 0.75 },
  /**
   * Walls (Decision D-37, only with `?walls=1`): a stone pillar of courses of blocks, lit on one face and shaded
   * on the other, mossy on top (snow-capped in the snow bands). Upright and grey where a ledge is flat and
   * earthy, so it never reads as something to land on from the side. `coursePx` is the height of a block row.
   */
  wall: { stone: 0x5d6070, light: 0x8d92a6, shade: 0x34363f, seam: 0x40424d, moss: 0x5f8f3e, mossDark: 0x46702d, snow: 0xeef4fb,
    coursePx: 16, mossTufts: 3 },
  /** Accents drawn above the darkness, faded with the light like the ledge outlines (outline-fade.ts). */
  night: { cap: 0xff9fb4, crumble: 0xffb15c, updraft: 0x9fe6ff, wall: 0xc9b8ff, alpha: 0.85 },
} as const;
