/**
 * Shapes of authored content: level sections and narrator lines.
 *
 * Why: content is data written by hand (Neil's lane) and handed to the game and the
 * narrator by src/main.ts, so those lanes never import the content folder directly.
 *
 * This is the STARTING shape. P4.2 (sections) and P7 (narrator) refine it through an integrator PR.
 */

export interface PlatformData {
  id: string;
  /** Centre position and size in world pixels. y grows downward. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Registry id of the platform type. Only 'static' exists in the foundation. */
  type: string;
}

/** A rectangular zone (refuge, finish). Centre position and size in world pixels, like `PlatformData`. */
export interface AreaData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SectionData {
  id: string;
  /** Where the player appears in this section. */
  spawn: { x: number; y: number };
  platforms: PlatformData[];
  /** The safe zone of this section where progress is saved, or null if it has none. */
  refuge: (AreaData & { id: string }) | null;
  /** The winning zone. Set on the last section only. */
  finish: AreaData | null;
}

export interface NarratorLine {
  id: string;
  /** Caption text, reviewed by a human. */
  text: string;
  /** Path of the pre-generated clip under public/, or null while no clip exists. */
  clip: string | null;
}
