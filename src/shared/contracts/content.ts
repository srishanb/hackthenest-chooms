/**
 * Shapes of authored content: level sections and narrator lines.
 *
 * Why: content is data written by hand (Neil's lane) and handed to the game and the
 * narrator by src/main.ts, so those lanes never import the content folder directly.
 *
 * This is the STARTING shape. P4.2 (sections) and P7 (narrator) refine it through an integrator PR.
 */

export interface PlatformData {
  /** Ice strength 0..1; omit for the platform type's normal traction. */
  ice01?: number;
  lesson?: 'basics' | 'moving' | 'slippery' | 'wind' | 'finish';
  id: string;
  /** Centre position and size in world pixels. y grows downward. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Registry id: static, moving or slippery. */
  type: string;
  /** Deterministic tutorial motion; distance is the maximum offset from the authored centre. */
  motion?: { axis: 'x' | 'y'; distance: number; periodMs: number };
}

/** A rectangular zone (refuge, finish). Centre position and size in world pixels, like `PlatformData`. */
export interface AreaData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionData {
  /** A playable stage ends only on this platform's landing event. */
  stage?: { kind: StageKind; finalPlatformId: string; snow01: number; wind01: number };
  lesson?: 'basics' | 'moving' | 'slippery' | 'wind' | 'finish';
  /** Authored wind zones; independent of the signal and applied only while airborne. */
  wind?: Array<AreaData & { accelerationX: number; periodMs: number; fadePx?: number }>;
  id: string;
  /** Where the player appears in this section. */
  spawn: { x: number; y: number };
  platforms: PlatformData[];
  /** Optional rest area; entering never saves or refills an ember. */
  refuge: (AreaData & { id: string }) | null;
  /** Legacy draft zone; live stages must use stage.finalPlatformId and leave this null. */
  finish: AreaData | null;
}

export type NarratorMoment = 'welcome' | 'tutorial' | 'height' | 'fall' | 'stage' | 'finish' | 'low-fuel';

export interface NarratorLine {
  /** Optional event category; older banks remain opening lines. */
  moment?: NarratorMoment;
  id: string;
  /** Caption text, reviewed by a human. */
  text: string;
  /** Path of the pre-generated clip under public/, or null while no clip exists. */
  clip: string | null;
}

export type StageKind = 'tutorial' | 'normal' | 'snow' | 'windy' | 'snow-windy';
