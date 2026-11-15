/** UI-local navigation. It never writes the game-owned snapshot or shared contracts. */
import { createStore, type Store } from '../shared/store';
export type CalibrationOrigin = 'start' | 'pause' | 'signal' | 'ember';
export interface UiActions {
  calibrationFrom: Store<CalibrationOrigin | null>;
  calibrationAvailable: boolean;
  openCalibration(from: CalibrationOrigin): void;
  settingsOpen: Store<boolean>;
  settingsAvailable: boolean;
  tutorialOpen: Store<boolean>;
  tutorialAvailable: boolean;
}
export function createUiActions(settingsAvailable = true, calibrationAvailable = true, tutorialAvailable = true): UiActions {
  const calibrationFrom = createStore<CalibrationOrigin | null>(null);
  return { settingsOpen: createStore(false), settingsAvailable, tutorialOpen: createStore(false), tutorialAvailable, calibrationFrom, calibrationAvailable,
    openCalibration(from) { if (calibrationAvailable) calibrationFrom.set(from); } };
}
