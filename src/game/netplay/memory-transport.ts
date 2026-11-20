/**
 * Two connected transports in one program, for tests: no network, a clock the test controls, and adjustable
 * delay, jitter, loss and reordering.
 *
 * How: `send` copies the message through JSON (so anything that would not survive a real connection fails here
 * first), then either drops it (`loss01`) or queues it for the other end, due after `delayMs` plus a random part
 * of `jitterMs`. `receive` hands over what is due by the link's clock, in the order it falls due, so jitter also
 * reorders. `reorder01` swaps a message with the one before it now and then. The randomness is seeded, so a
 * failing test fails the same way every time.
 */
import type { Transport, TransportState } from './transport';

export interface LinkConditions {
  delayMs: number;
  jitterMs: number;
  loss01: number;
  reorder01: number;
}

export interface MemoryLink {
  a: Transport;
  b: Transport;
  /** Change the conditions for messages sent from now on (both directions). */
  setConditions(next: Partial<LinkConditions>): void;
  /** Stop delivering from one end, as if it went silent (its messages are dropped). */
  silence(end: 'a' | 'b', silent: boolean): void;
  /** Messages sent so far, and how many were dropped. */
  stats(): { sent: number; dropped: number };
}

interface Queued { dueMs: number; order: number; data: unknown }

/** A small seeded random source (mulberry32), so a test run is repeatable. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMemoryLink(now: () => number, conditions: Partial<LinkConditions> = {}, seed = 1): MemoryLink {
  let current: LinkConditions = { delayMs: 0, jitterMs: 0, loss01: 0, reorder01: 0, ...conditions };
  const random = seeded(seed);
  const queues: Record<'a' | 'b', Queued[]> = { a: [], b: [] };
  const silent: Record<'a' | 'b', boolean> = { a: false, b: false };
  const open: Record<'a' | 'b', boolean> = { a: true, b: true };
  let order = 0, sent = 0, dropped = 0;

  const end = (self: 'a' | 'b'): Transport => {
    const other = self === 'a' ? 'b' : 'a';
    return {
      send(data) {
        if (!open[self] || !open[other]) return;
        sent++;
        const copy: unknown = JSON.parse(JSON.stringify(data));
        if (silent[self] || random() < current.loss01) { dropped++; return; }
        const queue = queues[other];
        const item: Queued = { dueMs: now() + current.delayMs + random() * current.jitterMs, order: order++, data: copy };
        queue.push(item);
        if (queue.length > 1 && random() < current.reorder01) {
          const last = queue[queue.length - 2]!;
          [last.dueMs, item.dueMs] = [item.dueMs, last.dueMs];
        }
      },
      receive() {
        if (!open[self]) return [];
        const queue = queues[self];
        const t = now();
        const due = queue.filter((item) => item.dueMs <= t).sort((p, q) => p.dueMs - q.dueMs || p.order - q.order);
        queues[self] = queue.filter((item) => item.dueMs > t);
        return due.map((item) => item.data);
      },
      state: (): TransportState => (open[self] ? 'open' : 'closed'),
      close() { open[self] = false; queues[self] = []; },
    };
  };

  return {
    a: end('a'),
    b: end('b'),
    setConditions(next) { current = { ...current, ...next }; },
    silence(which, value) { silent[which] = value; },
    stats: () => ({ sent, dropped }),
  };
}
