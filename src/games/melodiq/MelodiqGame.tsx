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
import { PhoneQueueBridge } from './components/PhoneQueueBridge';
import { PhoneClientEngine } from './PhoneClientEngine';

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

type View = 'Home' | 'Settings' | 'Session' | 'Connection' | 'Playlists' | 'PlaylistDetails';

export const MelodiqGameContent: React.FC = () => {
    initMelodiqI18n();
    
    const params = new URLSearchParams(window.location.search);
    const isClient = params.get('role') === 'client';

    const { songs, loadingProgress, refreshSongs, getSongById, isLoading, hasConnectionError } = useSongs();
    const { queue, popNext, setNowPlaying, addToQueue, addNext, nowPlaying, replaceItem } = useQueue();
    const { jobs } = useDownloads();
    
    const {
        isTVConnected, isPresentationAvailable, openTVWindow, startPresentation,
        playSongOnTV, lastEvent, sendRemoteCommand, sendGameUpdate, disconnectTV
    } = useTVMode();
    
    const { manager } = useWebRTC();
    const { settings } = useMelodiqSettings();

    const searchFilterState = useSearchFilters(songs);
    const { isOnlineSearch, isSearchingOnline, filteredSongs, filteredOnlineSongs } = searchFilterState;

    const [remoteSong, setRemoteSong] = useState<SongMeta | null>(null);
    const [selectedSongForQueue, setSelectedSongForQueue] = useState<SongMeta | null>(null);
    const [queueDialogOpen, setQueueDialogOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [showQueueDrawer, setShowQueueDrawer] = useState(false);
    
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

    // --- Extracted Hooks ---
    useDownloadSync({
        isClient, jobs, queue, refreshSongs, replaceItem
    });

    useMelodiqHeader({
        currentView, setCurrentView, viewMode, setViewMode,
        queueLength: queue.length, loadingProgress: loadingProgress as any, refreshSongs, setShowQueueDrawer,
        isClient, isTVConnected, isPresentationAvailable, openTVWindow, startPresentation, disconnectTV
    });

    const handleSelectSong = async (songMeta: SongMeta, forcePlay: boolean = false) => {
        try {
            if (isClient) {
                window.dispatchEvent(new CustomEvent('melodiq_client_send_data', { 
                    detail: { type: 'host.select_song', songId: songMeta.id, forcePlay } 
                }));
                setFeedbackMessage(`Sent to Host: ${songMeta.title}`);
                return;
            }

            const isPlaying = !!selectedSong || (isTVConnected && !!remoteSong);

            if (!forcePlay && isPlaying) {
                addToQueue(songMeta);
                setFeedbackMessage(`Added to queue: ${songMeta.title}`);
                return;
            }

            if (isTVConnected) {
                const fullSong = await getSongById(songMeta.id);
                playSongOnTV(songMeta.id, fullSong || songMeta);
                setRemoteSong(songMeta);

                if (fullSong) {
                    setSelectedSong(fullSong);
                    setNowPlaying(songMeta);
                }
            } else {
                const fullSong = await getSongById(songMeta.id);
                if (fullSong) {
                    setSelectedSong(fullSong);
                    setNowPlaying(songMeta);
                    setCurrentView('Session');
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
        setCurrentView, selectedSong, remoteSong, songs
    });

    // --- Actions ---

    const handleSongLongPress = (song: SongMeta) => {
        setSelectedSongForQueue(song);
        setQueueDialogOpen(true);
    };

    const handleDownloadOnly = async (usdbSong: any) => {
        try {
            const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const helperUrl = url.replace(/\/$/, "");

            const res = await fetch(`${helperUrl}/api/usdb/download`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            const data = await res.json();
            if (data.jobIds && data.jobIds.length > 0) {
                setFeedbackMessage(`Downloading: ${usdbSong.title}`);
            }
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const handleDownloadAndQueue = async (usdbSong: any) => {
        try {
            const url = localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000';
            const token = localStorage.getItem('melodiq_helper_token') || '';
            const helperUrl = url.replace(/\/$/, "");

            const res = await fetch(`${helperUrl}/api/usdb/download`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    usdbId: usdbSong.usdbId,
                    artist: usdbSong.artist,
                    title: usdbSong.title,
                    videoMode: 'stream'
                })
            });
            const data = await res.json();
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
        }
    };

    const handleGameUpdate = useCallback((state: any) => {
        sendGameUpdate(state);
        if (manager && !isClient) {
            manager.broadcast({ type: 'game_state_update', state });
        }
    }, [sendGameUpdate, manager, isClient]);

    useEffect(() => {
        if (selectedSong || remoteSong) {
            setRestoredSong(null);
        }
    }, [selectedSong, remoteSong]);

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
                pb: (selectedSong || remoteSong) ? '64px' : 0
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
                    songsLength={songs?.length || 0}
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
                    />
                )}

                {!isOnlineSearch && (
                    <LocalSongsView 
                        viewMode={viewMode}
                        filteredSongs={filteredSongs as any}
                        handleSelectSong={handleSelectSong}
                        handleSongLongPress={handleSongLongPress}
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
                onExitSession={(forceHome = false) => {
                    if (forceHome) {
                        setCurrentView('Home');
                        setSelectedSong(null);
                    } else {
                        setSelectedSong(null);
                        setCurrentView('Home');
                    }
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
                playSongOnTV={playSongOnTV}
                handleSelectSong={handleSelectSong}
                addNext={addNext}
                addToQueue={addToQueue}
                refreshSongs={refreshSongs}
                setFeedbackMessage={setFeedbackMessage}
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
