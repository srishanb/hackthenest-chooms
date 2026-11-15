/**
 * URL parameters that choose how the signal runs, so a demo or a test never needs a code edit.
 *
 *   ?source=sim|replay|live   where samples come from (live arrives in P3)
 *   ?algo=<registry id>       which algorithm version
 *   ?mode=fixed               the active-play fallback: intensity stays neutral
 *   ?replay=<name>.jsonl      a recording under /recordings/ (used with source=replay; dev server only)
 *
 * Anything unrecognised is ignored (null), never an error.
 */
import type { SignalMode } from '../shared/contracts/composure';

export interface SignalUrlParams {
  source: 'sim' | 'replay' | 'live' | null;
  algo: string | null;
  mode: SignalMode | null;
  replay: string | null;
}

const SOURCES = new Set(['sim', 'replay', 'live']);
const ALGO_ID = /^[a-z0-9][a-z0-9.-]{0,40}$/i;
/** A plain file name: no slashes, so a URL can never point outside /recordings/. */
const RECORDING_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jsonl$/;

export function parseSignalUrlParams(search: string): SignalUrlParams {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const algo = params.get('algo');
  const replay = params.get('replay');
  return {
    source: source !== null && SOURCES.has(source) ? (source as SignalUrlParams['source']) : null,
    algo: algo !== null && ALGO_ID.test(algo) ? algo : null,
    mode: params.get('mode') === 'fixed' ? 'fixed' : null,
    replay: replay !== null && RECORDING_NAME.test(replay) ? replay : null,
  };
}
