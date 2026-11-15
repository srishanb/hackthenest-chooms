/**
 * Captions: timing rules plus the mounted component, driven by published narrator_line events.
 * Vitest runs in Node, so a tiny fake DOM stands in for the few element methods the component uses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEventBus } from '../../shared/bus';
import { createStore } from '../../shared/store';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/contracts/settings';
import { INITIAL_GAME_SNAPSHOT } from '../../shared/contracts/game-state';
import { captions } from '../components/captions/captions';
import { CAPTION_MAX_MS, CAPTION_MIN_MS, captionCues, captionDurationMs, captionText } from '../components/captions/captions-state';
import { STRINGS, t } from '../strings';
import type { UiDeps } from '../types';

class FakeElement {
  className = '';
  hidden = false;
  textContent = '';
  removed = false;
  readonly attributes = new Map<string, string>();
  readonly vars = new Map<string, string>();
  readonly style = { setProperty: (name: string, value: string): void => { this.vars.set(name, value); } };
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  append(...children: FakeElement[]): void { this.children.push(...children); }
  remove(): void { this.removed = true; }
  readonly children: FakeElement[] = [];
}

function setup(search = ''): { box: FakeElement; bus: ReturnType<typeof createEventBus>; settings: ReturnType<typeof createStore<Settings>>; unmount: () => void } {
  const fakeWindow = { location: { search } };
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('document', { createElement: () => new FakeElement() });
  const root = new FakeElement();
  const bus = createEventBus();
  const settings = createStore<Settings>(structuredClone(DEFAULT_SETTINGS));
  const deps = { bus, stores: { settings, snapshot: createStore(structuredClone(INITIAL_GAME_SNAPSHOT)) } } as unknown as UiDeps;
  const unmount = captions.mount(root as unknown as HTMLElement, deps);
  return { box: root.children[0]!, bus, settings, unmount };
}

const line = (text: string, durationMs: number) => ({ type: 'narrator_line' as const, lineId: 'l', text, durationMs });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('caption timing helpers', () => {
  it('uses a valid duration, clamped to a readable range', () => {
    expect(captionDurationMs(3000, 'hi')).toBe(3000);
    expect(captionDurationMs(10, 'hi')).toBe(CAPTION_MIN_MS);
    expect(captionDurationMs(10 ** 9, 'hi')).toBe(CAPTION_MAX_MS);
  });
  it('falls back to a length-based duration for bad values', () => {
    for (const bad of [0, -5, NaN, Infinity]) {
      const ms = captionDurationMs(bad, 'x'.repeat(50));
      expect(ms).toBeGreaterThanOrEqual(CAPTION_MIN_MS);
      expect(ms).toBeLessThanOrEqual(CAPTION_MAX_MS);
    }
    expect(captionDurationMs(NaN, 'x'.repeat(50))).toBe(3000);
  });
  it('treats empty or non-string text as nothing to show', () => {
    expect(captionText('  ')).toBeNull();
    expect(captionText(undefined)).toBeNull();
    expect(captionText('  Hello ')).toBe('Hello');
  });
});

describe('captions component', () => {
  it('starts hidden, then shows the line text for its duration and hides it again', () => {
    const { box, bus } = setup();
    expect(box.hidden).toBe(true);
    bus.emit(line('The climb is long.', 2000));
    expect(box.hidden).toBe(false);
    expect(box.textContent).toBe('The climb is long.');
    vi.advanceTimersByTime(1999);
    expect(box.hidden).toBe(false);
    vi.advanceTimersByTime(2);
    expect(box.hidden).toBe(true);
    expect(box.textContent).toBe('');
  });

  it('replaces an active caption and restarts the timer', () => {
    const { box, bus } = setup();
    bus.emit(line('First.', 2000));
    vi.advanceTimersByTime(1500);
    bus.emit(line('Second.', 2000));
    expect(box.textContent).toBe('Second.');
    vi.advanceTimersByTime(1000);
    expect(box.hidden).toBe(false); // the first line's timer would have fired by now
    vi.advanceTimersByTime(1100);
    expect(box.hidden).toBe(true);
  });

  it('stays hidden while captions are disabled and honours the setting live', () => {
    const { box, bus, settings } = setup();
    settings.set({ ...settings.get(), captions: { enabled: false, scale: 1 } });
    bus.emit(line('Quiet.', 3000));
    expect(box.hidden).toBe(true);
    settings.set({ ...settings.get(), captions: { enabled: true, scale: 1 } });
    expect(box.hidden).toBe(false);
    expect(box.textContent).toBe('Quiet.');
    settings.set({ ...settings.get(), captions: { enabled: false, scale: 1 } });
    expect(box.hidden).toBe(true);
  });

  it('applies the caption scale without a reload', () => {
    const { box, settings } = setup();
    expect(box.vars.get('--caption-scale')).toBe('1');
    settings.set({ ...settings.get(), captions: { enabled: true, scale: 1.5 } });
    expect(box.vars.get('--caption-scale')).toBe('1.5');
  });

  it('ignores a line with no usable text and clears the one showing', () => {
    const { box, bus } = setup();
    bus.emit(line('Hello.', 3000));
    bus.emit(line('   ', 3000));
    expect(box.hidden).toBe(true);
  });

  it('clears on finish and on restart', () => {
    const { box, bus } = setup();
    bus.emit(line('Almost there.', 5000));
    bus.emit({ type: 'finish' });
    expect(box.hidden).toBe(true);
    bus.emit(line('Again.', 5000));
    bus.emit({ type: 'run_restart' });
    expect(box.hidden).toBe(true);
  });

  it('is announced politely to screen readers', () => {
    const { box } = setup();
    expect(box.attributes.get('role')).toBe('status');
    expect(box.attributes.get('aria-live')).toBe('polite');
  });

  it('stops listening and removes itself on unmount, with no timer left running', () => {
    const { box, bus, unmount } = setup();
    bus.emit(line('Bye.', 5000));
    unmount();
    expect(box.removed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    bus.emit(line('After unmount.', 5000));
    expect(box.textContent).not.toBe('After unmount.');
  });

  it('dev trigger: window.lightenCaption publishes a narrator_line and is removed on unmount', () => {
    const { box, unmount } = setup();
    const scope = window as unknown as { lightenCaption?: (text?: string) => void };
    expect(typeof scope.lightenCaption).toBe('function');
    scope.lightenCaption?.('Sample line.');
    expect(box.textContent).toBe('Sample line.');
    unmount();
    expect(scope.lightenCaption).toBeUndefined();
  });

  it('?captionDemo plays a sample line immediately', () => {
    const { box } = setup('?captionDemo');
    expect(box.textContent).toBe(t('captions.demo.1'));
  });
});

describe('caption wording', () => {
  it('sample lines describe the climb, never the player, and use no mood or medical words', () => {
    const banned = /emotion|stress|anxi|calm down|you (are|were|should|failed)|you're|good job|well done|health|therap|diagnos|\d|%/i;
    for (const key of Object.keys(STRINGS).filter((k) => k.startsWith('captions.'))) {
      expect(STRINGS[key as keyof typeof STRINGS], key).not.toMatch(banned);
    }
  });
});

describe('long narration and resume',()=>{
  const text='Welcome to the climb. Carry your candle carefully and keep an eye out for wax. Take your time and find your next ledge.';
  it('keeps every word in readable chunks and honours durations beyond twelve seconds',()=>{
    const cues=captionCues(text,24000);
    expect(cues.length).toBeGreaterThan(1);expect(cues.map(cue=>cue.text).join(' ')).toBe(text);
    expect(cues[0]!.atMs).toBe(0);expect(cues.at(-1)!.atMs).toBeLessThan(24000);
    const {box,bus}=setup();bus.emit(line(text,24000));
    vi.advanceTimersByTime(13000);expect(box.hidden).toBe(false);
    vi.advanceTimersByTime(11001);expect(box.hidden).toBe(true);
  });
  it('resumes with the current chunk instead of repeating the first caption',()=>{
    const cues=captionCues(text,24000);const offset=cues[1]!.atMs+10;
    const resumed=captionCues(text,24000-offset,offset);
    expect(resumed[0]!.text).toBe(cues[1]!.text);expect(resumed[0]!.atMs).toBe(0);
    const {box,bus}=setup();bus.emit({...line(text,24000-offset),offsetMs:offset});
    expect(box.textContent).toBe(cues[1]!.text);
    bus.emit(line('',0));expect(box.hidden).toBe(true);expect(vi.getTimerCount()).toBe(0);
  });
});
