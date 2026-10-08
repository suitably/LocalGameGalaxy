import { useEffect, useRef } from 'react';
import { storage } from '../../../lib/storage';
import { handleHostApiRequest } from './handleHostApiRequest';
import { type Song, type SongMeta } from '../db';
import { type TVEvent } from './useTVMode';

interface UseMelodiqGlobalEventsProps {
    lastEvent: TVEvent | null;
    popNext: () => any;
    playSongOnTV: (id: string, song: SongMeta, currentTime?: number) => void;
    setRemoteSong: (song: SongMeta | null) => void;
    setFeedbackMessage: (msg: string | null) => void;
    handleSelectSong: (song: SongMeta, forcePlay?: boolean, participants?: any[], requester?: string, requesterId?: string) => void;
    manager: any;
    isTVConnected: boolean;
    sendRemoteCommand: (command: string, value?: any) => void;
    currentView: string;
    refreshSongs: () => Promise<void>;
    isClient: boolean;
    getSongById: (id: string) => Promise<Song | undefined>;
    setSelectedSong: (song: Song | null) => void;
    setCurrentView: (view: any) => void;
    selectedSong: Song | null;
    remoteSong: SongMeta | null;
    songs: SongMeta[];
    activeParticipants?: any[] | null;
    setActiveParticipants: (p: any[] | null) => void;
    updateSetting: (key: string, value: any) => void;
}

export const useMelodiqGlobalEvents = ({
    lastEvent, popNext, playSongOnTV, setRemoteSong, setFeedbackMessage,
    handleSelectSong, manager, isTVConnected, sendRemoteCommand,
    currentView, refreshSongs, isClient, getSongById, setSelectedSong,
    setCurrentView, selectedSong, remoteSong, songs, activeParticipants,
    setActiveParticipants, updateSetting
}: UseMelodiqGlobalEventsProps) => {

    const handleSelectSongRef = useRef(handleSelectSong);
    useEffect(() => {
        handleSelectSongRef.current = handleSelectSong;
    }, [handleSelectSong]);

    const songsRef = useRef(songs);
    useEffect(() => {
        songsRef.current = songs;
    }, [songs]);

    const getSongByIdRef = useRef(getSongById);
    useEffect(() => {
        getSongByIdRef.current = getSongById;
    }, [getSongById]);

    const processedEventRef = useRef<number | null>(null);
    // Holds the song ID from the last session_sync when songs hadn't loaded yet
    const pendingSyncIdRef = useRef<string | null>(null);

    // 1. Handle TV Events & Auto-Play Next
    useEffect(() => {
        if (!lastEvent || lastEvent.timestamp === processedEventRef.current) return;
        
        if (lastEvent.type === 'PLAYBACK_STARTED') {
            processedEventRef.current = lastEvent.timestamp;
            setFeedbackMessage(`TV Playback started: ${lastEvent.payload.title}`);
        } else if (lastEvent.type === 'SONG_ENDED') {
            processedEventRef.current = lastEvent.timestamp;
            setRemoteSong(null);
            const nextItem = popNext();
            if (nextItem) {
                console.log('TV Song Ended. Playing next from queue:', nextItem.song.title);
                handleSelectSongRef.current(nextItem.song, true, nextItem.participants);
            }
        } else if (lastEvent.type === 'TV_READY') {
            processedEventRef.current = lastEvent.timestamp;
            if (selectedSong && !remoteSong) {
                console.log("TV_READY received while playing locally, switching to TV...");
                const currentTime = (window as any).__melodiq_current_time || 0;
                playSongOnTV(selectedSong.id, selectedSong, currentTime);
                setRemoteSong(selectedSong as unknown as SongMeta);
            }
        }
    }, [lastEvent, popNext, playSongOnTV, setRemoteSong, setFeedbackMessage, selectedSong, remoteSong]);

    // 2. Listen for Playlist Trigger (when playPlaylistNow is called)
    useEffect(() => {
        const handlePlaylistTrigger = (e: any) => {
            const songToPlay = e.detail;
            if (songToPlay) {
                handleSelectSongRef.current(songToPlay, true);
            }
        };
        window.addEventListener('melodiq_play_playlist_trigger', handlePlaylistTrigger);
        return () => window.removeEventListener('melodiq_play_playlist_trigger', handlePlaylistTrigger);
    }, []);

    // 2.5 Listen for Remote Select Song
    useEffect(() => {
        const handleRemoteSelect = (e: any) => {
            const { songId, forcePlay, requester, requesterId } = e.detail;
            const song = songs.find(s => s.id === songId);
            if (song) {
                handleSelectSongRef.current(song, forcePlay, undefined, requester, requesterId);
            }
        };
        window.addEventListener('melodiq_remote_select_song', handleRemoteSelect);
        return () => window.removeEventListener('melodiq_remote_select_song', handleRemoteSelect);
    }, [songs]);

    // 3. Forward Phone Commands to TV & Handle Global Commands
    useEffect(() => {
        if (!manager) return;

        const handleRemoteCommand = async (peerId: string, data: any) => {
            if (data.type === 'remote.command') {
                if (data.command === 'PING') {
                    manager.sendToPeer(peerId, { type: 'remote.command', command: 'PONG', value: Date.now() });
                    return;
                }
                
                if (data.command === 'UPDATE_SETTINGS' && !isClient) {
                    if (data.value && typeof data.value === 'object') {
                        Object.entries(data.value).forEach(([key, value]) => {
                            updateSetting(key as any, value);
                        });
                    }
                    return;
                }

                if (data.command === 'CALIBRATE_BEEP') {
                    const ctx = new window.AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    const startTime = ctx.currentTime + 0.05;
                    osc.start(startTime);
                    osc.stop(startTime + 0.15);
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.setValueAtTime(1.0, startTime);
                    gain.gain.setValueAtTime(0, startTime + 0.15);
                    
                    setTimeout(() => ctx.close(), 500);
                    return;
                }
            
                if (isTVConnected) {
                    console.log('Forwarding remote command to TV:', data.command);
                    sendRemoteCommand(data.command, data.value);
                } else {
                    console.log('Handling remote command locally:', data.command);
                    window.dispatchEvent(new CustomEvent('melodiq_host_command', { detail: { command: data.command, value: data.value } }));
                }
            } else if (data.type === 'api_request') {
                handleHostApiRequest({
                    manager,
                    peerId,
                    data,
                    songs: songsRef.current,
                    getSongById: getSongByIdRef.current
                });
            }
        };

        manager.on('message', handleRemoteCommand);
        return () => {
            manager.off('message', handleRemoteCommand);
        };
    }, [manager, isTVConnected, sendRemoteCommand]);

    // 4. Remote Configuration Listener
    useEffect(() => {
        if (!manager) return;

        if (currentView !== 'Session') {
            const handleConfig = (peerId: string, data: any) => {
                if (data.type === 'configure' && data.config) {
                    console.log(`[Host] Received Remote Config from ${peerId}:`, data.config);
                    if (data.config.url) storage.setHelperUrl(data.config.url);
                    if (data.config.token) storage.setHelperToken(data.config.token);
                    storage.setHelperActive(true);
                    setFeedbackMessage(`Configuration Updated by Remote Phone!\nURL: ${data.config.url}\nReloading...`);
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            };
            manager.on('message', handleConfig);
            return () => { manager.off('message', handleConfig); };
        }
    }, [manager, currentView, refreshSongs]);

    // 5. Client Session Sync (Auto-sync Client View with Host's playing song)
    useEffect(() => {
        if (!isClient) return;

        const handleSessionSync = (e: any) => {
            const data = e.detail;
            if (data.activeSong) {
                // If the song ID hasn't changed, only update activeParticipants — DO NOT re-set selectedSong
                if (selectedSong && selectedSong.id === data.activeSong.id) {
                    if (data.participants) setActiveParticipants(data.participants);
                    return;
                }
                pendingSyncIdRef.current = data.activeSong.id;
                getSongById(data.activeSong.id).then(fullSong => {
                    if (fullSong) {
                        pendingSyncIdRef.current = null;
                        setSelectedSong(fullSong);
                        if (data.participants) setActiveParticipants(data.participants);
                        setCurrentView('Session');
                    } else if (data.activeSong && data.activeSong.title) {
                        // If it's an online song, use the partial data from host
                        pendingSyncIdRef.current = null;
                        setSelectedSong(data.activeSong as any);
                        if (data.participants) setActiveParticipants(data.participants);
                        setCurrentView('Session');
                    }
                }).catch(err => console.error("Failed to sync session song:", err));
            } else {
                pendingSyncIdRef.current = null;
                setSelectedSong(null);
                setCurrentView('Home');
            }
        };

        window.addEventListener('melodiq_client_session_sync', handleSessionSync);
        return () => window.removeEventListener('melodiq_client_session_sync', handleSessionSync);
    }, [isClient, getSongById, setSelectedSong, setCurrentView, selectedSong, setActiveParticipants]);

    // Retry session sync when the songs list updates (covers the race where the
    // sync event arrived before songs were loaded from the helper server)
    useEffect(() => {
        if (!isClient) return;
        const pendingId = pendingSyncIdRef.current;
        if (!pendingId || songs.length === 0) return;

        getSongById(pendingId).then(fullSong => {
            if (fullSong) {
                pendingSyncIdRef.current = null;
                setSelectedSong(fullSong);
                setCurrentView('Session');
            }
        }).catch(() => {});
    }, [isClient, songs, getSongById, setSelectedSong, setCurrentView]);

    useEffect(() => {
        if (!isClient && manager) {
            manager.broadcast({
                type: 'session_sync',
                activeSong: selectedSong ? { id: selectedSong.id, title: selectedSong.title, artist: selectedSong.artist } : null,
                participants: activeParticipants
            });
            // Also broadcast public helper URL so clients can load images
            const helperUrl = storage.getHelperUrl();
            const helperToken = storage.getHelperToken();
            if (helperUrl) {
                manager.broadcast({
                    type: 'helper_config',
                    url: helperUrl,
                    token: helperToken
                });
            }
        }
    }, [isClient, selectedSong, activeParticipants, manager]);

    // 7. Auto-Play on TV Connect
    useEffect(() => {
        if (isTVConnected && selectedSong && !remoteSong) {
            console.log("TV Connected while playing locally, switching to TV...");
            playSongOnTV(selectedSong.id, selectedSong);
            setRemoteSong(selectedSong as unknown as SongMeta);
        } else if (!isTVConnected && remoteSong) {
            setRemoteSong(null);
        }
    }, [isTVConnected, selectedSong, remoteSong, playSongOnTV, setRemoteSong]);
};
