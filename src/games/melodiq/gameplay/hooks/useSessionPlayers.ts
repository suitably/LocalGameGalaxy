import { useState, useEffect, useRef } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import { type UserProfile, type ActivePlayer } from '../../MelodiqSettings';
import { type Song } from '../../db';

interface UseSessionPlayersProps {
    manager: any;
    activePeers: any[];
    parsedSong: any;
    song: Song;
    switchTrack: (playerIndex: number, trackIndex: number) => void;
    setResults: React.Dispatch<React.SetStateAction<any[]>>;
    togglePlay: () => void;
    onExit: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    activeSessionOverride?: any[] | null;
}

export function useSessionPlayers({
    manager,
    activePeers,
    parsedSong,
    song,
    switchTrack,
    setResults,
    togglePlay,
    onExit,
    audioRef,
    videoRef,
    activeSessionOverride
}: UseSessionPlayersProps) {
    const [players, setPlayers] = useState<PlayerRuntime[]>([]);
    const [ready, setReady] = useState(false);
    const playersRef = useRef<PlayerRuntime[]>([]);

    // Initialization Effect: Load Players from Settings
    useEffect(() => {
        const storedProfiles = localStorage.getItem('melodiq_profiles');
        
        let activeSession: ActivePlayer[] = [];
        const storedActive = JSON.parse(localStorage.getItem('melodiq_active_session') || '[]');
        
        if (activeSessionOverride) {
            activeSession = activeSessionOverride;
        } else {
            activeSession = storedActive;
        }

        const storedMicSlots = JSON.parse(localStorage.getItem('melodiq_mic_slots') || '[]');
        let localMicIndex = 0;

        activeSession = activeSession.map(p => {
            if (p.isRemote || p.profileId === 'BOT') return p;
            
            // Assign from mic slots
            const assignedDeviceId = storedMicSlots[localMicIndex] || '';
            localMicIndex++;

            return { ...p, deviceId: assignedDeviceId };
        });

        // Filter out local users without a mic!
        activeSession = activeSession.filter(p => p.isRemote || p.profileId === 'BOT' || p.deviceId !== '');

        if (storedProfiles && activeSession.length > 0) {
            const allProfiles: UserProfile[] = JSON.parse(storedProfiles);

            const newPlayers: PlayerRuntime[] = [];

            activeSession.forEach(p => {
                if (p.profileId === 'BOT') {
                    newPlayers.push(new PlayerRuntime({
                        id: 'BOT',
                        name: 'Bot',
                        hue: 330, // Pink
                        deviceId: 'BOT',
                        volume: 0.8,
                        muted: false,
                        latency: 0,
                        isRemote: false
                    }));
                } else {
                    const profile = allProfiles.find(prof => prof.id === p.profileId);
                    if (profile) {
                        newPlayers.push(new PlayerRuntime({
                            ...profile,
                            deviceId: p.deviceId,
                            volume: p.volume ?? 1.0,
                            muted: p.muted ?? false,
                            latency: p.latency ?? 0,
                            isRemote: p.isRemote ?? false,
                            hidePitch: p.hidePitch ?? false
                        }));
                    }
                }
            });

            console.log('[MelodiqSession] Initialized players:', newPlayers.length);
            setPlayers(newPlayers);
            playersRef.current = newPlayers;
            setReady(true);
        } else {
            console.warn("No dynamic settings found, falling back to empty session.");
            setReady(true);
        }

        return () => {
            console.log('[MelodiqSession] Cleaning up players on unmount...');
            // Create a copy to cleanup, as ref might change
            const playersToStop = [...playersRef.current];
            playersToStop.forEach(p => {
                p.stop().catch(e => console.warn("Error stopping player:", e));
            });
        };
    }, []);

    // Sync Players with WebRTC Peers
    useEffect(() => {
        if (!manager) return;

        // Message Handling
        manager.onMessage = (peerId: string, data: any) => {
            if (data.type === 'trackSelect' && typeof data.trackIndex === 'number') {
                const currentPlayers = playersRef.current;
                const pIdx = currentPlayers.findIndex(p => p.remotePeerId === peerId);
                if (pIdx !== -1) {
                    console.log(`[Session] Remote track switch for ${currentPlayers[pIdx].config.name} -> Track ${data.trackIndex}`);
                    switchTrack(pIdx, data.trackIndex);
                }
            }

            if (data.type === 'history_report') {
                console.log(`[Session] Received history from ${peerId}`, data);
                setResults(prev => prev.map(r => {
                    if (r.remotePeerId === peerId && r.config.isRemote) {
                        return {
                            ...r,
                            history: data.history,
                            isNewRecord: data.isNewRecord,
                            loadingHistory: false
                        };
                    }
                    return r;
                }));
            }

            // Phone Remote Control Commands
            if (data.type === 'remote.command') {
                console.log(`[Session] Remote command from ${peerId}:`, data.command);
                switch (data.command) {
                    case 'UPDATE_PROFILE':
                        if (data.latency !== undefined) {
                            setPlayers(prevPlayers => {
                                const newPlayers = [...prevPlayers];
                                const pIdx = newPlayers.findIndex(p => p.remotePeerId === peerId);
                                if (pIdx !== -1) {
                                    newPlayers[pIdx].config.latency = data.latency;
                                }
                                playersRef.current = newPlayers;
                                return newPlayers;
                            });
                        }
                        break;
                    case 'play':
                        togglePlay();
                        break;
                    case 'restart':
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            if (videoRef.current) videoRef.current.currentTime = 0;
                        }
                        break;
                    case 'next':
                        // Skip to end to trigger song-end handler
                        if (audioRef.current && audioRef.current.duration) {
                            audioRef.current.currentTime = audioRef.current.duration - 0.1;
                        }
                        break;
                    case 'exit':
                        onExit();
                        break;
                    case 'session.join_mode':
                        const mode = data.mode; // 'singer' or 'spectator'
                        const isSpectator = mode === 'spectator';
                        setPlayers(prevPlayers => {
                            const newPlayers = [...prevPlayers];
                            const pIdx = newPlayers.findIndex(p => p.remotePeerId === peerId);
                            if (pIdx !== -1) {
                                console.log(`[Session] Phone ${peerId} changed join mode to ${mode}`);
                                newPlayers[pIdx].config.hidePitch = isSpectator;
                                // If they become a spectator, we could also clear their current score, but it's fine
                            }
                            playersRef.current = newPlayers;
                            return newPlayers;
                        });
                        break;
                }
            }
        };

        setPlayers(prevPlayers => {
            let updatedPlayers = [...prevPlayers];
            let changed = false;

            // 1. Attach/Add/Update connected peers
            activePeers.forEach(peer => {
                const existingIdx = updatedPlayers.findIndex(p => 
                    (peer.deviceId && p.config.deviceId === peer.deviceId) || 
                    p.config.deviceId === peer.peerId
                );

                if (existingIdx !== -1) {
                    // Attach to existing player AND Update Details
                    const player = updatedPlayers[existingIdx];

                    // Check for identity updates (Name/Hue)
                    if (player.config.name !== peer.name || player.config.hue !== peer.hue) {
                        console.log(`[Session] Updating details for ${player.config.name} -> ${peer.name}`);
                        player.config.name = peer.name;
                        if (peer.hue !== undefined) player.config.hue = peer.hue;
                        changed = true;
                    }

                    if (!player.webRtcManager) {
                        console.log(`[Session] Attaching Phone ${peer.name} to existing player ${player.config.name}`);
                        player.attachRemotePeer(manager, peer.peerId);
                        changed = true;
                    }
                } else {
                    // Create new Guest Player
                    console.log(`[Session] New Phone Guest: ${peer.name}`);
                    const newProfile: UserProfile = {
                        id: peer.peerId,
                        name: peer.name,
                        hue: peer.hue || Math.floor(Math.random() * 360)
                    };

                    const newPlayer = new PlayerRuntime({
                        ...newProfile,
                        deviceId: peer.deviceId || peer.peerId, // Device ID is persistent ID if available
                        volume: 1.0,
                        muted: false,
                        latency: 0,
                        isRemote: true,
                        hidePitch: true // Default to spectator
                    }, manager);

                    newPlayer.attachRemotePeer(manager, peer.peerId);

                    updatedPlayers.push(newPlayer);
                    changed = true;
                }
            });

            // 2. Handle Disconnected Peers
            // Remove Guests who disconnected
            const activePeerIds = new Set(activePeers.map(p => p.peerId));
            const filtered = updatedPlayers.filter(p => {
                if (p.config.isRemote) {
                    // If peer is gone
                    if (!p.remotePeerId || !activePeerIds.has(p.remotePeerId)) {
                        // If Guest (profileId matches deviceId basically, meaning not from activeSession)
                        if (p.config.id === p.config.deviceId) {
                            console.log(`[Session] removing disconnected guest ${p.config.name}`);
                            changed = true;
                            return false;
                        }
                    }
                }
                return true;
            });

            if (filtered.length !== updatedPlayers.length) {
                updatedPlayers = filtered;
                changed = true;
            }

            if (changed) {
                playersRef.current = updatedPlayers;
            }
            return changed ? updatedPlayers : prevPlayers;
        });

    }, [activePeers, manager]);

    // Broadcast Song Info (Tracks) to Peers
    useEffect(() => {
        if (!manager || !parsedSong) return;

        const trackNames = parsedSong.tracks && parsedSong.tracks.length > 0
            ? parsedSong.tracks.map((t: any, i: number) => t.name || `Player ${i + 1}`)
            : [];

        const payload = {
            type: 'songInfo',
            title: song.title,
            artist: song.artist,
            tracks: trackNames
        };

        // Send to all connected remote players
        players.forEach(p => {
            if (p.config.isRemote && p.webRtcManager && p.remotePeerId && p.webRtcManager.getConnectedPeers().some(cp => cp.peerId === p.remotePeerId)) {
                p.webRtcManager.sendToPeer(p.remotePeerId, payload);
            }
        });

    }, [manager, parsedSong, players.length, song.title]);

    return { players, setPlayers, playersRef, ready };
}
