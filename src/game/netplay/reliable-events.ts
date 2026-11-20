/**
 * Events that must arrive exactly once: each has an id, is sent again until the other game acknowledges it, and
 * a repeat that arrives is acknowledged again but never applied twice.
 *
 * Outbox: `send` returns the message to put on the wire now and keeps it; `due` returns the ones to send again
 * (every `resendMs`, up to `giveUpMs`); an `ack` removes them. Inbox: `accept` says whether an event id is new and
 * remembers it either way so it is acknowledged; `takeAcks` hands over the ids to acknowledge in one message.
 */
import type { Message, NetEvent } from './protocol';

type EventMessage = Extract<Message, { type: 'event' }>;

export interface ReliableEvents {
  /** Queue a new event stamped `atMs` (shared time); returns the message to send now. */
  send(event: NetEvent, atMs: number, localMs: number): EventMessage;
  /** Messages to send again at local time `localMs`. */
  due(localMs: number): EventMessage[];
  onAck(ids: readonly string[]): void;
  /** True the first time an id arrives; false for a repeat. The id is acknowledged in both cases. */
  accept(id: string): boolean;
  /** Ids to acknowledge now (each once per arrival). */
  takeAcks(): string[];
  /** Events still waiting for an acknowledgement. */
  pending(): number;
  /** Forget everything outgoing (the other player left). Ids already seen stay remembered. */
  clearOutbox(): void;
}

/** How many seen ids are remembered (old ones are long acknowledged and never resent). */
const SEEN_LIMIT = 2048;

export function createReliableEvents(prefix: string, resendMs: number, giveUpMs: number): ReliableEvents {
  let counter = 0;
  let outbox: { message: EventMessage; firstMs: number; lastMs: number }[] = [];
  const seen = new Set<string>();
  const seenOrder: string[] = [];
  let acks: string[] = [];

  return {
    send(event, atMs, localMs) {
      const message: EventMessage = { type: 'event', id: `${prefix}${++counter}`, atMs, event };
      outbox.push({ message, firstMs: localMs, lastMs: localMs });
      return message;
    },
    due(localMs) {
      outbox = outbox.filter((item) => localMs - item.firstMs < giveUpMs);
      const out: EventMessage[] = [];
      for (const item of outbox) if (localMs - item.lastMs >= resendMs) { item.lastMs = localMs; out.push(item.message); }
      return out;
    },
    onAck(ids) { const done = new Set(ids); outbox = outbox.filter((item) => !done.has(item.message.id)); },
    accept(id) {
      // Acknowledgements are drained once a frame while connected; if they are not, the newest SEEN_LIMIT are kept.
      acks.push(id);
      if (acks.length > SEEN_LIMIT) acks = acks.slice(acks.length - SEEN_LIMIT / 2);
      if (seen.has(id)) return false;
      seen.add(id); seenOrder.push(id);
      if (seenOrder.length > SEEN_LIMIT) seen.delete(seenOrder.shift()!);
      return true;
    },
    takeAcks() { const taken = acks; acks = []; return taken; },
    pending: () => outbox.length,
    clearOutbox() { outbox = []; },
  };
}
