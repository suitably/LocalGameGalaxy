import React, { useEffect, useState, createContext, useContext, useRef } from 'react';
import { useWebRTCClient } from '../../lib/webrtc/useWebRTCClient';
import { MicrophoneManager } from './audio/MicrophoneManager';
import type { PassiveGameState } from './gameplay/MelodiqSession';

interface ClientEngineContextType {
    isConnected: boolean;
    statusMessage: string;
    gameState: PassiveGameState | null;
    sendClientCommand: (command: string, data?: any) => void;
}

export const ClientEngineContext = createContext<ClientEngineContextType>({
    isConnected: false,
    statusMessage: 'Not connected',
    gameState: null,
    sendClientCommand: () => {},
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
    
    // Using useQueue here to locally dispatch updates received from Host
    // NOTE: This requires useQueue to expose a way to OVERRIDE local storage, or we just rely on BroadcastChannel
    // The BroadcastChannel in useQueue syncs all hooks in this tab, which is perfect!

    const handleMessage = (data: any) => {
        if (!data || !data.type) return;

        if (data.type === 'game_state_update') {
            setGameState(data.state);
        } else if (data.type === 'queue.update') {
            // Trigger a custom event that useQueue can listen to if needed, 
            // OR if we abstract useQueue to accept an external dispatcher, we do it here.
            // For now, we will use a global window event to sync the queue on the client
            window.dispatchEvent(new CustomEvent('melodiq_client_queue_update', { detail: data }));
        }
    };

    const { isConnected, statusMessage, sendData } = useWebRTCClient(partyId, trackerUrls, {
        autoConnect: true,
        onMessage: handleMessage,
        getIdentity: () => ({ name: 'Phone', hue: 120 })
    });

    // Request initial data on connect
    useEffect(() => {
        if (isConnected) {
            setTimeout(() => {
                sendData({ type: 'queue.get' });
            }, 500);
        }
    }, [isConnected, sendData]);

    // Microphone Processing Loop
    const micRef = useRef<MicrophoneManager | null>(null);
    const animFrameRef = useRef<number>(0);
    const lastPitchSendTimeRef = useRef<number>(0);

    useEffect(() => {
        // Start processing audio when the session is actually playing
        if (gameState?.isPlaying) {
            if (!micRef.current) {
                const mic = new MicrophoneManager();
                micRef.current = mic;
                mic.start(undefined, 1.0, false).then(() => {
                    console.log("[PhoneClientEngine] Microphone started successfully.");
                    const processAudio = () => {
                        const now = performance.now();
                        if (now - lastPitchSendTimeRef.current > 33) { // ~30fps pitch send
                            const pitch = mic.getPitch();
                            // Always send volume so the host knows we are active, but frequency only if valid
                            if (pitch) {
                                sendData({ type: 'pitch', frequency: pitch.frequency, note: pitch.note, volume: pitch.volume });
                            } else {
                                const currentVol = mic.getCurrentVolume();
                                sendData({ type: 'pitch', frequency: -1, note: -1, volume: currentVol });
                            }
                            lastPitchSendTimeRef.current = now;
                        }
                        animFrameRef.current = requestAnimationFrame(processAudio);
                    };
                    processAudio();
                }).catch(err => {
                    console.error("[PhoneClientEngine] Failed to start microphone:", err);
                });
            }
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
            if (micRef.current) {
                micRef.current.stop();
                micRef.current = null;
            }
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [gameState?.isPlaying, sendData]);

    const sendClientCommand = (command: string, data: any = {}) => {
        sendData({ type: 'remote.command', command, ...data });
    };

    return (
        <ClientEngineContext.Provider value={{ isConnected, statusMessage, gameState, sendClientCommand }}>
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
