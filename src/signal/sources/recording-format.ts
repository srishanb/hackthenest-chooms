/**
 * The recording file format: JSON Lines, one object per line, each with a `type`.
 *
 * Why JSONL: a recording can be appended to while the game runs, read line by line, and
 * diffed. P1.1 defines `header` and `frame`; P1.5 (recorder) adds `state` and `event`
 * lines. `parseRecording` skips unknown types, so older tools still read newer files.
 *
 * Privacy: recordings hold band powers, quality and events only. Never raw EEG samples,
 * never a person's name.
 */
import type { InputSourceKind } from '../../shared/contracts/composure';
import type { BandFrame } from '../../shared/contracts/signal-internal';

export interface RecordingHeader {
  type: 'header';
  format: 'lighten-recording';
  version: 1;
  /** ISO date-time the recording was made. */
  createdAt: string;
  source: InputSourceKind;
  /** Registry id of the algorithm that was running, if any. */
  algo: string | null;
}

export interface Recording {
  header: RecordingHeader;
  frames: BandFrame[];
}

export function createHeader(source: InputSourceKind, algo: string | null, createdAt: Date = new Date()): RecordingHeader {
  return { type: 'header', format: 'lighten-recording', version: 1, createdAt: createdAt.toISOString(), source, algo };
}

export function serializeRecording(recording: Recording): string {
  const lines = [JSON.stringify(recording.header), ...recording.frames.map((frame) => JSON.stringify({ type: 'frame', ...frame }))];
  return `${lines.join('\n')}\n`;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isFrame(value: Record<string, unknown>): boolean {
  const bands = value['bands'];
  return typeof value['t'] === 'number' && isObject(bands) && ['delta', 'theta', 'alpha', 'beta', 'gamma'].every((key) => typeof bands[key] === 'number');
}

/** Parse a recording. Throws a readable error for a missing header or a malformed line. */
export function parseRecording(text: string): Recording {
  let header: RecordingHeader | null = null;
  const frames: BandFrame[] = [];

  text.split('\n').forEach((line, index) => {
    if (line.trim() === '') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      throw new Error(`recording line ${index + 1} is not valid JSON`);
    }
    if (!isObject(parsed)) throw new Error(`recording line ${index + 1} is not an object`);

    if (parsed['type'] === 'header') {
      if (parsed['format'] !== 'lighten-recording' || parsed['version'] !== 1) throw new Error('unsupported recording format or version');
      header = parsed as unknown as RecordingHeader;
    } else if (parsed['type'] === 'frame') {
      if (!isFrame(parsed)) throw new Error(`recording line ${index + 1} is not a valid frame`);
      const { type: _type, ...frame } = parsed;
      frames.push(frame as unknown as BandFrame);
    }
    // Other types (state, event, ...) belong to later tools; skip them.
  });

  if (!header) throw new Error('recording has no header line');
  return { header, frames };
}
