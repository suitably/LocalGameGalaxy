import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { type Song, type SongMeta } from '../db';

interface LoadingProgress {
    loaded: number;
    total: number;
}

interface UseSongsResult {
    songs: SongMeta[];
    isLoading: boolean;
    loadingProgress: LoadingProgress | null;
    refreshSongs: () => Promise<void>;
    getSongById: (id: string) => Promise<Song | undefined>;
}

const SongsContext = createContext<UseSongsResult | null>(null);

/**
 * Provider component that manages the song library state.
 */
export const SongsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [songs, setSongs] = useState<SongMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);

    // Read config from storage
    const getHelperConfig = () => ({
        url: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
        token: localStorage.getItem('melodiq_helper_token') || '',
        enabled: localStorage.getItem('melodiq_enable_helper') !== 'false'
    });

    // Cache for server song content
    const serverContentCache = useRef(new Map<string, string>());

    const loadSongs = useCallback(async () => {
        let mounted = true;
        const { url, token, enabled } = getHelperConfig();
        const helperUrl = url.replace(/\/$/, "");

        try {
            setIsLoading(true);
            setLoadingProgress({ loaded: 0, total: 0 });

            // Parallel fetch: Server + Local DB
            const serverPromise = enabled
                ? fetch(`${helperUrl}/api/songs`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                }).then(res => {
                    if (res.status === 401) {
                        console.warn('Helper Auth Failed');
                        return [];
                    }
                    return res.ok ? res.json() : [];
                }).catch((e) => {
                    console.warn('Helper connection failed:', e);
                    return [];
                })
                : Promise.resolve([]);

            // Dynamically import DB
            const [serverSongs, localSongs] = await Promise.all([
                serverPromise,
                import('../db').then(m => m.default.songsMeta.toArray())
            ]);

            if (mounted) {
                console.log(`[SongsProvider] Loaded ${serverSongs.length} server, ${localSongs.length} local`);

                serverSongs.forEach((s: any) => {
                    if (s.id && s.txtContent) serverContentCache.current.set(s.id, s.txtContent);
                });

                const allSongs = [...serverSongs, ...localSongs];

                const metas: SongMeta[] = allSongs.map((s: any) => {
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
                        start: s.start,
                        end: s.end,
                        duration: s.duration,
                        edition: s.edition,
                        hasCover: s.hasCover ?? !!s.cover,
                        hasVideo: s.hasVideo ?? !!s.video
                    };
                });

                // Deduplicate
                const unique = Array.from(new Map(metas.map(item => [item.id, item])).values());

                setSongs(unique);
                setLoadingProgress({ loaded: unique.length, total: unique.length });
                setIsLoading(false);
            }
        } catch (e) {
            console.error('Failed to load songs:', e);
            if (mounted) {
                setIsLoading(false);
                setLoadingProgress(null);
            }
        }
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

    const refreshSongs = useCallback(async () => {
        await loadSongs();
    }, [loadSongs]);

    const getSongById = useCallback(async (id: string): Promise<Song | undefined> => {
        try {
            const localSong = await import('../db').then(m => m.default.songs.get(id));
            if (localSong) return localSong;
        } catch (e) {
            console.warn("Failed to check local DB for song", id);
        }

        const found = songs.find(s => s.id === id);
        if (found) {
            const content = serverContentCache.current.get(id);
            if (content) {
                return { ...found, txtContent: content } as unknown as Song;
            }
            return found as unknown as Song;
        }
        return undefined;
    }, [songs]);

    return (
        <SongsContext.Provider value= {{ songs, isLoading, loadingProgress, refreshSongs, getSongById }
}>
    { children }
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
