import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { type Song, type SongMeta } from '../db';
import { melodiqFetch } from '../api/melodiqFetch';

interface LoadingProgress {
    loaded: number;
    total: number;
}

interface UseSongsResult {
    songs: SongMeta[];
    isLoading: boolean;
    hasConnectionError: boolean;
    loadingProgress: LoadingProgress | null;
    refreshSongs: () => Promise<void>;
    getSongById: (id: string) => Promise<Song | undefined>;
}

const SongsContext = createContext<UseSongsResult | null>(null);

/**
 * Provider component that manages the song library state.
 */
export const SongsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [songs, setSongs] = useState<SongMeta[]>(() => {
        try {
            const cached = sessionStorage.getItem('melodiq_meta_cache');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [isLoading, setIsLoading] = useState(() => {
        try {
            return !sessionStorage.getItem('melodiq_meta_cache');
        } catch { return true; }
    });
    const [hasConnectionError, setHasConnectionError] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);

    // Read config from storage
    const getHelperConfig = () => ({
        url: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
        token: localStorage.getItem('melodiq_helper_token') || '',
        enabled: localStorage.getItem('melodiq_enable_helper') !== 'false'
    });

    // Cache for server song content
    const serverContentCache = useRef(new Map<string, string>());

    const loadSongs = useCallback(async (forceRefresh = false) => {
        let mounted = true;
        const { url, token, enabled } = getHelperConfig();
        const helperUrl = url.replace(/\/$/, "");

        const processAndApply = (serverSongs: any[]) => {
            serverSongs.forEach((s: any) => {
                if (s.id && s.txtContent) serverContentCache.current.set(s.id, s.txtContent);
            });

            const metas: SongMeta[] = serverSongs.map((s: any) => {
                const processUrl = (url?: string | Blob | FileSystemFileHandle) => {
                    if (typeof url === 'string') {
                        if (url.startsWith('/media')) {
                            let final = `${helperUrl}${url}`;
                            if (token && !final.includes('token=')) {
                                final += (final.includes('?') ? '&' : '?') + `token=${token}`;
                            }
                            return final;
                        }
                        if (url.startsWith(helperUrl) && url.includes('/media') && token && !url.includes('token=')) {
                            return url + (url.includes('?') ? '&' : '?') + `token=${token}`;
                        }
                    }
                    return url;
                };

                return {
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    bpm: s.bpm,
                    year: s.year,
                    language: s.language,
                    genre: s.genre,
                    cover: processUrl(s.cover),
                    video: processUrl(s.video),
                    audio: processUrl(s.audio),
                    originalAudio: processUrl(s.originalAudio),
                    instrumentalAudio: processUrl(s.instrumentalAudio),
                    vocalsAudio: processUrl(s.vocalsAudio),
                    hasSeparation: s.hasSeparation ?? !!(s.vocalsAudio || (s.txtContent && s.txtContent.includes('#VOCALS:'))),
                    start: s.start,
                    end: s.end,
                    duration: s.duration,
                    edition: s.edition,
                    hasCover: s.hasCover ?? !!s.cover,
                    hasVideo: s.hasVideo ?? !!s.video,
                    usdbId: s.usdbId,
                    txtPath: s.txtPath
                };
            });

            const unique = Array.from(new Map(metas.map(item => [item.id, item])).values());
            if (mounted) {
                setSongs(unique);
                try {
                    // Save lightweight meta state synchronously to prevent UI flash on reload
                    sessionStorage.setItem('melodiq_meta_cache', JSON.stringify(unique.map(s => ({...s, txtContent: undefined}))));
                } catch(e) {}
                setLoadingProgress({ loaded: unique.length, total: unique.length });
                setIsLoading(false);
            }
        };

        try {
            const cacheName = 'melodiq-api-cache';
            const requestUrl = `${helperUrl}/api/songs`;

            const hasExistingSongs = songs.length > 0 || !!sessionStorage.getItem('melodiq_meta_cache');

            // Only show scanning state if we are forcing a refresh AND we have no songs
            if (forceRefresh || !hasExistingSongs) {
                setIsLoading(true);
                setLoadingProgress({ loaded: 0, total: 0 });
            }

            let loadedFromCache = false;

            // 1. Try to load instantly from Cache API (unless forcing refresh)
            if (enabled && !forceRefresh) {
                try {
                    const cache = await caches.open(cacheName);
                    const cachedRes = await cache.match(requestUrl);
                    if (cachedRes) {
                        const cachedData = await cachedRes.json();
                        if (cachedData && cachedData.length > 0) {
                            console.log(`[SongsProvider] Instant load: ${cachedData.length} songs from Cache API`);
                            processAndApply(cachedData);
                            loadedFromCache = true;
                        }
                    }
                } catch (e) {
                    console.warn('Cache API read failed', e);
                }
            }

            // 2. Fetch fresh data from server in background (or immediately if no cache)
            if (enabled) {
                try {
                    const freshData = await melodiqFetch('/api/songs');
                    console.log(`[SongsProvider] Fetched ${freshData.length} fresh server songs`);
                    if (mounted) setHasConnectionError(false);
                    
                    // Store clone in Cache API for next reload (using a synthetic Response)
                    try {
                        const cache = await caches.open(cacheName);
                        cache.put(requestUrl, new Response(JSON.stringify(freshData)));
                    } catch(e) {}
                    
                    processAndApply(freshData);
                } catch (e) {
                    console.warn('Helper connection failed:', e);
                    if (mounted && !loadedFromCache) {
                        setIsLoading(false);
                        setHasConnectionError(true);
                        setLoadingProgress(null);
                        setSongs([]);
                    }
                }
            } else if (mounted) {
                setIsLoading(false);
            }


        } catch (e) {
            console.error('Failed to load songs:', e);
            if (mounted) {
                setIsLoading(false);
                setHasConnectionError(true);
                setLoadingProgress(null);
            }
        }
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        const isClient = new URLSearchParams(window.location.search).get('role') === 'client';
        
        // On client mode: don't load songs at mount — wait for helper_config which fires
        // melodiq_settings_updated once the WebRTC connection is established.
        // On host/standalone: load immediately.
        if (!isClient) {
            loadSongs();
        }

        const handleSettingsUpdate = () => {
            console.log('[SongsProvider] Settings updated, reloading songs...');
            loadSongs();
        };

        window.addEventListener('melodiq_settings_updated', handleSettingsUpdate);
        return () => {
            window.removeEventListener('melodiq_settings_updated', handleSettingsUpdate);
        };
    }, [loadSongs]);

    const refreshSongs = useCallback(async () => {
        await loadSongs(true); // force fresh fetch
    }, [loadSongs]);

    const getSongById = useCallback(async (id: string): Promise<Song | undefined> => {
        let found = songs.find(s => s.id === id);
        let content = serverContentCache.current.get(id);

        if (found && content) {
            return { ...found, txtContent: content } as unknown as Song;
        }

        // Dynamically fetch missing data from Host (which includes txtContent)
        try {
            const res = await melodiqFetch(`/api/songs/${id}`);
            if (res) {
                if (res.txtContent) {
                    serverContentCache.current.set(id, res.txtContent);
                }
                return { ...(found || res), txtContent: res.txtContent || content } as unknown as Song;
            }
        } catch (e) {
            console.warn("[SongsProvider] Failed to fetch full song data for", id, e);
        }

        if (found) {
            return found as unknown as Song;
        }
        return undefined;
    }, [songs]);

    const value = React.useMemo(() => ({
        songs, isLoading, hasConnectionError, loadingProgress, refreshSongs, getSongById
    }), [songs, isLoading, hasConnectionError, loadingProgress, refreshSongs, getSongById]);

    return (
        <SongsContext.Provider value={value}>
            {children}
        </SongsContext.Provider>
    );
};

export const useSongs = () => {
    const context = useContext(SongsContext);
    if (!context) {
        throw new Error('useSongs must be used within a SongsProvider');
    }
    return context;
};
