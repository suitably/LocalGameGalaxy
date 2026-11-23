import { createContext, useContext } from 'react';
import type { SettingsState } from './settingsStorage';

export { DEFAULT_SETTINGS, loadSettings } from './settingsStorage';
export type { SettingsState } from './settingsStorage';

export interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: (newState: SettingsState) => void;
  saveSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Consume the shared settings context. Must be used within a SettingsProvider. */
export const useMelodiqSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useMelodiqSettings must be used within a <SettingsProvider>');
  }
  return ctx;
};
