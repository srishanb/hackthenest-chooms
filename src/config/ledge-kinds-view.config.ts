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
    /** It starts to shake once this much of its hold time has gone (0..1), by up to `shakePx` either way. */
    shakeFrom01: 0.2, shakePx: 4,
    /** Bits that fall when it goes: how many, and how long they are drawn (ms), under this gravity (px/s^2). */
    debris: 9, debrisMs: 800, debrisGravity: 1400,
  },
  updraft: {
    /** The column's faint fill (alpha 0..1) and the streak colour. */
    fill: 0x9fdcf0, fillAlpha: 0.07, streak: 0xe4f7ff, streakAlpha: 0.55,
    /** One streak per this many square px of column, at least `minStreaks`; streak length range (px). */
    pxPerStreak: 5200, minStreaks: 6, streakPx: [10, 24] as const,
    /** How fast the streaks rise (px/s) in a rise column and in a drift column: faster means stronger lift. */
    riseSpeed: 150, driftSpeed: 55,
  },
  /** Accents drawn above the darkness, faded with the light like the ledge outlines (outline-fade.ts). */
  night: { cap: 0xff9fb4, crumble: 0xffb15c, updraft: 0x9fe6ff, alpha: 0.85 },
} as const;
