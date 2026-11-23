import React, { useState, useCallback, useEffect } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import { useMultiChannelSync } from '../../../modules/sync';
import { TV_CONTROL_SYNC, type TvControlMessage } from '../logic/syncChannels';
import {
  loadSettings,
  persistSettings,
  persistSingleSetting,
  type SettingsState,
} from './settingsStorage';
import { SettingsContext } from './settingsContextCore';

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  // Settings changes made in another window of this device (e.g. the TV window) reload from storage
  const { publish: publishLocal } = useMultiChannelSync<TvControlMessage>({
    ...TV_CONTROL_SYNC,
    selfEcho: false,
    onMessage: (message) => {
      if (message?.type === 'SETTINGS_UPDATE') {
        setSettings(loadSettings());
      }
    },
  });

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        persistSingleSetting(key, value);
        return next;
      });

      publishLocal({ type: 'SETTINGS_UPDATE', payload: { [key]: value } });
      window.dispatchEvent(
        new CustomEvent('melodiq_settings_updated', { detail: { [key]: value } }),
      );
    },
    [publishLocal],
  );

  const resetSettings = useCallback(
    (newState: SettingsState) => {
      setSettings((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(newState)) return prev;
        persistSettings(newState);
        return newState;
      });

      publishLocal({ type: 'SETTINGS_UPDATE', payload: newState });
      window.dispatchEvent(new CustomEvent('melodiq_settings_updated', { detail: newState }));
    },
    [publishLocal],
  );

  const saveSettings = useCallback(() => {
    persistSettings(settings);
  }, [settings]);

  // Listen for cross-tab storage changes (broadcast updates: see useMultiChannelSync above)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('melodiq_')) {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Parse URL parameters for initial setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let updated = false;

    const urlHelper = params.get('helperUrl');
    const urlToken = params.get('token') || params.get('apiKey');

    if (urlHelper) {
      storage.set(STORAGE_KEYS.HELPER_URL, urlHelper);
      storage.set(STORAGE_KEYS.HELPER_ACTIVE, 'true');
      params.delete('helperUrl');
      updated = true;
    }

    if (urlToken) {
      storage.set(STORAGE_KEYS.HELPER_TOKEN, urlToken);
      params.delete('token');
      params.delete('apiKey');
      updated = true;
    }

    if (updated) {
      // Update the URL without reloading the page
      const newUrl =
        window.location.pathname +
        (params.toString() ? `?${params.toString()}` : '') +
        window.location.hash;
      window.history.replaceState({}, '', newUrl);

      // Apply the new settings to the state immediately
      setSettings(loadSettings());

      // Notify hooks (e.g. useSongs) that helper config changed so they reload
      window.dispatchEvent(new Event('melodiq_settings_updated'));
    }
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
