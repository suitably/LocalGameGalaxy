import React, { useState, useEffect, useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { type Song, type SongMeta } from './db';
import { MelodiqSettings } from './MelodiqSettings';
import { MelodiqPlaylists } from './components/MelodiqPlaylists';
import { PlaylistDetails } from './components/PlaylistDetails';
import { ClientSettings } from './components/ClientSettings';

import { initMelodiqI18n } from './i18n';
import { WebRTCProvider, WebRTCMockProvider, useWebRTC } from './audio/WebRTCContext';
import { SettingsProvider, useMelodiqSettings } from './hooks/SettingsContext';
import { MelodiqConnection } from './MelodiqConnection';
import { type Playlist } from './db';
import { useSongs, SongsProvider } from './hooks/useSongs';
import { useQueue } from './hooks/useQueue';
import { useDownloads } from './hooks/useDownloads';
import { melodiqFetch } from './api/melodiqFetch';
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { PhoneClientEngine, useClientEngine } from './PhoneClientEngine';

import { useTVMode } from './hooks/useTVMode';
import { useSearchFilters } from './hooks/useSearchFilters';
import { MelodiqSearchBar } from './components/MelodiqSearchBar';
import { LibraryEmptyState } from './components/LibraryEmptyState';
import { OnlineSongsView } from './components/OnlineSongsView';
import { LocalSongsView } from './components/LocalSongsView';
import { PlaybackManager } from './components/PlaybackManager';
import { HostQueueDrawer } from './components/HostQueueDrawer';


// New extracted hooks & components
import { SongActionDialogs } from './components/SongActionDialogs';
import { useMelodiqHeader } from './hooks/useMelodiqHeader';
import { useMelodiqGlobalEvents } from './hooks/useMelodiqGlobalEvents';
import { useDownloadSync } from './hooks/useDownloadSync';
import { DownloadWaitScreen } from './components/DownloadWaitScreen';

type View = 'Home' | 'Settings' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails' | 'DownloadWait';

export const MelodiqGameContent: React.FC = () => {
    initMelodiqI18n();
    
    const params = new URLSearchParams(window.location.search);
    const isClient = params.get('role') === 'client';

    const { songs, loadingProgress, refreshSongs, getSongById, isLoading, hasConnectionError } = useSongs();
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

    const [remoteSong, setRemoteSong] = useState<SongMeta | null>(null);
    const [selectedSongForQueue, setSelectedSongForQueue] = useState<SongMeta | null>(null);
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [showQueueDrawer, setShowQueueDrawer] = useState(false);
    const [activeParticipants, setActiveParticipants] = useState<any[] | null>(null);
    
    const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
    const [restoredSong, setRestoredSong] = useState<SongMeta | null>(() => nowPlaying ?? null);
    
    const [currentView, setCurrentView] = useState<View>('Home');
    const [selectedSong, setSelectedSong] = useState<Song | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');


    useEffect(() => {
        if (settings.defaultViewMode) {
            setViewMode(settings.defaultViewMode);
        }
    }, [settings.defaultViewMode]);

    const handleCurrentSongDownloaded = useCallback((realSong: any) => {
        setSelectedSong(realSong);
        setNowPlaying(realSong);
        if (isTVConnected) {
            playSongOnTV(realSong.id, realSong);
            setRemoteSong(realSong);
        }
        setCurrentView('Session');
    }, [isTVConnected, playSongOnTV, setRemoteSong, setSelectedSong, setNowPlaying, setCurrentView]);

    useDownloadSync({
        isClient, jobs, queue, refreshSongs, replaceItem, selectedSong, onCurrentSongDownloaded: handleCurrentSongDownloaded
    });

    useMelodiqHeader({
        currentView, setCurrentView, viewMode, setViewMode,
        queueLength: queue.length, loadingProgress: loadingProgress as any, refreshSongs, setShowQueueDrawer,
        isClient, isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV, clientRole
    });

    const handleSelectSong = async (songMeta: SongMeta, forcePlay: boolean = false, participants?: any[], requester?: string, requesterId?: string) => {
        try {


            if (isClient) {
                if (clientRole === 'singer') {
                    setFeedbackMessage('Als Sänger kannst du keine Lieder auswählen.');
                    return;
                }
                
                const willForcePlay = (clientRole === 'admin' || clientRole === 'queue_manager') && forcePlay;
                
                window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { 
                    detail: { type: 'remote.select_song', songId: songMeta.id, forcePlay: willForcePlay } 
                }));
                
                if (selectedSong && !willForcePlay) {
                    setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
                } else {
                    setFeedbackMessage(`Wird abgespielt: ${songMeta.title}`);
                }
                return;
            }

            let actualForcePlay = forcePlay;
            if (!forcePlay && !selectedSong && !remoteSong && !nowPlaying) {
                actualForcePlay = true;
            }

            if (!actualForcePlay) {
                addToQueue(songMeta, requester, requesterId);
                setFeedbackMessage(`Zur Warteschlange hinzugefügt: ${songMeta.title}`);
                return;
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
                    setSelectedSong(songMeta as any);
                    setNowPlaying(songMeta);
                    setActiveParticipants(participants || null);
                    setCurrentView('DownloadWait');
                } else {
                    playSongOnTV(songMeta.id, songMeta as any);
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
                    setSelectedSong(songMeta as any);
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

    // --- Actions ---

    const handleSkipAndRequeue = useCallback(() => {
        if (selectedSong && (selectedSong as any).isDownloading) {
            // Re-queue the current downloading song at the end
            addToQueue(selectedSong as any, 'System');
            setFeedbackMessage(`${selectedSong.title} wurde hinten angestellt.`);
            
            // Pop the next one and play it
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

    const handleDownloadOnly = async (usdbSong: any) => {
        // Only queue managers and admins can trigger downloads
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

    const handleDownloadAndQueue = async (usdbSong: any) => {
        // Only queue managers and admins can trigger downloads
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
                const dummySong = {
                    id: `dl-${jobId}`,
                    title: usdbSong.title,
                    artist: usdbSong.artist,
                    isDownloading: true,
                    jobId: jobId
                } as any;
                addToQueue(dummySong, 'User');
                setFeedbackMessage(`Downloading and Queuing: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
            setFeedbackMessage('Download fehlgeschlagen.');
        }
    };

    const lastGameUpdateRef = React.useRef<number>(0);
    const handleGameUpdate = useCallback((state: any) => {
        sendGameUpdate(state);
        if (manager && !isClient) {
            const now = Date.now();
            if (now - lastGameUpdateRef.current > 50) { // ~20fps for WebRTC sync
                manager.broadcast({ type: 'game_state_update', state: { ...state, hostTimestamp: now } });
                lastGameUpdateRef.current = now;
            }
        }
    }, [sendGameUpdate, manager, isClient]);

    useEffect(() => {
        if (selectedSong || remoteSong) {
            setRestoredSong(null);
        }
    }, [selectedSong, remoteSong]);

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
                        <ClientSettings onBack={() => setCurrentView('Home')} />
                    ) : (
                        <MelodiqSettings 
                            onBack={() => {
                                refreshSongs();
                                setCurrentView('Home');
                            }} 
                            onNavigateToPlaylists={() => setCurrentView('Playlists')}
                        />
                    )}
                </Box>
            );
        }

        if (currentView === 'Connection') {
            return (
                <Box sx={{ height: '100%', overflow: 'auto' }}>
                    <MelodiqConnection onBack={() => setCurrentView('Home')} />
                </Box>
            );
        }

        if (currentView === 'Playlists') {
            return (
                <MelodiqPlaylists 
                    onBack={() => setCurrentView('Home')} 
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
                {!hasConnectionError && (
                    <MelodiqSearchBar 
                        {...searchFilterState} 
                        filteredSongsLength={filteredSongs.length} 
                        totalSongsLength={songs.length} 
                    />
                )}

                <LibraryEmptyState 
                    hasConnectionError={!!hasConnectionError}
                    isLoading={isLoading}
                    songsLength={isOnlineSearch ? (songs?.length || 0) : (filteredSongs?.length || 0)}
                    isOnlineSearch={isOnlineSearch}
                    refreshSongs={refreshSongs}
                />

                {isOnlineSearch && (
                    <OnlineSongsView 
                        isSearchingOnline={isSearchingOnline}
                        viewMode={viewMode}
                        filteredOnlineSongs={filteredOnlineSongs}
                        songs={songs}
                        jobs={jobs}
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
                        viewMode={viewMode}
                        filteredSongs={filteredSongs as any}
                        handleSelectSong={handleSelectSong}
                        handleSongLongPress={handleSongLongPress}
                        isSinger={isClient && clientRole === 'singer'}
                        jobs={jobs}
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
                onExitSession={() => {
                    setSelectedSong(null);
                    setActiveParticipants(null);
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
            />

            <HostQueueDrawer
                open={showQueueDrawer}
                onClose={() => setShowQueueDrawer(false)}
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
    const params = new URLSearchParams(window.location.search);
    const isClient = params.get('role') === 'client';

    return (
        <SettingsProvider>
            {!isClient ? (
                <WebRTCProvider>
                    <SongsProvider>
                        <MelodiqGameContent />
                        <PhoneQueueBridge />
                    </SongsProvider>
                </WebRTCProvider>
            ) : (
                <PhoneClientEngine>
                    <WebRTCMockProvider>
                        <SongsProvider>
                            <MelodiqGameContent />
                        </SongsProvider>
                    </WebRTCMockProvider>
                </PhoneClientEngine>
            )}
        </SettingsProvider>
    );
};
