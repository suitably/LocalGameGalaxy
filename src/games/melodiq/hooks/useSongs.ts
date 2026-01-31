import { useState, useEffect, useCallback } from 'react';
import db, { type Song, type SongMeta } from '../db';

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

    // Chunked loading for initial load
    const loadSongs = useCallback(async () => {
        const CHUNK_SIZE = 500;
        let cancelled = false;

        try {
            const total = await db.songsMeta.count();

            if (total === 0) {
                // Fallback: Maybe songsMeta not populated yet, try songs table
                const legacyTotal = await db.songs.count();
                if (legacyTotal > 0) {
                    // Migrate: Build songsMeta from songs table
                    setLoadingProgress({ loaded: 0, total: legacyTotal });
                    const allMeta: SongMeta[] = [];

                    for (let offset = 0; offset < legacyTotal; offset += CHUNK_SIZE) {
                        if (cancelled) return;

                        const chunk = await db.songs.offset(offset).limit(CHUNK_SIZE).toArray();
                        const metaChunk: SongMeta[] = chunk.map(s => ({
                            id: s.id,
                            libraryId: s.libraryId,
                            title: s.title,
                            artist: s.artist,
                            duration: s.duration,
                            year: s.year,
                            genre: s.genre,
                            language: s.language,
                            edition: s.edition,
                            album: s.album,
                            hasCover: !!s.cover,
                            hasVideo: !!s.video
                        }));

                        allMeta.push(...metaChunk);

                        if (!cancelled) {
                            setSongs([...allMeta]);
                            setLoadingProgress({ loaded: allMeta.length, total: legacyTotal });
                        }

                        // Yield to browser
                        await yieldToBrowser();
                    }

                    // Persist migrated metadata
                    await db.songsMeta.bulkPut(allMeta);

                    if (!cancelled) {
                        setLoadingProgress(null);
                        setIsLoading(false);
                    }
                    return;
                }

                setSongs([]);
                setIsLoading(false);
                return;
            }

            // Normal case: Load from songsMeta
            setLoadingProgress({ loaded: 0, total });
            const allSongs: SongMeta[] = [];

            for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
                if (cancelled) return;

                const chunk = await db.songsMeta.offset(offset).limit(CHUNK_SIZE).toArray();
                allSongs.push(...chunk);

                if (!cancelled) {
                    setSongs([...allSongs]);
                    setLoadingProgress({ loaded: allSongs.length, total });
                }

                await yieldToBrowser();
            }

            if (!cancelled) {
                setLoadingProgress(null);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to load songs:', error);
            setIsLoading(false);
        }

        return () => { cancelled = true; };
    }, []);

    // Load on mount
    useEffect(() => {
        loadSongs();
    }, [loadSongs]);

    // Refresh callback (for after imports)
    const refreshSongs = useCallback(async () => {
        setIsLoading(true);
        await loadSongs();
    }, [loadSongs]);

    // Get full song data for playback (on-demand)
    const getSongById = useCallback(async (id: string): Promise<Song | undefined> => {
        return db.songs.get(id);
    }, []);

    return {
        songs,
        isLoading,
        loadingProgress,
        refreshSongs,
        getSongById
    };
};

// Helper to yield to browser for responsiveness
const yieldToBrowser = (): Promise<void> => {
    return new Promise(resolve => {
        if ('requestIdleCallback' in window) {
            (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
                .requestIdleCallback(resolve, { timeout: 50 });
        } else {
            setTimeout(resolve, 0);
        }
    });
};
