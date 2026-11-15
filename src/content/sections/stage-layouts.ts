/** Independent stage geometry and environment tuning. Every row is a real ledge, never a portal. */
import type { SectionData, StageKind } from '../../shared/contracts/content';

interface StageLayout {
  kind: Exclude<StageKind, 'tutorial'>;
  firstY: number;
  /** Rise to each next ledge: varied charge timing rather than identical staircase jumps. */
  risesPx: readonly number[];
  snow01: number;
  wind01: number;
  /** x, width, ice strength. Zero ice means ordinary traction. */
  ledges: readonly (readonly [number, number, number])[];
  windAccelerationX: number;
}

export const STAGE_LAYOUTS: readonly StageLayout[] = [
  // Final ledges offer a small breather; stage averages keep getting tighter and farther apart.
  { kind: 'normal', firstY: -570, risesPx: [110,115,112,120,116,124,118,126,122], snow01: 0, wind01: 0, windAccelerationX: 0,
    ledges: [[350,250,0],[610,240,0],[780,230,0],[530,220,0],[240,210,0],[460,200,0],[730,190,0],[510,180,0],[270,170,0],[520,180,0]] },
  { kind: 'windy', firstY: -1773, risesPx: [124,130,126,136,128,138,132,140,134], snow01: 0, wind01: 1, windAccelerationX: 120,
    ledges: [[290,180,0],[520,174,0],[770,168,0],[550,162,0],[280,156,0],[480,150,0],[730,144,0],[490,138,0],[230,132,0],[480,144,0]] },
  { kind: 'snow', firstY: -3106, risesPx: [134,140,136,146,138,148,142,150,144], snow01: 1, wind01: 0, windAccelerationX: 0,
    ledges: [[700,144,0.2],[450,138,0.4],[210,132,0.6],[460,126,0.8],[730,120,0],[500,114,1],[250,108,1],[490,102,1],[760,96,0.7],[500,112,0]] },
  { kind: 'snow-windy', firstY: -4534, risesPx: [144,150,146,156,148,158,152,162,156], snow01: 1, wind01: 1, windAccelerationX: 150,
    ledges: [[700,108,0.25],[440,102,0.5],[720,98,0.75],[450,94,1],[190,90,0],[460,86,1],[200,82,1],[470,78,1],[730,74,1],[480,92,0]] },
];

export function buildStage(layout: StageLayout): SectionData {
  if (layout.risesPx.length !== layout.ledges.length - 1 || layout.risesPx.some(rise => !Number.isFinite(rise) || rise <= 0)) {
    throw new Error(`Stage ${layout.kind}: each consecutive ledge needs a positive rise`);
  }
  let y = layout.firstY;
  const platforms = layout.ledges.map(([x, width, ice01], index) => {
    if (index > 0) y -= layout.risesPx[index - 1]!;
    return { id: `${layout.kind}-${index + 1}`, x, y,
      width, height: 20, type: ice01 > 0 ? 'slippery' : 'static', ice01 };
  });
  const last = platforms.at(-1)!;
  const height = layout.firstY - last.y + 300;
  return {
    id: layout.kind, spawn: { x: platforms[0]!.x, y: layout.firstY - 28 }, platforms, refuge: null, finish: null,
    stage: { kind: layout.kind, finalPlatformId: last.id, snow01: layout.snow01, wind01: layout.wind01 },
    wind: layout.windAccelerationX === 0 ? [] : [{ x: 480, y: (layout.firstY + last.y) / 2 - 50,
      width: 960, height, accelerationX: layout.windAccelerationX, periodMs: 4200, fadePx: 180 }],
  };
}
