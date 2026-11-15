/** Combine keyboard aliases and preserve quick jump taps between fixed physics steps. */
import type { KeyBindings } from '../shared/contracts/settings';
import type { PlayerInput } from './player/types';

type Action = keyof PlayerInput;
const ALIASES: Record<Action, readonly string[]> = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], jump: ['Space', 'ArrowUp'],
};

export function createKeyboardInput(getKeys: () => KeyBindings) {
  const pressed = new Set<string>();
  const jumpEdges: boolean[] = [];
  let jumpHeld = false;

  function matches(code: string, action: Action): boolean {
    const keys = getKeys();
    if (code === keys[action]) return true;
    // An explicitly remapped action wins over another action's default alias.
    if (Object.values(keys).includes(code)) return false;
    return ALIASES[action].includes(code);
  }
  function held(action: Action): boolean {
    return [...pressed].some((code) => matches(code, action));
  }
  function recordJump(): void {
    const next = held('jump');
    if (next !== jumpHeld) jumpEdges.push(next);
    jumpHeld = next;
  }

  return {
    keyDown(code: string): boolean {
      const handled = (Object.keys(ALIASES) as Action[]).some((action) => matches(code, action));
      if (!handled) return false;
      pressed.add(code);
      recordJump();
      return true;
    },
    keyUp(code: string): void { pressed.delete(code); recordJump(); },
    /** One edge per physics step: even a complete tap within one render frame reaches movement. */
    read(): PlayerInput {
      return { left: held('left'), right: held('right'), jump: jumpEdges.shift() ?? held('jump') };
    },
    clear(): void { pressed.clear(); jumpEdges.length = 0; jumpHeld = false; },
  };
}
