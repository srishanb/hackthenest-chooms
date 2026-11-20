/**
 * The messages two games exchange in the two-player climb, and the check every received message goes through.
 *
 * Why a check: a message comes from another window or (in phase B) another machine, so it can be anything. Each
 * one is parsed into a typed message or dropped; nothing else in netplay/ ever reads raw data. Every message is
 * plain data (numbers, strings, booleans, arrays, plain objects) so it survives `structuredClone` and JSON alike.
 * Every envelope carries the protocol version: a game that does not speak this version is refused politely.
 */

/** Bump when a message changes shape or meaning. Two games with different versions do not play together. */
export const PROTOCOL_VERSION = 1;

export type Role = 'host' | 'guest';

/** What makes the world: the same values give the same climb on both sides. */
export interface WorldOptions {
  seed: number;
  /** The wall prototype (`?walls=1`) changes the chunks, so it is part of the world. */
  walls: boolean;
}

/** How a player's candle looks to the other player. */
export interface CandleLook { candleSeed: number }

/** One player's candle at one moment: enough to draw it and to make it a solid body. */
export interface BodyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  platformId: string | null;
  charging: boolean;
  /** 0..1 of a full charge, for the drawing. */
  charge01: number;
  /** Direction held (-1, 0, 1), for the drawing. */
  aim: -1 | 0 | 1;
  fuel01: number;
  /** True once its flame has gone out (its run is over). */
  out: boolean;
  candleSeed: number;
  /** Standing on a head: how far right of that head's centre (px), so the other side draws it on the real head. */
  rideOffsetX?: number;
  /** Which run of this player it is (each restart adds one). */
  run: number;
}

/** Things that happen once, sent reliably (resent until acknowledged) and applied once. */
export type NetEvent =
  | { kind: 'shove'; dir: -1 | 1 }
  | { kind: 'knock'; dvx: number; dvy: number }
  | { kind: 'crumble'; ledgeId: string }
  | { kind: 'wax'; dropId: string; run: number }
  | { kind: 'run_reset'; run: number };

export type RefuseReason = 'version' | 'full';

export type Message =
  | { type: 'join'; build: string; look: CandleLook }
  | { type: 'hello'; build: string; world: WorldOptions; look: CandleLook }
  | { type: 'welcome'; look: CandleLook }
  | { type: 'refuse'; reason: RefuseReason }
  | { type: 'ping'; t0: number }
  | { type: 'pong'; t0: number; hostMs: number }
  | { type: 'state'; seq: number; atMs: number; body: BodyState }
  | { type: 'event'; id: string; atMs: number; event: NetEvent }
  | { type: 'ack'; ids: string[] }
  | { type: 'bye' };

/** What goes over a transport: who sent it, to whom (`*` before the two have met), and the message. */
export interface Envelope { v: number; from: string; to: string; msg: Message }

/** A parsed envelope, or why it was dropped. A wrong version still says who sent it, so it can be refused. */
export type Parsed = { ok: true; envelope: Envelope } | { ok: false; reason: 'malformed' } | { ok: false; reason: 'version'; from: string; type: string };

const MAX_ID = 64;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const str = (value: unknown, max = MAX_ID): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const bool = (value: unknown): value is boolean => typeof value === 'boolean';
const dir = (value: unknown): value is -1 | 1 => value === -1 || value === 1;

function look(value: unknown): CandleLook | null {
  return isObject(value) && num(value.candleSeed) ? { candleSeed: value.candleSeed >>> 0 } : null;
}

function world(value: unknown): WorldOptions | null {
  return isObject(value) && num(value.seed) && bool(value.walls) ? { seed: value.seed >>> 0, walls: value.walls } : null;
}

function body(value: unknown): BodyState | null {
  if (!isObject(value)) return null;
  const { x, y, vx, vy, grounded, platformId, charging, charge01, aim, fuel01, out, candleSeed, rideOffsetX, run } = value;
  if (!num(x) || !num(y) || !num(vx) || !num(vy) || !bool(grounded) || !bool(charging) || !num(charge01) || !num(fuel01) || !bool(out)) return null;
  if (!(platformId === null || str(platformId)) || !(aim === -1 || aim === 0 || aim === 1) || !num(candleSeed) || !num(run)) return null;
  if (rideOffsetX !== undefined && !num(rideOffsetX)) return null;
  return { x, y, vx, vy, grounded, platformId, charging, charge01, aim, fuel01, out, candleSeed: candleSeed >>> 0, run,
    ...(rideOffsetX !== undefined ? { rideOffsetX } : {}) };
}

function netEvent(value: unknown): NetEvent | null {
  if (!isObject(value)) return null;
  switch (value.kind) {
    case 'shove': return dir(value.dir) ? { kind: 'shove', dir: value.dir } : null;
    case 'knock': return num(value.dvx) && num(value.dvy) ? { kind: 'knock', dvx: value.dvx, dvy: value.dvy } : null;
    case 'crumble': return str(value.ledgeId) ? { kind: 'crumble', ledgeId: value.ledgeId } : null;
    case 'wax': return str(value.dropId) && num(value.run) ? { kind: 'wax', dropId: value.dropId, run: value.run } : null;
    case 'run_reset': return num(value.run) ? { kind: 'run_reset', run: value.run } : null;
    default: return null;
  }
}

function message(value: unknown): Message | null {
  if (!isObject(value)) return null;
  switch (value.type) {
    case 'join': { const l = look(value.look); return str(value.build) && l ? { type: 'join', build: value.build, look: l } : null; }
    case 'hello': {
      const l = look(value.look), w = world(value.world);
      return str(value.build) && l && w ? { type: 'hello', build: value.build, world: w, look: l } : null;
    }
    case 'welcome': { const l = look(value.look); return l ? { type: 'welcome', look: l } : null; }
    case 'refuse': return value.reason === 'version' || value.reason === 'full' ? { type: 'refuse', reason: value.reason } : null;
    case 'ping': return num(value.t0) ? { type: 'ping', t0: value.t0 } : null;
    case 'pong': return num(value.t0) && num(value.hostMs) ? { type: 'pong', t0: value.t0, hostMs: value.hostMs } : null;
    case 'state': { const b = body(value.body); return num(value.seq) && num(value.atMs) && b ? { type: 'state', seq: value.seq, atMs: value.atMs, body: b } : null; }
    case 'event': {
      const e = netEvent(value.event);
      return str(value.id) && num(value.atMs) && e ? { type: 'event', id: value.id, atMs: value.atMs, event: e } : null;
    }
    case 'ack': {
      const ids = value.ids;
      return Array.isArray(ids) && ids.length <= 256 && ids.every((id) => str(id)) ? { type: 'ack', ids: ids as string[] } : null;
    }
    case 'bye': return { type: 'bye' };
    default: return null;
  }
}

/** Check raw data from a transport. Never throws. */
export function parseEnvelope(raw: unknown): Parsed {
  if (!isObject(raw) || !str(raw.from) || !str(raw.to)) return { ok: false, reason: 'malformed' };
  if (raw.v !== PROTOCOL_VERSION) {
    const type = isObject(raw.msg) && typeof raw.msg.type === 'string' ? raw.msg.type.slice(0, 16) : '';
    return { ok: false, reason: 'version', from: raw.from, type };
  }
  const msg = message(raw.msg);
  return msg ? { ok: true, envelope: { v: PROTOCOL_VERSION, from: raw.from, to: raw.to, msg } } : { ok: false, reason: 'malformed' };
}

/** Wrap a message for sending. */
export const envelope = (from: string, to: string, msg: Message): Envelope => ({ v: PROTOCOL_VERSION, from, to, msg });
