/**
 * Headless evaluation CLI: replays a JSONL recording through a chosen algorithm and prints metrics.
 *
 * Usage:
 *   npm run eval -- <algo> <recording.jsonl> [--speed N]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SIGNAL_CONFIG } from '../../src/config/signal.config';
import type { ComposureState } from '../../src/shared/contracts/composure';
import { resolveAlgorithm } from '../../src/signal/algorithms/registry';
import { createPipeline } from '../../src/signal/pipeline';
import { parseRecording } from '../../src/signal/sources/recording-format';
import { createReplaySource } from '../../src/signal/sources/replay-source';
import { computeEvalMetrics, extractCalibrationOutcomes, formatEvalTable, type EvalMetrics } from './metrics';

export interface EvalCliArgs {
  algoId: string;
  recordingPath: string;
  speed: number;
}

export function parseEvalArgs(argv: readonly string[]): EvalCliArgs | null {
  const positional: string[] = [];
  let speed = Number.POSITIVE_INFINITY;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === '--speed') {
      const raw = argv[i + 1];
      if (!raw) return null;
      const parsed = Number(raw);
      if (!(parsed > 0)) return null;
      speed = parsed;
      i += 1;
    } else if (arg.startsWith('--speed=')) {
      const parsed = Number(arg.slice('--speed='.length));
      if (!(parsed > 0)) return null;
      speed = parsed;
    } else if (arg.startsWith('-')) {
      return null;
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) return null;
  return { algoId: positional[0]!, recordingPath: positional[1]!, speed };
}

export async function evaluateRecordingText(algoId: string, jsonlText: string, speed = Number.POSITIVE_INFINITY): Promise<EvalMetrics> {
  const recording = parseRecording(jsonlText);
  const calibrationOutcomes = extractCalibrationOutcomes(jsonlText);
  const entry = resolveAlgorithm(algoId, SIGNAL_CONFIG.defaultAlgo);
  const pipeline = createPipeline({
    config: SIGNAL_CONFIG,
    entry,
    initialMode: 'adaptive',
    initialSource: 'REPLAY',
  });

  const states: ComposureState[] = [];
  await new Promise<void>((resolveDone, rejectDone) => {
    const source = createReplaySource({
      frames: recording.frames,
      speed,
      onEnd: () => resolveDone(),
    });
    void source.start((frame) => {
      states.push(pipeline.process(frame, frame.t));
    }).catch(rejectDone);
  });

  return computeEvalMetrics(entry.algorithm.id, states, calibrationOutcomes);
}

async function main(): Promise<void> {
  const parsed = parseEvalArgs(process.argv.slice(2));
  if (!parsed) {
    console.error('Usage: npm run eval -- <algo> <recording.jsonl> [--speed N]');
    process.exitCode = 1;
    return;
  }

  const text = readFileSync(resolve(process.cwd(), parsed.recordingPath), 'utf8');
  const metrics = await evaluateRecordingText(parsed.algoId, text, parsed.speed);
  console.log(formatEvalTable(metrics));
}

const isMain = Boolean(process.argv[1]) && resolve(process.argv[1]!) === fileURLToPath(import.meta.url);
if (isMain) {
  void main();
}
