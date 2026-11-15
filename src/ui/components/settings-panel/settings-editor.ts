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
