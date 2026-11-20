/**
 * Second QA round, finding 11: two small checks the first round left open. The host repeats its own `hello` until the
 * guest's `welcome` arrives (not only when asked again), and a rider and the candle it stands on never knock each other
 * (the pair check inside `knockBetween`, whichever of the two ways it is told).
 */
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG as G } from '../../config/game.config';
import { NETPLAY_CONFIG as N } from '../../config/netplay.config';
import { createMemoryLink } from '../netplay/memory-transport';
import { envelope, type Message } from '../netplay/protocol';
import { createNetplaySession } from '../netplay/session';
import { knockBetween, headId, type OtherBody } from '../player/versus';

describe('the host repeats its hello until the welcome arrives', () => {
  it('a guest that joins and then says nothing is sent hello again every joinEveryMs, on the host\'s own', () => {
    const clock = { t: 0 };
    const link = createMemoryLink(() => clock.t);
    const host = createNetplaySession({ role: 'host', transport: link.a, config: N, gravityY: G.gravityY, now: () => clock.t, build: 'x',
      look: { candleSeed: 1 }, world: { seed: 1, walls: false }, peerId: 'host-1' });
    const body = { x: 0, y: 0, vx: 0, vy: 0, grounded: true, platformId: null, charging: false, charge01: 0, aim: 0 as const, fuel01: 1, out: false, candleSeed: 1, run: 0 };
    link.b.send(envelope('guest-1', '*', { type: 'join', build: 'x', look: { candleSeed: 2 } }));
    const seen: Message[] = [];
    // Two seconds of host frames; the guest never answers (no welcome) and never asks again.
    for (let i = 0; i < 120; i++) {
      clock.t += 1000 / 60;
      host.update(body);
      for (const raw of link.b.receive()) seen.push((raw as { msg: Message }).msg);
    }
    const hellos = seen.filter((m) => m.type === 'hello').length;
    // The first answers the join; the rest are the host's own repeats, one per joinEveryMs (400 ms): about 5 in 2 s.
    expect(hellos).toBeGreaterThanOrEqual(4);
    expect(hellos).toBeLessThanOrEqual(7);
    expect(host.status()).toBe('waiting');
  });
});

describe('a rider and the candle it stands on never knock each other (knockBetween)', () => {
  const body = G.player;
  const V = G.versus!;
  const dt = 1 / G.stepHz;
  // The two meet fast, head on, one in the air: this knocks, unless they are a pair.
  const me = { x: 300, y: 300, vx: 300, vy: 0, grounded: false, platformId: null as string | null };
  const other: OtherBody = { id: 'guest', x: 300 + body.width, y: 300, vx: -300, vy: 0, width: body.width, height: body.height, grounded: false };

  it('the same meeting knocks when they are not a pair', () => {
    expect(knockBetween(me, other, body, V, dt)).not.toBeNull();
  });

  it('is no knock when the other candle stands on this one (it rides me)', () => {
    expect(knockBetween(me, { ...other, ridesMe: true }, body, V, dt)).toBeNull();
  });

  it('is no knock when this candle stands on the other one\'s head', () => {
    expect(knockBetween({ ...me, platformId: headId('guest') }, other, body, V, dt)).toBeNull();
  });
});
