/**
 * Every piece of player-facing text, in one place.
 *
 * Why: wording must follow the framing rules in AGENTS.md (composure, never "emotion" or
 * "stress"; no medical claims), and one file makes that reviewable. Components and game
 * state refer to text by key, never by literal string.
 */
export const STRINGS = {
  'source.LIVE_EEG': 'LIVE EEG',
  'source.SIMULATED': 'SIMULATED INPUT',
  'source.REPLAY': 'RECORDED REPLAY',
  'debug.title': 'Signal debug',
  'debug.hint': 'Press ` to hide · Shift+R to download',
  'debug.calibrateActive': 'Calibrate active',
  'debug.calibrateResting': 'Calibrate resting',
  'debug.calibrating': 'Calibrating...',
  'debug.calibrationOk': 'ok',
  'debug.calibrationUnknown': 'unknown',
  'debug.downloadRecording': 'Download recording',
  'debug.recordingDownloaded': 'Downloaded recording',
  'debug.connectBoard': 'Connect Octopus 16',
  'debug.disconnectBoard': 'Disconnect',
  'debug.boardConnecting': 'Choose the board in the Bluetooth list...',
  'debug.boardConnected': 'Board connected',
  'debug.boardDisconnected': 'Board disconnected',
  'debug.boardNotConnected': 'board not connected',
  'debug.checkpointRun': 'Run checkpoint',
  'debug.checkpointOpen': 'Eyes open, look at one spot',
  'debug.checkpointClosed': 'Eyes closed, stay still',
  'debug.checkpointSimHint': 'simulator: press 1 to switch the alpha boost on for closed and off for open',
  'debug.checkpointSegment': 'Segment',
  'debug.checkpointDone': 'Checkpoint done and file downloaded',
  'debug.checkpointRatio': 'closed/open',
  'debug.checkpointClear': 'clear separation',
  'debug.checkpointWeak': 'weak separation: check contact and try again',
  'debug.checkpointNoData': 'no usable data: check the connection',
  'debug.contactLow': 'check electrodes: contact is low',
  'debug.lossHigh': 'many packets lost: move closer or check power',
  'debug.simLegendTitle': 'Simulator keys',
  'debug.simKey.alpha': 'alpha boost (toggle)',
  'debug.simKey.clench': 'jaw clench',
  'debug.simKey.blink': 'eye blink',
  'debug.simKey.noisyPin': 'noisy pin (toggle)',
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey): string {
  return STRINGS[key];
}
