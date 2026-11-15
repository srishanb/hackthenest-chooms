/**
 * The built-in preset timelines: what happens on the simulated Octopus 16 and when.
 *
 * Why scripted events and not hand-drawn curves: every frame still comes out of the SDK
 * simulator's filters and FFT, so a preset carries the same quirks real data would (muscle
 * bursts leak into every band, the alpha boost moves alpha). Edit a timeline, run
 * `npm run presets`, commit the regenerated files.
 *
 * Data: every frame is output of PiEEG's own simulator (the guide's "PiEEG's simulated signals"). Nothing is
 * hand-drawn or invented here, including contact quality, which is whatever the SDK reports.
 *
 * Wording: "calm" and "tension" only. Muscle activity is a large part of the tension signal.
 */
import type { SimTimeline } from './simulate';

export interface PresetDefinition {
  id: string;
  label: string;
  description: string;
  timeline: SimTimeline;
}

const SECOND = 1000;
/** Clench bursts of `durationMs` every `everyMs` between `fromMs` and `toMs`. */
function bursts(fromMs: number, toMs: number, everyMs: number, durationMs: number) {
  const events = [];
  for (let at = fromMs; at < toMs; at += everyMs) events.push({ atMs: at, type: 'clench' as const, value: durationMs });
  return events;
}

export const PRESET_DEFINITIONS: readonly PresetDefinition[] = [
  {
    id: 'calm-climb',
    label: 'Calm climb',
    description: 'Steady, relaxed signal for the whole climb. The light stays wide and the ember settles.',
    timeline: {
      durationMs: 45 * SECOND,
      seed: 101,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 14 * SECOND, type: 'blink', value: 220 },
        { atMs: 31 * SECOND, type: 'blink', value: 220 },
      ],
    },
  },
  {
    id: 'rising-tension',
    label: 'Rising tension',
    description: 'Starts relaxed, then muscle tension builds in longer and longer bursts until it holds.',
    timeline: {
      durationMs: 45 * SECOND,
      seed: 202,
      events: [
        ...bursts(12 * SECOND, 18 * SECOND, 3 * SECOND, 900),
        ...bursts(18 * SECOND, 26 * SECOND, 3 * SECOND, 1800),
        { atMs: 26 * SECOND, type: 'clench', value: 19 * SECOND },
      ],
    },
  },
  {
    id: 'jaw-clench-bursts',
    label: 'Jaw clench bursts',
    description: 'Relaxed signal broken by short, sharp jaw clenches every few seconds.',
    timeline: {
      durationMs: 45 * SECOND,
      seed: 303,
      events: bursts(6 * SECOND, 42 * SECOND, 6 * SECOND, 1500),
    },
  },
  {
    id: 'mixed-climb',
    label: 'Mixed climb',
    description: 'Calm, then a tense stretch, then recovery: the full arc the game is built around.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 404,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 16 * SECOND, type: 'alpha', value: false },
        { atMs: 17 * SECOND, type: 'clench', value: 15 * SECOND },
        { atMs: 38 * SECOND, type: 'alpha', value: true },
      ],
    },
  },
  {
    id: 'noisy-pin',
    label: 'Noisy pin',
    description: 'Relaxed signal, then one pin picks up interference for a while. Shows how the reading holds up against a poorly seated pin.',
    timeline: {
      durationMs: 45 * SECOND,
      seed: 505,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 10 * SECOND, type: 'noisy_pin', value: 3 },
        { atMs: 34 * SECOND, type: 'noisy_pin', value: -1 },
      ],
    },
  },
];
