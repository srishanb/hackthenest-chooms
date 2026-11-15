/** Small code-native interface symbols; no replacement game art or network assets. */
export type IconName = 'flame' | 'height' | 'wax' | 'trophy' | 'pause' | 'play' | 'flag' | 'settings' | 'home';
const paths: Record<IconName, string> = {
  flame: '<path d="M13 2 5 13v5l4 4h7l4-5-2-8-4 5 1-7z" fill="currentColor"/><path d="m12 13-3 5 3 3 3-3z" fill="#fff1b3"/>',
  height: '<path d="m1 21 8-16 4 7 3-5 7 14z" fill="currentColor"/><path d="m9 5-3 7 3-2 3 2z" fill="#fff1df"/>',
  wax: '<path d="M12 2 5 13v5l4 4h6l4-4v-5z" fill="currentColor"/>',
  trophy: '<path d="M7 3h10v10l-4 4v3h5v2H6v-2h5v-3l-4-4zM6 5H2v7l5 3v-3l-3-2V7h2zm12 0h4v7l-5 3v-3l3-2V7h-2z" fill="currentColor"/>',
  pause: '<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>',
  play: '<path d="m7 3 14 9L7 21z" fill="currentColor"/>',
  flag: '<path d="M5 2h2v20H5zm2 1h13v10H7z" fill="currentColor"/>',
  settings: '<path d="M9 2h6l1 4 4 1 2 5-3 3v5l-5 2-3-3-5 1-3-5 2-4-1-5 5-1z" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#111e2b"/>',
  home: '<path d="m1 11 11-9 11 9-3 1v10h-6v-8h-4v8H4V12z" fill="currentColor"/>',
};
export function icon(name: IconName): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('ui-icon'); svg.innerHTML = paths[name]; return svg;
}
