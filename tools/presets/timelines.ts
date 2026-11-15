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
    description: 'A steady, relaxed signal for a full minute: alpha stays up and 13-30 Hz power stays low.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 101,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 20 * SECOND, type: 'blink', value: 220 },
        { atMs: 41 * SECOND, type: 'blink', value: 220 },
      ],
    },
  },
  {
    id: 'rising-tension',
    label: 'Rising tension',
    description: 'Starts relaxed, then muscle tension builds in longer bursts until it holds. Muscle activity is part of this signal.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 202,
      events: [
        ...bursts(14 * SECOND, 20 * SECOND, 3 * SECOND, 900),
        ...bursts(20 * SECOND, 30 * SECOND, 3 * SECOND, 1800),
        { atMs: 30 * SECOND, type: 'clench', value: 30 * SECOND },
      ],
    },
  },
  {
    id: 'jaw-clench-bursts',
    label: 'Jaw clench bursts',
    description: 'A relaxed signal broken by four-second jaw clenches with rests between. Muscle activity is a large part of this signal.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 303,
      events: bursts(3 * SECOND, 60 * SECOND, 10 * SECOND, 4000),
    },
  },
  {
    id: 'mixed-climb',
    label: 'Mixed climb',
    description: 'Calm, then a tense stretch, then recovery: the whole range in one run.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 404,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 16 * SECOND, type: 'alpha', value: false },
        { atMs: 17 * SECOND, type: 'clench', value: 26 * SECOND },
        { atMs: 43 * SECOND, type: 'alpha', value: true },
      ],
    },
  },
  {
    id: 'noisy-pin',
    label: 'Noisy pin',
    description: 'A relaxed signal while one pin picks up interference for a stretch, then the pin is reseated.',
    timeline: {
      durationMs: 60 * SECOND,
      seed: 505,
      events: [
        { atMs: 0, type: 'alpha', value: true },
        { atMs: 15 * SECOND, type: 'noisy_pin', value: 3 },
        { atMs: 40 * SECOND, type: 'noisy_pin', value: -1 },
      ],
    },
  },
];
