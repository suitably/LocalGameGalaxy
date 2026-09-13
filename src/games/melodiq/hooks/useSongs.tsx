import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { type Song, type SongMeta } from '../db';
import { useLocalLibrary, type UseLocalLibraryResult } from './useLocalLibrary';
import { storage, STORAGE_KEYS } from '../../../lib/storage';
import {
    getHelperConfig,
    processServerSongs,
    loadCachedServerSongs,
    saveServerSongsToCache,
    fetchServerSongs,
    fetchServerSongDetails
} from '../logic/serverSongsProvider';

export interface LoadingProgress {
    loaded: number;
    total: number;
}

export interface UseSongsResult {
    songs: SongMeta[];
    isLoading: boolean;
    hasConnectionError: boolean;
    loadingProgress: LoadingProgress | null;
    refreshSongs: () => Promise<void>;
    getSongById: (id: string) => Promise<Song | undefined>;
    localLibrary: UseLocalLibraryResult;
}

const SongsContext = createContext<UseSongsResult | null>(null);

/**
 * Provider component managing both server-based and local song libraries.
 */
export const SongsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const localLibrary = useLocalLibrary();

    const [serverSongs, setServerSongs] = useState<SongMeta[]>(() => {
        return storage.getJson<SongMeta[]>(STORAGE_KEYS.MELODIQ_META_CACHE, []);
    });
    const [isServerLoading, setIsServerLoading] = useState(() => {
        return storage.getJson<SongMeta[]>(STORAGE_KEYS.MELODIQ_META_CACHE, []).length === 0;
    });
    const [hasConnectionError, setHasConnectionError] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);

    const serverContentCache = useRef(new Map<string, string>());

    const loadServerSongs = useCallback(async (forceRefresh = false) => {
        let mounted = true;
        const { url, token, enabled } = getHelperConfig();

        if (!enabled) {
            setIsServerLoading(false);
            return () => { mounted = false; };
        }

        const applyServerData = (rawData: Record<string, unknown>[]) => {
            const metas = processServerSongs(rawData, url, token, serverContentCache.current);
            const unique = Array.from(new Map(metas.map(item => [item.id, item])).values());
            if (mounted) {
                setServerSongs(unique);
                storage.setJson(STORAGE_KEYS.MELODIQ_META_CACHE, unique.map(s => ({ ...s, txtContent: undefined })));
                setLoadingProgress({ loaded: unique.length, total: unique.length });
                setIsServerLoading(false);
            }
        };

        const hasExisting = serverSongs.length > 0 || storage.getJson<SongMeta[]>(STORAGE_KEYS.MELODIQ_META_CACHE, []).length > 0;
        if (forceRefresh || !hasExisting) {
            setIsServerLoading(true);
            setLoadingProgress({ loaded: 0, total: 0 });
        }

        let loadedFromCache = false;
        if (!forceRefresh) {
            const cachedData = await loadCachedServerSongs(url);
            if (cachedData && cachedData.length > 0) {
                applyServerData(cachedData);
                loadedFromCache = true;
            }
        }

        try {
            const freshData = await fetchServerSongs();
            if (mounted) setHasConnectionError(false);
            await saveServerSongsToCache(url, freshData);
            applyServerData(freshData);
        } catch (e) {
            console.warn('[SongsProvider] Helper connection failed:', e);
            if (mounted && !loadedFromCache) {
                setIsServerLoading(false);
                setHasConnectionError(true);
                setLoadingProgress(null);
                setServerSongs([]);
            }
        }

        return () => { mounted = false; };
    }, [serverSongs.length]);

    useEffect(() => {
        const isClient = new URLSearchParams(window.location.search).get('role') === 'client';
        if (!isClient) {
            loadServerSongs();
        }

        const handleSettingsUpdate = (e: Event) => {
            const detail = (e as CustomEvent)?.detail;
            if (!detail || detail.helperUrl !== undefined || detail.enableHelper !== undefined || detail.helperToken !== undefined || detail.forceReload) {
                loadServerSongs();
            }
        };

        window.addEventListener('melodiq_settings_updated', handleSettingsUpdate);
        return () => {
            window.removeEventListener('melodiq_settings_updated', handleSettingsUpdate);
        };
    }, [loadServerSongs]);

    // Merge local and server songs into unified library
    const songs = useMemo<SongMeta[]>(() => {
        const localMetas: SongMeta[] = localLibrary.localSongs.map(s => ({
            id: s.id,
            source: 'local',
            title: s.title,
            artist: s.artist,
            bpm: (s as unknown as { bpm?: number }).bpm,
            year: s.year,
            language: s.language,
            genre: s.genre,
            cover: s.cover,
            video: s.video,
            audio: s.audio,
            originalAudio: s.originalAudio,
            instrumentalAudio: s.instrumentalAudio,
            vocalsAudio: s.vocalsAudio,
            hasSeparation: s.hasSeparation,
            duration: s.duration,
            edition: s.edition,
            hasCover: s.hasCover,
            hasVideo: s.hasVideo,
            txtPath: s.dirPath
        }));

        if (serverSongs.length === 0) return localMetas;
        if (localMetas.length === 0) return serverSongs;

        const seen = new Set<string>();
        const merged: SongMeta[] = [];
        for (const s of [...localMetas, ...serverSongs]) {
            if (!seen.has(s.id)) {
                seen.add(s.id);
                merged.push(s);
            }
        }
        return merged;
    }, [localLibrary.localSongs, serverSongs]);

    const refreshSongs = useCallback(async () => {
        await Promise.all([
            loadServerSongs(true),
            localLibrary.rescanFolder()
        ]);
    }, [loadServerSongs, localLibrary]);

    const getSongById = useCallback(async (id: string): Promise<Song | undefined> => {
        // 1. Check local songs first
        const localFound = localLibrary.localSongs.find(s => s.id === id);
        if (localFound) {
            return localFound;
        }

        // 2. Check cached server content
        const serverFound = serverSongs.find(s => s.id === id);
        const cachedTxt = serverContentCache.current.get(id);
        if (serverFound && cachedTxt) {
            return { ...serverFound, txtContent: cachedTxt } as Song;
        }

        // 3. Fetch from server API
        return fetchServerSongDetails(id);
    }, [localLibrary.localSongs, serverSongs]);

    const isLoading = isServerLoading || localLibrary.isScanning;

    const value = useMemo<UseSongsResult>(() => ({
        songs,
        isLoading,
        hasConnectionError,
        loadingProgress,
        refreshSongs,
        getSongById,
        localLibrary
    }), [songs, isLoading, hasConnectionError, loadingProgress, refreshSongs, getSongById, localLibrary]);

    return (
        <SongsContext.Provider value={value}>
            {children}
        </SongsContext.Provider>
    );
};

export const useSongs = (): UseSongsResult => {
    const context = useContext(SongsContext);
    if (!context) {
        throw new Error('useSongs must be used within a SongsProvider');
    }
    return context;
};
