/**
 * The two-player climb's connection tuning (Decision D-38, behind `?mp=`). Owner: game lane.
 *
 * Why one file: how often a game sends its candle, how far in the past the other candle is shown and how long
 * a silent player is waited for are trade-offs to tune by feel, with no code edit. None of these numbers changes
 * how a candle moves: the rules of two candles meeting are in `game.config.ts` `versus`.
 */
export interface NetplayConfig {
  /** How many times a second a game sends its own candle's state (Hz). */
  sendHz: number;
  /**
   * The other candle is shown this far in the past (ms) at least, plus the measured travel time of its updates and
   * their spread, so there are almost always two updates to blend between.
   */
  playbackDelayMs: number;
  /** The longest playback delay (ms), however slow the connection: past it the candle is guessed ahead instead. */
  maxPlaybackDelayMs: number;
  /** When updates are late, the candle is guessed ahead from its last speed for at most this long (ms), then waits. */
  maxExtrapolateMs: number;
  /** A new update that moves the shown candle is blended in over about this time (ms), not jumped to. */
  correctionTauMs: number;
  /** A correction larger than this (px) is a jump: the shown candle moves there at once (a restart, a teleport). */
  snapPx: number;
  /** How often the guest measures the round trip to the host to agree on a clock (ms), after a quick first few. */
  pingEveryMs: number;
  /** An important event (knock, wax, crumbling ledge) is sent again this often (ms) until the other game confirms it. */
  resendMs: number;
  /** ...and given up after this long (ms). */
  giveUpMs: number;
  /** A guest asks to join this often (ms) until the host answers. */
  joinEveryMs: number;
  /**
   * Nothing heard from the other player for this long (ms): they have left, and their candle fades out. If they are
   * heard again (a tab brought back), the session picks up and their candle fades back in.
   */
  silentAfterMs: number;
  /** A new guest takes the place of one not heard for this long (ms): a reload whose goodbye was lost. */
  replaceSilentGuestMs: number;
  /** A handshake not finished in this long (ms) is given up: the guest says so, the host waits for another guest. */
  handshakeTimeoutMs: number;
  /** How long the other candle takes to fade out (ms). */
  fadeMs: number;
  /** The guest's candle starts this far right of the host's (px), so the two never start inside each other. */
  guestSpawnOffsetPx: number;
  /**
   * Moving ledges follow the shared clock: the world time is nudged toward it by at most this much per physics step
   * (ms), and set to it at once when it is further off than `worldTimeSnapMs` (the start of a run, a pause).
   */
  worldTimeSlewMs: number;
  worldTimeSnapMs: number;
  /**
   * When this game's physics steps are more than this far apart in shared time (ms), it was not stepping (a pause, a hidden
   * tab, a long hitch): the world time is set to the shared clock at once instead of nudged, even below `worldTimeSnapMs`.
   * Above a frame at 30 fps, so ordinary frames never count.
   */
  worldTimeResumeGapMs: number;
  /** How long the status line shows "connected" and "the other player left" (ms). Waiting shows until it ends. */
  connectedNoticeMs: number;
  leftNoticeMs: number;
  /**
   * How many drops the other player has taken, at most, that this game remembers (ids). The oldest is forgotten past
   * it. Far above what a real climb collects, so an honest claim is never lost, and the same for every list below:
   * a message from the other window is untrusted, so nothing it feeds may grow without limit.
   */
  maxRemoteWax: number;
  /** Crumbling ledges the other player may have running here at once (a ledge that is no ledge here is dropped by the next step). */
  maxCrumbling: number;
  /** Messages kept unread for the next frame (the newest); a window that is not drawing cannot pile up more. */
  maxQueuedMessages: number;
}

export const NETPLAY_CONFIG: NetplayConfig = {
  sendHz: 20, // 50 ms between updates: smooth enough with blending, small enough for any connection
  playbackDelayMs: 100, // two updates' worth: one lost update still leaves two to blend between
  maxPlaybackDelayMs: 450,
  maxExtrapolateMs: 150,
  correctionTauMs: 90,
  snapPx: 120,
  pingEveryMs: 1000,
  resendMs: 120,
  giveUpMs: 8000,
  joinEveryMs: 400,
  silentAfterMs: 4000,
  replaceSilentGuestMs: 1500, // 30 missed updates: a live guest is never replaced, a reloaded one waits a moment
  handshakeTimeoutMs: 15000,
  fadeMs: 1000,
  guestSpawnOffsetPx: 48,
  worldTimeSlewMs: 0.5, // 0.5 ms per 8.3 ms step: a moving ledge drifts back into line without a visible jerk
  worldTimeSnapMs: 1000,
  worldTimeResumeGapMs: 50, // a frame at 20 fps: slower than that is a hitch, and setting the clock then is what the nudge was after
  connectedNoticeMs: 4000,
  leftNoticeMs: 6000,
  maxRemoteWax: 4096,
  maxCrumbling: 128,
  maxQueuedMessages: 256,
};
