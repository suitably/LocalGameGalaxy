import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import {
  loadSettings,
  persistSettings,
  persistSingleSetting,
  type SettingsState,
} from './settingsStorage';

export { DEFAULT_SETTINGS, loadSettings } from './settingsStorage';
export type { SettingsState } from './settingsStorage';

interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: (newState: SettingsState) => void;
  saveSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const updateSetting = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        persistSingleSetting(key, value);
        return next;
      });

      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ type: 'SETTINGS_UPDATE', payload: { [key]: value } });
        } catch (e) {}
      }
      window.dispatchEvent(
        new CustomEvent('melodiq_settings_updated', { detail: { [key]: value } }),
      );
    },
    [],
  );

  const resetSettings = useCallback((newState: SettingsState) => {
    setSettings((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newState)) return prev;
      persistSettings(newState);
      return newState;
    });

    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type: 'SETTINGS_UPDATE', payload: newState });
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('melodiq_settings_updated', { detail: newState }));
  }, []);

  const saveSettings = useCallback(() => {
    persistSettings(settings);
  }, [settings]);

  // Listen for cross-tab storage changes and BroadcastChannel updates so settings sync if changed in another tab or window
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('melodiq_')) {
        setSettings(loadSettings());
      }
    };
    window.addEventListener('storage', handleStorage);

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('melodiq_tv_control');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SETTINGS_UPDATE') {
            setSettings(loadSettings());
          }
        };
        channelRef.current = channel;
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      channelRef.current?.close();
      channelRef.current = null;
    };
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

/** Consume the shared settings context. Must be used within a SettingsProvider. */
export const useMelodiqSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useMelodiqSettings must be used within a <SettingsProvider>');
  }
  return ctx;
};
