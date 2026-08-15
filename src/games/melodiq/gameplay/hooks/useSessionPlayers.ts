import { useState, useEffect, useRef } from 'react';
import { PlayerRuntime } from './PlayerRuntime';
import { type UserProfile, type ActivePlayer } from '../../types';
import { type Song } from '../../db';

interface UseSessionPlayersProps {
    manager: any;
    activePeers: any[];
    parsedSong: any;
    song: Song;
    switchTrack: (playerIndex: number, trackIndex: number) => void;
    setResults: React.Dispatch<React.SetStateAction<any[]>>;
    onExit: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    activeSessionOverride?: any[] | null;
    isPassive?: boolean;
}

export function useSessionPlayers({
    manager,
    activePeers,
    parsedSong,
    song,
    switchTrack,
    setResults,
    onExit,
    audioRef,
    videoRef,
    activeSessionOverride,
    isPassive = false
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

            newPlayers.forEach(p => {
                if (!p.config.isRemote) {
                    p.start().catch(e => console.warn('[Session] Failed to start player mic:', e));
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

    // Reactive update: sync player list when activeSessionOverride changes mid-session.
    // NOTE: This effect identifies players by profileId/deviceId — it does NOT re-assign mic
    // device IDs (that was done once at initialization). The goal is purely to add/remove
    // players and toggle hidePitch for phones based on the desired participant list.
    useEffect(() => {
        // Only run after initial mount (ready ensures initialization is done)
        if (!ready) return;
        if (isPassive) return; // Passive/TV displays get players from Host via GAME_STATE
        // Only relevant when an override is actively provided
        if (activeSessionOverride === null || activeSessionOverride === undefined) return;

        const storedProfiles = localStorage.getItem('melodiq_profiles');
        const allProfiles: UserProfile[] = storedProfiles ? JSON.parse(storedProfiles) : [];
        const storedMicSlots: string[] = JSON.parse(localStorage.getItem('melodiq_mic_slots') || '[]');

        const activePeerDeviceIds = new Set(activePeers.map(p => p.deviceId).filter(Boolean));
        const activePeerIds = new Set(activePeers.map(p => p.peerId));

        // Get all existing remote player identifiers currently loaded in playersRef
        const existingRemoteIds = new Set<string>();
        (playersRef.current || []).forEach(p => {
            if (p.config.isRemote) {
                if (p.config.id) existingRemoteIds.add(p.config.id);
                if (p.config.deviceId) existingRemoteIds.add(p.config.deviceId);
                if (p.remotePeerId) existingRemoteIds.add(p.remotePeerId);
            }
        });

        const isRemoteParticipant = (p: any) => {
            if (p.isRemote) return true;
            const id = p.profileId || p.deviceId;
            return activePeerDeviceIds.has(id) ||
                   activePeerIds.has(id) ||
                   activePeerDeviceIds.has(p.deviceId) ||
                   activePeerIds.has(p.deviceId) ||
                   existingRemoteIds.has(id) ||
                   existingRemoteIds.has(p.deviceId);
        };

        // Build sets of desired profileIds/keys for quick lookup
        const desiredLocalProfileIds = new Set<string>();
        const desiredRemoteKeys = new Set<string>();
        activeSessionOverride.forEach((p: any) => {
            if (isRemoteParticipant(p)) {
                if (p.deviceId) desiredRemoteKeys.add(p.deviceId);
                if (p.profileId) desiredRemoteKeys.add(p.profileId);
            } else {
                desiredLocalProfileIds.add(p.profileId || p.deviceId);
            }
        });

        setPlayers(prev => {
            const updated = [...prev];
            let changed = false;

            // 1. Add participants (local or remote) present in activeSessionOverride but not yet in players list
            let localMicIndex = 0;
            activeSessionOverride.forEach((p: any) => {
                const profileId = p.profileId || p.deviceId;
                const isRemote = isRemoteParticipant(p);
                const alreadyExists = updated.find(existing => 
                    existing.config.id === profileId || 
                    (p.deviceId && existing.config.deviceId === p.deviceId) ||
                    (p.deviceId && existing.remotePeerId === p.deviceId)
                );

                if (!alreadyExists) {
                    let newPlayer: PlayerRuntime | null = null;
                    if (isRemote) {
                        const peer = activePeers.find(ap => ap.deviceId === p.deviceId || ap.peerId === p.deviceId || ap.peerId === p.profileId);
                        newPlayer = new PlayerRuntime({
                            id: profileId,
                            name: p.name || peer?.name || 'Phone User',
                            hue: p.hue || peer?.hue || Math.floor(Math.random() * 360),
                            deviceId: p.deviceId || profileId,
                            volume: 1.0,
                            muted: false,
                            latency: 0,
                            isRemote: true,
                            hidePitch: false
                        }, manager);
                        if (peer) {
                            newPlayer.attachRemotePeer(manager, peer.peerId);
                        }
                    } else if (profileId === 'BOT') {
                        newPlayer = new PlayerRuntime({
                            id: 'BOT', name: 'Bot', hue: 330,
                            deviceId: 'BOT', volume: 0.8, muted: false, latency: 0, isRemote: false
                        });
                    } else {
                        const profile = allProfiles.find(prof => prof.id === profileId);
                        if (profile) {
                            const assignedDeviceId = storedMicSlots[localMicIndex] || '';
                            if (assignedDeviceId) {
                                newPlayer = new PlayerRuntime({
                                    ...profile,
                                    deviceId: assignedDeviceId,
                                    volume: p.volume ?? 1.0,
                                    muted: p.muted ?? false,
                                    latency: p.latency ?? 0,
                                    isRemote: false,
                                    hidePitch: false
                                });
                            }
                        }
                    }

                    if (newPlayer) {
                        if (!isRemote) {
                            newPlayer.start().catch(e => console.warn('[Session] Failed to start new player mic:', e));
                        }
                        console.log('[Session] Participant added live:', profileId, 'isRemote:', isRemote);
                        updated.push(newPlayer);
                        changed = true;
                    }
                }
                if (!isRemote) localMicIndex++;
            });

            // 2. Remove participants no longer in activeSessionOverride
            const filteredOut = updated.filter(existing => {
                const devId = existing.config.deviceId;
                const profId = existing.config.id;
                const peerId = existing.remotePeerId;
                const wantedInSession = (profId && (desiredLocalProfileIds.has(profId) || desiredRemoteKeys.has(profId))) ||
                                        (devId && (desiredLocalProfileIds.has(devId) || desiredRemoteKeys.has(devId))) ||
                                        (peerId && desiredRemoteKeys.has(peerId));
                if (!wantedInSession) {
                    console.log('[Session] Participant removed live:', profId);
                    if (!existing.config.isRemote) {
                        existing.stop().catch(e => console.warn('[Session] Error stopping removed player:', e));
                    }
                    changed = true;
                    return false; // Remove from array
                }
                return true;
            });

            // 3. For remaining remote (phone) players: ensure hidePitch is false if in active session
            filteredOut.forEach(existing => {
                if (!existing.config.isRemote) return;
                if (existing.config.hidePitch !== false) {
                    existing.config.hidePitch = false;
                    changed = true;
                }
            });

            if (changed) {
                playersRef.current = filteredOut;
                return [...filteredOut]; // new array reference to trigger re-render
            }
            return prev;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSessionOverride, ready, activePeers]);

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
                                const pIdx = prevPlayers.findIndex(p => p.remotePeerId === peerId);
                                if (pIdx !== -1 && prevPlayers[pIdx].config.latency !== data.latency) {
                                    const newPlayers = [...prevPlayers];
                                    newPlayers[pIdx].config.latency = data.latency;
                                    playersRef.current = newPlayers;
                                    return newPlayers;
                                }
                                return prevPlayers; // No re-render if unchanged
                            });
                        }
                        break;
                    case 'restart':
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            if (videoRef.current) videoRef.current.currentTime = 0;
                        }
                        break;
                    case 'next':
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
                            const pIdx = prevPlayers.findIndex(p => p.remotePeerId === peerId);
                            if (pIdx !== -1) {
                                const targetPlayer = prevPlayers[pIdx];
                                const devId = targetPlayer.config.deviceId;
                                const profId = targetPlayer.config.id;
                                const desiredKeys = new Set<string>();
                                if (activeSessionOverride) {
                                    activeSessionOverride.forEach((p: any) => {
                                        if (p.deviceId) desiredKeys.add(p.deviceId);
                                        if (p.profileId) desiredKeys.add(p.profileId);
                                    });
                                }
                                const isWantedByHost = activeSessionOverride === null || activeSessionOverride === undefined ||
                                    (devId && desiredKeys.has(devId)) ||
                                    (profId && desiredKeys.has(profId)) ||
                                    desiredKeys.has(peerId);
                                const targetHide = isSpectator || !isWantedByHost;

                                if (targetPlayer.config.hidePitch !== targetHide) {
                                    console.log(`[Session] Phone ${peerId} hidePitch set to ${targetHide} (isSpectator: ${isSpectator}, isWantedByHost: ${isWantedByHost})`);
                                    const newPlayers = [...prevPlayers];
                                    newPlayers[pIdx].config.hidePitch = targetHide;
                                    playersRef.current = newPlayers;
                                    return newPlayers;
                                }
                            }
                            return prevPlayers; // No re-render if unchanged
                        });
                        break;
                }
            }
        };

        setPlayers(prevPlayers => {
            let updatedPlayers = [...prevPlayers];
            let changed = false;

            // Check desired remote keys from activeSessionOverride if available
            const desiredRemoteKeys = new Set<string>();
            if (activeSessionOverride) {
                activeSessionOverride.forEach((p: any) => {
                    if (p.deviceId) desiredRemoteKeys.add(p.deviceId);
                    if (p.profileId) desiredRemoteKeys.add(p.profileId);
                });
            }

            // 1. Attach/Add/Update connected peers
            activePeers.forEach(peer => {
                const existingIdx = updatedPlayers.findIndex(p => 
                    (peer.deviceId && p.config.deviceId === peer.deviceId) || 
                    p.config.deviceId === peer.peerId ||
                    p.config.id === peer.peerId
                );

                const isWantedInSession = activeSessionOverride === null || activeSessionOverride === undefined ||
                                          (peer.deviceId && desiredRemoteKeys.has(peer.deviceId)) ||
                                          desiredRemoteKeys.has(peer.peerId);

                if (existingIdx !== -1) {
                    const player = updatedPlayers[existingIdx];

                    if (player.config.hidePitch !== !isWantedInSession) {
                        player.config.hidePitch = !isWantedInSession;
                        changed = true;
                    }

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
                } else if (isWantedInSession) {
                    console.log(`[Session] New Phone Guest selected in session: ${peer.name}`);
                    const newProfile: UserProfile = {
                        id: peer.peerId,
                        name: peer.name,
                        hue: peer.hue || Math.floor(Math.random() * 360)
                    };

                    const newPlayer = new PlayerRuntime({
                        ...newProfile,
                        deviceId: peer.deviceId || peer.peerId,
                        volume: 1.0,
                        muted: false,
                        latency: 0,
                        isRemote: true,
                        hidePitch: false
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
