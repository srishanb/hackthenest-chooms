/**
 * A transport between two windows or tabs of one browser on one machine, through `BroadcastChannel`: no network,
 * no server. Phase A uses it to play the two-player climb in two windows side by side.
 *
 * Every window that opens the same room name hears every message of that room (a third window is refused by the
 * host's session, not here). A window never hears its own messages. The room name comes from the URL
 * (`?mp=host&room=NAME`) and is checked: letters, digits, `-` and `_`, at most 32.
 * Unread messages are kept to the newest `maxQueuedMessages`: a window that is not drawing (a hidden tab), or a page
 * that floods the room, cannot make this one hold more.
 */
import { NETPLAY_CONFIG } from '../../config/netplay.config';
import type { Transport, TransportState } from './transport';

const ROOM_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/** True for a room name the switch accepts. */
export const isRoomName = (room: string): boolean => ROOM_PATTERN.test(room);

/** Open the room, or return null when this browser has no `BroadcastChannel` or the name is not valid. */
export function createBroadcastTransport(room: string): Transport | null {
  if (!isRoomName(room) || typeof BroadcastChannel === 'undefined') return null;
  const channel = new BroadcastChannel(`lighten-up-mp:${room}`);
  let inbox: unknown[] = [];
  let open = true;
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!open) return;
    inbox.push(event.data);
    if (inbox.length > NETPLAY_CONFIG.maxQueuedMessages) inbox.shift();
  };
  return {
    send(data) {
      if (!open) return;
      try { channel.postMessage(data); } catch { /* A message that cannot be cloned is dropped, like a lost one. */ }
    },
    receive() { const taken = inbox; inbox = []; return taken; },
    state: (): TransportState => (open ? 'open' : 'closed'),
    close() { if (!open) return; open = false; inbox = []; channel.close(); },
  };
}
