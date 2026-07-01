import React, { useEffect, useState, createContext, useContext, useRef, useCallback } from 'react';
import { useWebRTCClient } from '../../lib/webrtc/useWebRTCClient';
import { MicrophoneManager } from './audio/MicrophoneManager';
import type { PassiveGameState } from './gameplay/MelodiqSession';

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
    gameState: PassiveGameState | null;
    sendClientCommand: (command: string, data?: any) => void;
    clientProfile: ClientProfile;
    clientRole: string;
    setClientRole: (role: string) => void;
    promptedSongId: string | null;
    setPromptedSongId: (id: string | null) => void;
}

export const ClientEngineContext = createContext<ClientEngineContextType>({
    isConnected: false,
    statusMessage: 'Not connected',
    gameState: null,
    sendClientCommand: () => {},
    clientProfile: { name: 'Phone', hue: 120, deviceId: '' },
    clientRole: 'spectator',
    setClientRole: () => {},
    promptedSongId: null,
    setPromptedSongId: () => {},
});

export const useClientEngine = () => useContext(ClientEngineContext);

export const PhoneClientEngine: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const params = new URLSearchParams(window.location.search);
    const partyId = params.get('party');

    const [trackerUrls, setTrackerUrls] = useState<string[]>([]);
    useEffect(() => {
        // Parse trackers from URL
        const urls = params.getAll('tracker');
        if (urls.length > 0) {
            setTrackerUrls(urls);
        } else {
            // Fallback to local storage if empty
            const stored = localStorage.getItem('melodiq_tracker_urls');
            if (stored) setTrackerUrls(JSON.parse(stored));
        }
    }, []);

    const [gameState, setGameState] = useState<PassiveGameState | null>(null);

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

    const updateClientProfile = useCallback((updates: Partial<ClientProfile>) => {
        setClientProfile(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem('melodiq_client_profile', JSON.stringify(next));
            window.dispatchEvent(new Event('melodiq_profile_update'));
            return next;
        });
    }, []);
    
    // Using useQueue here to locally dispatch updates received from Host
    // NOTE: This requires useQueue to expose a way to OVERRIDE local storage, or we just rely on BroadcastChannel
    // The BroadcastChannel in useQueue syncs all hooks in this tab, which is perfect!
    
    const lastSyncedSongIdRef = useRef<string | null>(null);

    const handleMessage = useCallback((data: any) => {
        if (!data || !data.type) return;

        if (data.type === 'game_state_update') {
            setGameState(data.state);
            
            // Auto-sync session view if phone joined late or reloaded
            const activeId = data.state.activeSongId;
            if (activeId && activeId !== lastSyncedSongIdRef.current) {
                lastSyncedSongIdRef.current = activeId;
                window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: { activeSong: { id: activeId } } }));
            } else if (!activeId && lastSyncedSongIdRef.current) {
                lastSyncedSongIdRef.current = null;
                window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: { activeSong: null } }));
            }
        } else if (data.type === 'queue.update') {
            window.dispatchEvent(new CustomEvent('melodiq_client_queue_update', { detail: data }));
        } else if (data.type === 'session_sync') {
            window.dispatchEvent(new CustomEvent('melodiq_client_session_sync', { detail: data }));
            if (data.activeSong && data.participants) {
                const isSinger = data.participants.some((p: any) => p.deviceId === clientProfile.deviceId);
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
            // Find our role in the roster
            if (data.roster && Array.isArray(data.roster)) {
                const me = data.roster.find((r: any) => r.deviceId === clientProfile.deviceId);
                if (me && me.role) {
                    setClientRole(me.role);
                }
            }
        }
    }, [clientProfile.deviceId]);

    const getIdentity = useCallback(() => {
        return {
            name: clientProfile.name,
            hue: clientProfile.hue,
            deviceId: clientProfile.deviceId
        };
    }, [clientProfile.name, clientProfile.hue, clientProfile.deviceId]);

    const { isConnected, statusMessage, sendData, resendIdentity } = useWebRTCClient(partyId, trackerUrls, {
        autoConnect: true,
        onMessage: handleMessage,
        getIdentity
    });

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
            if (!gameState?.isPlaying || !mounted || clientRole === 'spectator') return;

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
        if (gameState?.isPlaying && clientRole === 'singer') {
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
    }, [gameState?.isPlaying, sendData, clientProfile.micDeviceId, clientRole]);

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
            isConnected, statusMessage, gameState, sendClientCommand, 
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
