import { useEffect, useRef } from 'react';
import { useWebRTC } from '../audio/WebRTCContext';
import { useMelodiqSettings } from '../hooks/SettingsContext';
import {
  canEditHostSettings,
  parseHostSettingsRpc,
  pickHostSettings,
} from '../logic/hostSettingsRpc';
import type { HostSettings, HostSettingsReply } from '../types';
import { getRoleForDevice } from './useStoredRoles';

/**
 * Host side of the typed `HostSettingsRpc`: applies settings requested by an admin phone to the
 * host's own settings (and storage) and answers with the host's current values.
 */
export const HostSettingsRpcBridge: React.FC = () => {
  const { manager } = useWebRTC();
  const { settings, updateSetting } = useMelodiqSettings();
  const settingsRef = useRef(settings);
  const updateRef = useRef(updateSetting);
  useEffect(() => {
    settingsRef.current = settings;
    updateRef.current = updateSetting;
  });

  useEffect(() => {
    if (!manager) return;
    return manager.on('message', (peerId: string, data: unknown) => {
      const rpc = parseHostSettingsRpc(data);
      if (!rpc) return;

      const peer = manager.getConnectedPeers().find((p) => p.peerId === peerId);
      const role = getRoleForDevice(peer?.deviceId);
      if (!canEditHostSettings(role)) {
        console.warn(`[HostSettingsRpc] Denied ${rpc.type} from ${peer?.name} (Role: ${role})`);
        return;
      }

      let next: HostSettings = pickHostSettings(settingsRef.current);
      if (rpc.type === 'host.settings.set') {
        const patch = rpc.patch as Record<string, unknown>;
        for (const key of Object.keys(patch) as (keyof HostSettings)[]) {
          updateRef.current(key, patch[key] as never);
        }
        next = { ...next, ...rpc.patch };
      }
      const reply: HostSettingsReply = { type: 'host.settings.state', settings: next };
      manager.sendToPeer(peerId, reply);
    });
  }, [manager]);

  return null;
};
