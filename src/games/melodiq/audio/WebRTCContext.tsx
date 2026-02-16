import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { WebRTCMicManager } from './WebRTCMicManager';

interface PeerInfo {
    id: string;
    name: string;
    hue?: number;
    connectionId?: string;
}

interface WebRTCContextType {
    manager: WebRTCMicManager | null;
    peers: PeerInfo[];
    activePeers: PeerInfo[];
    inactivePeers: PeerInfo[];
    togglePeerActive: (peerId: string) => void;
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

export const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const useWebRTC = () => {
    const context = useContext(WebRTCContext);
    if (!context) {
        throw new Error('useWebRTC must be used within a WebRTCProvider');
    }
    return context;
};

export const WebRTCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // 1. Configuration State (Persisted)
    const [partyId, setPartyId] = useState(() => {
        const stored = localStorage.getItem('melodiq_party_id');
        return stored || Math.random().toString(36).substring(2, 8).toUpperCase();
    });

    const [trackerUrls, setTrackerUrls] = useState<string[]>(() => {
        const stored = localStorage.getItem('melodiq_tracker_urls');
        return stored ? JSON.parse(stored) : [];
    });

    // 2. Runtime State
    const [manager, setManager] = useState<WebRTCMicManager | null>(null);
    const [peers, setPeers] = useState<PeerInfo[]>([]);

    // Active/Inactive peer tracking (persisted)
    const [activePeerIds, setActivePeerIds] = useState<string[]>(() => {
        const stored = localStorage.getItem('melodiq_active_peer_ids');
        return stored ? JSON.parse(stored) : [];
    });

    // Persist Config Changes
    useEffect(() => {
        localStorage.setItem('melodiq_party_id', partyId);
    }, [partyId]);

    useEffect(() => {
        localStorage.setItem('melodiq_tracker_urls', JSON.stringify(trackerUrls));
    }, [trackerUrls]);

    // Persist active peer IDs
    useEffect(() => {
        localStorage.setItem('melodiq_active_peer_ids', JSON.stringify(activePeerIds));
    }, [activePeerIds]);

    // 3. Manager Lifecycle
    useEffect(() => {
        if (!partyId || trackerUrls.length === 0) return;

        let managerInstance: WebRTCMicManager | null = null;
        let isCleanedUp = false;

        console.log('[WebRTCProvider] Scheduling Manager init...', { partyId });

        // Debounce initialization to handle React Strict Mode double-mount
        const timer = setTimeout(() => {
            if (isCleanedUp) return;

            console.log('[WebRTCProvider] Initializing Manager with:', { partyId, trackerUrls });

            managerInstance = new WebRTCMicManager(partyId, trackerUrls, {
                onPeerConnected: (peerId, name, hue, connectionId) => {
                    console.log('[WebRTCProvider] Peer Connected:', name, peerId, connectionId);
                    setPeers(prev => {
                        if (prev.some(p => p.id === peerId)) return prev.map(p => p.id === peerId ? { id: peerId, name, hue, connectionId } : p);
                        return [...prev, { id: peerId, name, hue, connectionId }];
                    });
                    // Auto-activate new peers
                    setActivePeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
                },
                onPeerDisconnected: (peerId) => {
                    console.log('[WebRTCProvider] Peer Disconnected:', peerId);
                    setPeers(prev => prev.filter(p => p.id !== peerId));
                },
                onPeerUpdated: (peerId, name, hue, connectionId) => {
                    console.log('[WebRTCProvider] Peer Updated:', name, peerId, connectionId);
                    setPeers(prev => {
                        const existing = prev.find(p => p.id === peerId);
                        if (existing) {
                            return prev.map(p => p.id === peerId ? { ...p, name, hue, connectionId: connectionId || p.connectionId } : p);
                        }
                        // Peer doesn't exist yet (identity arrived before stream), add it
                        return [...prev, { id: peerId, name, hue, connectionId }];
                    });
                    // Auto-activate new peers
                    setActivePeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
                },
                onMessage: (peerId, data) => {
                    if (data.type === 'roster.toggle') {
                        console.log('[WebRTCContext] Received roster.toggle from peer:', peerId); // DEBUG LOG
                        setActivePeerIds(prev =>
                            prev.includes(peerId)
                                ? prev.filter(id => id !== peerId)
                                : [...prev, peerId]
                        );
                    }
                }
            });

            // Start it
            managerInstance.start().catch(err => console.error('[WebRTCProvider] Failed to start manager:', err));
            setManager(managerInstance);
        }, 500); // 500ms delay to ensure stability

        return () => {
            isCleanedUp = true;
            clearTimeout(timer);
            if (managerInstance) {
                console.log('[WebRTCProvider] Cleaning up Manager');
                managerInstance.stop();
                setManager(null);
                setPeers([]);
            }
        };
    }, [partyId, JSON.stringify(trackerUrls)]); // Re-init if config changes

    // 4. Actions
    const regeneratePartyId = useCallback(() => {
        setPartyId(Math.random().toString(36).substring(2, 8).toUpperCase());
    }, []);

    const addTrackerUrl = useCallback((url: string) => {
        if (url && !trackerUrls.includes(url)) {
            setTrackerUrls(prev => [...prev, url]);
        }
    }, [trackerUrls]);

    const removeTrackerUrl = useCallback((url: string) => {
        setTrackerUrls(prev => prev.filter(t => t !== url));
    }, []);

    const restoreDefaultTrackers = useCallback(() => {
        setTrackerUrls([]);
    }, []);

    // Toggle peer active/inactive
    const togglePeerActive = useCallback((peerId: string) => {
        setActivePeerIds(prev =>
            prev.includes(peerId)
                ? prev.filter(id => id !== peerId)
                : [...prev, peerId]
        );
    }, []);

    // Computed: active and inactive peers
    const activePeers = useMemo(() => peers.filter(p => activePeerIds.includes(p.id)), [peers, activePeerIds]);
    const inactivePeers = useMemo(() => peers.filter(p => !activePeerIds.includes(p.id)), [peers, activePeerIds]);

    // Broadcast roster updates
    useEffect(() => {
        if (manager) {
            const roster = activePeers.map(p => ({
                id: p.id,
                name: p.name,
                hue: p.hue,
                connectionId: p.connectionId
            }));
            console.log('[WebRTCContext] Broadcasting Roster:', roster); // DEBUG LOG
            manager.broadcast({
                type: 'roster.update',
                roster
            });
        }
    }, [activePeers, manager]);

    return (
        <WebRTCContext.Provider value={{
            manager,
            peers,
            activePeers,
            inactivePeers,
            togglePeerActive,
            partyId,
            regeneratePartyId,
            trackerUrls,
            addTrackerUrl,
            removeTrackerUrl,
            restoreDefaultTrackers
        }}>
            {children}
        </WebRTCContext.Provider>
    );
};
