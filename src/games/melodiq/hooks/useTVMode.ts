import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, STORAGE_KEYS } from '../../../lib/storage';

// Minimal Presentation API Type Definitions
interface PresentationConnectionCloseEvent extends Event {
    reason: 'error' | 'closed' | 'wentaway';
    message: string;
}

interface PresentationConnection extends EventTarget {
    id: string;
    state: 'connecting' | 'connected' | 'closed' | 'terminated';
    send(message: string): void;
    close(): void;
    terminate(): void;
    onconnect: ((this: PresentationConnection, ev: Event) => any) | null;
    onclose: ((this: PresentationConnection, ev: PresentationConnectionCloseEvent) => any) | null;
    onterminate: ((this: PresentationConnection, ev: Event) => any) | null;
    onmessage: ((this: PresentationConnection, ev: MessageEvent) => any) | null;
}

interface PresentationRequest extends EventTarget {
    start(): Promise<PresentationConnection>;
    reconnect(id: string): Promise<PresentationConnection>;
    getAvailability(): Promise<PresentationAvailability>;
    onconnectionavailable: ((this: PresentationRequest, ev: PresentationConnectionAvailableEvent) => any) | null;
}

interface PresentationConnectionAvailableEvent extends Event {
    connection: PresentationConnection;
}

interface PresentationAvailability extends EventTarget {
    value: boolean;
    onchange: ((this: PresentationAvailability, ev: Event) => any) | null;
}

declare global {
    interface Window {
        PresentationRequest: {
            new(urls: string | string[]): PresentationRequest;
        };
    }
}

export interface TVEvent {
    type: string;
    payload?: any;
    timestamp: number;
}

export interface TVSessionInfo {
    partyId?: string;
    activeTrackerUrls?: string[];
    baseUrl?: string;
}

export const useTVMode = (sessionInfo?: TVSessionInfo) => {
    const [isTVConnected, setIsTVConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<TVEvent | null>(null);
    const [isPresentationAvailable, setIsPresentationAvailable] = useState(false);

    const sessionInfoRef = useRef(sessionInfo);
    useEffect(() => {
        sessionInfoRef.current = sessionInfo;
    }, [sessionInfo]);

    const getLatestSessionInfo = useCallback(() => {
        const currentPartyId = sessionInfoRef.current?.partyId || storage.get(STORAGE_KEYS.MELODIQ_PARTY_ID);
        const currentTrackers = sessionInfoRef.current?.activeTrackerUrls?.length
            ? sessionInfoRef.current.activeTrackerUrls
            : storage.getJson<string[]>(STORAGE_KEYS.MELODIQ_TRACKER_URLS, []);
        const currentBaseUrl = sessionInfoRef.current?.baseUrl
            || storage.get(STORAGE_KEYS.MELODIQ_HOST_BASE_URL)
            || (typeof window !== 'undefined' ? window.location.origin : '');

        return {
            partyId: currentPartyId && currentPartyId !== 'TV-MODE' ? currentPartyId : '',
            trackerUrls: currentTrackers,
            baseUrl: currentBaseUrl
        };
    }, []);

    // Transports
    const channelRef = useRef<BroadcastChannel | null>(null);
    const presentationConnectionRef = useRef<PresentationConnection | null>(null);
    const tvWindowRef = useRef<Window | null>(null);

    // Forward ref to sendMessage so handlers defined prior can use it
    const sendMessageRef = useRef<(type: string, payload?: any) => void>(() => {});

    const sendSessionInfo = useCallback(() => {
        const info = getLatestSessionInfo();
        if (info.partyId) {
            sendMessageRef.current('HOST_SESSION_INFO', info);
        }
    }, [getLatestSessionInfo]);

    // Unified Message Handler
    const handleMessage = useCallback((type: string, payload?: any) => {
        setLastEvent({ type, payload, timestamp: Date.now() });

        if (type === 'TV_READY' || type === 'PONG') {
            setIsTVConnected(true);
            sendSessionInfo();
        } else if (type === 'SONG_ENDED') {
            console.log('TV finished song');
        }
    }, [sendSessionInfo]);

    // Setup Broadcast Channel (Local Window)
    useEffect(() => {
        const channel = new BroadcastChannel('melodiq_tv_control');
        channelRef.current = channel;

        channel.onmessage = (event) => {
            const { type, payload } = event.data;
            handleMessage(type, payload);
        };

        // Check if already open (ping)
        channel.postMessage({ type: 'PING' });

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [handleMessage]);

    // Check Presentation Availability
    useEffect(() => {
        if (window.PresentationRequest) {
            const request = new window.PresentationRequest(['/games/melodiq/tv']);
            request.getAvailability()
                .then(availability => {
                    setIsPresentationAvailable(availability.value);
                    availability.onchange = () => {
                        setIsPresentationAvailable(availability.value);
                    };
                })
                .catch(e => console.log('Presentation availability check failed (not secure context?):', e));
        }
    }, []);

    // Sync settings changes to active PresentationConnection
    useEffect(() => {
        const handleSettings = (e: any) => {
            if (presentationConnectionRef.current && presentationConnectionRef.current.state === 'connected') {
                try {
                    presentationConnectionRef.current.send(JSON.stringify({ type: 'SETTINGS_UPDATE', payload: e.detail || {} }));
                } catch (err) {
                    console.error('Failed to send SETTINGS_UPDATE to PresentationConnection:', err);
                }
            }
        };
        window.addEventListener('melodiq_settings_updated', handleSettings);
        return () => window.removeEventListener('melodiq_settings_updated', handleSettings);
    }, []);

    // Unified Sender
    const sendMessage = useCallback((type: string, payload?: any) => {
        const msg = { type, payload };

        // Send via BroadcastChannel
        if (channelRef.current) {
            channelRef.current.postMessage(msg);
        }

        // Send via PresentationConnection
        if (presentationConnectionRef.current && presentationConnectionRef.current.state === 'connected') {
            try {
                presentationConnectionRef.current.send(JSON.stringify(msg));
            } catch (e) {
                console.error('Failed to send to PresentationConnection:', e);
            }
        }
    }, []);

    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    // Re-sync session info whenever TV connects or host session info changes
    useEffect(() => {
        if (isTVConnected) {
            sendSessionInfo();
        }
    }, [isTVConnected, sendSessionInfo, sessionInfo?.partyId, sessionInfo?.activeTrackerUrls]);

    const setupPresentationConnection = useCallback((connection: PresentationConnection) => {
        presentationConnectionRef.current = connection;

        connection.onconnect = () => {
            console.log('Presentation connected');
            setIsTVConnected(true);
            sendSessionInfo();
        };

        connection.onclose = () => {
            console.log('Presentation closed');
            setIsTVConnected(false);
            presentationConnectionRef.current = null;
        };

        connection.onterminate = () => {
            console.log('Presentation terminated');
            setIsTVConnected(false);
            presentationConnectionRef.current = null;
        };

        connection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data.type, data.payload);
            } catch (e) {
                console.error('Failed to parse presentation message:', e);
            }
        };
    }, [handleMessage, sendSessionInfo]);

    const startPresentation = useCallback(async () => {
        if (!window.PresentationRequest) return;

        try {
            const info = getLatestSessionInfo();
            const params = new URLSearchParams();
            if (info.partyId) params.set('party', info.partyId);
            if (info.baseUrl) params.set('baseUrl', info.baseUrl);
            const qs = params.toString() ? `?${params.toString()}` : '';

            const request = new window.PresentationRequest([`/games/melodiq/tv${qs}`]);
            const connection = await request.start();
            setupPresentationConnection(connection);
        } catch (error) {
            console.error('Presentation request failed:', error);
        }
    }, [setupPresentationConnection, getLatestSessionInfo]);

    const openTVWindow = useCallback(() => {
        if (tvWindowRef.current && !tvWindowRef.current.closed) {
            tvWindowRef.current.focus();
            return;
        }

        const width = 1280;
        const height = 720;
        const info = getLatestSessionInfo();
        const params = new URLSearchParams();
        if (info.partyId) params.set('party', info.partyId);
        if (info.baseUrl) params.set('baseUrl', info.baseUrl);
        const qs = params.toString() ? `?${params.toString()}` : '';

        const win = window.open(
            `/games/melodiq/tv${qs}`,
            'MelodiqTV',
            `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
        );
        tvWindowRef.current = win;

        const interval = setInterval(() => {
            if (win?.closed) {
                clearInterval(interval);
                // Only mark disconnected if NO presentation needs connection either
                if (!presentationConnectionRef.current || presentationConnectionRef.current.state !== 'connected') {
                    setIsTVConnected(false);
                }
                tvWindowRef.current = null;
            }
        }, 1000);
    }, [getLatestSessionInfo]);

    const playSongOnTV = useCallback((songId: string, songData?: any, currentTime?: number) => {
        const info = getLatestSessionInfo();
        sendMessage('PLAY_SONG', {
            songId,
            songData,
            currentTime: currentTime || 0,
            sessionInfo: info
        });
    }, [sendMessage, getLatestSessionInfo]);

    const stopSongOnTV = useCallback(() => {
        sendMessage('STOP_SONG');
    }, [sendMessage]);

    const sendRemoteCommand = useCallback((command: string, value?: any) => {
        sendMessage('REMOTE_COMMAND', { command, value });
    }, [sendMessage]);

    // Throttled Game State Update (for Host -> TV sync)
    const lastUpdateRef = useRef<number>(0);
    const sendGameUpdate = useCallback((state: any) => {
        const now = Date.now();
        // Limit to ~60fps (15ms) to improve smoothness
        if (now - lastUpdateRef.current > 15) {
            sendMessage('GAME_STATE', state);
            lastUpdateRef.current = now;
        }
    }, [sendMessage]);

    const disconnectTV = useCallback(() => {
        // 1. Close Window if open
        if (tvWindowRef.current) {
            tvWindowRef.current.close();
            tvWindowRef.current = null;
        }

        // 2. Terminate/Close Presentation
        if (presentationConnectionRef.current) {
            presentationConnectionRef.current.terminate(); // Terminate to stop receiver
            presentationConnectionRef.current = null;
        }

        setIsTVConnected(false);
    }, []);

    return {
        isTVConnected,
        isPresentationAvailable,
        lastEvent,
        openTVWindow,
        startPresentation,
        playSongOnTV,
        stopSongOnTV,
        sendRemoteCommand,
        sendGameUpdate,
        disconnectTV,
        sendSessionInfo
    };
};
