/** UI-local navigation. It never writes the game-owned snapshot or shared contracts. */
import { createStore, type Store } from '../shared/store';
export interface UiActions {
  settingsOpen: Store<boolean>;
  settingsAvailable: boolean;
}
export function createUiActions(settingsAvailable = true): UiActions {
  return { settingsOpen: createStore(false), settingsAvailable };
}
