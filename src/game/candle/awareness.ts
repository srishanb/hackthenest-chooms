/**
 * What the candle notices around it, so its eyes can follow: wax within reach, the edge of the
 * ledge it stands on, and ice under its feet.
 *
 * Why: a character that looks at things feels alive, and the look doubles as a quiet hint (the
 * eyes turn toward wax the player may have missed). Pure: plain positions in, a direction out.
 * It is drawn by the candle and nowhere else; movement never reads it.
 */

/** A direction for the eyes: -1 left or up, 0 none, 1 right or down, in world terms (not mirrored). */
export interface LookTarget {
  x: -1 | 0 | 1;
  y: -1 | 0 | 1;
  /** True when the candle is peering over the edge of its ledge, rather than looking at wax. */
  peek: boolean;
}

export interface Surroundings {
  /** Where to look, or null when nothing nearby deserves a look. */
  look: LookTarget | null;
  /** True while the candle is sliding on ice. */
  sliding: boolean;
}

/** How far away (px) wax still catches the eye, and how close to an edge (px) the candle peers over it. */
export const AWARENESS = { waxRangePx: 300, deadZonePx: 26, edgePx: 14, slideSpeedPx: 30 } as const;

const sign = (value: number, deadZone: number): -1 | 0 | 1 => (value > deadZone ? 1 : value < -deadZone ? -1 : 0);

export function surroundings(
  player: { x: number; y: number; vx: number; grounded: boolean },
  wax: readonly { x: number; y: number }[],
  ledge: { x: number; width: number; type?: string } | undefined,
  worldWidth: number,
): Surroundings {
  const sliding = player.grounded && ledge?.type === 'slippery' && Math.abs(player.vx) > AWARENESS.slideSpeedPx;
  // The nearest wax in range wins.
  let nearest: { dx: number; dy: number; distance: number } | null = null;
  for (const drop of wax) {
    const dx = drop.x - player.x, dy = drop.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= AWARENESS.waxRangePx && (!nearest || distance < nearest.distance)) nearest = { dx, dy, distance };
  }
  if (nearest) {
    const look: LookTarget = { x: sign(nearest.dx, AWARENESS.deadZonePx), y: sign(nearest.dy, AWARENESS.deadZonePx), peek: false };
    if (look.x !== 0 || look.y !== 0) return { look, sliding };
  }
  // No wax to look at: standing at the edge of a ledge (not a full-width landing), it peers down over it.
  if (player.grounded && ledge && ledge.width < worldWidth) {
    const toLeft = player.x - (ledge.x - ledge.width / 2);
    const toRight = ledge.x + ledge.width / 2 - player.x;
    if (Math.min(toLeft, toRight) <= AWARENESS.edgePx) return { look: { x: toLeft < toRight ? -1 : 1, y: 1, peek: true }, sliding };
  }
  return { look: null, sliding };
}
