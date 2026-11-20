/**
 * One player's side of a two-player climb: the handshake, the shared clock, sending this candle, rebuilding the
 * other candle, and the reliable events. The scene calls `update` once a frame and reads the rest.
 *
 * Handshake (every message in it is repeated until the next step is seen, so a lost one only costs time):
 *   1. The guest sends `join` (its build and candle look) every `joinEveryMs` until the handshake is done.
 *   2. The host takes the first guest whose build matches and answers `hello` (the world, its build and look),
 *      again to every repeated `join` and every `joinEveryMs` on its own until `welcome` arrives. A guest of another
 *      build or protocol gets `refuse{version}`. A second guest gets `refuse{full}` and keeps asking: it takes the
 *      place of a guest that has not been heard for `replaceSilentGuestMs` (a reload whose `bye` was lost).
 *   3. The guest checks the host's build and answers every `hello` with `welcome`; it also starts its clock pings.
 *   4. The host is connected on `welcome` and starts sending states; the guest is connected on the host's first
 *      state. So both are connected, or both still waiting. A guest that has the world but no state after
 *      `handshakeTimeoutMs` gives up (`refused`, reason `timeout`); a host forgets a guest that never welcomed it in
 *      that time and waits for another.
 * Afterwards: states at `sendHz` (the guest only once its clock is set), pings from the guest, events resent until
 * acknowledged. `bye` makes the status `left` for good. Silence for `silentAfterMs` makes it `left` too, but when the
 * same player is heard again the session picks up (`resumed`): the other candle fades back in at its new place,
 * and `connectionId()` changes, so the game re-agrees on wax and crumbling ledges.
 * Nothing here opens a network connection: it only talks to the `Transport` it is given.
 */
import type { NetplayConfig } from '../../config/netplay.config';
import { createRemoteCandle, type ShownCandle } from './remote-candle';
import { createReliableEvents } from './reliable-events';
import { createSharedClock } from './shared-clock';
import type { Transport } from './transport';
import { ackChunks, envelope, parseEnvelope, type BodyState, type CandleLook, type Message, type MessageLimits, type NetEvent, type RefuseReason,
  type Role, type WorldOptions } from './protocol';

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
  /** Bounds for every received number (protocol.ts `messageLimits` of the local game config). The game's own by default. */
  limits?: MessageLimits;
}

export interface ReceivedEvent { id: string; atMs: number; event: NetEvent }

export interface NetplaySession {
  role: Role;
  status(): SessionStatus;
  /** Why it is refused; `full` while a guest keeps asking a full room. */
  refusedReason(): RefuseReason | null;
  /** The world to build: the host's own; the guest's once `hello` arrived (null before). */
  world(): WorldOptions | null;
  /** The other player's candle look, once known. */
  remoteLook(): CandleLook | null;
  /** The shared time (ms). */
  nowMs(): number;
  /**
   * Once a frame: read what arrived, answer, send this candle's state when it is due, resend events. `localAtMs` is
   * the shared time the state is for (its last physics step); now by default.
   */
  update(local: BodyState, localAtMs?: number): void;
  /** Where to show the other candle at shared time `atMs` (null before its first state or once it has left). */
  remote(atMs: number): ShownCandle | null;
  /** 1 while the other player is here (fading in after a resume), fading to 0 once they left. */
  remoteAlpha(): number;
  /** Changes on every connection, the first and every resume after a silence: the game re-agrees the world then. */
  connectionId(): number;
  /** True while the current connection is a resume after a silence. */
  resumed(): boolean;
  /** The other end's id, or null; a new id means a new player (a reload). */
  peerId(): string | null;
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
  /** The handshake with `peer` is done (host: welcome seen; guest: a host state seen). */
  let confirmed = false;
  let handshakeFromMs = 0;
  let leftByBye = false;
  let remoteLook: CandleLook | null = null;
  let lastHeardMs = now();
  let leftAtMs: number | null = null;
  let connectedAtMs = 0;
  let connections = 0;
  let isResumed = false;
  let lastJoinMs = Number.NEGATIVE_INFINITY, lastHelloMs = Number.NEGATIVE_INFINITY, lastStateMs = Number.NEGATIVE_INFINITY;
  let lastPingMs = Number.NEGATIVE_INFINITY;
  let pings = 0, seq = 0, sentStates = 0, receivedStates = 0;
  let inbox: ReceivedEvent[] = [];

  const post = (to: string, msg: Message): void => transport.send(envelope(me, to, msg));
  const hello = (to: string): void => { lastHelloMs = now(); post(to, { type: 'hello', build: options.build, world: world!, look: options.look }); };
  const connect = (resuming: boolean): void => {
    status = 'connected';
    confirmed = true;
    isResumed = resuming;
    leftAtMs = null;
    connectedAtMs = now();
    connections++;
    // A resumed candle starts at its new place: nothing is blended (or carried) across the gap.
    if (resuming) remoteCandle.clear();
  };
  const leave = (byBye: boolean): void => {
    if (status !== 'connected') return;
    status = 'left';
    leftByBye = byBye;
    leftAtMs = now();
    events.clearOutbox();
    // A host takes a new guest after one said goodbye; after a silence it keeps the guest, which may come back.
    if (role === 'host' && byBye) { peer = null; confirmed = false; }
  };
  const refuse = (reason: RefuseReason): void => { status = 'refused'; refused = reason; };
  /** The host takes `from` as its guest (a first guest, or one replacing a silent or departed one). */
  const takeGuest = (from: string, look: CandleLook): void => {
    if (peer !== from) { remoteCandle.clear(); confirmed = false; events.clearOutbox(); if (status === 'connected' || status === 'left') status = 'waiting'; }
    peer = from;
    remoteLook = look;
    refused = null;
    handshakeFromMs = now();
    lastHeardMs = now();
    hello(from);
  };

  function handle(from: string, msg: Message): void {
    if (role === 'host' && msg.type === 'join') {
      if (msg.build !== options.build) { post(from, { type: 'refuse', reason: 'version' }); return; }
      if (peer === from) { lastHeardMs = now(); if (!confirmed) hello(from); return; }
      const silent = now() - lastHeardMs > config.replaceSilentGuestMs;
      if (peer !== null && status !== 'left' && !silent) { post(from, { type: 'refuse', reason: 'full' }); return; }
      takeGuest(from, msg.look);
      return;
    }
    if (role === 'guest' && msg.type === 'hello') {
      if (status === 'refused' || (peer !== null && peer !== from)) return;
      if (msg.build !== options.build) { post(from, { type: 'refuse', reason: 'version' }); refuse('version'); return; }
      if (peer === null) handshakeFromMs = now();
      peer = from;
      world = msg.world;
      remoteLook = msg.look;
      refused = null;
      lastHeardMs = now();
      post(from, { type: 'welcome', look: options.look });
      return;
    }
    if (msg.type === 'refuse' && status === 'waiting') {
      // A full room may free up (a silent guest is replaced): keep asking. Another version is final.
      if (msg.reason === 'full') refused = 'full'; else refuse(msg.reason);
      return;
    }
    if (from !== peer) return;
    lastHeardMs = now();
    // The same player is heard again after a silence: pick up where it was.
    if (status === 'left' && !leftByBye && msg.type !== 'bye') connect(true);
    switch (msg.type) {
      case 'welcome': remoteLook = msg.look; if (role === 'host' && status === 'waiting') connect(false); break;
      case 'ping': if (role === 'host') post(from, { type: 'pong', t0: msg.t0, hostMs: clock.nowMs() }); break;
      case 'pong': clock.onPong(msg.t0, msg.hostMs); break;
      case 'state':
        if (role === 'guest' && status === 'waiting') connect(false);
        receivedStates++;
        remoteCandle.push(msg.body, msg.atMs, clock.nowMs());
        break;
      case 'event': if (events.accept(msg.id)) inbox.push({ id: msg.id, atMs: msg.atMs, event: msg.event }); break;
      case 'ack': events.onAck(msg.ids); break;
      case 'bye': leave(true); break;
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
    update(local, localAtMs) {
      if (transport.state() === 'closed') return;
      for (const raw of transport.receive()) {
        const parsed = parseEnvelope(raw, options.limits);
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
      if (role === 'guest' && status === 'waiting') {
        if (t - lastJoinMs >= config.joinEveryMs) { lastJoinMs = t; post('*', { type: 'join', build: options.build, look: options.look }); }
        if (peer !== null && t - handshakeFromMs > config.handshakeTimeoutMs) { refuse('timeout'); return; }
      }
      if (role === 'host' && status === 'waiting' && peer !== null) {
        if (t - handshakeFromMs > config.handshakeTimeoutMs) { peer = null; remoteLook = null; }
        else if (t - lastHelloMs >= config.joinEveryMs) hello(peer);
      }
      if (status === 'connected' && t - lastHeardMs > config.silentAfterMs) leave(false);
      if (peer === null) return;
      // The guest sets its clock as soon as it knows the host, so its first states are stamped right.
      if (role === 'guest' && status !== 'left' && t - lastPingMs >= (pings < QUICK_PINGS ? QUICK_PING_MS : config.pingEveryMs)) {
        lastPingMs = t; pings++;
        post(peer, { type: 'ping', t0: clock.localMs() });
      }
      // After a silence this side keeps sending its candle, so the other side can pick up again when it hears it.
      const silentLeft = status === 'left' && !leftByBye;
      if (status !== 'connected' && !silentLeft) return;
      if (t - lastStateMs >= 1000 / config.sendHz && clock.synced()) {
        lastStateMs = t;
        sentStates++;
        post(peer, { type: 'state', seq: ++seq, atMs: Math.min(localAtMs ?? Number.POSITIVE_INFINITY, clock.nowMs()), body: local });
      }
      if (silentLeft) return;
      for (const message of events.due(t)) post(peer, message);
      for (const ids of ackChunks(events.takeAcks())) post(peer, { type: 'ack', ids });
    },
    remote(atMs) { return status === 'connected' || status === 'left' ? remoteCandle.at(atMs) : null; },
    remoteAlpha() {
      const fade = Math.max(1, config.fadeMs);
      if (status === 'connected') return isResumed ? Math.min(1, (now() - connectedAtMs) / fade) : 1;
      if (status === 'left' && leftAtMs !== null) return Math.max(0, 1 - (now() - leftAtMs) / fade);
      return 0;
    },
    connectionId: () => connections,
    resumed: () => status === 'connected' && isResumed,
    peerId: () => peer,
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
