/**
 * One player's side of a two-player climb: the handshake, the shared clock, sending this candle, rebuilding the
 * other candle, and the reliable events. The scene calls `update` once a frame and reads the rest.
 *
 * Handshake: the guest sends `join` (its build and candle look) every `joinEveryMs`. The host answers the first
 * guest whose build matches with `hello` (the world: seed and options, its build and look); a guest with another
 * build or protocol gets `refuse{version}`, a second guest `refuse{full}`. The guest checks the host's build
 * too, then answers `welcome`. Either side refusing ends it politely, with the reason in `refusedReason`.
 * Afterwards: states at `sendHz`, pings from the guest for the clock, events resent until acknowledged.
 * If the other player says `bye`, or nothing is heard for `silentAfterMs`, the status becomes `left`: their candle
 * fades out and this player carries on alone. A host that lost its guest accepts a new one (a reload rejoins).
 * Nothing here opens a network connection: it only talks to the `Transport` it is given.
 */
import type { NetplayConfig } from '../../config/netplay.config';
import { createRemoteCandle, type ShownCandle } from './remote-candle';
import { createReliableEvents } from './reliable-events';
import { createSharedClock } from './shared-clock';
import type { Transport } from './transport';
import { envelope, parseEnvelope, type BodyState, type CandleLook, type Message, type NetEvent, type RefuseReason, type Role, type WorldOptions } from './protocol';

export type SessionStatus = 'waiting' | 'connected' | 'left' | 'refused';

export interface SessionOptions {
  role: Role;
  transport: Transport;
  config: NetplayConfig;
  /** Gravity (px/s^2), for guessing the other candle ahead in the air. */
  gravityY: number;
  /** Local clock in ms (performance.now in the game; a test clock in tests). */
  now: () => number;
  /** The world fingerprint (build-id.ts); both sides must match. */
  build: string;
  /** This player's candle look. */
  look: CandleLook;
  /** The host's world. Required for the host; the guest learns it from `hello`. */
  world?: WorldOptions;
  /** This end's id on a shared channel. Random by default. */
  peerId?: string;
}

export interface ReceivedEvent { id: string; atMs: number; event: NetEvent }

export interface NetplaySession {
  role: Role;
  status(): SessionStatus;
  refusedReason(): RefuseReason | null;
  /** The world to build: the host's own; the guest's once `hello` arrived (null before). */
  world(): WorldOptions | null;
  /** The other player's candle look, once known. */
  remoteLook(): CandleLook | null;
  /** The shared time (ms). */
  nowMs(): number;
  /** Once a frame: read what arrived, answer, send this candle's state when it is due, resend events. */
  update(local: BodyState): void;
  /** Where to show the other candle at shared time `atMs` (null before its first state or once it has left). */
  remote(atMs: number): ShownCandle | null;
  /** 1 while the other player is here, fading to 0 once they left. */
  remoteAlpha(): number;
  /** Send an event reliably, stamped `atMs` (shared time, now by default); returns its id. */
  sendEvent(event: NetEvent, atMs?: number): string;
  /** Events that arrived since the last call, each once. */
  takeEvents(): ReceivedEvent[];
  /** Counters for tests and the dev readout. */
  stats(): { sentStates: number; receivedStates: number; pendingEvents: number; delayMs: number; rttMs: number | null };
  /** Say goodbye and close the transport. */
  close(): void;
}

const randomId = (): string => Math.random().toString(36).slice(2, 10);
/** The first few pings go out quickly so the clock is right within a second of meeting. */
const QUICK_PINGS = 5;
const QUICK_PING_MS = 150;

export function createNetplaySession(options: SessionOptions): NetplaySession {
  const { role, transport, config, now } = options;
  if (role === 'host' && !options.world) throw new Error('a host session needs its world');
  const me = options.peerId ?? `${role}-${randomId()}`;
  const clock = createSharedClock(role, now);
  const remoteCandle = createRemoteCandle(config, options.gravityY);
  const events = createReliableEvents(`${me}:`, config.resendMs, config.giveUpMs);
  let status: SessionStatus = 'waiting';
  let refused: RefuseReason | null = null;
  let world: WorldOptions | null = options.world ?? null;
  let peer: string | null = null;
  let remoteLook: CandleLook | null = null;
  let lastHeardMs = now();
  let leftAtMs: number | null = null;
  let lastJoinMs = Number.NEGATIVE_INFINITY, lastStateMs = Number.NEGATIVE_INFINITY, lastPingMs = Number.NEGATIVE_INFINITY;
  let pings = 0, seq = 0, sentStates = 0, receivedStates = 0;
  let inbox: ReceivedEvent[] = [];

  const post = (to: string, msg: Message): void => transport.send(envelope(me, to, msg));
  const leave = (): void => {
    if (status !== 'connected') return;
    status = 'left';
    leftAtMs = now();
    events.clearOutbox();
    // A host takes a new guest after this one left (a reload rejoins the same climb); a guest stays alone.
    if (role === 'host') peer = null;
  };
  const refuse = (reason: RefuseReason): void => { status = 'refused'; refused = reason; };

  function handle(from: string, msg: Message): void {
    if (role === 'host' && msg.type === 'join') {
      if (peer !== null && peer !== from) { post(from, { type: 'refuse', reason: 'full' }); return; }
      if (msg.build !== options.build) { post(from, { type: 'refuse', reason: 'version' }); return; }
      if (peer !== from) remoteCandle.clear();
      peer = from;
      remoteLook = msg.look;
      lastHeardMs = now();
      post(from, { type: 'hello', build: options.build, world: world!, look: options.look });
      return;
    }
    if (role === 'guest' && msg.type === 'hello') {
      if (status === 'refused' || (peer !== null && peer !== from)) return;
      if (msg.build !== options.build) { post(from, { type: 'refuse', reason: 'version' }); refuse('version'); return; }
      peer = from;
      world = msg.world;
      remoteLook = msg.look;
      lastHeardMs = now();
      if (status === 'waiting') status = 'connected';
      post(from, { type: 'welcome', look: options.look });
      return;
    }
    if (msg.type === 'refuse' && status === 'waiting') { refuse(msg.reason); return; }
    if (from !== peer) return;
    lastHeardMs = now();
    switch (msg.type) {
      case 'welcome': remoteLook = msg.look; if (status !== 'refused') { status = 'connected'; leftAtMs = null; } break;
      case 'ping': if (role === 'host') post(from, { type: 'pong', t0: msg.t0, hostMs: clock.nowMs() }); break;
      case 'pong': clock.onPong(msg.t0, msg.hostMs); break;
      case 'state': receivedStates++; remoteCandle.push(msg.body, msg.atMs, clock.nowMs()); break;
      case 'event': if (events.accept(msg.id)) inbox.push({ id: msg.id, atMs: msg.atMs, event: msg.event }); break;
      case 'ack': events.onAck(msg.ids); break;
      case 'bye': leave(); break;
      default: break;
    }
  }

  return {
    role,
    status: () => status,
    refusedReason: () => refused,
    world: () => world,
    remoteLook: () => remoteLook,
    nowMs: () => clock.nowMs(),
    update(local) {
      if (transport.state() === 'closed') return;
      for (const raw of transport.receive()) {
        const parsed = parseEnvelope(raw);
        if (parsed.ok) {
          if (parsed.envelope.from === me || (parsed.envelope.to !== '*' && parsed.envelope.to !== me)) continue;
          handle(parsed.envelope.from, parsed.envelope.msg);
        } else if (parsed.reason === 'version' && status === 'waiting' && (parsed.type === 'join' || parsed.type === 'hello')) {
          // Another protocol version: say so, politely, and (as a guest) stop asking.
          transport.send(envelope(me, parsed.from, { type: 'refuse', reason: 'version' }));
          if (role === 'guest') refuse('version');
        } else if (parsed.reason === 'version' && parsed.type === 'refuse' && role === 'guest' && status === 'waiting') refuse('version');
      }
      const t = now();
      if (status === 'refused') return;
      if (role === 'guest' && status === 'waiting' && t - lastJoinMs >= config.joinEveryMs) {
        lastJoinMs = t;
        post('*', { type: 'join', build: options.build, look: options.look });
      }
      if (status === 'connected' && t - lastHeardMs > config.silentAfterMs) leave();
      if (status !== 'connected' || peer === null) return;
      if (role === 'guest' && t - lastPingMs >= (pings < QUICK_PINGS ? QUICK_PING_MS : config.pingEveryMs)) {
        lastPingMs = t; pings++;
        post(peer, { type: 'ping', t0: clock.localMs() });
      }
      if (t - lastStateMs >= 1000 / config.sendHz) {
        lastStateMs = t;
        sentStates++;
        post(peer, { type: 'state', seq: ++seq, atMs: clock.nowMs(), body: local });
      }
      for (const message of events.due(t)) post(peer, message);
      const acks = events.takeAcks();
      if (acks.length) post(peer, { type: 'ack', ids: acks });
    },
    remote(atMs) { return status === 'connected' || status === 'left' ? remoteCandle.at(atMs) : null; },
    remoteAlpha() {
      if (status === 'connected') return 1;
      if (status === 'left' && leftAtMs !== null) return Math.max(0, 1 - (now() - leftAtMs) / Math.max(1, config.fadeMs));
      return 0;
    },
    sendEvent(event, atMs) {
      const message = events.send(event, atMs ?? clock.nowMs(), now());
      if (status === 'connected' && peer !== null) post(peer, message);
      return message.id;
    },
    takeEvents() { const taken = inbox; inbox = []; return taken; },
    stats: () => ({ sentStates, receivedStates, pendingEvents: events.pending(), delayMs: remoteCandle.delayMs(), rttMs: clock.rttMs() }),
    close() {
      if (peer !== null && transport.state() === 'open') for (let i = 0; i < 3; i++) post(peer, { type: 'bye' });
      status = status === 'connected' ? 'left' : status;
      transport.close();
    },
  };
}
