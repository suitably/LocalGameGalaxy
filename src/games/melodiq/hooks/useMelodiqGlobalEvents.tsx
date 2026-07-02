import { useEffect, useRef } from 'react';
import { type Song, type SongMeta } from '../db';
import { type TVEvent } from './useTVMode';

interface UseMelodiqGlobalEventsProps {
    lastEvent: TVEvent | null;
    popNext: () => any;
    playSongOnTV: (id: string, song: SongMeta) => void;
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
}

export const useMelodiqGlobalEvents = ({
    lastEvent, popNext, playSongOnTV, setRemoteSong, setFeedbackMessage,
    handleSelectSong, manager, isTVConnected, sendRemoteCommand,
    currentView, refreshSongs, isClient, getSongById, setSelectedSong,
    setCurrentView, selectedSong, remoteSong, songs, activeParticipants
}: UseMelodiqGlobalEventsProps) => {

    const handleSelectSongRef = useRef(handleSelectSong);
    useEffect(() => {
        handleSelectSongRef.current = handleSelectSong;
    }, [handleSelectSong]);

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
                playSongOnTV(selectedSong.id, selectedSong);
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

        const handleRemoteCommand = (peerId: string, data: any) => {
            if (data.type === 'remote.command') {
                if (data.command === 'CALIBRATE_PLAY_BEEP') {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    const startTime = ctx.currentTime;
                    osc.start(startTime);
                    osc.stop(startTime + 0.15);
                    gain.gain.setValueAtTime(0, startTime);
                    gain.gain.setValueAtTime(1.0, startTime);
                    gain.gain.setValueAtTime(0, startTime + 0.15);
                    
                    setTimeout(() => ctx.close(), 500);
                    
                    manager.sendTo(peerId, { type: 'remote.command', command: 'CALIBRATE_BEEP_PLAYED', hostTimestamp: Date.now() });
                    return;
                }
            
                if (isTVConnected) {
                    console.log('Forwarding remote command to TV:', data.command);
                    sendRemoteCommand(data.command, data.value);
                }
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
                    if (data.config.url) localStorage.setItem('melodiq_helper_url', data.config.url);
                    if (data.config.token) localStorage.setItem('melodiq_helper_token', data.config.token);
                    localStorage.setItem('melodiq_enable_helper', 'true');
                    alert(`Configuration Updated by Remote Phone!\nURL: ${data.config.url}\nReloading...`);
                    window.location.reload();
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
                pendingSyncIdRef.current = data.activeSong.id;
                getSongById(data.activeSong.id).then(fullSong => {
                    if (fullSong) {
                        pendingSyncIdRef.current = null;
                        setSelectedSong(fullSong);
                        setCurrentView('Session');
                    }
                    // If not found yet, pendingSyncIdRef retains the id.
                    // The effect below will retry once songs are available.
                }).catch(err => console.error("Failed to sync session song:", err));
            } else {
                pendingSyncIdRef.current = null;
                setSelectedSong(null);
                setCurrentView('Home');
            }
        };

        window.addEventListener('melodiq_client_session_sync', handleSessionSync);
        return () => window.removeEventListener('melodiq_client_session_sync', handleSessionSync);
    }, [isClient, getSongById, setSelectedSong, setCurrentView]);

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
                activeSong: selectedSong ? { id: selectedSong.id } : null,
                participants: activeParticipants
            });
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
