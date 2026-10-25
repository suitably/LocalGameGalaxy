import { useCallback, useEffect } from 'react';
import type { RemotePeerBase, WebRTCHostManager } from './WebRTCHostManager';
import { storage, STORAGE_KEYS } from '../storage';

/** Broadcasts the active-peer roster (with client roles) whenever peers or roles change. */
export function useRosterBroadcast<T extends RemotePeerBase>(
  manager: WebRTCHostManager<T> | null,
  activePeers: T[],
) {
  const broadcastRoster = useCallback(() => {
    if (manager) {
      const parsedRoles = storage.getJson<Record<string, string>>(
        STORAGE_KEYS.MELODIQ_CLIENT_ROLES,
        {},
      );

      const roster = activePeers.map((p) => ({
        id: p.peerId, // Legacy format expectation maybe?
        connectionId: p.connectionId,
        name: p.name,
        hue: p.hue,
        deviceId: p.deviceId,
        role: (p.deviceId ? parsedRoles[p.deviceId] : undefined) || 'singer',
      }));
      manager.broadcast({
        type: 'roster.update',
        roster,
      });
    }
  }, [activePeers, manager]);

  useEffect(() => {
    broadcastRoster();
  }, [broadcastRoster]);

  useEffect(() => {
    const handler = () => broadcastRoster();
    window.addEventListener('melodiq_roles_updated', handler);
    return () => window.removeEventListener('melodiq_roles_updated', handler);
  }, [broadcastRoster]);
}
