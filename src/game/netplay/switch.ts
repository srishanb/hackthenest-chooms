/**
 * The two-player switch in the URL: `?mp=host&room=NAME` or `?mp=join&room=NAME` (production builds too). Off when
 * absent or not valid, and then nothing about the game changes. src/main.ts reads it and passes it to createGame.
 */
import { isRoomName } from './broadcast-transport';
import type { Role } from './protocol';

export interface NetplaySwitch { role: Role; room: string }

/** The switch from a query string, or null (solo play). */
export function readNetplaySwitch(search: string): NetplaySwitch | null {
  const query = new URLSearchParams(search);
  const mode = query.get('mp');
  const room = query.get('room') ?? '';
  if ((mode !== 'host' && mode !== 'join') || !isRoomName(room)) return null;
  return { role: mode === 'host' ? 'host' : 'guest', room };
}
