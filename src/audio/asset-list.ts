/** Licensed local music, both CC0 (see CREDITS.md). `quiet` is the calm bed; `tense` is the layer the
 * music crossfades to as the real signal rises (effects row musicTenseMix). A missing file stays silent.
 */
export interface MusicAssets { quiet: string | null; tense: string | null }
export const MUSIC_ASSETS: MusicAssets = {
  quiet: 'assets/audio/music/cathedral-in-the-forest.ogg',
  tense: 'assets/audio/music/insistent.ogg',
};

/** Level-matches the two loops so the crossfade does not change loudness. Measured as whole-file RMS of the
 * decoded files: the calm bed is -19.4 dB and the tense loop -24.2 dB, so the tense layer is raised 4.8 dB. */
export const MUSIC_LEVEL_TRIM: Record<keyof MusicAssets, number> = { quiet: 1, tense: 1.74 };

/** Existing licensed cues; all paths are already covered by CREDITS.md. */
export const SFX_ASSETS: import('./sfx').SfxAssets = {
  jump: 'assets/audio/footsteps/01-footstep.ogg',
  land: 'assets/audio/footsteps/02-footstep.ogg',
  landHard: 'assets/audio/footsteps/06-footstep.ogg',
  refuge: 'assets/audio/interface/confirmation_001.ogg',
  save: 'assets/audio/interface/confirmation_001.ogg',
  emberGained: 'assets/audio/interface/confirmation_001.ogg',
  emberRequested: 'assets/audio/ember/fantasy-magic-button-1.mp3',
  emberReturned: 'assets/audio/ember/fantasy-magic-button-1.mp3',
  emberCancelled: 'assets/audio/interface/back_001.ogg',
  finish: 'assets/audio/interface/confirmation_001.ogg',
  wax: 'assets/audio/interface/click_001.ogg',
};
