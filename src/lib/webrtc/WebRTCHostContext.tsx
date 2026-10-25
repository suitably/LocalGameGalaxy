import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { WebRTCHostManager } from './WebRTCHostManager';
import type { RemotePeerBase } from './WebRTCHostManager';
import { DEFAULT_PUBLIC_TRACKERS, type TrackerItem } from './trackerTypes';
import { useRosterBroadcast } from './useRosterBroadcast';
import { useTrackerConfig } from './useTrackerConfig';
import { applyPeerConnected, applyPeerCreated, applyPeerUpdated } from './peerListUpdates';
import { storage, STORAGE_PREFIXES } from '../storage';

export { DEFAULT_PUBLIC_TRACKERS, type TrackerItem };

export interface WebRTCHostContextType<
  T extends RemotePeerBase = RemotePeerBase,
  M extends WebRTCHostManager<T> = WebRTCHostManager<T>,
> {
  manager: M | null;
  peers: T[];
  activePeers: T[];
  inactivePeers: T[];
  togglePeerActive: (peerId: string) => void;
  partyId: string;
  regeneratePartyId: () => void;
  trackerUrls: string[];
  activeTrackerUrls: string[];
  disabledTrackerUrls: string[];
  allTrackers: TrackerItem[];
  toggleTrackerActive: (url: string, enabled?: boolean) => void;
  addTrackerUrl: (url: string) => void;
  removeTrackerUrl: (url: string) => void;
  restoreDefaultTrackers: () => void;
}

// We use a generic context type but map to any under the hood.
// Consumers can cast it or use specific typed hooks.
export const WebRTCHostContext = createContext<WebRTCHostContextType<any, any> | null>(null);

export function useWebRTCHost<
  T extends RemotePeerBase = RemotePeerBase,
  M extends WebRTCHostManager<T> = WebRTCHostManager<T>,
>() {
  const context = useContext(WebRTCHostContext);
  if (!context) {
    throw new Error('useWebRTCHost must be used within a WebRTCHostProvider');
  }
  return context as WebRTCHostContextType<T, M>;
}

export interface WebRTCHostProviderProps<T extends RemotePeerBase, M extends WebRTCHostManager<T>> {
  children: React.ReactNode;
  gameId?: string; // Used for storage key isolation (e.g. 'melodiq')
  createManager: (partyId: string, trackerUrls: string[], callbacks: any) => M;
}

export function WebRTCHostProvider<T extends RemotePeerBase, M extends WebRTCHostManager<T>>({
  children,
  gameId = 'generic',
  createManager,
}: WebRTCHostProviderProps<T, M>) {
  const createManagerRef = useRef(createManager);
  useEffect(() => {
    createManagerRef.current = createManager;
  }, [createManager]);

  // 1. Configuration State (Persisted)
  const [partyId, setPartyId] = useState(() => {
    const stored = storage.get(`${gameId}${STORAGE_PREFIXES.WEBRTC_PARTY_ID}`);
    return stored || Math.random().toString(36).substring(2, 8).toUpperCase();
  });

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
    storage.set(`${gameId}${STORAGE_PREFIXES.WEBRTC_PARTY_ID}`, partyId);
  }, [partyId, gameId]);

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

    console.log(`[WebRTCHostProvider:${gameId}] Scheduling Manager init...`, { partyId });

    const timer = setTimeout(() => {
      if (isCleanedUp) return;

      console.log(`[WebRTCHostProvider:${gameId}] Initializing Manager with:`, {
        partyId,
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
        console.log(`[WebRTCHostProvider:${gameId}] Cleaning up Manager`);
        managerInstance.stop();
        setManager(null);
        setPeers([]);
      }
    };
  }, [partyId, activeTrackersKey, gameId]);

  // 4. Actions
  const regeneratePartyId = useCallback(() => {
    setPartyId(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

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
