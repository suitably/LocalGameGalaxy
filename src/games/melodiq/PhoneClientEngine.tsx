import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import { useWebRTCClient } from '../../lib/webrtc/useWebRTCClient';
import { MicrophoneManager } from './audio/MicrophoneManager';

export interface ClientProfile {
    name: string;
    hue: number;
    micDeviceId?: string;
    displayMode?: 'lyrics' | 'self' | 'all';
    latency?: number;
    deviceId: string;
}

interface ClientEngineContextType {
    isConnected: boolean;
    statusMessage: string;
    isSessionPlaying: boolean;
    activeSongId: string | null;
    sendClientCommand: (command: string, data?: any) => void;
    clientProfile: ClientProfile;
    clientRole: string;
    setClientRole: (role: string) => void;
    promptedSongId: string | null;
    setPromptedSongId: (id: string | null) => void;
    updateClientProfile: (updates: Partial<ClientProfile>) => void;
}

export const ClientEngineContext = createContext<ClientEngineContextType>({
    isConnected: false,
    statusMessage: 'Not connected',
    isSessionPlaying: false,
    activeSongId: null,
    sendClientCommand: () => {},
    clientProfile: { name: 'Phone', hue: 120, deviceId: '' },
    clientRole: 'spectator',
    setClientRole: () => {},
    promptedSongId: null,
    setPromptedSongId: () => {},
    updateClientProfile: () => {},
});

export const useClientEngine = () => useContext(ClientEngineContext);

export const PhoneClientEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const params = new URLSearchParams(window.location.search);
    const partyId = params.get('party');

    const [trackerUrls] = useState<string[]>(() => {
        const urls = new URLSearchParams(window.location.search).getAll('tracker');
        if (urls.length > 0) {
            return urls;
        }
        const stored = localStorage.getItem('melodiq_tracker_urls');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {}
        }
        return [];
    });

    // Profile State
    const [clientProfile, setClientProfile] = useState<ClientProfile>(() => {
        const stored = localStorage.getItem('melodiq_client_profile');
        if (stored) {
            try { 
                const parsed = JSON.parse(stored);
                if (!parsed.displayMode) parsed.displayMode = 'lyrics';
                if (!parsed.deviceId) {
                    parsed.deviceId = crypto.randomUUID();
                    localStorage.setItem('melodiq_client_profile', JSON.stringify(parsed));
                }
                return parsed;
            } catch (e) {}
        }
        const newProfile: ClientProfile = { 
            name: 'Phone', 
            hue: Math.floor(Math.random() * 360), 
            displayMode: 'lyrics',
            deviceId: crypto.randomUUID()
        };
        localStorage.setItem('melodiq_client_profile', JSON.stringify(newProfile));
        return newProfile;
    });
    const [clientRole, setClientRole] = useState<string>('spectator');
    const [promptedSongId, setPromptedSongId] = useState<string | null>(null);

    // Derived session state — updated only when these specific values change to avoid 20fps re-renders
    const [isSessionPlaying, setIsSessionPlaying] = useState<boolean>(false);
    const [activeSongId, setActiveSongId] = useState<string | null>(null);

    const updateClientProfile = useCallback((updates: Partial<ClientProfile>) => {
        setClientProfile(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem('melodiq_client_profile', JSON.stringify(next));
            window.dispatchEvent(new Event('melodiq_profile_update'));
            return next;
        });
    }, []);

    // Ref-based state for use inside stable callbacks
    const clientProfileRef = useRef(clientProfile);
    useEffect(() => { clientProfileRef.current = clientProfile; }, [clientProfile]);

    const isSessionPlayingRef = useRef(isSessionPlaying);
    useEffect(() => { isSessionPlayingRef.current = isSessionPlaying; }, [isSessionPlaying]);

    const activeSongIdRef = useRef(activeSongId);
    useEffect(() => { activeSongIdRef.current = activeSongId; }, [activeSongId]);

    // Buffer to reassemble chunked api_response messages
    const chunkBufferRef = useRef<Map<string, { chunks: string[], total: number }>>(new Map());

    const lastSyncedSongIdRef = useRef<string | null>(null);

    const handleMessage = useCallback((data: any) => {
        if (!data || !data.type) return;

        if (data.type === 'game_state_update') {
            // Only trigger React re-render if isPlaying or activeSongId actually changed
            if (data.state.isPlaying !== isSessionPlayingRef.current) {
                setIsSessionPlaying(data.state.isPlaying);
                isSessionPlayingRef.current = data.state.isPlaying;
            }

            const activeId = data.state.activeSongId || null;
            if (activeId !== activeSongIdRef.current) {
                setActiveSongId(activeId);
                activeSongIdRef.current = activeId;
            }

            // Dispatch the full game state for lightweight event listeners (lyrics, etc.)
            window.dispatchEvent(new CustomEvent('melodiq_tv_game_state', { detail: data.state }));

            const activeSong = data.state.activeSong || (activeId ? { id: activeId } : null);
            
            // Auto-sync session view if phone joined late, reloaded, or a new song started
            const participants = data.state.players?.map((p: any) => p.config || {
                profileId: p.id,
                deviceId: p.deviceId || p.id,
                name: p.name,
                hue: p.hue,
                isRemote: true
            });

            if (activeId && activeId !== lastSyncedSongIdRef.current) {
                lastSyncedSongIdRef.current = activeId;
                window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: { activeSong, participants } }));
            } else if (!activeId && lastSyncedSongIdRef.current) {
                lastSyncedSongIdRef.current = null;
                window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: { activeSong: null, participants } }));
            }

        } else if (data.type === 'queue.update') {
            window.dispatchEvent(new CustomEvent('melodiq_client_queue_update', { detail: data }));

        } else if (data.type === 'session_sync') {
            window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: data }));
            if (data.activeSong && data.participants) {
                const isSinger = data.participants.some((p: any) => p.deviceId === clientProfileRef.current.deviceId);
                if (isSinger) {
                    setClientRole('singer');
                    updateClientProfile({ displayMode: 'self' });
                } else {
                    setClientRole('spectator');
                    updateClientProfile({ displayMode: 'lyrics' });
                }
            } else if (!data.activeSong) {
                setClientRole('spectator');
                updateClientProfile({ displayMode: 'lyrics' });
            }

        } else if (data.type === 'roster.update') {
            if (data.roster && Array.isArray(data.roster)) {
                const me = data.roster.find((r: any) => r.deviceId === clientProfileRef.current.deviceId);
                if (me && me.role) {
                    setClientRole(me.role);
                }
            }

        } else if (data.type === 'api_response_chunk') {
            // Reassemble chunked API response
            const { reqId, chunk, index, total } = data;
            if (!chunkBufferRef.current.has(reqId)) {
                chunkBufferRef.current.set(reqId, { chunks: new Array(total), total });
            }
            const buf = chunkBufferRef.current.get(reqId)!;
            buf.chunks[index] = chunk;

            // Check if all chunks arrived
            const receivedCount = buf.chunks.filter(c => c !== undefined).length;
            if (receivedCount === total) {
                chunkBufferRef.current.delete(reqId);
                try {
                    const fullJson = buf.chunks.join('');
                    const parsed = JSON.parse(fullJson);
                    window.dispatchEvent(new CustomEvent(`melodiq_api_response_${reqId}`, { detail: parsed }));
                } catch (e) {
                    console.error('[PhoneClientEngine] Failed to parse reassembled api_response:', e);
                    window.dispatchEvent(new CustomEvent(`melodiq_api_response_${reqId}`, { 
                        detail: { reqId, status: 500, error: 'Chunk reassembly parse failed' }
                    }));
                }
            }

        } else if (data.type === 'api_response') {
            // Legacy fallback for small responses sent without chunking
            window.dispatchEvent(new CustomEvent(`melodiq_api_response_${data.reqId}`, { detail: data }));

        } else if (data.type === 'helper_config') {
            // Host sent us the helper URL (without token!) so we can load images
            if (data.url) {
                localStorage.setItem('melodiq_helper_url', data.url);
                localStorage.setItem('melodiq_enable_helper', 'true');
                window.dispatchEvent(new Event('melodiq_settings_updated'));
            }
        }
    }, [updateClientProfile]);

    const getIdentity = useCallback(() => {
        return {
            name: clientProfileRef.current.name,
            hue: clientProfileRef.current.hue,
            deviceId: clientProfileRef.current.deviceId
        };
    }, []);

    const { isConnected, statusMessage, sendData, resendIdentity } = useWebRTCClient(partyId, trackerUrls, {
        autoConnect: true,
        onMessage: handleMessage,
        getIdentity
    });

    // Signal connection state for melodiqFetch waitForConnection()
    useEffect(() => {
        if (isConnected) {
            sessionStorage.setItem('melodiq_rtc_connected', 'true');
            (window as any).__melodiq_rtc_connected = true;
            window.dispatchEvent(new Event('melodiq_rtc_connected'));
        } else {
            sessionStorage.removeItem('melodiq_rtc_connected');
            (window as any).__melodiq_rtc_connected = false;
        }
    }, [isConnected]);

    // Request initial data on connect
    useEffect(() => {
        if (isConnected) {
            setTimeout(() => {
                sendData({ type: 'queue.get' });
            }, 500);
        }
    }, [isConnected, sendData]);

    // Listen for events from UI components (like useQueue) to forward to Host
    useEffect(() => {
        const handler = (e: any) => {
            if (isConnected) {
                sendData(e.detail);
            }
        };
        window.addEventListener('melodiq_client_send_data', handler);
        return () => window.removeEventListener('melodiq_client_send_data', handler);
    }, [isConnected, sendData]);

    // Microphone Processing Loop
    const micRef = useRef<MicrophoneManager | null>(null);
    const animFrameRef = useRef<number>(0);
    const lastPitchSendTimeRef = useRef<number>(0);

    useEffect(() => {
        let mounted = true;

        const startMic = async () => {
            if (micRef.current) {
                await micRef.current.stop();
                micRef.current = null;
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = 0;
            }
            if (!isSessionPlaying || !mounted || clientRole === 'spectator') return;

            const mic = new MicrophoneManager();
            micRef.current = mic;
            
            try {
                await mic.start(clientProfile.micDeviceId);
                if (!mounted) {
                    mic.stop();
                    return;
                }
                
                console.log("[PhoneClientEngine] Microphone started successfully.");
                const processAudio = () => {
                    if (!mounted) return;
                    const now = performance.now();
                    if (now - lastPitchSendTimeRef.current > 33) {
                        const pitch = mic.getPitch();
                        if (pitch) {
                            sendData({ type: 'pitch', frequency: pitch.frequency, note: pitch.note, volume: pitch.volume });
                            window.dispatchEvent(new CustomEvent('melodiq_local_pitch', { detail: { pitch } }));
                        } else {
                            const currentVol = mic.getCurrentVolume();
                            sendData({ type: 'pitch', frequency: -1, note: -1, volume: currentVol });
                            window.dispatchEvent(new CustomEvent('melodiq_local_pitch', { detail: { pitch: null } }));
                        }
                        lastPitchSendTimeRef.current = now;
                    }
                    animFrameRef.current = requestAnimationFrame(processAudio);
                };
                processAudio();
            } catch (err) {
                console.error("[PhoneClientEngine] Failed to start microphone:", err);
            }
        };

        if (isSessionPlaying && clientRole === 'singer') {
            startMic();
        } else {
            // Stop mic when session is not playing to save battery
            if (micRef.current) {
                micRef.current.stop();
                micRef.current = null;
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = 0;
            }
        }

        return () => {
            mounted = false;
            if (micRef.current) {
                micRef.current.stop();
                micRef.current = null;
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [isSessionPlaying, sendData, clientProfile.micDeviceId, clientRole]);

    const sendClientCommand = (command: string, data: any = {}) => {
        sendData({ type: 'remote.command', command, ...data });
    };

    // Re-send identity if profile changes while connected
    useEffect(() => {
        if (isConnected && resendIdentity) {
            resendIdentity();
            sendClientCommand('UPDATE_PROFILE', { latency: clientProfile.latency || 0 });
        }
    }, [clientProfile.name, clientProfile.hue, clientProfile.latency, isConnected, resendIdentity]);

    return (
        <ClientEngineContext.Provider value={{ 
            isConnected, statusMessage, isSessionPlaying, activeSongId, sendClientCommand, 
            clientProfile, updateClientProfile, clientRole, setClientRole,
            promptedSongId, setPromptedSongId
        }}>
            {/* Show a connection overlay if not connected yet */}
            {!isConnected && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <h2>{statusMessage}</h2>
                </div>
            )}
            {children}
        </ClientEngineContext.Provider>
    );
};
