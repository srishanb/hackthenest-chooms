/**
 * The connection between two games, as the rest of netplay/ sees it: send a message, take what has arrived, ask
 * whether it is still open, close it.
 *
 * Why an interface: phase A ships two connections that use no network (memory-transport.ts for tests,
 * broadcast-transport.ts for two windows of one browser); phase B adds a real one behind the same four calls, and
 * nothing else changes. A transport may lose, delay or reorder messages: the session copes with all three.
 * It carries plain data only (what `structuredClone` and JSON both keep); the session checks everything it takes.
 */
export type TransportState = 'open' | 'closed';

export interface Transport {
  /** Send one message to the other end. Never throws; after `close` it does nothing. */
  send(data: unknown): void;
  /** Every message that has arrived since the last call, oldest first, unchecked. */
  receive(): unknown[];
  state(): TransportState;
  close(): void;
}
