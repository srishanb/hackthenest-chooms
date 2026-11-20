/**
 * Netplay status: one short line for the two-player climb (waiting for the other player, connected, the other
 * player left, or why the two could not play together).
 *
 * Why a component of its own: the game only writes a string key (`snapshot.netplayKey`); the words live in
 * strings.ts like every player-facing text. In solo play the key is never set, so nothing shows. Removing this
 * component changes nothing about play.
 */
import { STRINGS, t, type StringKey } from '../../strings';
import type { UiComponent } from '../../types';
import './netplay-status.css';

export const netplayStatus: UiComponent = {
  id: 'netplay-status',
  visibleIn: ['menu', 'playing', 'paused', 'finished'],
  mount(root, { stores }) {
    const line = document.createElement('div');
    line.className = 'netplay-status';
    line.setAttribute('role', 'status');
    line.hidden = true;
    root.append(line);
    const render = (key: string | undefined): void => {
      const known = key !== undefined && Object.hasOwn(STRINGS, key);
      line.hidden = !known;
      line.dataset.key = known ? key : '';
      line.textContent = known ? t(key as StringKey) : '';
    };
    render(stores.snapshot.get().netplayKey);
    const unsubscribe = stores.snapshot.subscribe((snapshot) => {
      if ((line.dataset.key || undefined) !== snapshot.netplayKey) render(snapshot.netplayKey);
    });
    return () => { unsubscribe(); line.remove(); };
  },
};
