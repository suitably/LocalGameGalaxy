import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { WebRTCMicManager } from './WebRTCMicManager';

interface PeerInfo {
    id: string;
    name: string;
    hue?: number;
}

interface WebRTCContextType {
    manager: WebRTCMicManager | null;
    peers: PeerInfo[];
    partyId: string;
    regeneratePartyId: () => void;
    trackerUrls: string[];
    addTrackerUrl: (url: string) => void;
    removeTrackerUrl: (url: string) => void;
    restoreDefaultTrackers: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

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

    // Persist Config Changes
    useEffect(() => {
        localStorage.setItem('melodiq_party_id', partyId);
    }, [partyId]);

    useEffect(() => {
        localStorage.setItem('melodiq_tracker_urls', JSON.stringify(trackerUrls));
    }, [trackerUrls]);

    // 3. Manager Lifecycle
    useEffect(() => {
        if (!partyId || trackerUrls.length === 0) return;

        console.log('[WebRTCProvider] Initializing Manager with:', { partyId, trackerUrls });

        const newManager = new WebRTCMicManager(partyId, trackerUrls, {
            onPeerConnected: (peerId, name, hue) => {
                console.log('[WebRTCProvider] Peer Connected:', name, peerId);
                setPeers(prev => {
                    if (prev.some(p => p.id === peerId)) return prev.map(p => p.id === peerId ? { id: peerId, name, hue } : p);
                    return [...prev, { id: peerId, name, hue }];
                });
            },
            onPeerDisconnected: (peerId) => {
                console.log('[WebRTCProvider] Peer Disconnected:', peerId);
                setPeers(prev => prev.filter(p => p.id !== peerId));
            },
            onPeerUpdated: (peerId, name, hue) => {
                console.log('[WebRTCProvider] Peer Updated:', name, peerId);
                setPeers(prev => {
                    const existing = prev.find(p => p.id === peerId);
                    if (existing) {
                        return prev.map(p => p.id === peerId ? { ...p, name, hue } : p);
                    }
                    // Peer doesn't exist yet (identity arrived before stream), add it
                    return [...prev, { id: peerId, name, hue }];
                });
            }
        });

        // Start it
        newManager.start().catch(err => console.error('[WebRTCProvider] Failed to start manager:', err));
        setManager(newManager);

        return () => {
            console.log('[WebRTCProvider] Cleaning up Manager');
            newManager.stop();
            setManager(null);
            setPeers([]);
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
        const defaults = [
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.files.fm:7073/announce',
            'wss://tracker.btorrent.xyz',
        ];

        // If explicitly localhost in browser check, ideally we add local.
        // But for generic defaults, we stick to public ones.
        // The user can add their own local ones or rely on auto-detection logic if they want.
        // Wait, previous logic had auto-detection inside settings? No, inside component mount logic.
        // Let's just stick to public defaults here to start clean.
        setTrackerUrls(defaults);
    }, []);

    // Ensure we have at least defaults if empty
    useEffect(() => {
        if (trackerUrls.length === 0) {
            restoreDefaultTrackers();
        }
    }, []);

    return (
        <WebRTCContext.Provider value={{
            manager,
            peers,
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
