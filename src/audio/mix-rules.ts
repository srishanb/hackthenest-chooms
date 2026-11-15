/**
 * Pure audio gain rules: crossfade music without changing controls or masking cues.
 * Phase scales are temporary lane-local tunables per P5.4's explicit fallback until
 * AudioConfig.mix is agreed: refuge 0.5, ember 0.25, paused 0.35 of normal music.
 * These gains already include master volume; the engine must not multiply it again.
 */
import type { AudioConfig } from '../shared/contracts/config';
import type { GamePhase } from '../shared/contracts/game-state';
import type { Volumes } from '../shared/contracts/settings';

export const MIX_SCALES = { refuge: 0.5, ember: 0.25, paused: 0.35 } as const;

export interface MixInput {
  tenseMix01: number;
  volumes: Volumes;
  phase: GamePhase;
  inRefuge: boolean;
  emberActive: boolean;
}

export interface MixGains {
  quiet: number;
  tense: number;
  sfx: number;
  narrator: number;
}

/** Nonfinite gain inputs silence the affected bus; a bad mix position uses neutral. */
function bounded(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export function computeMix(input: MixInput, config: AudioConfig): MixGains {
  const master = bounded(input.volumes.master);
  const ember = input.emberActive || input.phase === 'ember';
  const scale = input.phase === 'paused' ? MIX_SCALES.paused
    : ember ? MIX_SCALES.ember
    : input.inRefuge ? MIX_SCALES.refuge : 1;
  const music = master * bounded(input.volumes.music) * bounded(config.maxMusicGain) * scale;
  const mix = ember ? 0 : bounded(input.tenseMix01, 0.3);
  // Exact endpoints avoid an inaudible but nonzero cos(pi/2) residue.
  return {
    quiet: mix === 1 ? 0 : music * Math.cos(mix * Math.PI / 2),
    tense: mix === 0 ? 0 : music * Math.sin(mix * Math.PI / 2),
    sfx: master * bounded(input.volumes.sfx),
    narrator: master * bounded(input.volumes.narrator),
  };
}
