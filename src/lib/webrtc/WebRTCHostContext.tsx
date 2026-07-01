import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { WebRTCHostManager } from './WebRTCHostManager';
import type { RemotePeerBase } from './WebRTCHostManager';

export interface WebRTCHostContextType<T extends RemotePeerBase = RemotePeerBase, M extends WebRTCHostManager<T> = WebRTCHostManager<T>> {
    manager: M | null;
    peers: T[];
    activePeers: T[];
    inactivePeers: T[];
    togglePeerActive: (peerId: string) => void;
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    activeTrackerUrls: string[];
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

// We use a generic context type but map to any under the hood. 
// Consumers can cast it or use specific typed hooks.
export const WebRTCHostContext = createContext<WebRTCHostContextType<any, any> | null>(null);

export function useWebRTCHost<T extends RemotePeerBase = RemotePeerBase, M extends WebRTCHostManager<T> = WebRTCHostManager<T>>() {
    const context = useContext(WebRTCHostContext);
    if (!context) {
        throw new Error('useWebRTCHost must be used within a WebRTCHostProvider');
    }
    return context as WebRTCHostContextType<T, M>;
}

export interface WebRTCHostProviderProps<T extends RemotePeerBase, M extends WebRTCHostManager<T>> {
    children: React.ReactNode;
    gameId?: string; // Used for localStorage key isolation (e.g. 'melodiq')
    createManager: (partyId: string, trackerUrls: string[], callbacks: any) => M;
}

export function WebRTCHostProvider<T extends RemotePeerBase, M extends WebRTCHostManager<T>>({
    children,
    gameId = 'generic',
    createManager
}: WebRTCHostProviderProps<T, M>) {

    // 1. Configuration State (Persisted)
    const [partyId, setPartyId] = useState(() => {
        const stored = localStorage.getItem(`${gameId}_party_id`);
        return stored || Math.random().toString(36).substring(2, 8).toUpperCase();
    });

    const [trackerUrls, setTrackerUrls] = useState<string[]>(() => {
        const stored = localStorage.getItem(`${gameId}_tracker_urls`);
        return stored ? JSON.parse(stored) : [];
    });

    // Computed active tracker URLs including helper server tracker if enabled
    const activeTrackerUrls = useMemo(() => {
        const urls = [...trackerUrls];
        const isHelperEnabled = localStorage.getItem('melodiq_enable_helper') !== 'false';
        if (isHelperEnabled) {
            let helperUrlRaw = localStorage.getItem('melodiq_helper_url');
            if (!helperUrlRaw) {
                helperUrlRaw = `${window.location.protocol}//${window.location.hostname}:3000`;
            }
            try {
                const parsed = new URL(helperUrlRaw);
                const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
                const localWsTracker = `${wsProto}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
                
                // Only add if not already in the list
                if (!urls.includes(localWsTracker)) {
                    urls.unshift(localWsTracker); // Prepend to make it primary!
                }
            } catch (e) {
                console.warn('[WebRTCHostProvider] Failed to parse helper URL for local tracker:', e);
            }
        }
        
        // If still empty, use a default fallback so it doesn't break
        if (urls.length === 0) {
            urls.push('wss://tracker.openwebtorrent.com');
        }
        
        return Array.from(new Set(urls));
    }, [trackerUrls]);

    // 2. Runtime State
    const [manager, setManager] = useState<M | null>(null);
    const [peers, setPeers] = useState<T[]>([]);

    // Active/Inactive peer tracking (persisted)
    const [activePeerIds, setActivePeerIds] = useState<string[]>(() => {
        const stored = localStorage.getItem(`${gameId}_active_peer_ids`);
        return stored ? JSON.parse(stored) : [];
    });

    // Persist Config Changes
    useEffect(() => {
        localStorage.setItem(`${gameId}_party_id`, partyId);
    }, [partyId, gameId]);

    useEffect(() => {
        // Only save if not empty or if we want to allow empty? Let's always save.
        localStorage.setItem(`${gameId}_tracker_urls`, JSON.stringify(trackerUrls));
    }, [trackerUrls, gameId]);

    // Persist active peer IDs
    useEffect(() => {
        localStorage.setItem(`${gameId}_active_peer_ids`, JSON.stringify(activePeerIds));
    }, [activePeerIds, gameId]);

    // 3. Manager Lifecycle
    useEffect(() => {
        if (!partyId || activeTrackerUrls.length === 0) return;

        let managerInstance: M | null = null;
        let isCleanedUp = false;

        console.log(`[WebRTCHostProvider:${gameId}] Scheduling Manager init...`, { partyId });

        const timer = setTimeout(() => {
            if (isCleanedUp) return;

            console.log(`[WebRTCHostProvider:${gameId}] Initializing Manager with:`, { partyId, trackerUrls: activeTrackerUrls });

            managerInstance = createManager(partyId, activeTrackerUrls, {
                onPeerConnected: (peerId: string, name: string, hue?: number, connectionId?: string, deviceId?: string) => {
                    setPeers(prev => {
                        const existing = prev.find(p => p.peerId === peerId);
                        if (existing) {
                            return prev.map(p => p.peerId === peerId ? { ...p, name, hue, connectionId, deviceId } : p);
                        }
                        // It will get created in onPeerCreated or here if it represents an abstract view
                        return prev;
                    });
                    setActivePeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
                },
                onPeerDisconnected: (peerId: string) => {
                    setPeers(prev => prev.filter(p => p.peerId !== peerId));
                },
                onPeerUpdated: (peerId: string, name: string, hue?: number, connectionId?: string, deviceId?: string) => {
                    setPeers(prev => {
                        const existing = prev.find(p => p.peerId === peerId);
                        if (existing) {
                            return prev.map(p => p.peerId === peerId ? { ...p, name, hue, connectionId: connectionId || p.connectionId, deviceId: deviceId || p.deviceId } : p);
                        }
                        return prev;
                    });
                    setActivePeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId]);
                },
                onPeerCreated: (peerId: string, remotePeer: T) => {
                    setPeers(prev => {
                        if (prev.some(p => p.peerId === peerId)) return prev;
                        return [...prev, remotePeer];
                    });
                },
                onPeerRemoved: (peerId: string, _remotePeer: T) => {
                    setPeers(prev => prev.filter(p => p.peerId !== peerId));
                },
                onMessage: (peerId: string, data: any) => {
                    if (data.type === 'roster.toggle') {
                        setActivePeerIds(prev =>
                            prev.includes(peerId)
                                ? prev.filter(id => id !== peerId)
                                : [...prev, peerId]
                        );
                    }
                }
            });

            managerInstance.start().catch(err => console.error(`[WebRTCHostProvider:${gameId}] Failed to start manager:`, err));
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
    }, [partyId, JSON.stringify(activeTrackerUrls), gameId, createManager]);

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

    const togglePeerActive = useCallback((peerId: string) => {
        setActivePeerIds(prev =>
            prev.includes(peerId)
                ? prev.filter(id => id !== peerId)
                : [...prev, peerId]
        );
    }, []);

    // Computed
    const activePeers = useMemo(() => peers.filter(p => activePeerIds.includes(p.peerId)), [peers, activePeerIds]);
    const inactivePeers = useMemo(() => peers.filter(p => !activePeerIds.includes(p.peerId)), [peers, activePeerIds]);

    // Broadcast roster updates
    const broadcastRoster = useCallback(() => {
        if (manager) {
            const storedRoles = localStorage.getItem('melodiq_client_roles');
            let parsedRoles: Record<string, string> = {};
            if (storedRoles) {
                try { parsedRoles = JSON.parse(storedRoles); } catch (e) {}
            }

            const roster = activePeers.map(p => ({
                id: p.peerId, // Legacy format expectation maybe?
                connectionId: p.connectionId,
                name: p.name,
                hue: p.hue,
                deviceId: p.deviceId,
                role: (p.deviceId ? parsedRoles[p.deviceId] : undefined) || 'singer'
            }));
            manager.broadcast({
                type: 'roster.update',
                roster
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

    return (
        <WebRTCHostContext.Provider value={{
            manager,
            peers,
            activePeers,
            inactivePeers,
            togglePeerActive,
            partyId,
            regeneratePartyId,
            trackerUrls,
            activeTrackerUrls,
            addTrackerUrl,
            removeTrackerUrl,
            restoreDefaultTrackers
        }}>
            {children}
        </WebRTCHostContext.Provider>
    );
}
