import { useState, useEffect, useCallback, useRef } from 'react';
import { type Song, type SongMeta } from '../db';

interface LoadingProgress {
    loaded: number;
    total: number;
}

/**
 * Centralized hook for managing song data.
 * Loads lightweight SongMeta for listing, provides on-demand full Song loading for playback.
 */
export const useSongs = () => {
    const [songs, setSongs] = useState<SongMeta[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);

    // Read config from storage
    const getHelperConfig = () => ({
        url: localStorage.getItem('melodiq_helper_url') || 'http://localhost:3000',
        enabled: localStorage.getItem('melodiq_enable_helper') === 'true'
    });

    // Cache for server song content (lyrics/notes) which is provided by API but not in SongMeta
    const serverContentCache = useRef(new Map<string, string>());

    // Load songs from Local Server AND IndexedDB
    const loadSongs = useCallback(async () => {
        let mounted = true;
        const { url, enabled } = getHelperConfig();
        const helperUrl = url.replace(/\/$/, "");

        try {
            setIsLoading(true);
            setLoadingProgress({ loaded: 0, total: 0 });

            // Parallel fetch: Server (if enabled) + Local DB
            const serverPromise = enabled
                ? fetch(`${helperUrl}/api/songs`)
                    .then(res => res.ok ? res.json() : [])
                    .catch(() => [])
                : Promise.resolve([]);

            // Import db dynamically to access local indexedDB
            const [serverSongs, localSongs] = await Promise.all([
                serverPromise,
                import('../db').then(m => m.default.songsMeta.toArray())
            ]);

            if (mounted) {
                console.log(`[useSongs] Loaded ${serverSongs.length} server (enabled=${enabled}), ${localSongs.length} local`);

                // Update Content Cache
                serverSongs.forEach((s: any) => {
                    if (s.id && s.txtContent) {
                        serverContentCache.current.set(s.id, s.txtContent);
                    }
                });

                // Merge (deduplicate by ID preferred, or just concat)
                const allSongs = [...serverSongs, ...localSongs];

                // Adapting to SongMeta
                const metas: SongMeta[] = allSongs.map((s: any) => {
                    // If song comes from server (has string URL starting with /media), prepend helperUrl
                    // Local DB songs have Blob/File objects or are processed differently

                    const processUrl = (url?: string | Blob | FileSystemFileHandle) => {
                        if (typeof url === 'string' && url.startsWith('/media')) {
                            return `${helperUrl}${url}`;
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
                        // Computed flags - respect existing flag first (local DB), fallback to field presence (Server)
                        hasCover: s.hasCover ?? !!s.cover,
                        hasVideo: s.hasVideo ?? !!s.video
                    };
                });

                // Deduplicate by ID
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

    // Load on mount
    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

    // Refresh callback
    const refreshSongs = useCallback(async () => {
        await loadSongs();
    }, [loadSongs]);

    // Get full song data
    const getSongById = useCallback(async (id: string): Promise<Song | undefined> => {
        // 1. Try to get full object from Local DB (contains File/Blob handles)
        try {
            const localSong = await import('../db').then(m => m.default.songs.get(id));
            if (localSong) return localSong;
        } catch (e) {
            console.warn("Failed to check local DB for song", id);
        }

        // 2. Fallback to in-memory state (Server songs) - casting Meta to Song
        // The URL processing done in loadSongs (prepending helperUrl) is preserved here
        // because we are finding it in 'songs' state which already has processed URLs.
        const found = songs.find(s => s.id === id);
        if (found) {
            // Attach cached content if available
            const content = serverContentCache.current.get(id);
            if (content) {
                // Return a hybrid object with txtContent (used by MelodiqSession)
                return { ...found, txtContent: content } as unknown as Song;
            }
            return found as unknown as Song;
        }
        return undefined;
    }, [songs]);

    return {
        songs,
        isLoading,
        loadingProgress,
        refreshSongs,
        getSongById
    };
};
