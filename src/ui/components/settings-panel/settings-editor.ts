/** Swapping duplicate bindings keeps every action reachable after a remap. */
import type { KeyBindings } from '../../../shared/contracts/settings';
export function remapKey(keys: KeyBindings, action: keyof KeyBindings, code: string): KeyBindings {
  const next = { ...keys };
  const previous = keys[action];
  for (const key of Object.keys(next) as Array<keyof KeyBindings>) {
    if (key !== action && next[key] === code) next[key] = previous;
  }
  next[action] = code;
  return next;
}

/** KeyE is the game's fixed ember control; Escape and KeyP always pause in the pause menu. */
const RESERVED: Readonly<Record<string, keyof KeyBindings | null>> = { KeyE: null, KeyP: 'pause', Escape: 'pause' };
/** False when the remap, including any swap it causes, puts an action on a key another control handles. */
export function remapAllowed(keys: KeyBindings, action: keyof KeyBindings, code: string): boolean {
  const next = remapKey(keys, action, code);
  return (Object.keys(next) as Array<keyof KeyBindings>).every((key) =>
    next[key] === keys[key] || !Object.hasOwn(RESERVED, next[key]) || RESERVED[next[key]] === key);
}
