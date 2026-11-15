/** Balance decoded speech once per clip; keep headroom and never amplify silence. */
import { NARRATOR_LEVELS } from '../../config/audio.config';
export function narrationGain(buffer: Pick<AudioBuffer, 'getChannelData' | 'numberOfChannels' | 'length'>): number {
  if (typeof buffer.getChannelData !== 'function' || !buffer.numberOfChannels || !buffer.length) return 1;
  let squares = 0, peak = 0, count = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const sample of buffer.getChannelData(channel)) {
      if (!Number.isFinite(sample)) return 1;
      squares += sample * sample; peak = Math.max(peak, Math.abs(sample)); count++;
    }
  }
  const rms = Math.sqrt(squares / count);
  if (rms < 0.00001 || peak < 0.00001) return 1;
  return Math.min(NARRATOR_LEVELS.maxGain, NARRATOR_LEVELS.targetRms / rms, NARRATOR_LEVELS.peakCeiling / peak);
}
