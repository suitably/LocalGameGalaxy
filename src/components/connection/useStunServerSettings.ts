/**
 * This device's STUN server choice [ID: HOOK-STUN-SERVER-SETTINGS]
 *
 * Loads and saves via `lib/webrtc/iceServers.ts`; new peer connections pick the change up.
 */
import { useMemo, useState } from 'react';
import {
  addCustomStunUrl,
  buildStunServers,
  loadStunSettings,
  removeCustomStunUrl,
  saveStunSettings,
  type AddStunResult,
  type StunSettings,
} from '../../lib/webrtc/iceServers';

export function useStunServerSettings() {
  const [settings, setSettings] = useState<StunSettings>(() => loadStunSettings());
  const servers = useMemo(() => buildStunServers(settings), [settings]);

  const update = (next: StunSettings) => {
    saveStunSettings(next);
    setSettings(next);
  };

  const toggleServer = (url: string, enabled: boolean) =>
    update({ ...settings, preferences: { ...settings.preferences, [url]: enabled } });

  const addServer = (url: string): AddStunResult => {
    const { result, settings: next } = addCustomStunUrl(settings, url);
    if (result === 'added') update(next);
    return result;
  };

  const removeServer = (url: string) => update(removeCustomStunUrl(settings, url));
  const restoreDefaults = () => update({ customUrls: [], preferences: {} });

  return { servers, toggleServer, addServer, removeServer, restoreDefaults };
}
