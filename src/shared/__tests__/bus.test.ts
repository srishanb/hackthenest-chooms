import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../bus';

describe('event bus', () => {
  it('delivers an event only to listeners of its type, with the emit time', () => {
    const bus = createEventBus(() => 1234);
    const onFall = vi.fn();
    const onFinish = vi.fn();
    bus.on('fall', onFall);
    bus.on('finish', onFinish);

    bus.emit({ type: 'fall', heightPx: 80, big: false });

    expect(onFall).toHaveBeenCalledWith({ type: 'fall', heightPx: 80, big: false }, 1234);
    expect(onFinish).not.toHaveBeenCalled();
  });

  it('onAny receives every event', () => {
    const bus = createEventBus(() => 0);
    const seen: string[] = [];
    bus.onAny((event) => seen.push(event.type));
    bus.emit({ type: 'pause' });
    bus.emit({ type: 'resume' });
    expect(seen).toEqual(['pause', 'resume']);
  });

  it('stops delivering after unsubscribe', () => {
    const bus = createEventBus(() => 0);
    const listener = vi.fn();
    const off = bus.on('finish', listener);
    off();
    bus.emit({ type: 'finish' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('a throwing listener does not stop the others', () => {
    const bus = createEventBus(() => 0);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('finish', () => {
      throw new Error('boom');
    });
    bus.on('finish', second);
    bus.emit({ type: 'finish' });
    expect(second).toHaveBeenCalledOnce();
    errors.mockRestore();
  });

  it('a listener added during an emit does not receive that event', () => {
    const bus = createEventBus(() => 0);
    const late = vi.fn();
    const lateAny = vi.fn();
    bus.on('finish', () => {
      bus.on('finish', late);
      bus.onAny(lateAny);
    });
    bus.emit({ type: 'finish' });
    expect(late).not.toHaveBeenCalled();
    expect(lateAny).not.toHaveBeenCalled();
    bus.emit({ type: 'finish' });
    expect(late).toHaveBeenCalledOnce();
    expect(lateAny).toHaveBeenCalledOnce();
  });

  it('an onAny listener added during an emit does not receive that event', () => {
    const bus = createEventBus(() => 0);
    const late = vi.fn();
    const off = bus.onAny(() => {
      off();
      bus.onAny(late);
    });
    bus.emit({ type: 'pause' });
    expect(late).not.toHaveBeenCalled();
  });
});
