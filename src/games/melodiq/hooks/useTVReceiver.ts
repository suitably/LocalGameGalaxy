import { useState, useEffect, useCallback } from 'react';
import { type Song } from '../db';
import { type PassiveGameState, type PresentationConnection, type NavigatorWithPresentation } from '../types';
import { useMelodiqSettings, type SettingsState } from './SettingsContext';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

export interface TVSessionPayload {
    partyId?: string;
    trackerUrls?: string[];
    baseUrl?: string;
}

export interface TVMessagePayload {
    songData?: Song;
    currentTime?: number;
    command?: string;
    value?: { title: string; artist: string };
    partyId?: string;
    trackerUrls?: string[];
    baseUrl?: string;
    sessionInfo?: TVSessionPayload;
    [key: string]: unknown;
}

export interface TVSessionInfo {
    partyId: string;
    activeTrackerUrls: string[];
    baseUrl: string;
}

export const useTVReceiver = () => {
    const { updateSetting } = useMelodiqSettings();

    const [activeSong, setActiveSong] = useState<(Song & { initialTime?: number }) | null>(null);
    const [passiveState, setPassiveState] = useState<PassiveGameState | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [downloadingSong, setDownloadingSong] = useState<{ title: string; artist: string } | null>(null);

    const [sessionInfo, setSessionInfo] = useState<TVSessionInfo>(() => {
        let party = '';
        let base = '';
        try {
            const params = new URLSearchParams(window.location.search);
            party = params.get('party') || params.get('partyId') || '';
            base = params.get('baseUrl') || '';
        } catch { }
        const storedParty = storage.get(STORAGE_KEYS.MELODIQ_PARTY_ID);
        const storedBase = storage.get(STORAGE_KEYS.MELODIQ_HOST_BASE_URL) || (typeof window !== 'undefined' ? window.location.origin : '');
        const storedTrackers = storage.getJson<string[]>(STORAGE_KEYS.MELODIQ_TRACKER_URLS, []);

        return {
            partyId: party || (storedParty !== 'TV-MODE' ? storedParty : ''),
            baseUrl: base || storedBase,
            activeTrackerUrls: storedTrackers
        };
    });

    const updateSessionInfo = useCallback((info?: TVSessionPayload) => {
        if (!info) return;
        setSessionInfo(prev => {
            const nextPartyId = (info.partyId && info.partyId !== 'TV-MODE') ? info.partyId : prev.partyId;
            const nextTrackers = Array.isArray(info.trackerUrls) && info.trackerUrls.length > 0 ? info.trackerUrls : prev.activeTrackerUrls;
            const nextBaseUrl = info.baseUrl || prev.baseUrl;
            if (nextPartyId) storage.set(STORAGE_KEYS.MELODIQ_PARTY_ID, nextPartyId);
            if (nextBaseUrl) storage.set(STORAGE_KEYS.MELODIQ_HOST_BASE_URL, nextBaseUrl);
            if (nextTrackers.length > 0) storage.setJson(STORAGE_KEYS.MELODIQ_TRACKER_URLS, nextTrackers);
            return { partyId: nextPartyId, activeTrackerUrls: nextTrackers, baseUrl: nextBaseUrl };
        });
    }, []);

    useEffect(() => {
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEYS.MELODIQ_PARTY_ID && e.newValue && e.newValue !== 'TV-MODE') {
                setSessionInfo(prev => ({ ...prev, partyId: e.newValue || prev.partyId }));
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        const channel = new BroadcastChannel('melodiq_tv_control');

        const handleMessage = (type: string, payload?: TVMessagePayload) => {
            if (!payload && type !== 'PING' && type !== 'STOP_SONG') return;

            if (type === 'HOST_SESSION_INFO' && payload) {
                updateSessionInfo(payload as TVSessionPayload);
            } else if (type === 'PLAY_SONG' && payload) {
                if (payload.sessionInfo) {
                    updateSessionInfo(payload.sessionInfo);
                }
                if (payload.songData) {
                    setDownloadingSong(null);
                    setActiveSong(prev => {
                        if (prev && prev.id === payload.songData?.id && payload.currentTime === undefined) {
                            return prev;
                        }
                        return {
                            ...(payload.songData as Song),
                            initialTime: payload.currentTime || 0
                        };
                    });
                }
            } else if (type === 'STOP_SONG') {
                setDownloadingSong(null);
                setActiveSong(null);
                setPassiveState(null);
            } else if (type === 'REMOTE_COMMAND' && payload?.command === 'WAIT_FOR_DOWNLOAD' && payload.value) {
                setActiveSong(null);
                setDownloadingSong({ title: payload.value.title, artist: payload.value.artist });
            } else if (type === 'SETTINGS_UPDATE' && payload) {
                Object.entries(payload).forEach(([k, v]) => {
                    updateSetting(k as keyof SettingsState, v as SettingsState[keyof SettingsState]);
                });
            } else if (type === 'GAME_STATE' && payload) {
                const state = payload as unknown as PassiveGameState;
                setPassiveState(state);
                window.dispatchEvent(new CustomEvent('melodiq_tv_game_state', { detail: payload }));
            } else if (type === 'PING') {
                channel.postMessage({ type: 'PONG' });
            }
        };

        channel.onmessage = e => handleMessage(e.data.type, e.data.payload);
        channel.postMessage({ type: 'TV_READY' });

        // Presentation API
        const nav = navigator as NavigatorWithPresentation;
        if (nav.presentation?.receiver) {
            nav.presentation.receiver.connectionList.then(list => {
                list.connections.forEach((conn: PresentationConnection) => setupConnection(conn));
                list.onconnectionavailable = (evt: { connection: PresentationConnection }) => setupConnection(evt.connection);
            });
        }

        function setupConnection(connection: PresentationConnection) {
            setIsConnected(true);
            connection.onmessage = (event: MessageEvent) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data.type, data.payload);
                } catch (e) {
                    console.error('Failed to parse presentation msg', e);
                }
            };
            connection.send(JSON.stringify({ type: 'TV_READY' }));
        }

        return () => channel.close();
    }, [updateSetting, updateSessionInfo]);

    return {
        activeSong,
        setActiveSong,
        passiveState,
        isConnected,
        downloadingSong,
        sessionInfo
    };
};
