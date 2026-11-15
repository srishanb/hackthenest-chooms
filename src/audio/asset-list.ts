/** Licensed local music handoff from public/assets/README.md (Neil's inventory).
 * Only one mixed ambient track exists. There is no tense stem: null is deliberately
 * silent, not a duplicated track or an invented asset. P8.1 must supply a second layer.
 */
export interface MusicAssets { quiet: string | null; tense: string | null }
export const MUSIC_ASSETS: MusicAssets = {
  quiet: 'assets/audio/music/cathedral-in-the-forest.ogg',
  tense: null,
};

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
