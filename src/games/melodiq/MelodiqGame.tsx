import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Snackbar, Alert, CircularProgress } from '@mui/material';
import { type Song, type SongMeta, type Playlist } from './db';
const Settings = lazy(() => import('../../features/settings/Settings').then(m => ({ default: m.Settings })));
import { MelodiqPlaylists } from './components/MelodiqPlaylists';
import { PlaylistDetails } from './components/PlaylistDetails';
import { ClientSettings } from './components/ClientSettings';
import { initMelodiqI18n } from './i18n';
import { WebRTCProvider, WebRTCMockProvider, useWebRTC } from './audio/WebRTCContext';
import { useMelodiqSettings } from './hooks/SettingsContext';
import { MelodiqConnection } from './MelodiqConnection';
import { useSongs, SongsProvider } from './hooks/useSongs';
import { useQueue, QueueProvider } from './hooks/useQueue';
import { useDownloads } from './hooks/useDownloads';
import { melodiqFetch } from './api/melodiqFetch';
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { PhoneClientEngine, useClientEngine } from './PhoneClientEngine';
import { useTVMode } from './hooks/useTVMode';
import { useSearchFilters } from './hooks/useSearchFilters';
import { storage, STORAGE_KEYS } from '../../lib/storage';
import { MelodiqSearchBar } from './components/MelodiqSearchBar';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { OnlineSongsView } from './components/OnlineSongsView';
import { LocalSongsView } from './components/LocalSongsView';
import { PlaybackManager } from './components/PlaybackManager';
import { HostQueueDrawer } from './components/HostQueueDrawer';
import { SongActionDialogs } from './components/SongActionDialogs';
import { useMelodiqHeader } from './hooks/useMelodiqHeader';
import { useMelodiqGlobalEvents } from './hooks/useMelodiqGlobalEvents';
import { useDownloadSync } from './hooks/useDownloadSync';
import { DownloadWaitScreen } from './components/DownloadWaitScreen';
import { type MelodiqParticipant, type MelodiqProfile, type UsdbSongItem, type PassiveGameState } from './types';

type View = 'Home' | 'Settings' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails' | 'DownloadWait';

// Initialize i18n bundles at module load time to prevent setState side-effects during render
initMelodiqI18n();

export const MelodiqGameContent: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isClient = searchParams.get('role') === 'client';

    const { songs, refreshSongs, getSongById, isLoading, hasConnectionError, localLibrary } = useSongs();
    const { queue, popNext, setNowPlaying, addToQueue, addNext, nowPlaying, replaceItem } = useQueue();
    const { jobs } = useDownloads(isClient ? 0 : 2000);
    
    const {
        isTVConnected, isPresentationAvailable, openTVWindow, startPresentation,
        playSongOnTV, lastEvent, sendRemoteCommand, sendGameUpdate, disconnectTV
    } = useTVMode();
    
    const { manager } = useWebRTC();
    const { settings } = useMelodiqSettings();
    const { clientRole, clientProfile } = useClientEngine();

    const searchFilterState = useSearchFilters(songs, jobs);
    const { isOnlineSearch, isSearchingOnline, filteredSongs, filteredOnlineSongs } = searchFilterState;

    const memoizedFilteredSongs = React.useMemo(() => filteredSongs, [filteredSongs]);
    const memoizedJobs = React.useMemo(() => jobs, [jobs]);

    const [remoteSong, setRemoteSong] = useState<SongMeta | null>(null);
    const [selectedSongForQueue, setSelectedSongForQueue] = useState<SongMeta | null>(null);
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [showQueueDrawer, setShowQueueDrawer] = useState(false);
    const [activeParticipants, setActiveParticipants] = useState<MelodiqParticipant[] | null>(() => 
        storage.getJson<MelodiqParticipant[] | null>(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, null)
    );
    const [sessionInstanceId, setSessionInstanceId] = useState<number>(0);

    const handleToggleCurrentParticipant = useCallback((deviceId: string, profile: MelodiqProfile) => {
        setActiveParticipants(prev => {
            const participants = prev ?? storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
            const exists = participants.find((p: MelodiqParticipant) =>
                p.deviceId === deviceId || p.profileId === deviceId || (profile?.peerId && p.deviceId === profile.peerId)
            );
            let next: MelodiqParticipant[];
            if (exists) {
                next = participants.filter((p: MelodiqParticipant) =>
                    p.deviceId !== deviceId && p.profileId !== deviceId && !(profile?.peerId && p.deviceId === profile.peerId)
                );
            } else {
                next = [...participants, {
                    profileId: deviceId,
                    deviceId: deviceId,
                    volume: 0.8,
                    muted: false,
                    latency: 0,
                    isRemote: profile?.isRemote || false,
                    name: profile?.name,
                    hue: profile?.hue
                }];
            }
            storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, next);
            return next;
        });
    }, []);

    const handleReorderCurrentParticipant = useCallback((startIndex: number, endIndex: number) => {
        setActiveParticipants(prev => {
            const base = prev ?? storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
            const next = Array.from(base);
            const [removed] = next.splice(startIndex, 1);
            next.splice(endIndex, 0, removed);
            storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, next);
            return next;
        });
    }, []);

    const currentDisplayParticipants = React.useMemo(() => {
        if (activeParticipants !== null) return activeParticipants;
        return storage.getJson<MelodiqParticipant[]>(STORAGE_KEYS.ACTIVE_SESSION, []);
    }, [activeParticipants]);
    
    const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
    const [restoredSong, setRestoredSong] = useState<SongMeta | null>(() => nowPlaying ?? null);
    
    const isSettingsFromUrl = Boolean(searchParams.get('tab') || searchParams.get('sub'));
    const [currentView, setCurrentView] = useState<View>(() => isSettingsFromUrl ? 'Settings' : 'Home');
    const handleSetCurrentView = useCallback((v: string) => {
        if (v === 'Settings') {
            const nextParams = new URLSearchParams(searchParams);
            nextParams.set('tab', 'melodiq');
            setSearchParams(nextParams);
        }
        setCurrentView(v as View);
    }, [searchParams, setSearchParams]);
    const [selectedSong, setSelectedSong] = useState<Song | SongMeta | null>(null);

    const [, setIsPlaybackPlaying] = useState<boolean>(false);
    const isPlaybackPlayingRef = useRef<boolean>(false);
    const selectedSongRef = useRef<Song | SongMeta | null>(selectedSong);
    const remoteSongRef = useRef<SongMeta | null>(remoteSong);

    useEffect(() => {
        selectedSongRef.current = selectedSong;
    }, [selectedSong]);

    useEffect(() => {
        remoteSongRef.current = remoteSong;
    }, [remoteSong]);

    const handlePlayingChange = useCallback((playing: boolean) => {
        setIsPlaybackPlaying(playing);
        isPlaybackPlayingRef.current = playing;
    }, []);

    const handleCurrentSongDownloaded = useCallback((realSong: Song) => {
        setSelectedSong(realSong);
        setNowPlaying(realSong);
        if (isTVConnected) {
            playSongOnTV(realSong.id, realSong);
            setRemoteSong(realSong);
        }
        setCurrentView('Session');
    }, [isTVConnected, playSongOnTV, setRemoteSong, setSelectedSong, setNowPlaying, setCurrentView]);

    useDownloadSync({
        isClient, jobs: memoizedJobs, queue, refreshSongs, replaceItem, selectedSong, onCurrentSongDownloaded: handleCurrentSongDownloaded
    });

    useEffect(() => {
        const hasSettingsParam = Boolean(searchParams.get('tab') || searchParams.get('sub'));
        if (hasSettingsParam && currentView !== 'Settings') {
            setCurrentView('Settings');
        } else if (!hasSettingsParam && currentView === 'Settings') {
            setCurrentView('Home');
        }
    }, [searchParams, currentView]);

    const handleCloseSubView = useCallback(() => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('tab');
        nextParams.delete('sub');
        nextParams.delete('section');
        setSearchParams(nextParams, { replace: true });
        if (window.history.state?.melodiqSubView) {
            window.history.back();
        } else {
            setCurrentView('Home');
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const isSubView = currentView === 'Connection' || currentView === 'Playlists' || currentView === 'PlaylistDetails';
        if (isSubView) {
            window.history.pushState({ melodiqSubView: true }, '', window.location.href);
            const handlePopState = () => setCurrentView('Home');
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [currentView]);

    useMelodiqHeader({
        currentView, setCurrentView: handleSetCurrentView,
        isClient, isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV, clientRole,
        onBackToHome: handleCloseSubView,
        onOpenLocalFolder: localLibrary.selectFolder
    });

    const handleSelectSong = async (songMeta: SongMeta, forcePlay: boolean = false, participants?: MelodiqParticipant[], requester?: string, requesterId?: string) => {
        try {
            if (isClient) {
                if (clientRole === 'singer') {
                    setFeedbackMessage('Als Sänger kannst du keine Lieder auswählen.');
                    return;
                }
                
                const isHostPlaying = isPlaybackPlayingRef.current;
                const canForce = (clientRole === 'admin' || clientRole === 'queue_manager');
                const willForcePlay = canForce && (forcePlay || !isHostPlaying);
                
                window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { 
                    detail: { type: 'remote.select_song', songId: songMeta.id, forcePlay: willForcePlay } 
                }));
                
                if (isHostPlaying && !willForcePlay) {
                    setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
                } else {
                    setFeedbackMessage(`Wird abgespielt: ${songMeta.title}`);
                }
                return;
            }

            const isPlayingActive = (Boolean(selectedSongRef.current) || Boolean(remoteSongRef.current)) && isPlaybackPlayingRef.current;

            let actualForcePlay = forcePlay;
            if (!forcePlay && !isPlayingActive) {
                actualForcePlay = true;
            }

            if (!actualForcePlay) {
                addToQueue(songMeta, requester, requesterId);
                setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
                return;
            }

            if (restoredSong) {
                setRestoredSong(null);
            }
            if (!selectedSongRef.current || selectedSongRef.current.id !== songMeta.id) {
                storage.remove(STORAGE_KEYS.MELODIQ_SAVED_TIME);
            }

            setSessionInstanceId(prev => prev + 1);
            if (participants) {
                storage.setJson(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS, participants);
            } else {
                storage.remove(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS);
            }

            if (isTVConnected) {
                const fullSong = await getSongById(songMeta.id);
                if (fullSong) {
                    playSongOnTV(songMeta.id, fullSong);
                    setRemoteSong(songMeta);
                    setSelectedSong(fullSong);
                    setNowPlaying(songMeta);
                    setActiveParticipants(participants || null);
                } else if (songMeta.isDownloading) {
                    sendRemoteCommand('WAIT_FOR_DOWNLOAD', { title: songMeta.title, artist: songMeta.artist });
                    setRemoteSong(songMeta);
                    setSelectedSong(songMeta);
                    setNowPlaying(songMeta);
                    setActiveParticipants(participants || null);
                    setCurrentView('DownloadWait');
                } else {
                    playSongOnTV(songMeta.id, songMeta);
                    setRemoteSong(songMeta);
                }
            } else {
                const fullSong = await getSongById(songMeta.id);
                if (fullSong) {
                    setSelectedSong(fullSong);
                    if (actualForcePlay) {
                        setCurrentView('Session');
                    }
                    setNowPlaying(songMeta);
                    setActiveParticipants(participants || null);
                } else if (songMeta.isDownloading) {
                    setSelectedSong(songMeta);
                    setNowPlaying(songMeta);
                    setActiveParticipants(participants || null);
                    setCurrentView('DownloadWait');
                } else {
                    console.error("Song content not found in DB");
                }
            }
        } catch (e) {
            console.error("Failed to load song", e);
        }
    };

    useMelodiqGlobalEvents({
        lastEvent, popNext, playSongOnTV, setRemoteSong, setFeedbackMessage,
        handleSelectSong, manager, isTVConnected, sendRemoteCommand,
        currentView, refreshSongs, isClient, getSongById, setSelectedSong,
        setCurrentView, selectedSong, remoteSong, songs, activeParticipants,
        setActiveParticipants
    });

    const handleSkipAndRequeue = useCallback(() => {
        if (selectedSong && (selectedSong as SongMeta).isDownloading) {
            addToQueue(selectedSong, 'System');
            setFeedbackMessage(`${selectedSong.title} wurde hinten angestellt.`);
            
            const nextItem = popNext();
            if (nextItem) {
                handleSelectSong(nextItem.song, true, nextItem.participants);
            } else {
                setSelectedSong(null);
                setNowPlaying(null);
                setRemoteSong(null);
                setCurrentView('Home');
            }
        }
    }, [selectedSong, addToQueue, popNext, setNowPlaying, setRemoteSong, handleSelectSong, setSelectedSong, setCurrentView, setFeedbackMessage]);

    const handleSongLongPress = (song: SongMeta) => {
        if (isClient && clientRole === 'singer') {
            setFeedbackMessage('Als Sänger kannst du keine Lieder zur Warteschlange hinzufügen.');
            return;
        }
        setSelectedSongForQueue(song);
        setQueueDialogOpen(true);
    };

    const handleDownloadOnly = async (usdbSong: UsdbSongItem) => {
        if (isClient && clientRole !== 'admin' && clientRole !== 'queue_manager') {
            setFeedbackMessage('Nur Queue Manager können Songs herunterladen.');
            return;
        }
        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            if (data.jobIds && data.jobIds.length > 0) {
                setFeedbackMessage(`Downloading: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
            setFeedbackMessage('Download fehlgeschlagen.');
        }
    };

    const handleDownloadAndQueue = async (usdbSong: UsdbSongItem) => {
        if (isClient && clientRole !== 'admin' && clientRole !== 'queue_manager') {
            setFeedbackMessage('Nur Queue Manager können Songs herunterladen.');
            return;
        }
        try {
            const data = await melodiqFetch('/api/usdb/download', {
                method: 'POST',
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            if (data.jobIds && data.jobIds.length > 0) {
                const jobId = data.jobIds[0];
                const dummySong: SongMeta = {
                    id: `dl-${jobId}`,
                    title: usdbSong.title,
                    artist: usdbSong.artist,
                    isDownloading: true,
                    jobId: jobId
                };
                addToQueue(dummySong, 'User');
                setFeedbackMessage(`Downloading and Queuing: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
            setFeedbackMessage('Download fehlgeschlagen.');
        }
    };

    const lastGameUpdateRef = React.useRef<number>(0);
    const handleGameUpdate = useCallback((state: PassiveGameState) => {
        sendGameUpdate(state);
        if (manager && !isClient) {
            const now = Date.now();
            if (now - lastGameUpdateRef.current > 50) {
                manager.broadcast({ type: 'game_state_update', state: { ...state, hostTimestamp: now } });
                lastGameUpdateRef.current = now;
            }
        }
    }, [sendGameUpdate, manager, isClient]);

    if ((selectedSong || remoteSong) && restoredSong !== null) {
        setRestoredSong(null);
    }

    if (currentView === 'DownloadWait') {
        return (
            <DownloadWaitScreen 
                songTitle={selectedSong?.title || ''}
                artist={selectedSong?.artist || ''}
                onSkipAndRequeue={handleSkipAndRequeue}
            />
        );
    }

    const renderView = () => {
        if (currentView === 'Settings') {
            return (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    {isClient ? (
                        <ClientSettings onBack={handleCloseSubView} />
                    ) : (
                        <Suspense fallback={<Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>}>
                            <Settings 
                                activeGameId="melodiq"
                                onBack={() => {
                                    refreshSongs();
                                    handleCloseSubView();
                                }} 
                                onNavigateToPlaylists={() => setCurrentView('Playlists')}
                            />
                        </Suspense>
                    )}
                </Box>
            );
        }

        if (currentView === 'Connection') {
            return (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <MelodiqConnection onBack={handleCloseSubView} />
                </Box>
            );
        }

        if (currentView === 'Playlists') {
            return (
                <MelodiqPlaylists 
                    onBack={handleCloseSubView} 
                    onSelectPlaylist={(p) => {
                        setActivePlaylist(p);
                        setCurrentView('PlaylistDetails');
                    }} 
                />
            );
        }

        if (currentView === 'PlaylistDetails' && activePlaylist) {
            return (
                <PlaylistDetails 
                    playlist={activePlaylist} 
                    onBack={() => setCurrentView('Playlists')} 
                />
            );
        }

        return (
            <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                pb: '64px'
            }}>
                {(!hasConnectionError || songs.length > 0) && (
                    <MelodiqSearchBar 
                        {...searchFilterState} 
                        filteredSongsLength={memoizedFilteredSongs.length} 
                        totalSongsLength={songs.length} 
                        canSearchOnline={!hasConnectionError}
                    />
                )}

                <LibraryEmptyState 
                    hasConnectionError={hasConnectionError && songs.length === 0}
                    isLoading={isLoading}
                    songsLength={isOnlineSearch ? (songs?.length || 0) : (memoizedFilteredSongs?.length || 0)}
                    isOnlineSearch={isOnlineSearch}
                    refreshSongs={refreshSongs}
                />

                {isOnlineSearch && (
                    <OnlineSongsView 
                        isSearchingOnline={isSearchingOnline}
                        viewMode={settings.defaultViewMode}
                        filteredOnlineSongs={filteredOnlineSongs}
                        songs={songs}
                        jobs={memoizedJobs}
                        handleSelectSong={handleSelectSong}
                        handleDownloadAndQueue={handleDownloadAndQueue}
                        handleSongLongPress={handleSongLongPress}
                        handleDownloadOnly={handleDownloadOnly}
                        isSinger={isClient && clientRole === 'singer'}
                        canDownload={!isClient || clientRole === 'admin' || clientRole === 'queue_manager'}
                    />
                )}

                {!isOnlineSearch && (
                    <LocalSongsView 
                        viewMode={settings.defaultViewMode}
                        filteredSongs={memoizedFilteredSongs}
                        handleSelectSong={handleSelectSong}
                        handleSongLongPress={handleSongLongPress}
                        isSinger={isClient && clientRole === 'singer'}
                        jobs={memoizedJobs}
                    />
                )}
            </Box >
        );
    };

    return (
        <Box sx={{ width: '100vw', height: '100%', overflow: 'hidden', bgcolor: 'background.default', color: 'text.primary' }}>
            {renderView()}

            <PlaybackManager
                selectedSong={selectedSong}
                remoteSong={remoteSong}
                isTVConnected={isTVConnected}
                currentView={currentView}
                sessionInstanceId={sessionInstanceId}
                onExitSession={() => {
                    setSelectedSong(null);
                    setActiveParticipants(null);
                    storage.remove(STORAGE_KEYS.CURRENT_SONG_PARTICIPANTS);
                    setCurrentView('Home');
                }}
                onMinimizeSession={() => setCurrentView('Home')}
                onRestoreSession={() => setCurrentView('Session')}
                onSelectSong={handleSelectSong}
                sendRemoteCommand={sendRemoteCommand}
                setRemoteSong={setRemoteSong}
                onShowQueue={() => setShowQueueDrawer(true)}
                sendGameUpdate={handleGameUpdate}
                restoredSong={restoredSong}
                onClearRestoredSong={() => setRestoredSong(null)}
                isClient={isClient}
                activeParticipants={activeParticipants}
                clientDeviceId={clientProfile?.deviceId}
                onPlayingChange={handlePlayingChange}
            />

            <HostQueueDrawer
                open={showQueueDrawer}
                onClose={() => setShowQueueDrawer(false)}
                activeParticipants={currentDisplayParticipants}
                onToggleCurrentParticipant={handleToggleCurrentParticipant}
                onReorderCurrentParticipant={handleReorderCurrentParticipant}
            />

            <SongActionDialogs
                selectedSongForQueue={selectedSongForQueue}
                queueDialogOpen={queueDialogOpen}
                setQueueDialogOpen={setQueueDialogOpen}
                isTVConnected={isTVConnected}

                handleSelectSong={handleSelectSong}
                addNext={addNext}
                addToQueue={addToQueue}
                refreshSongs={refreshSongs}
                setFeedbackMessage={setFeedbackMessage}
                isClient={isClient}
                clientRole={clientRole}
            />

            <Snackbar
                open={!!feedbackMessage}
                autoHideDuration={3000}
                onClose={() => setFeedbackMessage(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert severity="info" onClose={() => setFeedbackMessage(null)}>
                    {feedbackMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export const MelodiqGame: React.FC = () => {
    const [searchParams] = useSearchParams();
    const isClient = searchParams.get('role') === 'client';

    return !isClient ? (
        <WebRTCProvider>
            <SongsProvider>
                <QueueProvider>
                    <MelodiqGameContent />
                    <PhoneQueueBridge />
                </QueueProvider>
            </SongsProvider>
        </WebRTCProvider>
    ) : (
        <PhoneClientEngine>
            <WebRTCMockProvider>
                <SongsProvider>
                    <QueueProvider>
                        <MelodiqGameContent />
                    </QueueProvider>
                </SongsProvider>
            </WebRTCMockProvider>
        </PhoneClientEngine>
    );
};