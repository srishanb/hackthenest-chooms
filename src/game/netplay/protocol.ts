/**
 * The messages two games exchange in the two-player climb, and the check every received message goes through.
 *
 * Why a check: a message comes from another window or (in phase B) another machine, so it can be anything. Each
 * one is parsed into a typed message or dropped; nothing else in netplay/ ever reads raw data. Every message is
 * plain data (numbers, strings, booleans, arrays, plain objects) so it survives `structuredClone` and JSON alike.
 * Every envelope carries the protocol version: a game that does not speak this version is refused politely.
 *
 * Bounds: every number that arrives is read through one table (`messageLimits`), keyed by where it sits in the
 * message (`state.body.x`, `event.knock.dvx`, ...). A number that is not finite drops the message; a finite one is
 * clamped to the same limits the local rules use (a knock to `versus.knock.maxImpulse`, a position to the world, a
 * speed to the fastest a candle can go). A list longer than its limit drops the message. The protocol test walks a
 * sample of every message and fails if a number has no row in the table, so a new field cannot skip the check.
 */
import { GAME_CONFIG } from '../../config/game.config';
import type { GameConfig } from '../../shared/contracts/config';

/**
 * Bump when a message changes shape or meaning. Two games with different versions do not play together.
 * 2: bounded fields, the `sync` event, handshake resends, a knock stamped with its contact time.
 */
export const PROTOCOL_VERSION = 2;

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

/** What outlives one message: the drops this player took in its run, and the crumbling ledges it has running. */
export interface WorldSync {
  run: number;
  /** Drops this player took in this run, with the shared time it took each. */
  wax: { id: string; atMs: number }[];
  /** Crumbling ledges this player's game has running, with the shared time each started. */
  crumble: { id: string; startedMs: number }[];
}

/**
 * Things that happen once, sent reliably (resent until acknowledged) and applied once. A knock's event time is
 * the shared time of the contact. `sync` goes out after every (re)connection.
 */
export type NetEvent =
  | { kind: 'shove'; dir: -1 | 1 }
  | { kind: 'knock'; dvx: number; dvy: number }
  | { kind: 'crumble'; ledgeId: string }
  | { kind: 'wax'; dropId: string; run: number }
  | { kind: 'run_reset'; run: number }
  | ({ kind: 'sync' } & WorldSync);

/** Why two games do not play together: another version, a full room, or a handshake that never finished. */
export type RefuseReason = 'version' | 'full' | 'timeout';

export type Message =
  | { type: 'join'; build: string; look: CandleLook }
  | { type: 'hello'; build: string; world: WorldOptions; look: CandleLook }
  | { type: 'welcome'; look: CandleLook }
  | { type: 'refuse'; reason: 'version' | 'full' }
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

/** Every bounded field: numbers by their place in a message, list lengths with a `#`. */
export const LIMITED_FIELDS = [
  'join.look.candleSeed', 'hello.look.candleSeed', 'hello.world.seed', 'welcome.look.candleSeed',
  'ping.t0', 'pong.t0', 'pong.hostMs',
  'state.seq', 'state.atMs', 'state.body.x', 'state.body.y', 'state.body.vx', 'state.body.vy', 'state.body.charge01',
  'state.body.fuel01', 'state.body.candleSeed', 'state.body.rideOffsetX', 'state.body.run', 'state.body.aim',
  'event.atMs', 'event.shove.dir', 'event.knock.dvx', 'event.knock.dvy', 'event.wax.run', 'event.run_reset.run',
  'event.sync.run', 'event.sync.wax.atMs', 'event.sync.crumble.startedMs',
  'ack.ids#', 'event.sync.wax#', 'event.sync.crumble#',
] as const;
export type LimitedField = (typeof LIMITED_FIELDS)[number];

/** A field's bounds: a number is clamped into [min, max] (and made whole when `int`); a list longer than `max` is dropped. */
export interface Limit { min: number; max: number; int?: boolean }
export type MessageLimits = Record<LimitedField, Limit>;

/** Largest shared or local time accepted (ms): about 30 years of `performance.now`. */
const MAX_TIME_MS = 1e12;
const UINT32: Limit = { min: 0, max: 4294967295, int: true };

/** The bounds for a game with this config: the same numbers its own rules use. */
export function messageLimits(game: GameConfig): MessageLimits {
  const half = game.player.width / 2;
  const impulse = game.versus?.knock.maxImpulse ?? 0;
  const fastest = Math.max(game.walkSpeed, game.jump.maxSpeed, game.falling?.speedX ?? 0, game.ledgeKinds?.bounce.maxLaunchSpeed ?? 0);
  const time: Limit = { min: 0, max: MAX_TIME_MS };
  const run: Limit = { min: 0, max: 1e9, int: true };
  return {
    'join.look.candleSeed': UINT32, 'hello.look.candleSeed': UINT32, 'hello.world.seed': UINT32, 'welcome.look.candleSeed': UINT32,
    'ping.t0': time, 'pong.t0': time, 'pong.hostMs': time,
    'state.seq': { min: 0, max: 2 ** 31, int: true },
    'state.atMs': time,
    // Inside the world's side edges, as clampToWalls keeps a candle; from far above the sky down to well below the ground.
    'state.body.x': { min: half, max: game.view.width - half },
    'state.body.y': { min: -1e9, max: 1e6 },
    // The fastest a candle moves on its own, plus one knock. Falls are unbounded in height, so a fall's speed is
    // allowed up to what a 100,000 px fall reaches.
    'state.body.vx': { min: -(fastest + impulse), max: fastest + impulse },
    'state.body.vy': { min: -(fastest + impulse), max: Math.sqrt(2 * game.gravityY * 100_000) },
    'state.body.charge01': { min: 0, max: 1 }, 'state.body.fuel01': { min: 0, max: 1 },
    'state.body.candleSeed': UINT32,
    'state.body.rideOffsetX': { min: -game.player.width, max: game.player.width },
    'state.body.run': run,
    // Directions: whole numbers from -1 to 1 (a shove has no 0).
    'state.body.aim': { min: -1, max: 1, int: true }, 'event.shove.dir': { min: -1, max: 1, int: true },
    'event.atMs': time,
    'event.knock.dvx': { min: -impulse, max: impulse }, 'event.knock.dvy': { min: -impulse, max: impulse },
    'event.wax.run': run, 'event.run_reset.run': run, 'event.sync.run': run,
    'event.sync.wax.atMs': time, 'event.sync.crumble.startedMs': time,
    'ack.ids#': { min: 0, max: 256 }, 'event.sync.wax#': { min: 0, max: 1024 }, 'event.sync.crumble#': { min: 0, max: 256 },
  };
}

const DEFAULT_LIMITS = messageLimits(GAME_CONFIG);

const MAX_ID = 64;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown, max = MAX_ID): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;
const bool = (value: unknown): value is boolean => typeof value === 'boolean';

/** Read every number through its row of the table; null drops the message. */
function reader(limits: MessageLimits) {
  return {
    num(value: unknown, field: LimitedField): number | null {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const limit = limits[field];
      const clamped = Math.max(limit.min, Math.min(limit.max, value));
      return limit.int ? Math.floor(clamped) : clamped;
    },
    list(value: unknown, field: LimitedField): unknown[] | null {
      return Array.isArray(value) && value.length <= limits[field].max ? value : null;
    },
  };
}
type Reader = ReturnType<typeof reader>;

const look = (r: Reader, value: unknown, field: LimitedField): CandleLook | null => {
  const seed = isObject(value) ? r.num(value.candleSeed, field) : null;
  return seed === null ? null : { candleSeed: seed };
};

function world(r: Reader, value: unknown): WorldOptions | null {
  if (!isObject(value) || !bool(value.walls)) return null;
  const seed = r.num(value.seed, 'hello.world.seed');
  return seed === null ? null : { seed, walls: value.walls };
}

function body(r: Reader, value: unknown): BodyState | null {
  if (!isObject(value)) return null;
  const { grounded, platformId, charging, out } = value;
  if (!bool(grounded) || !bool(charging) || !bool(out) || !(platformId === null || str(platformId))) return null;
  const aim = r.num(value.aim, 'state.body.aim');
  if (aim === null) return null;
  const x = r.num(value.x, 'state.body.x'), y = r.num(value.y, 'state.body.y');
  const vx = r.num(value.vx, 'state.body.vx'), vy = r.num(value.vy, 'state.body.vy');
  const charge01 = r.num(value.charge01, 'state.body.charge01'), fuel01 = r.num(value.fuel01, 'state.body.fuel01');
  const candleSeed = r.num(value.candleSeed, 'state.body.candleSeed'), run = r.num(value.run, 'state.body.run');
  if (x === null || y === null || vx === null || vy === null || charge01 === null || fuel01 === null || candleSeed === null || run === null) return null;
  let rideOffsetX: number | undefined;
  if (value.rideOffsetX !== undefined) {
    const offset = r.num(value.rideOffsetX, 'state.body.rideOffsetX');
    if (offset === null) return null;
    rideOffsetX = offset;
  }
  return { x, y, vx, vy, grounded, platformId, charging, charge01, aim: aim as -1 | 0 | 1, fuel01, out, candleSeed, run, ...(rideOffsetX !== undefined ? { rideOffsetX } : {}) };
}

function sync(r: Reader, value: Record<string, unknown>): NetEvent | null {
  const run = r.num(value.run, 'event.sync.run');
  const waxList = r.list(value.wax, 'event.sync.wax#'), crumbleList = r.list(value.crumble, 'event.sync.crumble#');
  if (run === null || !waxList || !crumbleList) return null;
  const wax: WorldSync['wax'] = [];
  for (const item of waxList) {
    if (!isObject(item) || !str(item.id)) return null;
    const atMs = r.num(item.atMs, 'event.sync.wax.atMs');
    if (atMs === null) return null;
    wax.push({ id: item.id, atMs });
  }
  const crumble: WorldSync['crumble'] = [];
  for (const item of crumbleList) {
    if (!isObject(item) || !str(item.id)) return null;
    const startedMs = r.num(item.startedMs, 'event.sync.crumble.startedMs');
    if (startedMs === null) return null;
    crumble.push({ id: item.id, startedMs });
  }
  return { kind: 'sync', run, wax, crumble };
}

function netEvent(r: Reader, value: unknown): NetEvent | null {
  if (!isObject(value)) return null;
  switch (value.kind) {
    case 'shove': { const d = r.num(value.dir, 'event.shove.dir'); return d === 1 || d === -1 ? { kind: 'shove', dir: d } : null; }
    case 'knock': {
      const dvx = r.num(value.dvx, 'event.knock.dvx'), dvy = r.num(value.dvy, 'event.knock.dvy');
      return dvx === null || dvy === null ? null : { kind: 'knock', dvx, dvy };
    }
    case 'crumble': return str(value.ledgeId) ? { kind: 'crumble', ledgeId: value.ledgeId } : null;
    case 'wax': { const run = r.num(value.run, 'event.wax.run'); return str(value.dropId) && run !== null ? { kind: 'wax', dropId: value.dropId, run } : null; }
    case 'run_reset': { const run = r.num(value.run, 'event.run_reset.run'); return run === null ? null : { kind: 'run_reset', run }; }
    case 'sync': return sync(r, value);
    default: return null;
  }
}

function message(r: Reader, value: unknown): Message | null {
  if (!isObject(value)) return null;
  switch (value.type) {
    case 'join': { const l = look(r, value.look, 'join.look.candleSeed'); return str(value.build) && l ? { type: 'join', build: value.build, look: l } : null; }
    case 'hello': {
      const l = look(r, value.look, 'hello.look.candleSeed'), w = world(r, value.world);
      return str(value.build) && l && w ? { type: 'hello', build: value.build, world: w, look: l } : null;
    }
    case 'welcome': { const l = look(r, value.look, 'welcome.look.candleSeed'); return l ? { type: 'welcome', look: l } : null; }
    case 'refuse': return value.reason === 'version' || value.reason === 'full' ? { type: 'refuse', reason: value.reason } : null;
    case 'ping': { const t0 = r.num(value.t0, 'ping.t0'); return t0 === null ? null : { type: 'ping', t0 }; }
    case 'pong': {
      const t0 = r.num(value.t0, 'pong.t0'), hostMs = r.num(value.hostMs, 'pong.hostMs');
      return t0 === null || hostMs === null ? null : { type: 'pong', t0, hostMs };
    }
    case 'state': {
      const seq = r.num(value.seq, 'state.seq'), atMs = r.num(value.atMs, 'state.atMs'), b = body(r, value.body);
      return seq === null || atMs === null || !b ? null : { type: 'state', seq, atMs, body: b };
    }
    case 'event': {
      const atMs = r.num(value.atMs, 'event.atMs'), e = netEvent(r, value.event);
      return str(value.id) && atMs !== null && e ? { type: 'event', id: value.id, atMs, event: e } : null;
    }
    case 'ack': {
      const ids = r.list(value.ids, 'ack.ids#');
      return ids && ids.every((id) => str(id)) ? { type: 'ack', ids: ids as string[] } : null;
    }
    case 'bye': return { type: 'bye' };
    default: return null;
  }
}

/** Check raw data from a transport against `limits` (the local game's own). Never throws. */
export function parseEnvelope(raw: unknown, limits: MessageLimits = DEFAULT_LIMITS): Parsed {
  if (!isObject(raw) || !str(raw.from) || !str(raw.to)) return { ok: false, reason: 'malformed' };
  if (raw.v !== PROTOCOL_VERSION) {
    const type = isObject(raw.msg) && typeof raw.msg.type === 'string' ? raw.msg.type.slice(0, 16) : '';
    return { ok: false, reason: 'version', from: raw.from, type };
  }
  const msg = message(reader(limits), raw.msg);
  return msg ? { ok: true, envelope: { v: PROTOCOL_VERSION, from: raw.from, to: raw.to, msg } } : { ok: false, reason: 'malformed' };
}

/** Wrap a message for sending. */
export const envelope = (from: string, to: string, msg: Message): Envelope => ({ v: PROTOCOL_VERSION, from, to, msg });

/** Acknowledgements split into messages no longer than the receiver's list limit. */
export function ackChunks(ids: readonly string[], size = DEFAULT_LIMITS['ack.ids#'].max): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}
