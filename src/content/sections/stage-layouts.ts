/** Independent stage geometry and environment tuning. Every row is a real ledge, never a portal. */
import type { SectionData, StageKind } from '../../shared/contracts/content';

interface StageLayout {
  kind: Exclude<StageKind, 'tutorial'>;
  firstY: number;
  risePx: number;
  snow01: number;
  wind01: number;
  /** x, width, ice strength. Zero ice means ordinary traction. */
  ledges: readonly (readonly [number, number, number])[];
  windAccelerationX: number;
}

export const STAGE_LAYOUTS: readonly StageLayout[] = [
  { kind: 'normal', firstY: -570, risePx: 110, snow01: 0, wind01: 0, windAccelerationX: 0,
    ledges: [[350,260,0],[600,250,0],[760,240,0],[520,230,0],[280,225,0],[480,220,0],[710,215,0],[500,210,0],[270,205,0],[480,200,0]] },
  { kind: 'windy', firstY: -1685, risePx: 115, snow01: 0, wind01: 1, windAccelerationX: 120,
    ledges: [[290,230,0],[500,220,0],[710,215,0],[490,210,0],[270,205,0],[480,200,0],[700,195,0],[490,190,0],[280,185,0],[490,190,0]] },
  { kind: 'snow', firstY: -2845, risePx: 115, snow01: 1, wind01: 0, windAccelerationX: 0,
    ledges: [[690,240,0.2],[470,235,0.4],[250,225,0.6],[470,220,0.8],[700,215,0],[490,210,1],[270,205,1],[480,200,1],[700,195,0.7],[500,200,0]] },
  { kind: 'snow-windy', firstY: -4005, risePx: 120, snow01: 1, wind01: 1, windAccelerationX: 150,
    ledges: [[700,220,0.25],[490,215,0.5],[280,210,0.75],[490,205,1],[700,200,0],[480,195,1],[270,190,1],[480,185,1],[690,180,1],[480,210,0]] },
];

export function buildStage(layout: StageLayout): SectionData {
  const platforms = layout.ledges.map(([x, width, ice01], index) => ({
    id: `${layout.kind}-${index + 1}`, x, y: layout.firstY - layout.risePx * index,
    width, height: 20, type: ice01 > 0 ? 'slippery' : 'static', ice01,
  }));
  const last = platforms.at(-1)!;
  const height = layout.firstY - last.y + 300;
  return {
    id: layout.kind, spawn: { x: platforms[0]!.x, y: layout.firstY - 28 }, platforms, refuge: null, finish: null,
    stage: { kind: layout.kind, finalPlatformId: last.id, snow01: layout.snow01, wind01: layout.wind01 },
    wind: layout.windAccelerationX === 0 ? [] : [{ x: 480, y: (layout.firstY + last.y) / 2 - 50,
      width: 960, height, accelerationX: layout.windAccelerationX, periodMs: 4200, fadePx: 180 }],
  };
}
