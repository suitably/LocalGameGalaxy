import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createLogger } from '../logger';
import { WebRTCHostManager } from './WebRTCHostManager';
import type { RemotePeerBase } from './WebRTCHostManager';
import { WebRTCHostContext } from './webRTCHostContextCore';
import { useRosterBroadcast } from './useRosterBroadcast';
import { useTrackerConfig } from './useTrackerConfig';
import { applyPeerConnected, applyPeerCreated, applyPeerUpdated } from './peerListUpdates';
import { storage, STORAGE_PREFIXES } from '../storage';
import { initialPartyId, randomPartyId } from './initialPartyId';

const log = createLogger('WebRTCHostProvider');

export interface WebRTCHostProviderProps<T extends RemotePeerBase, M extends WebRTCHostManager<T>> {
  children: React.ReactNode;
  gameId?: string; // Used for storage key isolation (e.g. 'melodiq')
  createManager: (partyId: string, trackerUrls: string[], callbacks: any) => M;
  /** Use this party code (the lobby's room) instead of the stored one; it is not stored. */
  fixedPartyId?: string | null;
}

export function WebRTCHostProvider<T extends RemotePeerBase, M extends WebRTCHostManager<T>>({
  children,
  gameId = 'generic',
  createManager,
  fixedPartyId = null,
}: WebRTCHostProviderProps<T, M>) {
  const createManagerRef = useRef(createManager);
  useEffect(() => {
    createManagerRef.current = createManager;
  }, [createManager]);

  // 1. Configuration State (Persisted)
  const [partyId, setPartyId] = useState(() =>
    initialPartyId(fixedPartyId, storage.get(`${gameId}${STORAGE_PREFIXES.WEBRTC_PARTY_ID}`)),
  );

  const {
    trackerUrls,
    allTrackers,
    activeTrackerUrls,
    disabledTrackerUrls,
    toggleTrackerActive,
    addTrackerUrl,
    removeTrackerUrl,
    restoreDefaultTrackers,
  } = useTrackerConfig(gameId);

  // 2. Runtime State
  const [manager, setManager] = useState<M | null>(null);
  const [peers, setPeers] = useState<T[]>([]);

  // Active/Inactive peer tracking (persisted)
  const [activePeerIds, setActivePeerIds] = useState<string[]>(() => {
    return storage.getJson<string[]>(`${gameId}${STORAGE_PREFIXES.WEBRTC_ACTIVE_PEERS}`, []);
  });

  // Persist Config Changes
  useEffect(() => {
    if (!fixedPartyId) storage.set(`${gameId}${STORAGE_PREFIXES.WEBRTC_PARTY_ID}`, partyId);
  }, [partyId, gameId, fixedPartyId]);

  // Persist active peer IDs
  useEffect(() => {
    storage.setJson(`${gameId}${STORAGE_PREFIXES.WEBRTC_ACTIVE_PEERS}`, activePeerIds);
  }, [activePeerIds, gameId]);

  // 3. Manager Lifecycle
  const activeTrackersKey = activeTrackerUrls.join(',');
  useEffect(() => {
    if (!partyId || activeTrackerUrls.length === 0) return;

    let managerInstance: M | null = null;
    let isCleanedUp = false;

    log.debug(`[${gameId}] Scheduling Manager init...`);

    const timer = setTimeout(() => {
      if (isCleanedUp) return;

      log.debug(`[${gameId}] Initializing Manager with tracker URLs:`, {
        trackerUrls: activeTrackerUrls,
      });

      managerInstance = createManagerRef.current(partyId, activeTrackerUrls, {
        onPeerConnected: (
          peerId: string,
          name: string,
          hue?: number,
          connectionId?: string,
          deviceId?: string,
        ) => {
          setPeers((prev) => applyPeerConnected(prev, peerId, name, hue, connectionId, deviceId));
          setActivePeerIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
        },
        onPeerDisconnected: (peerId: string) => {
          setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
        },
        onPeerUpdated: (
          peerId: string,
          name: string,
          hue?: number,
          connectionId?: string,
          deviceId?: string,
        ) => {
          setPeers((prev) => applyPeerUpdated(prev, peerId, name, hue, connectionId, deviceId));
          setActivePeerIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
        },
        onPeerCreated: (peerId: string, remotePeer: T) => {
          setPeers((prev) => applyPeerCreated(prev, peerId, remotePeer));
        },
        onPeerRemoved: (peerId: string, _remotePeer: T) => {
          setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
        },
        onMessage: (peerId: string, data: any) => {
          if (data.type === 'roster.toggle') {
            setActivePeerIds((prev) =>
              prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId],
            );
          }
        },
      });

      managerInstance
        .start()
        .catch((err) =>
          console.error(`[WebRTCHostProvider:${gameId}] Failed to start manager:`, err),
        );
      setManager(managerInstance);
    }, 500);

    return () => {
      isCleanedUp = true;
      clearTimeout(timer);
      if (managerInstance) {
        log.debug(`[${gameId}] Cleaning up Manager`);
        managerInstance.stop();
        setManager(null);
        setPeers([]);
      }
    };
  }, [partyId, activeTrackersKey, gameId]);

  // 4. Actions
  const regeneratePartyId = useCallback(() => {
    if (!fixedPartyId) setPartyId(randomPartyId());
  }, [fixedPartyId]);

  const togglePeerActive = useCallback((peerId: string) => {
    setActivePeerIds((prev) =>
      prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId],
    );
  }, []);

  // Computed
  const activePeers = useMemo(
    () => peers.filter((p) => activePeerIds.includes(p.peerId)),
    [peers, activePeerIds],
  );
  const inactivePeers = useMemo(
    () => peers.filter((p) => !activePeerIds.includes(p.peerId)),
    [peers, activePeerIds],
  );

  useRosterBroadcast(manager, activePeers);

  return (
    <WebRTCHostContext.Provider
      value={{
        manager,
        peers,
        activePeers,
        inactivePeers,
        togglePeerActive,
        partyId,
        regeneratePartyId,
        trackerUrls,
        activeTrackerUrls,
        disabledTrackerUrls,
        allTrackers,
        toggleTrackerActive,
        addTrackerUrl,
        removeTrackerUrl,
        restoreDefaultTrackers,
      }}
    >
      {children}
    </WebRTCHostContext.Provider>
  );
}
