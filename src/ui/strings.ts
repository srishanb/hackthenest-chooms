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
  "calib.title": "Light your lantern",
  "calib.intro": "Calibrate composure in two short steps. Muscle activity is part of this signal.",
  "calib.source": "Choose an input and wait for fresh samples.",
  "calib.start": "Start",
  "calib.next": "Continue",
  "calib.retry": "Retry",
  "calib.close": "Close",
  "calib.steadyLight": "Use steady light",
  "calib.continueWithout": "Continue without it",
  "calib.active.low": "Relax your jaw and keep still for the first half.",
  "calib.active.high": "Gently clench your jaw now for the second half.",
  "calib.resting.low": "Keep your eyes open for the first half.",
  "calib.resting.high": "Close your eyes now if comfortable. Eye closure is not proof of calmness.",
  "calib.openEyes": "Open your eyes. This step is complete.",
  "calib.active.ok": "Active calibration is ready.",
  "calib.resting.ok": "Resting calibration is ready.",
  "calib.done": "Your lantern is ready.",
  "calib.withoutResting": "Lighting stays steady. The ember uses the labelled ordinary-input rescue.",
  "calib.failureNote": "A failed step says nothing about you. Retry or choose the fallback.",
  "calib.fail.tooFewSamples.active": "Too few usable samples for active calibration. Check the connection and retry.",
  "calib.fail.tooFewSamples.resting": "Too few usable samples for resting calibration. Check the connection and retry.",
  "calib.fail.unstable.active": "The active samples varied too much. Try a comfortable, consistent jaw movement.",
  "calib.fail.unstable.resting": "The resting samples varied too much. Retry when comfortable.",
  "calib.fail.noSeparation.active": "The two active windows were too similar. Retry or use steady light.",
  "calib.fail.noSeparation.resting": "The two resting windows were too similar. Retry or use the labelled rescue.",
  "calib.fail.unknown": "This step could not finish. Retry or choose the fallback.",
  "calib.connect": "Connect Octopus 16",
  "calib.connectFailed": "Use Chrome or Edge, close the cloud.pieeg.com tab, and check board power before reconnecting.",
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey): string {
  return STRINGS[key];
}
