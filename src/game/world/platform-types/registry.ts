/** Platform capabilities live here so future types do not require special cases in gameplay. */
import { STATIC_PLATFORM } from './static';

export interface PlatformType { stationary: boolean; anchorSafe: boolean }

const TYPES: Readonly<Record<string, PlatformType>> = {
  static: STATIC_PLATFORM,
  moving: { stationary: false, anchorSafe: false },
  slippery: { stationary: true, anchorSafe: false },
};

export function getPlatformType(id: string): PlatformType | undefined {
  return Object.hasOwn(TYPES, id) ? TYPES[id] : undefined;
}
