/** Licensed local music handoff from public/assets/README.md (Neil's inventory).
 * Only one mixed ambient track exists. There is no tense stem: null is deliberately
 * silent, not a duplicated track or an invented asset. P8.1 must supply a second layer.
 */
export interface MusicAssets { quiet: string | null; tense: string | null }
export const MUSIC_ASSETS: MusicAssets = {
  quiet: 'assets/audio/music/cathedral-in-the-forest.ogg',
  tense: null,
};
