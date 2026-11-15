/** UI-local short cues, as allowed by P6.1; no dependency on the audio lane.
 * API examples verified against MDN Web_Audio_API/Advanced_techniques and AudioContext/resume.
 * Missing/blocked audio fails quietly; written instructions are always present.
 */
export function createCueTone(volume: () => number) {
  let context: AudioContext | null = null;
  const unlock = (): void => {
    try {
      context ??= new AudioContext();
      void context.resume().catch(() => {});
    } catch { /* Text-only fallback for unsupported or denied audio. */ }
  };
  const play = (end = false): void => {
    if (!context || context.state !== 'running') return;
    try {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const t = context.currentTime;
      const raw = volume(), amplitude = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) * 0.08 : 0;
      oscillator.frequency.value = end ? 880 : 660;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(amplitude, t + 0.01);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(t); oscillator.stop(t + 0.21);
    } catch { /* A closing audio context must not interrupt calibration. */ }
  };
  return { unlock, play, dispose() { if (context) void context.close().catch(() => {}); context = null; } };
}
